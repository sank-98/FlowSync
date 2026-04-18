const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('express-async-errors');
const securityConfig = require('./config/security-config');
const { applySecurity } = require('./middleware/security');
const { authGuard } = require('./middleware/auth-guard');
const inputSanitizer = require('./middleware/input-sanitizer');
const errorHandler = require('./middleware/error-handler');
const {
  validateRouteRequest,
  validateChatRequest,
  validationErrorHandler,
} = require('./middleware/request-validator');
const { trackPerformance } = require('./config/performance-monitoring');
const cacheManager = require('./services/cache-manager');
const { createGoogleServices } = require('./config/cloud-services');
const { createHealthRouter } = require('./routes/health-check');
const { createStorageRouter } = require('./routes/storage');
const { createTasksRouter } = require('./routes/tasks');
const { createEventsRouter } = require('./routes/events');
const apiRouter = require('./routes/api');
const { validateEnvironment } = require('./config/env-validator');

dotenv.config();
validateEnvironment();

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = '0.0.0.0';
const googleServices = createGoogleServices();
const adminRouteAuth =
  process.env.NODE_ENV === 'production' || process.env.ENABLE_ADMIN_ROUTE_AUTH === 'true'
    ? authGuard
    : (_req, _res, next) => next();

if (securityConfig.trustProxy) {
  app.set('trust proxy', 1);
}
app.use(express.json({ limit: securityConfig.request.maxJsonSize }));
app.use(express.urlencoded({ extended: true, limit: securityConfig.request.maxUrlEncodedSize }));
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && Object.prototype.hasOwnProperty.call(err, 'body')) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  return next(err);
});
applySecurity(app);
app.use((req, res, next) => {
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
app.use(trackPerformance);
app.use(inputSanitizer);
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.path.startsWith('/api/')) {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type. Use application/json' });
    }
  }
  return next();
});
app.use(googleServices.cloudLogger.requestLoggingMiddleware);
app.use((req, res, next) => {
  res.on('finish', () => {
    const durationMs = Number(req.responseTimeMs || 0);
    googleServices.cloudMonitoring
      .recordAPILatency(req.path, durationMs)
      .catch((error) => googleServices.cloudLogger.logWarning('cloud monitoring latency write failed', { error: error.message }));

    if (res.statusCode >= 400) {
      googleServices.cloudMonitoring
        .recordErrorRate(req.path, 1)
        .catch((error) => googleServices.cloudLogger.logWarning('cloud monitoring error metric failed', { error: error.message }));
    }
  });
  next();
});

let db = null;

try {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : require('./firebase-key.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  db = admin.firestore();
  googleServices.cloudLogger.logInfo('Firebase initialized');
} catch (error) {
  googleServices.cloudLogger.logWarning('Firebase initialization warning', { error: error.message });
}

let model = null;

try {
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    googleServices.cloudLogger.logInfo('Gemini initialized');
  } else {
    googleServices.cloudLogger.logWarning('Gemini API key not found');
  }
} catch (error) {
  googleServices.cloudLogger.logWarning('Gemini initialization warning', { error: error.message });
}

const SIMULATION_CONFIG = {
  updateInterval: 1500,
  historyLength: 30,
  eventDecay: 0.965,
};

const BLUEPRINT = buildVenueBlueprint();
const zoneHistory = new Map();

let zones = [];
let simulationTime = 0;
let isSimulationRunning = true;
let eventPulse = 0;
let lastAnomalies = [];
let activeRouteReservations = new Map();
let simulationInterval;

/**
 * Constructs the complete venue blueprint with all zones and their relationships.
 * Creates 28 zones across 5 rings (outer, mid, inner) with specific types and capacities.
 *
 * @returns {Array<Object>} Array of zone objects with id, name, ring, radius, angle, type, capacity, and neighbors
 */
function buildVenueBlueprint() {
  const blueprint = [];
  const outerTypes = [
    'entry',
    'walkway',
    'exit',
    'entry',
    'walkway',
    'exit',
    'entry',
    'walkway',
    'exit',
    'entry',
    'walkway',
    'exit',
  ];
  const midTypes = ['food', 'walkway', 'restroom', 'food', 'walkway', 'restroom', 'food', 'walkway'];
  const innerTypes = ['medical', 'lounge', 'food', 'restroom'];

  outerTypes.forEach((type, index) => {
    blueprint.push(makeZoneTemplate('outer', index, outerTypes.length, 0.93, type, 420));
  });

  midTypes.forEach((type, index) => {
    blueprint.push(makeZoneTemplate('mid', index, midTypes.length, 0.66, type, 260));
  });

  innerTypes.forEach((type, index) => {
    blueprint.push(makeZoneTemplate('inner', index, innerTypes.length, 0.38, type, 160));
  });

  return blueprint.map((zone) => ({
    ...zone,
    neighbors: buildNeighborIds(zone, blueprint),
  }));
}

/**
 * Creates a single zone template with geometric positioning and service characteristics.
 *
 * @param {string} ring - Ring level: 'outer', 'mid', or 'inner'
 * @param {number} index - Zero-based index within the ring
 * @param {number} total - Total zones in the ring
 * @param {number} radius - Radial distance from center (0-1 normalized)
 * @param {string} type - Zone type: 'entry', 'exit', 'food', 'restroom', 'medical', 'lounge', 'walkway'
 * @param {number} capacity - Maximum occupancy for the zone
 * @returns {Object} Zone template object with positioning and service data
 */
