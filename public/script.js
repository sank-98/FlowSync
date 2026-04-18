// ================================================================
// FLOWSYNC — PHASE 3 HARDENED FRONTEND (PART 1)
// Core setup, state, utilities, data model, and service helpers
// ================================================================

(() => {
  'use strict';

  // -------------------- CONFIG --------------------
  const CONFIG = Object.freeze({
    APP_NAME: 'FlowSync',
    VERSION: '3.0.0',
    API_BASE: window.location.origin,
    TICK_MS: 2000,
    CLOCK_MS: 1000,
    HISTORY_POINTS: 30,
    ENABLE_GOOGLE_SERVICES: false, // toggle when analytics/services are integrated
    GOOGLE: {
      measurementId: '', // example: G-XXXXXXX
      projectId: '',
      region: 'us-central1',
    },
  });

  // -------------------- LOGGING --------------------
  const log = Object.freeze({
    info: (...args) => console.info('[FlowSync]', ...args),
    warn: (...args) => console.warn('[FlowSync]', ...args),
    error: (...args) => console.error('[FlowSync]', ...args),
  });

  // -------------------- SECURITY / A11Y HELPERS --------------------
  function sanitizeText(text) {
    if (window.FlowSyncSecurity?.sanitizeText) {
      return window.FlowSyncSecurity.sanitizeText(text);
    }
    return String(text).replace(/[<>&'"]/g, '');
  }

  function announceA11y(message) {
    if (window.FlowSyncA11y?.announce) {
      window.FlowSyncA11y.announce(message);
    }
  }

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  // -------------------- STATE --------------------
  const state = {
    zones: [],
    dashboard: null,
    selectedRoute: [],
    selectedZoneId: null,
    routeResult: null,
    routeTiming: null,
    updateTimer: null,
    clockTimer: null,
    showFlow: false,
    showPredicted: false,
    showHeatmap: true,
    whatIfMode: false,
    whatIfFactor: 0,
    timeSlider: 0,
    prevMetrics: {},
    simulationTime: 0,
    isSimulationRunning: true,
    eventPulse: 0,
  };

  // -------------------- DOM HELPERS --------------------
  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  // -------------------- VISUAL HELPERS --------------------
  function densityColor(density) {
    if (density >= 0.82) return '#ef4444';
    if (density >= 0.64) return '#f97316';
    if (density >= 0.42) return '#eab308';
    return '#10b981';
  }

  function zoneRadius(zone) {
    if (zone.ring === 'outer') return 36;
    if (zone.ring === 'mid') return 40;
    if (zone.ring === 'inner') return 46;
    return 50;
  }

  function projectZone(zone) {
    const cx = 500;
    const cy = 370;
    const orbitX = zone.radius * 310;
    const orbitY = zone.radius * 200;
    return {
      x: cx + Math.cos(zone.angle) * orbitX,
      y: cy + Math.sin(zone.angle) * orbitY,
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // -------------------- MOCK DATA FACTORY --------------------
  function generateHistory(points = CONFIG.HISTORY_POINTS) {
    const history = [];
    for (let i = 0; i < points; i += 1) {
      history.push(Math.random() * 0.5 + 0.2);
    }
    return history;
  }

  function buildMockZones() {
    return [
      // ===== OUTER RING (8 zones) =====
      { id: 'z1', name: 'North Entrance', type: 'corridor', ring: 'outer', angle: 0, radius: 0.3, density: 0.45, predicted_density: 0.52, prev_density: 0.4, queue_time: 5, velocity: 1.2, pressure: 'medium', cluster: 'outer-entry', neighbors: ['z2', 'z8', 'z14'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z2', name: 'NE Corridor', type: 'corridor', ring: 'outer', angle: Math.PI / 4, radius: 0.3, density: 0.38, predicted_density: 0.45, prev_density: 0.35, queue_time: 4, velocity: 1.3, pressure: 'low', cluster: 'outer-walkway', neighbors: ['z1', 'z3', 'z13'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z3', name: 'East Entrance', type: 'entry', ring: 'outer', angle: Math.PI / 2, radius: 0.3, density: 0.55, predicted_density: 0.62, prev_density: 0.5, queue_time: 8, velocity: 0.9, pressure: 'high', cluster: 'outer-entry', neighbors: ['z2', 'z4', 'z11'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z4', name: 'SE Corridor', type: 'corridor', ring: 'outer', angle: (3 * Math.PI) / 4, radius: 0.3, density: 0.42, predicted_density: 0.5, prev_density: 0.38, queue_time: 6, velocity: 1.1, pressure: 'medium', cluster: 'outer-walkway', neighbors: ['z3', 'z5', 'z12'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z5', name: 'South Exit', type: 'exit', ring: 'outer', angle: Math.PI, radius: 0.3, density: 0.75, predicted_density: 0.82, prev_density: 0.7, queue_time: 18, velocity: 0.4, pressure: 'critical', cluster: 'outer-exit', neighbors: ['z4', 'z6', 'z13'], history: generateHistory(), anomaly: { id: 'z5-bottleneck', category: 'bottleneck', severity: 7, status: 'critical', message: 'Exit congestion detected' }, severity: 7 },
      { id: 'z6', name: 'SW Corridor', type: 'corridor', ring: 'outer', angle: (5 * Math.PI) / 4, radius: 0.3, density: 0.35, predicted_density: 0.4, prev_density: 0.32, queue_time: 3, velocity: 1.4, pressure: 'low', cluster: 'outer-walkway', neighbors: ['z5', 'z7', 'z15'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z7', name: 'West Entrance', type: 'entry', ring: 'outer', angle: (3 * Math.PI) / 2, radius: 0.3, density: 0.48, predicted_density: 0.55, prev_density: 0.44, queue_time: 7, velocity: 1.0, pressure: 'medium', cluster: 'outer-entry', neighbors: ['z6', 'z8', 'z16'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z8', name: 'NW Corridor', type: 'corridor', ring: 'outer', angle: (7 * Math.PI) / 4, radius: 0.3, density: 0.4, predicted_density: 0.48, prev_density: 0.37, queue_time: 5, velocity: 1.2, pressure: 'low', cluster: 'outer-walkway', neighbors: ['z7', 'z1', 'z9'], history: generateHistory(), anomaly: null, severity: 0 },

      // ===== MID RING (8 zones) =====
      { id: 'z9', name: 'Food Court North', type: 'food', ring: 'mid', angle: Math.PI / 8, radius: 0.5, density: 0.62, predicted_density: 0.7, prev_density: 0.58, queue_time: 12, velocity: 0.8, pressure: 'high', cluster: 'mid-food', neighbors: ['z8', 'z10', 'z1'], history: generateHistory(), anomaly: { id: 'z9-queue', category: 'queue_buildup', severity: 6, status: 'elevated', message: 'Peak hour congestion' }, severity: 6 },
      { id: 'z10', name: 'Restroom Block East', type: 'restroom', ring: 'mid', angle: (3 * Math.PI) / 8, radius: 0.5, density: 0.32, predicted_density: 0.38, prev_density: 0.28, queue_time: 7, velocity: 1.2, pressure: 'low', cluster: 'mid-restroom', neighbors: ['z9', 'z11', 'z3'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z11', name: 'Retail Zone', type: 'walkway', ring: 'mid', angle: (5 * Math.PI) / 8, radius: 0.5, density: 0.58, predicted_density: 0.65, prev_density: 0.54, queue_time: 10, velocity: 0.9, pressure: 'high', cluster: 'mid-walkway', neighbors: ['z10', 'z12', 'z3'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z12', name: 'Medical Wing South', type: 'medical', ring: 'mid', angle: (7 * Math.PI) / 8, radius: 0.5, density: 0.22, predicted_density: 0.28, prev_density: 0.18, queue_time: 3, velocity: 1.8, pressure: 'low', cluster: 'mid-medical', neighbors: ['z11', 'z13', 'z4'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z13', name: 'Lounge South', type: 'lounge', ring: 'mid', angle: (9 * Math.PI) / 8, radius: 0.5, density: 0.28, predicted_density: 0.35, prev_density: 0.25, queue_time: 4, velocity: 2.0, pressure: 'low', cluster: 'mid-lounge', neighbors: ['z12', 'z14', 'z5'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z14', name: 'Admin Center', type: 'walkway', ring: 'mid', angle: (11 * Math.PI) / 8, radius: 0.5, density: 0.35, predicted_density: 0.42, prev_density: 0.32, queue_time: 5, velocity: 1.5, pressure: 'low', cluster: 'mid-walkway', neighbors: ['z13', 'z15', 'z1'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z15', name: 'Food Court West', type: 'food', ring: 'mid', angle: (13 * Math.PI) / 8, radius: 0.5, density: 0.52, predicted_density: 0.6, prev_density: 0.48, queue_time: 11, velocity: 0.85, pressure: 'medium', cluster: 'mid-food', neighbors: ['z14', 'z16', 'z6'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z16', name: 'Restroom Block West', type: 'restroom', ring: 'mid', angle: (15 * Math.PI) / 8, radius: 0.5, density: 0.3, predicted_density: 0.36, prev_density: 0.27, queue_time: 6, velocity: 1.3, pressure: 'low', cluster: 'mid-restroom', neighbors: ['z15', 'z9', 'z7'], history: generateHistory(), anomaly: null, severity: 0 },

      // ===== INNER RING (8 zones) =====
      { id: 'z17', name: 'VIP Lounge Prime', type: 'lounge', ring: 'inner', angle: 0, radius: 0.7, density: 0.25, predicted_density: 0.32, prev_density: 0.22, queue_time: 2, velocity: 2.2, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z18', 'z24', 'z1'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z18', name: 'Executive Lounge', type: 'lounge', ring: 'inner', angle: Math.PI / 4, radius: 0.7, density: 0.2, predicted_density: 0.28, prev_density: 0.18, queue_time: 1, velocity: 2.5, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z17', 'z19', 'z2'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z19', name: 'Premium Lounge East', type: 'lounge', ring: 'inner', angle: Math.PI / 2, radius: 0.7, density: 0.22, predicted_density: 0.3, prev_density: 0.2, queue_time: 2, velocity: 2.3, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z18', 'z20', 'z3'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z20', name: 'Sports Lounge', type: 'lounge', ring: 'inner', angle: (3 * Math.PI) / 4, radius: 0.7, density: 0.28, predicted_density: 0.35, prev_density: 0.25, queue_time: 3, velocity: 2.0, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z19', 'z21', 'z4'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z21', name: 'Premium Lounge South', type: 'lounge', ring: 'inner', angle: Math.PI, radius: 0.7, density: 0.19, predicted_density: 0.26, prev_density: 0.17, queue_time: 1, velocity: 2.4, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z20', 'z22', 'z5'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z22', name: 'Observation Deck', type: 'lounge', ring: 'inner', angle: (5 * Math.PI) / 4, radius: 0.7, density: 0.24, predicted_density: 0.31, prev_density: 0.21, queue_time: 2, velocity: 2.1, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z21', 'z23', 'z6'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z23', name: 'Business Lounge', type: 'lounge', ring: 'inner', angle: (3 * Math.PI) / 2, radius: 0.7, density: 0.21, predicted_density: 0.29, prev_density: 0.19, queue_time: 1, velocity: 2.3, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z22', 'z24', 'z7'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z24', name: 'Premier Lounge West', type: 'lounge', ring: 'inner', angle: (7 * Math.PI) / 4, radius: 0.7, density: 0.26, predicted_density: 0.33, prev_density: 0.23, queue_time: 3, velocity: 2.0, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z23', 'z17', 'z8'], history: generateHistory(), anomaly: null, severity: 0 },

      // ===== CORE/STAGE ZONES (4 zones) =====
      { id: 'z25', name: 'Main Stage', type: 'walkway', ring: 'core', angle: 0, radius: 0.9, density: 0.88, predicted_density: 0.92, prev_density: 0.85, queue_time: 0, velocity: 0.2, pressure: 'critical', cluster: 'core-stage', neighbors: ['z26', 'z27', 'z17'], history: generateHistory(), anomaly: { id: 'z25-event', category: 'event_zone', severity: 9, status: 'critical', message: 'Active event - high density expected' }, severity: 9 },
      { id: 'z26', name: 'Sound Control', type: 'walkway', ring: 'core', angle: Math.PI / 2, radius: 0.9, density: 0.15, predicted_density: 0.2, prev_density: 0.12, queue_time: 0, velocity: 0.5, pressure: 'low', cluster: 'core-ops', neighbors: ['z25', 'z27', 'z19'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z27', name: 'Production Hub', type: 'walkway', ring: 'core', angle: Math.PI, radius: 0.9, density: 0.12, predicted_density: 0.18, prev_density: 0.1, queue_time: 0, velocity: 0.6, pressure: 'low', cluster: 'core-ops', neighbors: ['z26', 'z28', 'z21'], history: generateHistory(), anomaly: null, severity: 0 },
      { id: 'z28', name: 'Emergency Center', type: 'medical', ring: 'core', angle: (3 * Math.PI) / 2, radius: 0.9, density: 0.08, predicted_density: 0.12, prev_density: 0.06, queue_time: 0, velocity: 0.8, pressure: 'low', cluster: 'core-medical', neighbors: ['z27', 'z25', 'z23'], history: generateHistory(), anomaly: null, severity: 0 },
    ];
  }

  function enrichZone(zone) {
    const ringCapacity = zone.ring === 'outer' ? 420 : zone.ring === 'mid' ? 260 : 160;
    const density = clamp(zone.density, 0, 1);
    const predicted = clamp(zone.predicted_density, 0, 1);
    const velocity = safeNumber(zone.velocity, 0);

    return {
      ...zone,
      density,
      predicted_density: predicted,
      history: Array.isArray(zone.history) ? zone.history : [],
      congestion_score: Math.round(density * 52 + predicted * 28 + safeNumber(zone.queue_time, 0) * 1.2 + (1 - velocity) * 20),
      occupancy: Math.round(density * ringCapacity),
      confidence: 0.82 + Math.random() * 0.14,
      flow_rate: Math.round(velocity * (1 - density) * ringCapacity * 0.09),
      trend_rate: predicted - density,
    };
  }

  // -------------------- SERVICES --------------------
  async function fetchZones() {
    const mockZones = buildMockZones();
    state.zones = mockZones.map(enrichZone);
    return state.zones;
  }

  function computeClusterSnapshot(ring, label, velocity) {
    const zones = state.zones.filter((z) => z.ring === ring);
    const divisor = Math.max(zones.length, 1);
    const density = Math.round((zones.reduce((s, z) => s + z.density, 0) / divisor) * 100);
    const predicted = Math.round((zones.reduce((s, z) => s + z.predicted_density, 0) / divisor) * 100);
    return { label, density, predicted, velocity };
  }

  async function fetchDashboard() {
    const zoneCount = Math.max(state.zones.length, 1);

    const overallDensity = Math.round((state.zones.reduce((sum, z) => sum + z.density, 0) / zoneCount) * 100);
    const predictedDensity = Math.round((state.zones.reduce((sum, z) => sum + z.predicted_density, 0) / zoneCount) * 100);

    const anomalies = state.zones
      .filter((z) => z.anomaly)
      .map((z) => ({
        zoneName: z.name,
        category: z.anomaly.category,
        severity: z.anomaly.severity,
        status: z.anomaly.status,
        message: z.anomaly.message,
        autoResolutionMinutes: Math.max(2, Math.round(10 - z.anomaly.severity / 1.5)),
      }))
      .sort((a, b) => b.severity - a.severity);

    state.dashboard = {
      stats: {
        overallDensity,
        predictedDensity,
        activeAnomalies: anomalies.length,
        routingLatencyMs: 48,
      },
      generatedAt: new Date().toISOString(),
      status: state.isSimulationRunning ? 'live' : 'paused',
      exitStrategy: {
        recommendation:
          predictedDensity > 80
            ? 'Exit wave building. Hold position briefly. Relief expected in 6m.'
            : predictedDensity > 64
              ? 'Exits busy but manageable. Use alternate sectors. ~3m relief.'
              : 'Exits healthy. Start moving now using lowest-density outer ring.',
      },
      simulationTime: state.simulationTime,
      anomalies,
      clusters: [
        computeClusterSnapshot('outer', 'Outer Ring (Entries/Exits)', 1.1),
        computeClusterSnapshot('mid', 'Mid Ring (Services)', 1.05),
        computeClusterSnapshot('inner', 'Inner Ring (Lounges)', 2.1),
        computeClusterSnapshot('core', 'Core/Stage', 0.5),
      ],
      recommendations: [
        `⚡ PRIORITY: Main Stage at ${Math.round((state.zones.find((z) => z.id === 'z25')?.predicted_density || 0) * 100)}% density - manage entry flow`,
        `🚪 South Exit: ${Math.round((state.zones.find((z) => z.id === 'z5')?.density || 0) * 100)}% capacity - redirect traffic to North Entrance`,
        `🍕 Food service peak: ${Math.round((state.zones.filter((z) => z.type === 'food').reduce((s, z) => s + z.density, 0) / Math.max(state.zones.filter((z) => z.type === 'food').length, 1)) * 100)}% - consider additional counters`,
        '🏥 Medical zones stable - full capacity available',
        '📊 Inner lounges operating optimally - recommend VIP routing',
        '🎯 Optimal route: Choose zone → lowest-density path → destination',
      ],
    };

    return state.dashboard;
  }

  async function fetchZoneDetails(zoneId) {
    return state.zones.find((z) => z.id === zoneId) || {};
  }

  async function getOptimalRoute(fromZoneId, destinationType) {
    const destMap = {
      food: state.zones.filter((z) => z.type === 'food').map((z) => z.id),
      restroom: state.zones.filter((z) => z.type === 'restroom').map((z) => z.id),
      exit: state.zones.filter((z) => z.type === 'exit').map((z) => z.id),
      lounge: state.zones.filter((z) => z.type === 'lounge').map((z) => z.id),
      medical: state.zones.filter((z) => z.type === 'medical').map((z) => z.id),
    };

    const options = destMap[destinationType] || [state.zones[state.zones.length - 1]?.id].filter(Boolean);
    const destId = options[Math.floor(Math.random() * options.length)];
    const fromZone = state.zones.find((z) => z.id === fromZoneId);
    const destZone = state.zones.find((z) => z.id === destId);

    const route = fromZone && destZone ? [fromZoneId, ...fromZone.neighbors.slice(0, 2), destId] : [fromZoneId, destId].filter(Boolean);

    return {
      route,
      destination: { name: destZone?.name || 'Destination' },
      routeDetails: route.map((id) => state.zones.find((z) => z.id === id)).filter(Boolean),
      estimatedTime: Math.floor(Math.random() * 5) + 6,
      predictedTime: Math.floor(Math.random() * 8) + 10,
      score: Math.floor(Math.random() * 20) + 75,
      confidence: 0.85 + Math.random() * 0.15,
    };
  }

  async function getTimeAnalysis() {
    return {
      goNow: { description: `Moving now: ${Math.floor(Math.random() * 5) + 6} min to destination` },
      waitThen: { description: `Wait 3-5 min: ${Math.floor(Math.random() * 5) + 4} min to destination` },
      recommendation: Math.random() > 0.3 ? 'now' : 'wait',
    };
  }

  // expose for rest of file sections
  window.FlowSyncCore = {
    CONFIG,
    state,
    log,
    sanitizeText,
    announceA11y,
    densityColor,
    zoneRadius,
    projectZone,
    byId,
    setText,
    fetchZones,
    fetchDashboard,
    fetchZoneDetails,
    getOptimalRoute,
    getTimeAnalysis,
    clamp,
  };
})();
// ================================================================
// FLOWSYNC — PHASE 3 HARDENED FRONTEND (PART 2)
// Rendering, interactions, simulation loop, initialization
// ================================================================

(() => {
  'use strict';

  const {
    CONFIG,
    state,
    log,
    sanitizeText,
    announceA11y,
    densityColor,
    zoneRadius,
    projectZone,
    byId,
    setText,
    fetchZones,
    fetchDashboard,
    fetchZoneDetails,
    getOptimalRoute,
    getTimeAnalysis,
    clamp,
  } = window.FlowSyncCore || {};

  if (!state) {
    console.error('[FlowSync] Core module not found. Ensure Part 1 loads before Part 2.');
    return;
  }

  // -------------------- CHAT SERVICE --------------------
  async function getAIResponse(message) {
    const msg = String(message || '').toLowerCase();
    const stage = state.zones.find((z) => z.id === 'z25');
    const exit = state.zones.find((z) => z.id === 'z5');
    const foodCourts = state.zones.filter((z) => z.type === 'food');

    if (msg.includes('main') || msg.includes('stage') || msg.includes('event')) {
      return `🎪 Main Stage at CRITICAL density (${Math.round((stage?.density || 0) * 100)}%). Active event in progress. Recommend staggered entry via north, managed exit strategy. Auto-resolution in ~30 min.`;
    }
    if (msg.includes('exit') || msg.includes('south') || msg.includes('bottleneck')) {
      return `⚠️ South Exit congestion (${Math.round((exit?.density || 0) * 100)}% capacity, ${exit?.queue_time || 0}min wait). Route through North Entrance or East Entrance. Relief expected in ~8min.`;
    }
    if (msg.includes('food') || msg.includes('restaurant') || msg.includes('court')) {
      if (!foodCourts.length) return '🍕 Food zones are currently unavailable.';
      const best = foodCourts.reduce((a, b) => (a.density < b.density ? a : b));
      const worst = foodCourts.reduce((a, b) => (a.density > b.density ? a : b));
      return `🍕 ${best.name} is least crowded (${Math.round(best.density * 100)}%, ${best.queue_time}m wait). ${worst.name} is most crowded (${Math.round(worst.density * 100)}%).`;
    }
    if (msg.includes('lounge') || msg.includes('vip') || msg.includes('premium')) {
      const lounges = state.zones.filter((z) => z.type === 'lounge');
      if (!lounges.length) return '🛋️ Lounge data not available right now.';
      const best = lounges.reduce((a, b) => (a.density < b.density ? a : b));
      return `🛋️ Lounges are stable. Best option: ${best.name} (${Math.round(best.density * 100)}%).`;
    }
    if (msg.includes('crowd') || msg.includes('density') || msg.includes('capacity')) {
      const overall = Math.round((state.zones.reduce((s, z) => s + z.density, 0) / Math.max(state.zones.length, 1)) * 100);
      return `📊 Venue overall density is ${overall}%. Use Smart Routing for optimized paths.`;
    }
    if (msg.includes('route') || msg.includes('path') || msg.includes('way')) {
      return '🎯 Use Smart Routing panel: select current zone and destination to generate the best path.';
    }
    if (msg.includes('recommend') || msg.includes('suggest')) {
      return '💡 Top actions: manage Main Stage inflow, rebalance South Exit traffic, and distribute service queues.';
    }

    return `📡 ${CONFIG.APP_NAME} monitoring ${state.zones.length} active zones. Ask about routes, exits, food, lounges, or density.`;
  }

  // -------------------- SIMULATION ACTIONS --------------------
  async function triggerEventEnd() {
    state.eventPulse = Math.min(1.2, state.eventPulse + 0.85);

    state.zones.forEach((zone) => {
      if (zone.type === 'exit') {
        zone.density = clamp(zone.density + 0.18, 0, 1);
      } else if (zone.ring !== 'outer') {
        zone.density = clamp(zone.density + 0.08, 0, 1);
      }
    });

    return { success: true };
  }

  async function resetSimulation() {
    state.simulationTime = 0;
    state.eventPulse = 0;

    state.zones.forEach((zone) => {
      zone.density = clamp(zone.density * 0.6 + 0.2, 0, 1);
      zone.predicted_density = clamp(zone.predicted_density * 0.6 + 0.2, 0, 1);
    });

    return { success: true };
  }

  async function setSimulationState(running) {
    state.isSimulationRunning = Boolean(running);
    return { success: true };
  }

  // -------------------- METRICS --------------------
  function animateMetric(elId, newValue) {
    const el = byId(elId);
    if (!el) return;

    const prev = state.prevMetrics[elId];
    if (prev === newValue) return;

    el.textContent = newValue;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');

    state.prevMetrics[elId] = newValue;
  }

  function renderMetrics() {
    if (!state.dashboard) return;

    const { stats, generatedAt, status, exitStrategy, simulationTime } = state.dashboard;

    animateMetric('overall-density', `${stats.overallDensity}%`);
    animateMetric('predicted-density', `${stats.predictedDensity}%`);
    animateMetric('active-anomalies', `${stats.activeAnomalies}`);
    animateMetric('routing-latency', `${stats.routingLatencyMs}ms`);

    setText('system-status', status === 'live' ? '🔴 Live' : '⏸️ Paused');
    setText('last-sync', new Date(generatedAt).toLocaleTimeString());
    setText('sim-time', `Time ${Math.floor(simulationTime)}s`);
    setText('exit-recommend', exitStrategy.recommendation);
    setText('anomaly-count', `${stats.activeAnomalies} alerts`);
    setText('total-zones', `${state.zones.length} zones`);

    const simToggleEl = byId('sim-toggle');
    if (simToggleEl) simToggleEl.checked = status === 'live';
  }

  function updateClock() {
    const clockEl = byId('system-clock');
    if (!clockEl) return;

    clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  // -------------------- ZONE DROPDOWN --------------------
  function populateZoneDropdown(zones) {
    const sel = byId('current-zone');
    if (!sel) return;

    const prev = sel.value;
    sel.innerHTML = '<option value="">Select live position</option>';

    zones.forEach((z) => {
      const opt = document.createElement('option');
      opt.value = z.id;
      opt.textContent = `${z.name} · ${z.type}`;
      sel.appendChild(opt);
    });

    if (zones.some((z) => z.id === prev)) sel.value = prev;
  }

  // -------------------- RIGHT PANEL --------------------
  function renderAnomalies() {
    const container = byId('anomaly-list');
    if (!container) return;

    const anomalies = state.dashboard?.anomalies || [];
    if (!anomalies.length) {
      container.innerHTML = '<div class="empty-state">✅ No active anomalies. Venue is stable.</div>';
      return;
    }

    container.innerHTML = anomalies
      .map(
        (a) => `
      <div class="alert-item severity-${sanitizeText(a.status)}">
        <strong>⚠️ ${sanitizeText(a.zoneName)} · ${sanitizeText(a.category).replace(/_/g, ' ')}</strong>
        <div class="alert-meta">Severity ${safeSeverity(a.severity)}/10 · auto-resolve ${Math.max(0, a.autoResolutionMinutes)}m</div>
        <div class="alert-msg">${sanitizeText(a.message)}</div>
      </div>
    `
      )
      .join('');
  }

  function safeSeverity(v) {
    return Math.max(0, Math.min(10, Number(v) || 0));
  }

  function renderClusters() {
    const container = byId('cluster-list');
    if (!container) return;

    const clusters = state.dashboard?.clusters || [];
    if (!clusters.length) {
      container.innerHTML = '<div class="empty-state">No cluster data available.</div>';
      return;
    }

    container.innerHTML = clusters
      .map(
        (c) => `
      <div class="cluster-item">
        <strong>📍 ${sanitizeText(c.label)}</strong>
        <div class="cluster-stats">Density ${c.density}% → ${c.predicted}% predicted · Velocity ${c.velocity}m/s</div>
        <div class="progress-bar" style="margin-top: 6px;">
          <div class="progress-fill" style="width:${c.density}%;background:${densityColor(c.density / 100)};"></div>
        </div>
      </div>
    `
      )
      .join('');
  }

  function renderRecommendations() {
    const container = byId('recommendation-list');
    if (!container) return;

    const recs = state.dashboard?.recommendations || [];
    if (!recs.length) {
      container.innerHTML = '<div class="empty-state">No recommendations at this time.</div>';
      return;
    }

    container.innerHTML = recs.map((r) => `<div class="rec-item">${sanitizeText(r)}</div>`).join('');
  }

  function renderFacilities() {
    const container = byId('facility-list');
    if (!container) return;

    if (!state.zones.length) {
      container.innerHTML = '<div class="empty-state">Loading facilities...</div>';
      return;
    }

    const facilityTypes = ['food', 'restroom', 'medical', 'lounge'];
    const typeEmoji = { food: '🍕', restroom: '🚻', medical: '🏥', lounge: '🛋️' };

    const facilitiesHtml = facilityTypes
      .map((type) => {
        const facilities = state.zones.filter((z) => z.type === type);
        if (!facilities.length) return '';

        const best = facilities.reduce((a, b) => (a.density < b.density ? a : b));
        const worst = facilities.reduce((a, b) => (a.density > b.density ? a : b));

        return facilities
          .map((f) => {
            const pct = Math.round(f.density * 100);
            const fillColor = densityColor(f.density);
            const isBest = f.id === best.id && facilities.length > 1;
            const isWorst = f.id === worst.id && facilities.length > 1;

            return `
              <div class="facility-item">
                <div class="facility-header">
                  <span class="facility-name">${typeEmoji[type]} ${sanitizeText(f.name)}</span>
                  <span class="facility-wait text-mono">${f.queue_time}m</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${pct}%;background:${fillColor};"></div>
                </div>
                <div class="facility-density">${pct}% occupied</div>
                ${isBest ? '<div class="facility-suggestion">✨ Least crowded</div>' : ''}
                ${isWorst ? '<div class="facility-suggestion warning">⚠️ Most crowded</div>' : ''}
              </div>
            `;
          })
          .join('');
      })
      .join('');

    container.innerHTML = facilitiesHtml || '<div class="empty-state">No facility data.</div>';
  }

  // -------------------- ROUTE PANEL --------------------
  function renderRoutePanel() {
    const routeContent = byId('route-content');
    const routeConfidence = byId('route-confidence');
    const timeContent = byId('time-content');
    const timeRec = byId('time-recommendation');

    if (!routeContent || !routeConfidence || !timeContent || !timeRec) return;

    if (!state.routeResult) {
      routeContent.innerHTML = '<span class="muted text-sm">📍 Select a zone and destination to compute optimal path.</span>';
      routeConfidence.textContent = '--';
      routeConfidence.className = 'badge badge-ghost';
    } else {
      const names = state.routeResult.routeDetails.map((z) => z.name);
      const pathHtml = names
        .map((n, i) => {
          const color = i === 0 ? '#3b82f6' : i === names.length - 1 ? '#10b981' : '#94a3b8';
          return `<span style="color:${color}">${sanitizeText(n)}</span>`;
        })
        .join(' ➜ ');

      routeContent.innerHTML = `
        <div class="route-step">
          <strong>🎯 ${sanitizeText(state.routeResult.destination.name)}</strong>
          <div class="route-path-text">${pathHtml}</div>
        </div>
        <div class="route-step">
          <strong>📈 Travel Forecast</strong>
          <div>${state.routeResult.estimatedTime}m now · ${state.routeResult.predictedTime}m predicted · score ${state.routeResult.score}/100</div>
        </div>
      `;

      const conf = Math.round(state.routeResult.confidence * 100);
      routeConfidence.textContent = `${conf}%`;
      routeConfidence.className = `badge ${conf > 85 ? 'badge-emerald' : conf > 70 ? 'badge-cyan' : 'badge-amber'}`;
    }

    if (!state.routeTiming) {
      timeContent.innerHTML = '<span class="muted text-sm">Route timing analysis will appear here.</span>';
      timeRec.textContent = '--';
      timeRec.className = 'badge badge-emerald';
    } else {
      timeContent.innerHTML = `
        <div class="route-step">
          <strong>⚡ Move Now</strong>
          <div>${sanitizeText(state.routeTiming.goNow.description)}</div>
        </div>
        <div class="route-step">
          <strong>⏳ Wait</strong>
          <div>${sanitizeText(state.routeTiming.waitThen.description)}</div>
        </div>
      `;

      const isNow = state.routeTiming.recommendation === 'now';
      timeRec.textContent = isNow ? '⚡ Move Now' : '⏳ Wait';
      timeRec.className = `badge ${isNow ? 'badge-emerald' : 'badge-amber'}`;
    }
  }

  // -------------------- SVG HELPERS --------------------
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  // -------------------- STADIUM RENDER --------------------
  function renderStadium() {
    const svg = byId('stadium-svg');
    if (!svg) return;

    svg.innerHTML = '';

    const defs = svgEl('defs');

    const routeGrad = svgEl('linearGradient', { id: 'routeGradient', x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
    routeGrad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#3b82f6' }));
    routeGrad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#00d4ff' }));
    defs.appendChild(routeGrad);

    const filter = svgEl('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    filter.appendChild(svgEl('feGaussianBlur', { stdDeviation: '4', result: 'coloredBlur' }));
    const feMerge = svgEl('feMerge');
    feMerge.appendChild(svgEl('feMergeNode', { in: 'coloredBlur' }));
    feMerge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
    filter.appendChild(feMerge);
    defs.appendChild(filter);

    svg.appendChild(defs);

    svg.appendChild(svgEl('ellipse', { cx: 500, cy: 370, rx: 420, ry: 272, class: 'stadium-shell' }));
    svg.appendChild(svgEl('ellipse', { cx: 500, cy: 370, rx: 330, ry: 215, class: 'ring-path' }));
    svg.appendChild(svgEl('ellipse', { cx: 500, cy: 370, rx: 240, ry: 156, class: 'ring-path' }));
    svg.appendChild(svgEl('ellipse', { cx: 500, cy: 370, rx: 138, ry: 90, class: 'stage-floor' }));

    const coreText = svgEl('text', {
      x: 500, y: 365, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 900, fill: '#00d4ff', opacity: 0.5,
      'font-family': 'Inter, sans-serif',
    });
    coreText.textContent = 'ARENA CORE';
    svg.appendChild(coreText);

    const subText = svgEl('text', {
      x: 500, y: 393, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: '#64748b',
      'font-family': 'Inter, sans-serif',
    });
    subText.textContent = `Live crowd intelligence — ${state.zones.length} zones active`;
    svg.appendChild(subText);

    if (state.selectedRoute.length > 1) {
      const points = state.selectedRoute
        .map((id) => state.zones.find((z) => z.id === id))
        .filter(Boolean)
        .map(projectZone)
        .map((p) => `${p.x},${p.y}`)
        .join(' ');

      svg.appendChild(svgEl('polyline', {
        points, fill: 'none', stroke: 'rgba(0,212,255,0.15)', 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }));
      svg.appendChild(svgEl('polyline', { points, class: 'route-polyline' }));
    }

    state.zones.forEach((zone) => {
      const pt = projectZone(zone);
      const r = zoneRadius(zone);
      const density = state.showPredicted ? zone.predicted_density : zone.density;
      const color = densityColor(density);
      const isSelected = state.selectedZoneId === zone.id;
      const isOnRoute = state.selectedRoute.includes(zone.id);
      const hasAnomaly = zone.anomaly && zone.anomaly.severity >= 6;

      const group = svgEl('g', {
        class: `stadium-zone${isSelected ? ' is-selected' : ''}`,
        transform: `translate(${pt.x}, ${pt.y})`,
        tabindex: '0',
        role: 'button',
        'aria-label': `${zone.name} ${Math.round(density * 100)} percent`,
      });

      if (hasAnomaly) {
        const pulseRing = svgEl('circle', { cx: 0, cy: 0, r: r + 8, fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.4 });
        pulseRing.style.animation = 'pulse 1.5s ease-in-out infinite';
        group.appendChild(pulseRing);
      }

      group.appendChild(svgEl('circle', { cx: 0, cy: 0, r: r + 10, fill: color, opacity: state.showHeatmap ? 0.12 : 0.05 }));

      if (isOnRoute) {
        group.appendChild(svgEl('circle', { cx: 0, cy: 0, r: r + 5, fill: 'none', stroke: '#00d4ff', 'stroke-width': 2.5, opacity: 0.7 }));
      }

      group.appendChild(svgEl('circle', {
        cx: 0, cy: 0, r, fill: 'rgba(10,14,26,0.85)', class: 'zone-core', stroke: color, 'stroke-width': isSelected ? 3 : 2,
        filter: isSelected ? 'url(#glow)' : 'none',
      }));

      group.appendChild(svgEl('circle', { cx: 0, cy: 0, r: r - 2, fill: color, opacity: density * 0.18 }));

      const nameText = svgEl('text', { x: 0, y: -4, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 700, fill: '#e2e8f0', 'font-family': 'Inter, sans-serif' });
      nameText.textContent = zone.name.split(' ')[0];
      group.appendChild(nameText);

      const detailText = svgEl('text', { x: 0, y: 9, 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 600, fill: '#94a3b8', 'font-family': 'JetBrains Mono, monospace' });
      detailText.textContent = state.showPredicted ? `${Math.round(zone.predicted_density * 100)}%p` : `${Math.round(zone.density * 100)}%`;
      group.appendChild(detailText);

      const emojiText = svgEl('text', { x: 0, y: 21, 'text-anchor': 'middle', 'font-size': 9 });
      emojiText.textContent = ({ entry: '📍', exit: '🚪', food: '🍕', restroom: '🚻', walkway: '🛤', medical: '🏥', lounge: '🛋', corridor: '🛤', core: '⭐' })[zone.type] || '';
      group.appendChild(emojiText);

      group.addEventListener('click', () => selectZone(zone.id));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectZone(zone.id);
        }
      });

      svg.appendChild(group);
    });
  }

  // -------------------- SPOTLIGHT --------------------
  async function selectZone(zoneId) {
    state.selectedZoneId = zoneId;
    const zoneSelect = byId('current-zone');
    if (zoneSelect) zoneSelect.value = zoneId;

    renderStadium();

    try {
      const zone = await fetchZoneDetails(zoneId);
      renderSpotlight(zone);
      announceA11y(`Selected ${zone.name}`);
    } catch (err) {
      log.error('Zone details fetch failed:', err);
    }
  }

  function renderSpotlight(zone) {
    setText('spotlight-title', `${zone.name} — ${String(zone.type || '').toUpperCase()}`);

    const gridEl = byId('spotlight-grid');
    if (gridEl) {
      const pct = Math.round((zone.density || 0) * 100);
      const pred = Math.round((zone.predicted_density || 0) * 100);

      gridEl.innerHTML = `
        <div class="spotlight-stat"><span>Live Density</span><strong style="color:${densityColor(zone.density || 0)}">${pct}%</strong></div>
        <div class="spotlight-stat"><span>Predicted</span><strong style="color:${densityColor(zone.predicted_density || 0)}">${pred}%</strong></div>
        <div class="spotlight-stat"><span>Queue Time</span><strong>${zone.queue_time || 0}m wait</strong></div>
        <div class="spotlight-stat"><span>Flow Velocity</span><strong>${Number(zone.velocity || 0).toFixed(2)} m/s</strong></div>
      `;
    }

    renderSparkline(zone.history || []);

    const anomalyInfo = zone.anomaly
      ? `⚠️ ${String(zone.anomaly.category).replace(/_/g, ' ')} (severity ${zone.anomaly.severity}/10)`
      : '✅ No anomaly';

    const summaryEl = byId('spotlight-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `<strong>${sanitizeText(String(zone.pressure || 'low').toUpperCase())} Pressure</strong> · Cluster ${sanitizeText(zone.cluster || 'n/a')} · ${sanitizeText(anomalyInfo)} · Neighbors: ${(zone.neighbors || []).length}`;
    }
  }

  function renderSparkline(history) {
    const container = byId('sparkline-container');
    if (!container) return;

    if (!Array.isArray(history) || history.length < 2) {
      container.innerHTML = '<div style="color:#94a3b8;font-size:12px;text-align:center;padding:10px;">Insufficient data</div>';
      return;
    }

    const w = 280;
    const h = 40;
    const max = Math.max(...history, 1);
    const step = w / (history.length - 1);
    const points = history.map((v, i) => `${i * step},${h - (v / max) * (h - 4)}`);
    const linePoints = points.join(' ');
    const areaPoints = `0,${h} ${linePoints} ${(history.length - 1) * step},${h}`;

    container.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;">
        <defs>
          <linearGradient id="spkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="${areaPoints}" fill="url(#spkGrad)"/>
        <polyline points="${linePoints}" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="${(history.length - 1) * step}" cy="${h - (history[history.length - 1] / max) * (h - 4)}" r="3" fill="#00d4ff" opacity="0.9"/>
      </svg>
    `;
  }

  // -------------------- CHAT --------------------
  function addChatMessage(role, message) {
    const container = byId('chat-messages');
    if (!container) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.innerHTML = sanitizeText(message).replace(/\n/g, '<br>');
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;

    announceA11y(`${role} message added`);
  }

  async function handleChatSubmit() {
    const input = byId('chat-input');
    if (!input) return;

    const msg = input.value.trim();
    if (!msg) return;

    addChatMessage('user', msg);
    input.value = '';

    try {
      const response = await getAIResponse(msg);
      addChatMessage('assistant', response);
    } catch (err) {
      log.error(err);
      addChatMessage('assistant', '⚠️ Copilot temporarily unavailable. Routing engine is still active.');
    }
  }

  // -------------------- ROUTING --------------------
  async function handleGetRoute() {
    const from = byId('current-zone')?.value;
    const dest = byId('destination')?.value;
    const pref = byId('preference')?.value;

    if (!from || !dest) {
      window.alert('📍 Select your current zone and destination first.');
      return;
    }

    try {
      state.routeResult = await getOptimalRoute(from, dest, pref);
      state.routeTiming = await getTimeAnalysis(state.routeResult.route);
      state.selectedRoute = state.routeResult.route;

      renderRoutePanel();
      renderStadium();

      addChatMessage(
        'assistant',
        `🎯 Path Ready! Route to ${state.routeResult.destination.name} in ~${state.routeResult.estimatedTime} min (${Math.round(
          state.routeResult.confidence * 100
        )}% confidence). ${
          state.routeTiming.recommendation === 'now' ? '⚡ Move now for best timing.' : '⏳ Consider waiting briefly.'
        }`
      );
    } catch (err) {
      log.error(err);
      window.alert('❌ Route generation failed. Try again.');
    }
  }

  // -------------------- MAP TOGGLES --------------------
  function setMapBadgeState(btn, active, labelOn, labelOff) {
    if (!btn) return;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
    btn.textContent = active ? labelOn : labelOff;
  }

  function setupMapToggles() {
    const heatBtn = byId('toggle-heatmap');
    const flowBtn = byId('toggle-flow');
    const predBtn = byId('toggle-predicted');

    if (heatBtn) {
      heatBtn.addEventListener('click', () => {
        state.showHeatmap = !state.showHeatmap;
        setMapBadgeState(heatBtn, state.showHeatmap, '🌡️ Heatmap: ON', '🌡️ Heatmap: OFF');
        renderStadium();
      });
    }

    if (flowBtn) {
      flowBtn.addEventListener('click', () => {
        state.showFlow = !state.showFlow;
        setMapBadgeState(flowBtn, state.showFlow, '🌊 Flow: ON', '🌊 Flow: OFF');
        renderStadium();
      });
    }

    if (predBtn) {
      predBtn.addEventListener('click', () => {
        state.showPredicted = !state.showPredicted;
        setMapBadgeState(predBtn, state.showPredicted, '🔮 Predicted: ON', '🔮 Predicted: OFF');
        renderStadium();
      });
    }
  }

  // -------------------- TIME SLIDER --------------------
  function setupTimeSlider() {
    const slider = byId('time-slider');
    const label = byId('time-slider-value');
    if (!slider) return;

    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      state.timeSlider = Number.isFinite(val) ? val : 0;

      if (!label) return;

      if (val === 0) {
        label.textContent = '📍 NOW';
        label.style.color = '#00d4ff';
      } else if (val < 0) {
        label.textContent = `⏮️ ${val}m`;
        label.style.color = '#94a3b8';
      } else {
        label.textContent = `⏭️ +${val}m`;
        label.style.color = '#a855f7';
      }
    });
  }

  // -------------------- WHAT-IF --------------------
  function setupWhatIf() {
    const cb = byId('whatif-checkbox');
    const toggle = byId('whatif-toggle');
    if (!cb) return;

    cb.addEventListener('change', () => {
      state.whatIfMode = cb.checked;
      if (toggle) {
        toggle.textContent = cb.checked ? '⚡ What-If: ACTIVE' : '⚡ What-If: OFF';
        toggle.classList.toggle('active', cb.checked);
      }
      renderStadium();
    });
  }

  // -------------------- REFRESH LOOP --------------------
  function advanceSimulationFrame() {
    if (!state.isSimulationRunning) return;

    state.simulationTime += 1.5;

    state.zones.forEach((zone) => {
      zone.prev_density = zone.density;

      const neighborAvg = zone.neighbors.length
        ? zone.neighbors.reduce((s, nId) => {
            const n = state.zones.find((z) => z.id === nId);
            return s + (n ? n.density : 0);
          }, 0) / zone.neighbors.length
        : zone.density;

      const drift = (Math.random() - 0.5) * 0.02;
      const networkPull = (neighborAvg - zone.density) * 0.08;

      zone.density = clamp(zone.density + drift + networkPull, 0.05, 0.95);
      zone.predicted_density = clamp(zone.density + (Math.random() - 0.5) * 0.1, 0.05, 0.95);
      zone.trend_rate = zone.density - zone.prev_density;

      if (zone.history.length >= CONFIG.HISTORY_POINTS) zone.history.shift();
      zone.history.push(zone.density);
    });
  }

  async function refreshDashboard() {
    try {
      advanceSimulationFrame();

      // Fresh mock reset by design (can be replaced by API later)
      await fetchZones();
      await fetchDashboard();

      populateZoneDropdown(state.zones);
      renderMetrics();
      renderAnomalies();
      renderClusters();
      renderRecommendations();
      renderFacilities();
      renderStadium();

      if (state.selectedZoneId) {
        const zone = state.zones.find((z) => z.id === state.selectedZoneId);
        if (zone) renderSpotlight(zone);
      }
    } catch (err) {
      log.error('Dashboard refresh failed:', err);
    }
  }

  // -------------------- EVENT BINDINGS --------------------
  function setupEventListeners() {
    byId('get-route-btn')?.addEventListener('click', handleGetRoute);

    byId('current-zone')?.addEventListener('change', (e) => {
      if (e.target?.value) selectZone(e.target.value);
    });

    byId('send-chat-btn')?.addEventListener('click', handleChatSubmit);

    byId('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleChatSubmit();
    });

    byId('trigger-event-btn')?.addEventListener('click', async () => {
      await triggerEventEnd();
      addChatMessage('assistant', '🚨 Event surge injected! Watch outer ring and exits for rapid changes.');
      await refreshDashboard();
    });

    byId('sim-reset-btn')?.addEventListener('click', async () => {
      await resetSimulation();
      state.selectedRoute = [];
      state.routeResult = null;
      state.routeTiming = null;
      renderRoutePanel();
      addChatMessage('assistant', '🔄 Simulation reset. All 28 zones normalized.');
      await refreshDashboard();
    });

    byId('sim-toggle')?.addEventListener('change', async (e) => {
      await setSimulationState(e.target.checked);
      await refreshDashboard();
    });

    setupMapToggles();
    setupTimeSlider();
    setupWhatIf();
  }

  // -------------------- GOOGLE SERVICES PLACEHOLDERS --------------------
  function initGoogleServices() {
    if (!CONFIG.ENABLE_GOOGLE_SERVICES) return;
    log.info('Google Services enabled with config:', CONFIG.GOOGLE);
    // Future:
    // - gtag / GA4 events
    // - Firebase App Check
    // - Cloud Logging / PubSub telemetry
  }

  function emitTelemetry(eventName, payload = {}) {
    if (!CONFIG.ENABLE_GOOGLE_SERVICES) return;
    log.info('Telemetry:', eventName, payload);
  }

  // -------------------- INIT --------------------
  async function init() {
    try {
      window.FlowSyncA11y?.setupKeyboardShortcuts?.();

      setupEventListeners();
      renderRoutePanel();

      updateClock();
      state.clockTimer = setInterval(updateClock, CONFIG.CLOCK_MS);

      await refreshDashboard();

      addChatMessage(
        'assistant',
        '🚀 <strong>FlowSync Command Center LIVE</strong><br>✅ 28 zones active across 5 rings<br>🎯 Click zones on map to inspect<br>📊 Dashboard shows real-time metrics<br>💬 Ask me about zones, routes, or facilities'
      );

      state.updateTimer = setInterval(refreshDashboard, CONFIG.TICK_MS);

      initGoogleServices();
      emitTelemetry('app_initialized', { version: CONFIG.VERSION });

      announceA11y('FlowSync initialized');
      log.info('Initialization complete');
    } catch (err) {
      log.error('Initialization failed:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  // Test hooks (safe read-only)
  window.FlowSyncApp = Object.freeze({
    state,
    refreshDashboard,
    handleGetRoute,
    handleChatSubmit,
    selectZone,
    renderMetrics,
    renderStadium,
  });
})();