function makeZoneTemplate(ring, index, total, radius, type, capacity) {
  const angle = ((Math.PI * 2) / total) * index - Math.PI / 2;
  const id = `${ring}-${index + 1}`;

  return {
    id,
    name: `${ring[0].toUpperCase()}${ring.slice(1)} ${index + 1}`,
    ring,
    radius,
    angle,
    angleDeg: Math.round((angle * 180) / Math.PI),
    type,
    capacity,
    serviceRate: type === 'food' ? 24 : type === 'restroom' ? 30 : 18,
    cluster: `${ring}-${type}`,
  };
}

/**
 * Discovers neighbor zones for path planning using circumferential and radial distance metrics.
 * Each zone connects to its ring neighbors and closest zones in adjacent rings.
 *
 * @param {Object} zone - Target zone to find neighbors for
 * @param {Array<Object>} allZones - All zones in the venue
 * @returns {Array<string>} Array of neighbor zone IDs
 */
function buildNeighborIds(zone, allZones) {
  const inRing = allZones.filter((candidate) => candidate.ring === zone.ring);
  const ordered = [...inRing].sort((left, right) => left.angle - right.angle);
  const position = ordered.findIndex((candidate) => candidate.id === zone.id);
  const previous = ordered[(position - 1 + ordered.length) % ordered.length];
  const next = ordered[(position + 1) % ordered.length];
  const radialNeighbors = allZones
    .filter((candidate) => candidate.ring !== zone.ring)
    .map((candidate) => ({
      id: candidate.id,
      distance:
        Math.abs(candidate.radius - zone.radius) * 10 + Math.abs(normalizeAngle(zone.angle - candidate.angle)),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, zone.ring === 'inner' ? 2 : 3)
    .map((candidate) => candidate.id);

  return [...new Set([previous.id, next.id, ...radialNeighbors])];
}

/**
 * Normalizes angles to the range [-π, π] for consistent angular distance calculations.
 *
 * @param {number} angle - Angle in radians
 * @returns {number} Normalized angle in [-π, π]
 */
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return Math.abs(angle);
}

/**
 * Clamps a numeric value to a specified range [min, max].
 *
 * @param {number} value - Value to clamp
 * @param {number} [min=0] - Minimum bound (default: 0)
 * @param {number} [max=1] - Maximum bound (default: 1)
 * @returns {number} Clamped value
 */
function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculates type-specific attraction scores for zones based on zone type and current event state.
 * Used in crowd dynamics simulation to influence density evolution.
 *
 * @param {string} type - Zone type: 'entry', 'exit', 'food', 'restroom', 'medical', 'lounge'
 * @returns {number} Attraction score in range [0.2, 0.62]
 */
function typeAttraction(type) {
  switch (type) {
    case 'entry':
      return 0.44;
    case 'exit':
      return 0.28 + eventPulse * 0.22;
    case 'food':
      return 0.62;
    case 'restroom':
      return 0.56;
    case 'medical':
      return 0.2;
    case 'lounge':
      return 0.34;
    default:
      return 0.4;
  }
}

/**
 * Initializes or resets the stadium simulation to its default state.
 * Sets all zones to base densities and clears history, anomalies, and reservations.
 */
function initializeStadium() {
  simulationTime = 0;
  eventPulse = 0;
  lastAnomalies = [];
  activeRouteReservations = new Map();
  zoneHistory.clear();

  zones = BLUEPRINT.map((template, index) => {
    const baseDensity = clamp(
      typeAttraction(template.type) * 0.55 +
        (template.ring === 'outer' ? 0.08 : template.ring === 'mid' ? 0.14 : 0.18) +
        ((index % 3) - 1) * 0.03,
      0.08,
      0.78
    );

    const zone = {
      ...template,
      density: baseDensity,
      prev_density: baseDensity,
      predicted_density: baseDensity,
      queue_time: Math.round(baseDensity * 16),
      pressure: classifyPressure(baseDensity),
      velocity: 1.1 - baseDensity * 0.7,
      trend_rate: 0,
      congestion_score: Math.round(baseDensity * 100),
      flow_rate: Math.round((1 - baseDensity) * template.capacity * 0.08),
      occupancy: Math.round(baseDensity * template.capacity),
      confidence: 0.82,
      severity: 0,
      anomaly: null,
      timestamp: new Date().toISOString(),
    };

    zoneHistory.set(zone.id, [zone.density]);
    return zone;
  });
}

/**
 * Classifies pressure level based on predicted density threshold.
 *
 * @param {number} density - Zone density in range [0, 1]
 * @returns {string} Pressure level: 'low', 'medium', 'high', or 'critical'
 */
function classifyPressure(density) {
  if (density >= 0.82) return 'critical';
  if (density >= 0.64) return 'high';
  if (density >= 0.42) return 'medium';
  return 'low';
}

/**
 * Retrieves a zone object by its ID.
 *
 * @param {string} zoneId - Unique zone identifier
 * @returns {Object|undefined} Zone object or undefined if not found
 */
function getZone(zoneId) {
  return zones.find((zone) => zone.id === zoneId);
}

/**
 * Retrieves all neighboring zones for a given zone.
 *
 * @param {Object} zone - Zone object
 * @returns {Array<Object>} Array of neighbor zone objects
 */
function getNeighbors(zone) {
  return zone.neighbors.map((neighborId) => getZone(neighborId)).filter(Boolean);
}

/**
 * Updates the simulation state for one cycle (1.5 seconds).
 * Recalculates density, velocity, queue times, and detects anomalies.
 * Publishes metrics to Google Cloud Pub/Sub if enabled.
 */
function updateSimulation() {
  if (!isSimulationRunning) return;

  simulationTime += SIMULATION_CONFIG.updateInterval / 1000;
  eventPulse *= SIMULATION_CONFIG.eventDecay;

  const nextDensities = new Map();

  zones.forEach((zone, index) => {
    zone.prev_density = zone.density;

    const neighbors = getNeighbors(zone);
    const neighborAverage =
      neighbors.reduce((sum, neighbor) => sum + neighbor.density, 0) / Math.max(neighbors.length, 1);
    const demandWave = Math.sin(simulationTime / 12 + index * 0.8) * 0.04;
    const ringBias = zone.ring === 'outer' ? 0.02 : zone.ring === 'mid' ? 0.05 : 0.03;
    const eventBias =
      zone.type === 'exit'
        ? eventPulse * 0.36
        : zone.type === 'food' || zone.type === 'restroom'
          ? eventPulse * 0.12
          : eventPulse * 0.05;
    const targetDensity = typeAttraction(zone.type) + ringBias + eventBias;
    const drift = (targetDensity - zone.density) * 0.18;
    const networkPull = (neighborAverage - zone.density) * 0.22;
    const randomWalk = (Math.random() - 0.5) * 0.035;
    const reservationPenalty = (activeRouteReservations.get(zone.id) || 0) * 0.015;

    nextDensities.set(zone.id, clamp(zone.density + drift + networkPull + demandWave + randomWalk + reservationPenalty));
  });

  zones.forEach((zone) => {
    zone.density = nextDensities.get(zone.id);
    zone.trend_rate = zone.density - zone.prev_density;
    zone.predicted_density = clamp(zone.density + zone.trend_rate * 4 + eventPulse * 0.1);
    zone.velocity = clamp(1.24 - zone.density * 0.92 - Math.max(zone.trend_rate, 0) * 0.9, 0.08, 1.25);
    zone.queue_time = Math.round(
      clamp(zone.predicted_density * zone.capacity / Math.max(zone.serviceRate, 1), 0, 24)
    );
    zone.pressure = classifyPressure(zone.predicted_density);
    zone.occupancy = Math.round(zone.density * zone.capacity);
    zone.flow_rate = Math.round(zone.velocity * (1 - zone.density) * zone.capacity * 0.09);
    zone.congestion_score = Math.round(
      zone.density * 52 + zone.predicted_density * 28 + zone.queue_time * 1.2 + (1 - zone.velocity) * 20
    );
    zone.confidence = clamp(0.9 - Math.abs(zone.trend_rate) * 1.4 - eventPulse * 0.1, 0.52, 0.96);
    zone.timestamp = new Date().toISOString();

    const history = zoneHistory.get(zone.id) || [];
    history.push(zone.density);
    if (history.length > SIMULATION_CONFIG.historyLength) history.shift();
    zoneHistory.set(zone.id, history);
  });

  lastAnomalies = detectAnomalies();
  if (lastAnomalies.length > 0) {
    googleServices.pubSubService
      .publishMessage('anomaly-detection', {
        count: lastAnomalies.length,
        topSeverity: lastAnomalies[0].severity,
        timestamp: new Date().toISOString(),
      })
      .catch((error) => googleServices.cloudLogger.logWarning('anomaly pubsub publish failed', { error: error.message }));
  }

  zones.forEach((zone) => {
    const anomaly = lastAnomalies.find((candidate) => candidate.zoneId === zone.id) || null;
    zone.anomaly = anomaly;
    zone.severity = anomaly ? anomaly.severity : 0;
  });

  for (const [zoneId, reservations] of [...activeRouteReservations.entries()]) {
    const nextValue = Math.max(0, reservations - 1);
    if (nextValue === 0) {
      activeRouteReservations.delete(zoneId);
    } else {
      activeRouteReservations.set(zoneId, nextValue);
    }
  }
}

/**
 * Detects anomalies in crowd behavior across all zones.
 * Identifies density spikes, flow stagnation, and critical threshold breaches.
 *
 * @returns {Array<Object>} Array of anomaly objects sorted by severity (highest first)
 */
function detectAnomalies() {
  return zones
    .map((zone) => {
      const densitySpike = zone.trend_rate > 0.11;
      const stagnation = zone.velocity < 0.3 && zone.predicted_density > 0.62;
      const thresholdBreach = zone.predicted_density > 0.84;

      if (!densitySpike && !stagnation && !thresholdBreach) return null;

      const severity = Math.round(
        clamp(
          zone.trend_rate * 320 +
            (thresholdBreach ? 28 : 0) +
            (stagnation ? 22 : 0) +
            zone.predicted_density * 42,
          15,
          100
        )
      );

      let category = 'crowd_spike';
      let message = 'Unexpected crowd acceleration detected';

      if (thresholdBreach) {
        category = 'critical_threshold';
        message = 'Predicted density exceeds safe operating threshold';
      } else if (stagnation) {
        category = 'flow_stagnation';
        message = 'Movement velocity collapsed while occupancy remains high';
      }

      return {
        id: `${zone.id}-${category}`,
        zoneId: zone.id,
        zoneName: zone.name,
        category,
        severity,
        status: severity > 74 ? 'critical' : severity > 48 ? 'elevated' : 'watch',
        autoResolutionMinutes: Math.max(2, Math.round(10 - severity / 15)),
        message,
        predicted: zone.predicted_density > zone.density,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.severity - left.severity);
}

/**
 * Calculates Euclidean distance between two zones after 2D projection.
 *
 * @param {Object} left - First zone
 * @param {Object} right - Second zone
 * @returns {number} Distance in projected space
 */
function euclideanDistance(left, right) {
  const leftPoint = projectZone(left);
  const rightPoint = projectZone(right);
  return Math.hypot(leftPoint.x - rightPoint.x, leftPoint.y - rightPoint.y);
}

/**
 * Projects a zone's polar coordinates (angle, radius) into 2D Cartesian space.
 * Used for distance calculations in pathfinding.
 *
 * @param {Object} zone - Zone with angle and radius properties
 * @returns {Object} Object with x and y coordinates
 */
function projectZone(zone) {
  return {
    x: Math.cos(zone.angle) * zone.radius,
    y: Math.sin(zone.angle) * zone.radius * 0.68,
  };
}

/**
 * Heuristic function for A* pathfinding estimating cost to reach target from current zone.
 *
 * @param {Object} current - Current zone
 * @param {Object} target - Target zone
 * @returns {number} Estimated cost (heuristic)
 */
function heuristicCost(current, target) {
  return euclideanDistance(current, target) * 4.8;
}

/**
 * Builds cost weight factors based on routing preference.
 * Different preferences prioritize different aspects of route quality.
 *
 * @param {string} [preference='balanced'] - Routing preference: 'fastest', 'least_crowded', 'accessible', or 'balanced'
 * @returns {Object} Weight factors for density, predicted density, queue, capacity, and reservation
 */
function buildCostWeights(preference = 'balanced') {
  if (preference === 'fastest') {
    return { density: 2.2, predicted: 2.1, queue: 0.8, capacity: 0.7, reservation: 1.2 };
  }

  if (preference === 'least_crowded') {
    return { density: 3.5, predicted: 3.2, queue: 1.2, capacity: 1.3, reservation: 1.6 };
  }

  if (preference === 'accessible') {
    return { density: 2.4, predicted: 2.3, queue: 0.8, capacity: 0.5, reservation: 1.1 };
  }

  return { density: 2.9, predicted: 2.8, queue: 1, capacity: 1, reservation: 1.4 };
}

/**
 * Calculates the movement cost for traversing a zone based on preference and current conditions.
 * Higher cost discourages routing through congested or reserved zones.
 *
 * @param {Object} zone - Zone to calculate cost for
 * @param {string} [preference='balanced'] - Routing preference
 * @returns {number} Total movement cost
 */
function calculateMovementCost(zone, preference = 'balanced') {
  const weights = buildCostWeights(preference);
  const reservationCount = activeRouteReservations.get(zone.id) || 0;
  const capacityPenalty = zone.occupancy / Math.max(zone.capacity, 1);
  const base = 1.8 + (zone.ring === 'outer' ? 0.3 : zone.ring === 'inner' ? 0.15 : 0.2);

  return (
    base +
    zone.density * weights.density +
    zone.predicted_density * weights.predicted +
    zone.queue_time * 0.16 * weights.queue +
    capacityPenalty * weights.capacity +
    reservationCount * 0.22 * weights.reservation
  );
}

/**
 * Reserves zones along a route to discourage other users from taking the same path.
 * Reservations decay over simulation cycles.
 *
 * @param {Array<string>} route - Array of zone IDs in the route
 */
function reserveRoute(route) {
  route.forEach((zoneId) => {
    activeRouteReservations.set(zoneId, (activeRouteReservations.get(zoneId) || 0) + 2);
  });
}

/**
 * Finds the optimal route from a source zone to a destination facility type using A* algorithm.
 * Evaluates all destination options and selects the best based on routing preference.
 *
 * @param {string} fromZoneId - Starting zone ID
 * @param {string} destinationType - Facility type: 'food', 'restroom', 'exit', etc.
 * @param {string} [preference='balanced'] - Routing preference
 * @returns {Object|null} Route result with path, destination, score, and confidence, or null if no route found
 */
function findOptimalRoute(fromZoneId, destinationType, preference = 'balanced') {
  const source = getZone(fromZoneId);
  const destinations = zones.filter((zone) => zone.type === destinationType);

  if (!source || destinations.length === 0) return null;

  let bestRoute = null;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestDestination = null;

  destinations.forEach((destination) => {
    const route = aStarRoute(source, destination, preference);
    if (!route) return;

    const score = calculateRouteScore(route, preference);
    if (score < bestScore) {
      bestScore = score;
      bestRoute = route;
      bestDestination = destination;
    }
  });

  if (!bestRoute || !bestDestination) return null;

  reserveRoute(bestRoute);

  return {
    route: bestRoute,
    destination: bestDestination,
    score: Math.round(bestScore),
    confidence: calculateRouteConfidence(bestRoute),
  };
}

/**
 * A* pathfinding algorithm implementation.
 * Finds the lowest-cost path from start zone to goal zone using heuristic guidance.
 *
 * @param {Object} start - Starting zone
 * @param {Object} goal - Goal/destination zone
 * @param {string} preference - Routing preference for cost calculation
 * @returns {Array<string>|null} Array of zone IDs forming the path, or null if no path exists
 */
function aStarRoute(start, goal, preference) {
  const openSet = new Set([start.id]);
  const cameFrom = new Map();
  const gScore = new Map(zones.map((zone) => [zone.id, Number.POSITIVE_INFINITY]));
  const fScore = new Map(zones.map((zone) => [zone.id, Number.POSITIVE_INFINITY]));

  gScore.set(start.id, 0);
  fScore.set(start.id, heuristicCost(start, goal));

  while (openSet.size > 0) {
    let currentId = null;
    let lowest = Number.POSITIVE_INFINITY;

    openSet.forEach((candidateId) => {
      const candidateScore = fScore.get(candidateId) ?? Number.POSITIVE_INFINITY;
      if (candidateScore < lowest) {
        lowest = candidateScore;
        currentId = candidateId;
      }
    });

    if (!currentId) return null;
    if (currentId === goal.id) {
      return reconstructPath(cameFrom, currentId);
    }

    openSet.delete(currentId);
    const current = getZone(currentId);

    getNeighbors(current).forEach((neighbor) => {
      const tentativeScore = (gScore.get(currentId) ?? Number.POSITIVE_INFINITY) +
        calculateMovementCost(neighbor, preference) +
        euclideanDistance(current, neighbor) * 1.2;

      if (tentativeScore < (gScore.get(neighbor.id) ?? Number.POSITIVE_INFINITY)) {
        cameFrom.set(neighbor.id, currentId);
        gScore.set(neighbor.id, tentativeScore);
        fScore.set(neighbor.id, tentativeScore + heuristicCost(neighbor, goal));
        openSet.add(neighbor.id);
      }
    });
  }

  return null;
}

/**
 * Reconstructs the complete path from A* algorithm result.
 * Traces backwards from goal to start using the cameFrom map.
 *
 * @param {Map<string, string>} cameFrom - Map of zone ID to predecessor zone ID
 * @param {string} currentId - Goal zone ID
 * @returns {Array<string>} Array of zone IDs from start to goal
 */
function reconstructPath(cameFrom, currentId) {
  const route = [currentId];
  let cursor = currentId;

  while (cameFrom.has(cursor)) {
    cursor = cameFrom.get(cursor);
    route.unshift(cursor);
  }

  return route;
}

/**
 * Calculates a score for a route based on movement costs and congestion metrics.
 * Lower scores indicate better routes.
 *
 * @param {Array<string>} route - Array of zone IDs in the route
 * @param {string} preference - Routing preference
 * @returns {number} Total route score
 */
function calculateRouteScore(route, preference) {
  return route.reduce((score, zoneId, index) => {
    const zone = getZone(zoneId);
    if (!zone) return score;

    return (
      score +
      calculateMovementCost(zone, preference) +
      zone.congestion_score * 0.08 +
      (index === route.length - 1 && zone.type === 'exit' ? -1.4 : 0)
    );
  }, 0);
}

/**
 * Estimates travel time along a route in minutes.
 * Accounts for current or predicted density, queue times, and zone velocity.
 *
 * @param {Array<string>} route - Array of zone IDs
 * @param {boolean} [futureMode=false] - Use predicted density (true) or current (false)
 * @returns {number} Estimated time in minutes (minimum 2)
 */
function calculateEstimatedTime(route, futureMode = false) {
  return Math.max(
    2,
    Math.round(
      route.reduce((minutes, zoneId) => {
        const zone = getZone(zoneId);
        if (!zone) return minutes;
        const density = futureMode ? zone.predicted_density : zone.density;
        return minutes + 0.6 + density * 1.3 + zone.queue_time * 0.22;
      }, 0)
    )
  );
}

/**
 * Calculates confidence score for a route based on average zone prediction confidence.
 *
 * @param {Array<string>} route - Array of zone IDs
 * @returns {number} Confidence score in range [0.5, 0.97]
 */
function calculateRouteConfidence(route) {
  if (!route.length) return 0.5;
  const averageConfidence =
    route.reduce((sum, zoneId) => sum + (getZone(zoneId)?.confidence || 0.6), 0) / route.length;
  return clamp(averageConfidence, 0.5, 0.97);
}

/**
 * Analyzes two time options for traveling a route: "Move Now" vs "Wait & Travel Later".
 * Recommends the option resulting in earliest arrival.
 *
 * @param {Array<string>} route - Array of zone IDs
 * @returns {Object} Analysis with goNow and waitThen options and recommendation
 */
function analyzeTimeOptions(route) {
  const now = calculateEstimatedTime(route, false);
  const later = calculateEstimatedTime(route, true);
  const waitMinutes = later < now ? 4 : 2;

  return {
    goNow: {
      minutes: now,
      description: `Move now and arrive in about ${now} minutes`,
    },
    waitThen: {
      waitMinutes,
      thenMinutes: later,
      description: `Delay ${waitMinutes} minutes and travel in about ${later} minutes`,
    },
    recommendation: later + waitMinutes < now ? 'later' : 'now',
  };
}

/**
 * Generates exit strategy recommendation based on current exit zone density.
 * Advises users whether to exit immediately or wait for conditions to improve.
 *
 * @returns {Object} Exit strategy with recommendation and wait time
 */
function getExitStrategy() {
  const exitZones = zones.filter((zone) => zone.type === 'exit');
  const averageExitDensity =
    exitZones.reduce((sum, zone) => sum + zone.predicted_density, 0) / Math.max(exitZones.length, 1);

  if (averageExitDensity > 0.8) {
    return {
      immediate: false,
      recommendation: 'Exit wave is building. Hold position briefly and reroute through quieter sectors.',
      timeToWait: 6,
    };
  }

  if (averageExitDensity > 0.64) {
    return {
      immediate: false,
      recommendation: 'Exits are busy but manageable. Use alternate sectors and avoid the highest-density portals.',
      timeToWait: 3,
    };
  }

  return {
    immediate: true,
    recommendation: 'Exits are healthy. Start moving now using the lowest-density outer ring.',
    timeToWait: 0,
  };
}

/**
 * Generates a summary of all crowd clusters (ring-type combinations) with aggregate metrics.
 * Sorted by predicted density (highest first).
 *
 * @returns {Array<Object>} Array of cluster summaries with density and velocity metrics
 */
function clusterSummary() {
  const clusters = new Map();

  zones.forEach((zone) => {
    const existing = clusters.get(zone.cluster) || {
      id: zone.cluster,
      label: zone.cluster.replace('-', ' '),
      density: 0,
      predicted: 0,
      velocity: 0,
      count: 0,
    };

    existing.density += zone.density;
    existing.predicted += zone.predicted_density;
    existing.velocity += zone.velocity;
    existing.count += 1;
    clusters.set(zone.cluster, existing);
  });

  return [...clusters.values()]
    .map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      density: Math.round((cluster.density / cluster.count) * 100),
      predicted: Math.round((cluster.predicted / cluster.count) * 100),
      velocity: Number((cluster.velocity / cluster.count).toFixed(2)),
    }))
    .sort((left, right) => right.predicted - left.predicted);
}

/**
 * Generates operational recommendations for venue operators.
 * Identifies high-congestion zones, low-congestion alternatives, and facility balancing.
 *
 * @returns {Array<string>} Array of actionable recommendation strings
 */
function topRecommendations() {
  const sortedFood = zones
    .filter((zone) => zone.type === 'food')
    .sort((left, right) => left.predicted_density - right.predicted_density);
  const sortedRestrooms = zones
    .filter((zone) => zone.type === 'restroom')
    .sort((left, right) => left.predicted_density - right.predicted_density);
  const hottest = [...zones].sort((left, right) => right.congestion_score - left.congestion_score)[0];
  const coolest = [...zones].sort((left, right) => left.predicted_density - right.predicted_density)[0];

  return [
    hottest
      ? `Intervene at ${hottest.name}: predicted density ${Math.round(hottest.predicted_density * 100)}% and velocity ${hottest.velocity.toFixed(2)}.`
      : null,
    sortedFood[0] ? `Redirect food traffic toward ${sortedFood[0].name} for the lowest expected wait.` : null,
    sortedRestrooms[0]
      ? `Restroom balancing favors ${sortedRestrooms[0].name} with ${sortedRestrooms[0].queue_time} minute queue.`
      : null,
    coolest ? `Use ${coolest.name} as a relief corridor while adjacent sections absorb current load.` : null,
  ].filter(Boolean);
}

/**
 * Builds the complete dashboard data structure with all metrics, anomalies, and recommendations.
 * Called on each API request to /api/dashboard.
 *
 * @returns {Object} Dashboard object with stats, anomalies, clusters, recommendations, and top zones
 */
function buildDashboard() {
  const overallDensity = Math.round(
    (zones.reduce((sum, zone) => sum + zone.density, 0) / Math.max(zones.length, 1)) * 100
  );
  const predictedDensity = Math.round(
    (zones.reduce((sum, zone) => sum + zone.predicted_density, 0) / Math.max(zones.length, 1)) * 100
  );
  const highPressureZones = zones.filter((zone) => zone.pressure === 'high' || zone.pressure === 'critical').length;
  const averageQueueTime = Math.round(
    zones.reduce((sum, zone) => sum + zone.queue_time, 0) / Math.max(zones.length, 1)
  );

  return {
    generatedAt: new Date().toISOString(),
    simulationTime,
    status: isSimulationRunning ? 'live' : 'paused',
    stats: {
      overallDensity,
      predictedDensity,
      highPressureZones,
      activeAnomalies: lastAnomalies.length,
      averageQueueTime,
      routingLatencyMs: 48,
      systemReadiness: db ? 'cloud-sync-ready' : 'local-sim-ready',
    },
    exitStrategy: getExitStrategy(),
    anomalies: lastAnomalies.slice(0, 6),
    clusters: clusterSummary().slice(0, 6),
    recommendations: topRecommendations(),
    topZones: [...zones]
      .sort((left, right) => right.congestion_score - left.congestion_score)
      .slice(0, 5)
      .map((zone) => ({
        id: zone.id,
        name: zone.name,
        type: zone.type,
        density: Math.round(zone.density * 100),
        predictedDensity: Math.round(zone.predicted_density * 100),
        queueTime: zone.queue_time,
        pressure: zone.pressure,
      })),
  };
}

/**
 * Builds minimal AI context for Gemini prompt or fallback response generation.
 * Extracts key metrics and recommendations for AI consultation.
 *
 * @returns {Object} Context object with density, anomalies, exit strategy, and recommendations
 */
function buildAIContext() {
  const dashboard = buildDashboard();
  return {
    overallDensity: dashboard.stats.overallDensity,
    predictedDensity: dashboard.stats.predictedDensity,
    anomalies: dashboard.anomalies.length,
    exit: dashboard.exitStrategy.recommendation,
    recommendations: dashboard.recommendations.slice(0, 3).join(' '),
  };
}

/**
 * Generates contextual fallback response when Gemini API is unavailable.
 * Pattern-matches user query to provide relevant operational guidance.
 *
 * @param {string} query - User query string
 * @returns {string} Contextual response based on query intent
 */
function generateContextualFallback(query) {
  const context = buildAIContext();
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('route') || lowerQuery.includes('path')) {
    return `Routing is live. Current density is ${context.overallDensity}% with ${context.anomalies} active alerts. Choose a start zone and destination to generate a predictive path.`;
  }

  if (lowerQuery.includes('food')) {
    const target = zones
      .filter((zone) => zone.type === 'food')
      .sort((left, right) => left.predicted_density - right.predicted_density)[0];
    return `${target.name} is the best current food option with predicted density ${Math.round(target.predicted_density * 100)}%.`;
  }

  if (lowerQuery.includes('exit') || lowerQuery.includes('leave')) {
    return context.exit;
  }

  if (lowerQuery.includes('anomaly') || lowerQuery.includes('alert')) {
    return context.anomalies
      ? `There are ${context.anomalies} active anomalies. Highest-priority interventions are highlighted in the operator panel.`
      : 'No critical anomalies are active right now. The venue is stable.';
  }

  return `FlowSync is tracking live density at ${context.overallDensity}% with predicted load ${context.predictedDensity}%. ${context.recommendations}`;
}

/**
 * Retrieves AI response using Google Gemini API with fallback to pattern-based response.
 * Sends venue context and user query to Gemini for nuanced advice.
 * Falls back to generateContextualFallback on API error.
 *
 * @param {string} userQuery - User query string
 * @returns {Promise<string>} AI response (max 90 words from Gemini, or fallback response)
 */
async function getAIResponse(userQuery) {
  if (!model) {
    return generateContextualFallback(userQuery);
  }

  const context = buildAIContext();
  const prompt = [
    'You are FlowSync, a venue intelligence assistant for a 50,000+ capacity venue.',
    `Current density: ${context.overallDensity}%`,
    `Predicted density: ${context.predictedDensity}%`,
    `Active anomalies: ${context.anomalies}`,
    `Exit guidance: ${context.exit}`,
    `Recommendations: ${context.recommendations}`,
    'Respond in under 90 words with operationally useful advice.',
    `User query: ${userQuery}`,
  ].join('\n');

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    googleServices.cloudLogger.logWarning('Gemini request failed', { error: error.message });
    return generateContextualFallback(userQuery);
  }
}

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

/**
 * GET /health
 * System health check endpoint. Returns basic status and simulation state.
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    simulationTime,
    mode: isSimulationRunning ? 'live' : 'paused',
  });
});

app.use('/health-check', createHealthRouter(googleServices));
app.get('/health/services', async (_req, res) => {
  const lastCheck = new Date().toISOString();
  const checks = await Promise.all([
    googleServices.storageService.healthCheck(),
    googleServices.tasksService.healthCheck(),
    Promise.resolve({ connected: googleServices.pubSubService.isEnabled() }),
    Promise.resolve({ connected: googleServices.cloudMonitoring.isCloudMonitoringEnabled() }),
    Promise.resolve({ connected: googleServices.cloudLogger.isCloudLoggingEnabled() }),
  ]);

  const services = {
    storage: checks[0],
    tasks: checks[1],
    pubsub: checks[2],
    monitoring: checks[3],
    logging: checks[4],
  };
  const healthy = Object.values(services).every((item) => item.connected === true);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    lastCheck,
    services,
  });
});
app.use('/api/base', apiRouter);
app.use('/api/storage', createStorageRouter(googleServices.storageService));
app.use('/api/tasks', createTasksRouter(googleServices.tasksService));
app.use('/api/events', createEventsRouter(googleServices.pubSubService));

/**
 * GET /api/zones
 * Returns all zones with current density and status data.
 */
app.get('/api/zones', (req, res) => {
  res.json({
    zones,
    count: zones.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/heatmap
 * Returns simplified zone data optimized for heatmap visualization.
 */
app.get('/api/heatmap', (req, res) => {
  res.json({
    generatedAt: new Date().toISOString(),
    zones: zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      angle: zone.angle,
      radius: zone.radius,
      density: zone.density,
      predicted_density: zone.predicted_density,
      pressure: zone.pressure,
      type: zone.type,
    })),
  });
});

/**
 * GET /api/anomalies
 * Returns currently detected anomalies with severity and category information.
 */
app.get('/api/anomalies', (req, res) => {
  res.json({
    anomalies: lastAnomalies,
    count: lastAnomalies.length,
  });
});

/**
 * GET /api/dashboard
 * Returns comprehensive dashboard with metrics, anomalies, clusters, and recommendations.
 * Cached for performance.
 */
app.get('/api/dashboard', (req, res) => {
  const cacheKey = 'dashboard';
  const cached = cacheManager.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  const dashboard = buildDashboard();
  cacheManager.set(cacheKey, dashboard);
  return res.json(dashboard);
});

/**
 * GET /api/zones/:id
 * Returns detailed zone data including neighbors and historical density.
 */
app.get('/api/zones/:id', (req, res) => {
  const zone = getZone(req.params.id);
  if (!zone) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  const history = zoneHistory.get(zone.id) || [];
  return res.json({
    ...zone,
    history,
    neighbors: getNeighbors(zone).map((neighbor) => ({
      id: neighbor.id,
      name: neighbor.name,
      density: Math.round(neighbor.density * 100),
      pressure: neighbor.pressure,
    })),
  });
});

/**
 * POST /api/route
 * Calculates optimal route using A* algorithm with specified preference.
 * Body: { fromZoneId, destinationType, preference? }
 */
app.post('/api/route', validateRouteRequest, validationErrorHandler, (req, res) => {
  const { fromZoneId, destinationType, preference } = req.body;

  if (!fromZoneId || !destinationType) {
    return res.status(400).json({
      error: 'Missing required fields: fromZoneId, destinationType',
    });
  }

  const routingResult = findOptimalRoute(fromZoneId, destinationType, preference || 'balanced');

  if (!routingResult) {
    return res.status(404).json({ error: 'No route found' });
  }

  const routeDetails = routingResult.route.map((zoneId) => getZone(zoneId));
  const estimatedTime = calculateEstimatedTime(routingResult.route, false);
  const futureTime = calculateEstimatedTime(routingResult.route, true);
  googleServices.pubSubService
    .publishMessage('user-routes', {
      fromZoneId,
      destinationType,
      routeLength: routingResult.route.length,
      confidence: routingResult.confidence,
      timestamp: new Date().toISOString(),
    })
    .catch((error) => googleServices.cloudLogger.logWarning('route pubsub publish failed', { error: error.message }));

  return res.json({
    route: routingResult.route,
    routeDetails,
    destination: routingResult.destination,
    estimatedTime,
    predictedTime: futureTime,
    score: routingResult.score,
    confidence: routingResult.confidence,
    zones: routingResult.route.length,
  });
});

/**
 * POST /api/time-analysis
 * Analyzes "Move Now" vs "Wait & Travel Later" options for a route.
 * Body: { route: [zoneIds] }
 */
app.post('/api/time-analysis', (req, res) => {
  const { route } = req.body;

  if (!route || !Array.isArray(route)) {
    return res.status(400).json({ error: 'Invalid route format' });
  }

  return res.json(analyzeTimeOptions(route));
});

/**
 * GET /api/exit-strategy
 * Returns current exit strategy based on exit zone density.
 */
app.get('/api/exit-strategy', (req, res) => {
  res.json(getExitStrategy());
});

/**
 * POST /api/ai-chat
 * Sends user query to Gemini AI with venue context. Falls back to pattern-based response.
 * Body: { message: string }
 */
app.post('/api/ai-chat', validateChatRequest, validationErrorHandler, async (req, res) => {
  const response = await getAIResponse(req.body.message);
  return res.json({
    response,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/stats
 * Returns summary statistics and publishes metrics to Cloud Monitoring and Pub/Sub.
 */
app.get('/api/stats', (req, res) => {
  const dashboard = buildDashboard();
  googleServices.cloudMonitoring
    .recordMetric(
      'custom.googleapis.com/crowdflow/zones_in_critical',
      dashboard.stats.highPressureZones
    )
    .catch((error) => googleServices.cloudLogger.logWarning('cloud monitoring metric write failed', { error: error.message }));

  googleServices.pubSubService
    .publishMessage('metrics-export', {
      overallDensity: dashboard.stats.overallDensity,
      predictedDensity: dashboard.stats.predictedDensity,
      highPressureZones: dashboard.stats.highPressureZones,
      timestamp: new Date().toISOString(),
    })
    .catch((error) => googleServices.cloudLogger.logWarning('metrics pubsub publish failed', { error: error.message }));

  res.json({
    overallDensity: dashboard.stats.overallDensity,
    predictedDensity: dashboard.stats.predictedDensity,
    highPressureZones: dashboard.stats.highPressureZones,
    activeAnomalies: dashboard.stats.activeAnomalies,
    avgQueueTime: dashboard.stats.averageQueueTime,
    simulationTime,
    totalZones: zones.length,
    mode: dashboard.status,
  });
});

/**
 * POST /api/simulation
 * Starts or stops the live simulation.
 * Body: { running: boolean }
 */
app.post('/api/simulation', adminRouteAuth, (req, res) => {
  if (typeof req.body.running !== 'boolean') {
    return res.status(400).json({ error: 'running must be a boolean field' });
  }
  isSimulationRunning = Boolean(req.body.running);
  return res.json({
    running: isSimulationRunning,
    simulationTime,
  });
});

/**
 * POST /api/trigger-event-end
 * Injects an event surge into the simulation to test anomaly detection.
 * Increases exit and zone densities to simulate end-of-event crowd movement.
 */
app.post('/api/trigger-event-end', adminRouteAuth, (req, res) => {
  eventPulse = clamp(eventPulse + 0.85, 0, 1.2);

  zones.forEach((zone) => {
    if (zone.type === 'exit') {
      zone.density = clamp(zone.density + 0.18);
    } else if (zone.ring !== 'outer') {
      zone.density = clamp(zone.density + 0.08);
    }
  });

  res.json({
    message: 'Event surge injected into simulation',
    eventPulse,
  });
});

/**
 * POST /api/reset
 * Resets the simulation to its initial state.
 */
app.post('/api/reset', adminRouteAuth, (req, res) => {
  initializeStadium();
  res.json({
    message: 'Simulation reset successfully',
    status: 'ok',
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use(errorHandler);

/**
 * Starts the FlowSync server and begins simulation loop.
 * Initializes the stadium and sets up 1.5-second update intervals.
 *
 * @returns {Object} Node HTTP server instance
 */
function start() {
  googleServices.cloudLogger.logInfo('Starting FlowSync server', { port: PORT, host: HOST });

  try {
    initializeStadium();
  } catch (error) {
    googleServices.cloudLogger.logError('Failed to initialize simulation state during startup', error, {
      port: PORT,
      host: HOST,
    });
    throw error;
  }

  const server = app.listen(PORT, HOST, () => {
    // Guard against duplicate startup invocations in tests or hot-reload-like runtimes.
    if (simulationInterval) {
      clearInterval(simulationInterval);
    }
    simulationInterval = setInterval(() => {
      updateSimulation();
    }, SIMULATION_CONFIG.updateInterval);

    googleServices.cloudLogger.logInfo(`FlowSync live at http://${HOST}:${PORT}`, { port: PORT, host: HOST });
  });

  server.on('error', (error) => {
    googleServices.cloudLogger.logError('Server startup failed', error, { port: PORT, host: HOST });
    if (require.main === module) {
      process.exit(1);
    }
  });

  return server;
}

if (require.main === module) {
  try {
    start();
  } catch {
    process.exit(1);
  }
}

module.exports = { app, start, initializeStadium, googleServices };
