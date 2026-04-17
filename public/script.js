// ================================================================
// FLOWSYNC — DARK FUTURISTIC CONTROL CENTER
// Complete Enhanced Frontend with Full Mock Data (No Backend Required)
// ================================================================

const _API_BASE = window.location.origin;

// -------------------- STATE --------------------
const state = {
  zones: [],
  dashboard: null,
  selectedRoute: [],
  selectedZoneId: null,
  routeResult: null,
  routeTiming: null,
  updateTimer: null,
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

function announceForScreenReader(message) {
  const announcer = document.getElementById('sr-announcer');
  if (!announcer) return;
  announcer.textContent = '';
  window.setTimeout(() => {
    announcer.textContent = message;
  }, 30);
}

// -------------------- COLORS --------------------
function densityColor(density) {
  if (density >= 0.82) return '#ef4444';
  if (density >= 0.64) return '#f97316';
  if (density >= 0.42) return '#eab308';
  return '#10b981';
}

// -------------------- PROJECTION --------------------
function zoneRadius(zone) {
  if (zone.ring === 'outer') return 36;
  if (zone.ring === 'mid') return 40;
  if (zone.ring === 'inner') return 46;
  return 50;
}

function projectZone(zone) {
  const cx = 500, cy = 370;
  const orbitX = zone.radius * 310;
  const orbitY = zone.radius * 200;
  return {
    x: cx + Math.cos(zone.angle) * orbitX,
    y: cy + Math.sin(zone.angle) * orbitY,
  };
}

// -------------------- COMPLETE MOCK ZONES DATA WITH HISTORY --------------------
async function fetchZones() {
  const generateHistory = () => {
    const history = [];
    for (let i = 0; i < 30; i++) {
      history.push(Math.random() * 0.5 + 0.2);
    }
    return history;
  };

  const mockZones = [
    // ===== OUTER RING (8 zones) =====
    { id: 'z1', name: 'North Entrance', type: 'corridor', ring: 'outer', angle: 0, radius: 0.3, density: 0.45, predicted_density: 0.52, prev_density: 0.40, queue_time: 5, velocity: 1.2, pressure: 'medium', cluster: 'outer-entry', neighbors: ['z2', 'z8', 'z14'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z2', name: 'NE Corridor', type: 'corridor', ring: 'outer', angle: Math.PI/4, radius: 0.3, density: 0.38, predicted_density: 0.45, prev_density: 0.35, queue_time: 4, velocity: 1.3, pressure: 'low', cluster: 'outer-walkway', neighbors: ['z1', 'z3', 'z13'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z3', name: 'East Entrance', type: 'entry', ring: 'outer', angle: Math.PI/2, radius: 0.3, density: 0.55, predicted_density: 0.62, prev_density: 0.50, queue_time: 8, velocity: 0.9, pressure: 'high', cluster: 'outer-entry', neighbors: ['z2', 'z4', 'z11'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z4', name: 'SE Corridor', type: 'corridor', ring: 'outer', angle: 3*Math.PI/4, radius: 0.3, density: 0.42, predicted_density: 0.50, prev_density: 0.38, queue_time: 6, velocity: 1.1, pressure: 'medium', cluster: 'outer-walkway', neighbors: ['z3', 'z5', 'z12'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z5', name: 'South Exit', type: 'exit', ring: 'outer', angle: Math.PI, radius: 0.3, density: 0.75, predicted_density: 0.82, prev_density: 0.70, queue_time: 18, velocity: 0.4, pressure: 'critical', cluster: 'outer-exit', neighbors: ['z4', 'z6', 'z13'], history: generateHistory(), anomaly: { id: 'z5-bottleneck', category: 'bottleneck', severity: 7, status: 'critical', message: 'Exit congestion detected' }, severity: 7 },
    { id: 'z6', name: 'SW Corridor', type: 'corridor', ring: 'outer', angle: 5*Math.PI/4, radius: 0.3, density: 0.35, predicted_density: 0.40, prev_density: 0.32, queue_time: 3, velocity: 1.4, pressure: 'low', cluster: 'outer-walkway', neighbors: ['z5', 'z7', 'z15'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z7', name: 'West Entrance', type: 'entry', ring: 'outer', angle: 3*Math.PI/2, radius: 0.3, density: 0.48, predicted_density: 0.55, prev_density: 0.44, queue_time: 7, velocity: 1.0, pressure: 'medium', cluster: 'outer-entry', neighbors: ['z6', 'z8', 'z16'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z8', name: 'NW Corridor', type: 'corridor', ring: 'outer', angle: 7*Math.PI/4, radius: 0.3, density: 0.40, predicted_density: 0.48, prev_density: 0.37, queue_time: 5, velocity: 1.2, pressure: 'low', cluster: 'outer-walkway', neighbors: ['z7', 'z1', 'z9'], history: generateHistory(), anomaly: null, severity: 0 },

    // ===== MID RING (8 zones) =====
    { id: 'z9', name: 'Food Court North', type: 'food', ring: 'mid', angle: Math.PI/8, radius: 0.5, density: 0.62, predicted_density: 0.70, prev_density: 0.58, queue_time: 12, velocity: 0.8, pressure: 'high', cluster: 'mid-food', neighbors: ['z8', 'z10', 'z1'], history: generateHistory(), anomaly: { id: 'z9-queue', category: 'queue_buildup', severity: 6, status: 'elevated', message: 'Peak hour congestion' }, severity: 6 },
    { id: 'z10', name: 'Restroom Block East', type: 'restroom', ring: 'mid', angle: 3*Math.PI/8, radius: 0.5, density: 0.32, predicted_density: 0.38, prev_density: 0.28, queue_time: 7, velocity: 1.2, pressure: 'low', cluster: 'mid-restroom', neighbors: ['z9', 'z11', 'z3'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z11', name: 'Retail Zone', type: 'walkway', ring: 'mid', angle: 5*Math.PI/8, radius: 0.5, density: 0.58, predicted_density: 0.65, prev_density: 0.54, queue_time: 10, velocity: 0.9, pressure: 'high', cluster: 'mid-walkway', neighbors: ['z10', 'z12', 'z3'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z12', name: 'Medical Wing South', type: 'medical', ring: 'mid', angle: 7*Math.PI/8, radius: 0.5, density: 0.22, predicted_density: 0.28, prev_density: 0.18, queue_time: 3, velocity: 1.8, pressure: 'low', cluster: 'mid-medical', neighbors: ['z11', 'z13', 'z4'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z13', name: 'Lounge South', type: 'lounge', ring: 'mid', angle: 9*Math.PI/8, radius: 0.5, density: 0.28, predicted_density: 0.35, prev_density: 0.25, queue_time: 4, velocity: 2.0, pressure: 'low', cluster: 'mid-lounge', neighbors: ['z12', 'z14', 'z5'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z14', name: 'Admin Center', type: 'walkway', ring: 'mid', angle: 11*Math.PI/8, radius: 0.5, density: 0.35, predicted_density: 0.42, prev_density: 0.32, queue_time: 5, velocity: 1.5, pressure: 'low', cluster: 'mid-walkway', neighbors: ['z13', 'z15', 'z1'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z15', name: 'Food Court West', type: 'food', ring: 'mid', angle: 13*Math.PI/8, radius: 0.5, density: 0.52, predicted_density: 0.60, prev_density: 0.48, queue_time: 11, velocity: 0.85, pressure: 'medium', cluster: 'mid-food', neighbors: ['z14', 'z16', 'z6'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z16', name: 'Restroom Block West', type: 'restroom', ring: 'mid', angle: 15*Math.PI/8, radius: 0.5, density: 0.30, predicted_density: 0.36, prev_density: 0.27, queue_time: 6, velocity: 1.3, pressure: 'low', cluster: 'mid-restroom', neighbors: ['z15', 'z9', 'z7'], history: generateHistory(), anomaly: null, severity: 0 },

    // ===== INNER RING (8 zones) =====
    { id: 'z17', name: 'VIP Lounge Prime', type: 'lounge', ring: 'inner', angle: 0, radius: 0.7, density: 0.25, predicted_density: 0.32, prev_density: 0.22, queue_time: 2, velocity: 2.2, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z18', 'z24', 'z1'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z18', name: 'Executive Lounge', type: 'lounge', ring: 'inner', angle: Math.PI/4, radius: 0.7, density: 0.20, predicted_density: 0.28, prev_density: 0.18, queue_time: 1, velocity: 2.5, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z17', 'z19', 'z2'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z19', name: 'Premium Lounge East', type: 'lounge', ring: 'inner', angle: Math.PI/2, radius: 0.7, density: 0.22, predicted_density: 0.30, prev_density: 0.20, queue_time: 2, velocity: 2.3, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z18', 'z20', 'z3'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z20', name: 'Sports Lounge', type: 'lounge', ring: 'inner', angle: 3*Math.PI/4, radius: 0.7, density: 0.28, predicted_density: 0.35, prev_density: 0.25, queue_time: 3, velocity: 2.0, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z19', 'z21', 'z4'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z21', name: 'Premium Lounge South', type: 'lounge', ring: 'inner', angle: Math.PI, radius: 0.7, density: 0.19, predicted_density: 0.26, prev_density: 0.17, queue_time: 1, velocity: 2.4, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z20', 'z22', 'z5'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z22', name: 'Observation Deck', type: 'lounge', ring: 'inner', angle: 5*Math.PI/4, radius: 0.7, density: 0.24, predicted_density: 0.31, prev_density: 0.21, queue_time: 2, velocity: 2.1, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z21', 'z23', 'z6'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z23', name: 'Business Lounge', type: 'lounge', ring: 'inner', angle: 3*Math.PI/2, radius: 0.7, density: 0.21, predicted_density: 0.29, prev_density: 0.19, queue_time: 1, velocity: 2.3, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z22', 'z24', 'z7'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z24', name: 'Premier Lounge West', type: 'lounge', ring: 'inner', angle: 7*Math.PI/4, radius: 0.7, density: 0.26, predicted_density: 0.33, prev_density: 0.23, queue_time: 3, velocity: 2.0, pressure: 'low', cluster: 'inner-lounge', neighbors: ['z23', 'z17', 'z8'], history: generateHistory(), anomaly: null, severity: 0 },

    // ===== CORE/STAGE ZONES (4 zones) =====
    { id: 'z25', name: 'Main Stage', type: 'walkway', ring: 'core', angle: 0, radius: 0.9, density: 0.88, predicted_density: 0.92, prev_density: 0.85, queue_time: 0, velocity: 0.2, pressure: 'critical', cluster: 'core-stage', neighbors: ['z26', 'z27', 'z17'], history: generateHistory(), anomaly: { id: 'z25-event', category: 'event_zone', severity: 9, status: 'critical', message: 'Active event - high density expected' }, severity: 9 },
    { id: 'z26', name: 'Sound Control', type: 'walkway', ring: 'core', angle: Math.PI/2, radius: 0.9, density: 0.15, predicted_density: 0.20, prev_density: 0.12, queue_time: 0, velocity: 0.5, pressure: 'low', cluster: 'core-ops', neighbors: ['z25', 'z27', 'z19'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z27', name: 'Production Hub', type: 'walkway', ring: 'core', angle: Math.PI, radius: 0.9, density: 0.12, predicted_density: 0.18, prev_density: 0.10, queue_time: 0, velocity: 0.6, pressure: 'low', cluster: 'core-ops', neighbors: ['z26', 'z28', 'z21'], history: generateHistory(), anomaly: null, severity: 0 },
    { id: 'z28', name: 'Emergency Center', type: 'medical', ring: 'core', angle: 3*Math.PI/2, radius: 0.9, density: 0.08, predicted_density: 0.12, prev_density: 0.06, queue_time: 0, velocity: 0.8, pressure: 'low', cluster: 'core-medical', neighbors: ['z27', 'z25', 'z23'], history: generateHistory(), anomaly: null, severity: 0 },
  ];

  state.zones = mockZones.map((zone) => ({
    ...zone,
    history: zone.history,
    congestion_score: Math.round(zone.density * 52 + zone.predicted_density * 28 + zone.queue_time * 1.2 + (1 - zone.velocity) * 20),
    occupancy: Math.round(zone.density * (zone.ring === 'outer' ? 420 : zone.ring === 'mid' ? 260 : 160)),
    confidence: 0.82 + Math.random() * 0.14,
    flow_rate: Math.round(zone.velocity * (1 - zone.density) * (zone.ring === 'outer' ? 420 : zone.ring === 'mid' ? 260 : 160) * 0.09),
    trend_rate: zone.predicted_density - zone.density,
  }));
  
  return mockZones;
}

// -------------------- DASHBOARD --------------------
async function fetchDashboard() {
  const overallDensity = Math.round(
    state.zones.reduce((sum, z) => sum + z.density, 0) / Math.max(state.zones.length, 1) * 100
  );
  const predictedDensity = Math.round(
    state.zones.reduce((sum, z) => sum + z.predicted_density, 0) / Math.max(state.zones.length, 1) * 100
  );
  const anomalies = state.zones.filter(z => z.anomaly).map(z => ({
    zoneName: z.name,
    category: z.anomaly.category,
    severity: z.anomaly.severity,
    status: z.anomaly.status,
    message: z.anomaly.message,
    autoResolutionMinutes: Math.max(2, Math.round(10 - z.anomaly.severity / 15)),
  })).sort((a, b) => b.severity - a.severity);

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
      recommendation: predictedDensity > 80 
        ? 'Exit wave building. Hold position briefly. Relief expected in 6m.'
        : predictedDensity > 64
        ? 'Exits busy but manageable. Use alternate sectors. ~3m relief.'
        : 'Exits healthy. Start moving now using lowest-density outer ring.',
    },
    simulationTime: state.simulationTime,
    anomalies,
    clusters: [
      { label: 'Outer Ring (Entries/Exits)', density: Math.round(state.zones.filter(z => z.ring === 'outer').reduce((s, z) => s + z.density, 0) / 8 * 100), predicted: Math.round(state.zones.filter(z => z.ring === 'outer').reduce((s, z) => s + z.predicted_density, 0) / 8 * 100), velocity: 1.1 },
      { label: 'Mid Ring (Services)', density: Math.round(state.zones.filter(z => z.ring === 'mid').reduce((s, z) => s + z.density, 0) / 8 * 100), predicted: Math.round(state.zones.filter(z => z.ring === 'mid').reduce((s, z) => s + z.predicted_density, 0) / 8 * 100), velocity: 1.05 },
      { label: 'Inner Ring (Lounges)', density: Math.round(state.zones.filter(z => z.ring === 'inner').reduce((s, z) => s + z.density, 0) / 8 * 100), predicted: Math.round(state.zones.filter(z => z.ring === 'inner').reduce((s, z) => s + z.predicted_density, 0) / 8 * 100), velocity: 2.1 },
      { label: 'Core/Stage', density: Math.round(state.zones.filter(z => z.ring === 'core').reduce((s, z) => s + z.density, 0) / 4 * 100), predicted: Math.round(state.zones.filter(z => z.ring === 'core').reduce((s, z) => s + z.predicted_density, 0) / 4 * 100), velocity: 0.5 },
    ],
    recommendations: [
      `⚡ PRIORITY: Main Stage at ${Math.round(state.zones.find(z => z.id === 'z25').predicted_density * 100)}% density - manage entry flow`,
      `🚪 South Exit: ${Math.round(state.zones.find(z => z.id === 'z5').density * 100)}% capacity - redirect traffic to North Entrance`,
      `🍕 Food service peak: ${Math.round(state.zones.filter(z => z.type === 'food').reduce((s, z) => s + z.density, 0) / 2 * 100)}% - consider additional counters`,
      `🏥 Medical zones stable - full capacity available`,
      `📊 Inner lounges operating optimally - recommend VIP routing`,
      `🎯 Optimal route: Choose zone → lowest-density path → destination`,
    ],
  };
  
  return state.dashboard;
}

async function fetchZoneDetails(zoneId) {
  const zone = state.zones.find((z) => z.id === zoneId);
  return zone || {};
}

async function getOptimalRoute(fromZoneId, destinationType, _preference) {
  const destMap = {
    food: state.zones.filter(z => z.type === 'food').map(z => z.id),
    restroom: state.zones.filter(z => z.type === 'restroom').map(z => z.id),
    exit: state.zones.filter(z => z.type === 'exit').map(z => z.id),
    lounge: state.zones.filter(z => z.type === 'lounge').map(z => z.id),
    medical: state.zones.filter(z => z.type === 'medical').map(z => z.id),
  };
  
  const options = destMap[destinationType] || [state.zones[state.zones.length - 1].id];
  const destId = options[Math.floor(Math.random() * options.length)];
  const destZone = state.zones.find((z) => z.id === destId);
  const fromZone = state.zones.find((z) => z.id === fromZoneId);
  
  const route = fromZone && destZone ? [fromZoneId, ...fromZone.neighbors.slice(0, 2), destId] : [fromZoneId, destId];
  
  return {
    route,
    destination: { name: destZone?.name || 'Destination' },
    routeDetails: route.map(id => state.zones.find(z => z.id === id)).filter(Boolean),
    estimatedTime: Math.floor(Math.random() * 5) + 6,
    predictedTime: Math.floor(Math.random() * 8) + 10,
    score: Math.floor(Math.random() * 20) + 75,
    confidence: 0.85 + Math.random() * 0.15,
  };
}

async function getTimeAnalysis(_route) {
  return {
    goNow: { description: `Moving now: ${Math.floor(Math.random() * 5) + 6} min to destination` },
    waitThen: { description: `Wait 3-5 min: ${Math.floor(Math.random() * 5) + 4} min to destination` },
    recommendation: Math.random() > 0.3 ? 'now' : 'wait',
  };
}

async function getAIResponse(message) {
  const msg = message.toLowerCase();
  const stage = state.zones.find(z => z.id === 'z25');
  const exit = state.zones.find(z => z.id === 'z5');
  const foodCourts = state.zones.filter(z => z.type === 'food');
  
  if (msg.includes('main') || msg.includes('stage') || msg.includes('event')) {
    return `🎪 Main Stage at CRITICAL density (${Math.round(stage.density * 100)}%). Active event in progress. Recommend staggered entry via north, managed exit strategy. Auto-resolution in ~30 min.`;
  }
  if (msg.includes('exit') || msg.includes('south') || msg.includes('bottleneck')) {
    return `⚠️ South Exit congestion (${Math.round(exit.density * 100)}% capacity, ${exit.queue_time}min wait). Route through North Entrance (45% cap) or East (55% cap). Relief in ~8min.`;
  }
  if (msg.includes('food') || msg.includes('restaurant') || msg.includes('court')) {
    const best = foodCourts.reduce((a, b) => a.density < b.density ? a : b);
    const worst = foodCourts.reduce((a, b) => a.density > b.density ? a : b);
    return `🍕 ${best.name} least crowded (${Math.round(best.density * 100)}%, ${best.queue_time}m wait). ${worst.name} at peak (${Math.round(worst.density * 100)}%). Suggest ${best.name} or waiting 8min.`;
  }
  if (msg.includes('lounge') || msg.includes('vip') || msg.includes('premium')) {
    const lounges = state.zones.filter(z => z.type === 'lounge');
    const best = lounges.reduce((a, b) => a.density < b.density ? a : b);
    return `🛋️ All lounges operating optimally. ${best.name} least crowded (${Math.round(best.density * 100)}%). Premium zones recommended for lower-density routing.`;
  }
  if (msg.includes('crowd') || msg.includes('density') || msg.includes('capacity')) {
    const overall = Math.round(state.zones.reduce((s, z) => s + z.density, 0) / state.zones.length * 100);
    return `📊 Stadium at ${overall}% overall density. Outer: 45%, Mid: 50%, Inner: 24%, Core: 88% (event). Distribution balanced except active areas.`;
  }
  if (msg.includes('route') || msg.includes('path') || msg.includes('way')) {
    return `🎯 Optimal routing: Select current zone → lowest-density adjacent zones → destination. System recommends fastest path. Confidence: 92%.`;
  }
  if (msg.includes('recommend') || msg.includes('suggest')) {
    return `💡 Top recommendations: (1) Manage Main Stage entry - event in progress. (2) Redirect 20% from South Exit. (3) Open food lanes. (4) Utilize VIP lounges for flow balancing.`;
  }
  
  return `📡 FlowSync monitoring real-time venue dynamics. ${state.zones.length} zones active, ${state.dashboard?.stats.activeAnomalies || 0} alerts. Routing engine ready. Ask about zones, exits, food, or routes.`;
}

async function triggerEventEnd() {
  state.eventPulse = Math.min(1.2, state.eventPulse + 0.85);
  state.zones.forEach((zone) => {
    if (zone.type === 'exit') {
      zone.density = Math.min(1, zone.density + 0.18);
    } else if (zone.ring !== 'outer') {
      zone.density = Math.min(1, zone.density + 0.08);
    }
  });
  return { success: true };
}

async function resetSimulation() {
  state.simulationTime = 0;
  state.eventPulse = 0;
  state.zones.forEach((zone) => {
    zone.density = zone.density * 0.6 + 0.2;
    zone.predicted_density = zone.predicted_density * 0.6 + 0.2;
  });
  return { success: true };
}

async function setSimulationState(running) {
  state.isSimulationRunning = running;
  return { success: true };
}

// -------------------- ZONE DROPDOWN --------------------
function populateZoneDropdown(zones) {
  const sel = document.getElementById('current-zone');
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

// -------------------- ANIMATED METRICS --------------------
function animateMetric(elId, newValue) {
  const el = document.getElementById(elId);
  if (!el) return;
  const prev = state.prevMetrics[elId];
  if (prev !== newValue) {
    el.textContent = newValue;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    state.prevMetrics[elId] = newValue;
  }
}

function renderMetrics() {
  if (!state.dashboard) return;
  const { stats, generatedAt, status, exitStrategy, simulationTime } = state.dashboard;

  animateMetric('overall-density', `${stats.overallDensity}%`);
  animateMetric('predicted-density', `${stats.predictedDensity}%`);
  animateMetric('active-anomalies', `${stats.activeAnomalies}`);
  animateMetric('routing-latency', `${stats.routingLatencyMs}ms`);

  const statusEl = document.getElementById('system-status');
  if (statusEl) statusEl.textContent = status === 'live' ? '🔴 Live' : '⏸️ Paused';

  const lastSyncEl = document.getElementById('last-sync');
  if (lastSyncEl) lastSyncEl.textContent = new Date(generatedAt).toLocaleTimeString();

  const simTimeEl = document.getElementById('sim-time');
  if (simTimeEl) simTimeEl.textContent = `Time ${Math.floor(simulationTime)}s`;

  const exitRecEl = document.getElementById('exit-recommend');
  if (exitRecEl) exitRecEl.textContent = exitStrategy.recommendation;

  const anomalyCountEl = document.getElementById('anomaly-count');
  if (anomalyCountEl) anomalyCountEl.textContent = `${stats.activeAnomalies} alerts`;

  const simToggleEl = document.getElementById('sim-toggle');
  if (simToggleEl) simToggleEl.checked = status === 'live';

  const totalZonesEl = document.getElementById('total-zones');
  if (totalZonesEl) totalZonesEl.textContent = `${state.zones.length} zones`;
}

// -------------------- LIVE CLOCK --------------------
function updateClock() {
  const el = document.getElementById('system-clock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}

// -------------------- ANOMALIES --------------------
function renderAnomalies() {
  const container = document.getElementById('anomaly-list');
  if (!container) return;
  
  const anomalies = state.dashboard?.anomalies || [];
  if (!anomalies.length) {
    container.innerHTML = '<div class="empty-state">✅ No active anomalies. Venue is stable.</div>';
    return;
  }
  container.innerHTML = anomalies.map((a) => `
    <div class="alert-item severity-${a.status}">
      <strong>⚠️ ${a.zoneName} · ${a.category.replace(/_/g, ' ')}</strong>
      <div class="alert-meta">Severity ${a.severity}/10 · auto-resolve ${a.autoResolutionMinutes}m</div>
      <div class="alert-msg">${a.message}</div>
    </div>
  `).join('');
}

// -------------------- CLUSTERS --------------------
function renderClusters() {
  const container = document.getElementById('cluster-list');
  if (!container) return;
  
  const clusters = state.dashboard?.clusters || [];
  if (!clusters.length) {
    container.innerHTML = '<div class="empty-state">No cluster data available.</div>';
    return;
  }
  container.innerHTML = clusters.map((c) => `
    <div class="cluster-item">
      <strong>📍 ${c.label}</strong>
      <div class="cluster-stats">Density ${c.density}% → ${c.predicted}% predicted · Velocity ${c.velocity}m/s</div>
      <div class="progress-bar" style="margin-top: 6px;">
        <div class="progress-fill" style="width:${c.density}%;background:${densityColor(c.density/100)};"></div>
      </div>
    </div>
  `).join('');
}

// -------------------- RECOMMENDATIONS --------------------
function renderRecommendations() {
  const container = document.getElementById('recommendation-list');
  if (!container) return;
  
  const recs = state.dashboard?.recommendations || [];
  if (!recs.length) {
    container.innerHTML = '<div class="empty-state">No recommendations at this time.</div>';
    return;
  }
  container.innerHTML = recs.map((r) => `<div class="rec-item">${r}</div>`).join('');
}

// -------------------- FACILITY INSIGHTS --------------------
function renderFacilities() {
  const container = document.getElementById('facility-list');
  if (!container) return;
  
  if (!state.zones.length) {
    container.innerHTML = '<div class="empty-state">Loading facilities...</div>';
    return;
  }

  const facilityTypes = ['food', 'restroom', 'medical', 'lounge'];
  const typeEmoji = { food: '🍕', restroom: '🚻', medical: '🏥', lounge: '🛋️' };

  const facilitiesHtml = facilityTypes.map((type) => {
    const facilities = state.zones.filter((z) => z.type === type);
    if (!facilities.length) return '';

    const best = facilities.reduce((a, b) => (a.density < b.density ? a : b));
    const worst = facilities.reduce((a, b) => (a.density > b.density ? a : b));

    return facilities.map((f) => {
      const pct = Math.round(f.density * 100);
      const fillColor = densityColor(f.density);
      const isBest = f.id === best.id && facilities.length > 1;
      const isWorst = f.id === worst.id && facilities.length > 1;

      return `
        <div class="facility-item">
          <div class="facility-header">
            <span class="facility-name">${typeEmoji[type]} ${f.name}</span>
            <span class="facility-wait text-mono">${f.queue_time}m</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%;background:${fillColor};"></div>
          </div>
          <div class="facility-density">${pct}% occupied</div>
          ${isBest ? '<div class="facility-suggestion">✨ Least crowded</div>' : ''}
          ${isWorst && facilities.length > 1 ? '<div class="facility-suggestion warning">⚠️ Most crowded</div>' : ''}
        </div>
      `;
    }).join('');
  }).join('');

  container.innerHTML = facilitiesHtml || '<div class="empty-state">No facility data.</div>';
}

// -------------------- ROUTE PANEL --------------------
function renderRoutePanel() {
  const routeContent = document.getElementById('route-content');
  const routeConfidence = document.getElementById('route-confidence');

  if (!routeContent || !routeConfidence) return;

  if (!state.routeResult) {
    routeContent.innerHTML = '<span class="muted text-sm">📍 Select a zone and destination to compute optimal path.</span>';
    routeConfidence.textContent = '--';
    routeConfidence.className = 'badge badge-ghost';
  } else {
    const names = state.routeResult.routeDetails.map((z) => z.name);
    const pathHtml = names.map((n, i) =>
      `<span style="color:${i === 0 ? '#3b82f6' : i === names.length - 1 ? '#10b981' : '#94a3b8'}">${n}</span>`
    ).join(' ➜ ');

    routeContent.innerHTML = `
      <div class="route-step">
        <strong>🎯 ${state.routeResult.destination.name}</strong>
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

  const timeContent = document.getElementById('time-content');
  const timeRec = document.getElementById('time-recommendation');

  if (!timeContent || !timeRec) return;

  if (!state.routeTiming) {
    timeContent.innerHTML = '<span class="muted text-sm">Route timing analysis will appear here.</span>';
    timeRec.textContent = '--';
    timeRec.className = 'badge badge-emerald';
  } else {
    timeContent.innerHTML = `
      <div class="route-step">
        <strong>⚡ Move Now</strong>
        <div>${state.routeTiming.goNow.description}</div>
      </div>
      <div class="route-step">
        <strong>⏳ Wait</strong>
        <div>${state.routeTiming.waitThen.description}</div>
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

// -------------------- STADIUM RENDERER --------------------
function renderStadium() {
  const svg = document.getElementById('stadium-svg');
  if (!svg) return;
  
  svg.innerHTML = '';

  const defs = svgEl('defs');

  const routeGrad = svgEl('linearGradient', { id: 'routeGradient', x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
  routeGrad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#3b82f6' }));
  routeGrad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#00d4ff' }));
  defs.appendChild(routeGrad);

  const marker = svgEl('marker', {
    id: 'arrowhead', markerWidth: '8', markerHeight: '6', refX: '8', refY: '3', orient: 'auto',
  });
  const arrow = svgEl('polygon', { points: '0 0, 8 3, 0 6', fill: 'rgba(255,255,255,0.15)' });
  marker.appendChild(arrow);
  defs.appendChild(marker);

  const filter = svgEl('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
  const blur = svgEl('feGaussianBlur', { stdDeviation: '4', result: 'coloredBlur' });
  filter.appendChild(blur);
  const feMerge = svgEl('feMerge');
  feMerge.appendChild(svgEl('feMergeNode', { in: 'coloredBlur' }));
  feMerge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
  filter.appendChild(feMerge);
  defs.appendChild(filter);

  svg.appendChild(defs);

  // Stadium rings
  svg.appendChild(svgEl('ellipse', { cx: 500, cy: 370, rx: 420, ry: 272, class: 'stadium-shell' }));
  svg.appendChild(svgEl('ellipse', { cx: 500, cy: 370, rx: 330, ry: 215, class: 'ring-path' }));
  svg.appendChild(svgEl('ellipse', { cx: 500, cy: 370, rx: 240, ry: 156, class: 'ring-path' }));
  svg.appendChild(svgEl('ellipse', { cx: 500, cy: 370, rx: 138, ry: 90, class: 'stage-floor' }));

  const coreText = svgEl('text', {
    x: 500, y: 365, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 900,
    fill: '#00d4ff', opacity: 0.5, 'font-family': 'Inter, sans-serif',
  });
  coreText.textContent = 'ARENA CORE';
  svg.appendChild(coreText);

  const subText = svgEl('text', {
    x: 500, y: 393, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600,
    fill: '#64748b', 'font-family': 'Inter, sans-serif',
  });
  subText.textContent = 'Live crowd intelligence — 28 zones active';
  svg.appendChild(subText);

  // Route polyline
  if (state.selectedRoute.length > 1) {
    const points = state.selectedRoute
      .map((id) => state.zones.find((z) => z.id === id))
      .filter(Boolean)
      .map(projectZone)
      .map((p) => `${p.x},${p.y}`)
      .join(' ');

    svg.appendChild(svgEl('polyline', {
      points,
      fill: 'none',
      stroke: 'rgba(0,212,255,0.15)',
      'stroke-width': 14,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }));

    svg.appendChild(svgEl('polyline', { points, class: 'route-polyline' }));
  }

  // Zone nodes
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
    });

    if (hasAnomaly) {
      const pulseRing = svgEl('circle', {
        cx: 0, cy: 0, r: r + 8,
        fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.4,
      });
      pulseRing.style.animation = 'pulse 1.5s ease-in-out infinite';
      group.appendChild(pulseRing);
    }

    group.appendChild(svgEl('circle', {
      cx: 0, cy: 0, r: r + 10,
      fill: color, opacity: state.showHeatmap ? 0.12 : 0.05,
    }));

    if (isOnRoute) {
      group.appendChild(svgEl('circle', {
        cx: 0, cy: 0, r: r + 5,
        fill: 'none', stroke: '#00d4ff', 'stroke-width': 2.5, opacity: 0.7,
      }));
    }

    group.appendChild(svgEl('circle', {
      cx: 0, cy: 0, r: r,
      fill: 'rgba(10,14,26,0.85)',
      class: 'zone-core',
      stroke: color,
      'stroke-width': isSelected ? 3 : 2,
      filter: isSelected ? 'url(#glow)' : 'none',
    }));

    group.appendChild(svgEl('circle', {
      cx: 0, cy: 0, r: r - 2,
      fill: color, opacity: density * 0.18,
    }));

    const nameText = svgEl('text', {
      x: 0, y: -4, 'text-anchor': 'middle',
      'font-size': 9, 'font-weight': 700,
      fill: '#e2e8f0', 'font-family': 'Inter, sans-serif',
    });
    nameText.textContent = zone.name.split(' ')[0];
    group.appendChild(nameText);

    const detailText = svgEl('text', {
      x: 0, y: 9, 'text-anchor': 'middle',
      'font-size': 8, 'font-weight': 600,
      fill: '#94a3b8', 'font-family': 'JetBrains Mono, monospace',
    });
    const pctLabel = state.showPredicted
      ? `${Math.round(zone.predicted_density * 100)}%p`
      : `${Math.round(zone.density * 100)}%`;
    detailText.textContent = pctLabel;
    group.appendChild(detailText);

    const typeEmojis = { 
      entry: '📍', exit: '🚪', food: '🍕', restroom: '🚻', walkway: '🛤', medical: '🏥', 
      lounge: '🛋', corridor: '🛤', core: '⭐'
    };
    const emojiText = svgEl('text', {
      x: 0, y: 21, 'text-anchor': 'middle', 'font-size': 9,
    });
    emojiText.textContent = typeEmojis[zone.type] || '';
    group.appendChild(emojiText);

    group.addEventListener('click', () => selectZone(zone.id));
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', `${zone.name}, ${Math.round(density * 100)} percent density`);
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectZone(zone.id);
      }
    });
    svg.appendChild(group);
  });
}

// -------------------- ZONE SELECTION --------------------
async function selectZone(zoneId) {
  state.selectedZoneId = zoneId;
  const zoneSelect = document.getElementById('current-zone');
  if (zoneSelect) zoneSelect.value = zoneId;
  const zone = state.zones.find((candidate) => candidate.id === zoneId);
  if (zone) announceForScreenReader(`${zone.name} selected`);
  renderStadium();

  try {
    const selectedZone = await fetchZoneDetails(zoneId);
    renderSpotlight(selectedZone);
  } catch (err) {
    console.error('Zone details fetch failed:', err);
  }
}

// -------------------- ZONE SPOTLIGHT --------------------
function renderSpotlight(zone) {
  const titleEl = document.getElementById('spotlight-title');
  if (titleEl) titleEl.textContent = `${zone.name} — ${zone.type.toUpperCase()}`;

  const gridEl = document.getElementById('spotlight-grid');
  if (gridEl) {
    const pct = Math.round(zone.density * 100);
    const pred = Math.round(zone.predicted_density * 100);

    gridEl.innerHTML = `
      <div class="spotlight-stat">
        <span>Live Density</span>
        <strong style="color:${densityColor(zone.density)}">${pct}%</strong>
      </div>
      <div class="spotlight-stat">
        <span>Predicted</span>
        <strong style="color:${densityColor(zone.predicted_density)}">${pred}%</strong>
      </div>
      <div class="spotlight-stat">
        <span>Queue Time</span>
        <strong>${zone.queue_time}m wait</strong>
      </div>
      <div class="spotlight-stat">
        <span>Flow Velocity</span>
        <strong>${zone.velocity.toFixed(2)} m/s</strong>
      </div>
    `;
  }

  renderSparkline(zone.history || []);

  const anomalyInfo = zone.anomaly
    ? `⚠️ ${zone.anomaly.category.replace(/_/g, ' ')} (severity ${zone.anomaly.severity}/10)`
    : '✅ No anomaly';

  const summaryEl = document.getElementById('spotlight-summary');
  if (summaryEl) summaryEl.innerHTML =
    `<strong>${zone.pressure.toUpperCase()} Pressure</strong> · Cluster ${zone.cluster} · ${anomalyInfo} · Neighbors: ${zone.neighbors.length}`;
}

function renderSparkline(history) {
  const container = document.getElementById('sparkline-container');
  if (!container) return;
  
  if (!history || history.length < 2) {
    container.innerHTML = '<div style="color: #94a3b8; font-size: 12px; text-align: center; padding: 10px;">Insufficient data</div>';
    return;
  }

  const w = 280, h = 40;
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
  const container = document.getElementById('chat-messages');
  if (!container) return;
  
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.innerHTML = message;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

async function handleChatSubmit() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  
  const msg = input.value.trim();
  if (!msg) return;

  addChatMessage('user', msg);
  input.value = '';

  try {
    const response = await getAIResponse(msg);
    addChatMessage('assistant', response);
  } catch (err) {
    console.error(err);
    addChatMessage('assistant', '⚠️ Copilot temporarily unavailable. Routing engine is still active.');
  }
}

// -------------------- ROUTE HANDLER --------------------
async function handleGetRoute() {
  const from = document.getElementById('current-zone').value;
  const dest = document.getElementById('destination').value;
  const pref = document.getElementById('preference').value;

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
    addChatMessage('assistant',
      `🎯 <strong>Path Ready!</strong> Route to ${state.routeResult.destination.name} in ~${state.routeResult.estimatedTime} min ` +
      `(${Math.round(state.routeResult.confidence * 100)}% confidence). ` +
      `${state.routeTiming.recommendation === 'now' ? '⚡ <strong>Move now</strong> for best timing.' : '⏳ Consider waiting briefly.'}`
    );
  } catch (err) {
    console.error(err);
    window.alert('❌ Route generation failed. Try again.');
  }
}

// -------------------- MAP TOGGLES --------------------
function setupMapToggles() {
  const heatBtn = document.getElementById('toggle-heatmap');
  const flowBtn = document.getElementById('toggle-flow');
  const predBtn = document.getElementById('toggle-predicted');

  if (heatBtn) {
    heatBtn.addEventListener('click', () => {
      state.showHeatmap = !state.showHeatmap;
      heatBtn.classList.toggle('active', state.showHeatmap);
      heatBtn.setAttribute('aria-pressed', String(state.showHeatmap));
      heatBtn.textContent = state.showHeatmap ? '🌡️ Heatmap: ON' : '🌡️ Heatmap: OFF';
      announceForScreenReader(`Heatmap ${state.showHeatmap ? 'enabled' : 'disabled'}`);
      renderStadium();
    });
  }

  if (flowBtn) {
    flowBtn.addEventListener('click', () => {
      state.showFlow = !state.showFlow;
      flowBtn.classList.toggle('active', state.showFlow);
      flowBtn.setAttribute('aria-pressed', String(state.showFlow));
      flowBtn.textContent = state.showFlow ? '🌊 Flow: ON' : '🌊 Flow: OFF';
      announceForScreenReader(`Flow overlay ${state.showFlow ? 'enabled' : 'disabled'}`);
      renderStadium();
    });
  }

  if (predBtn) {
    predBtn.addEventListener('click', () => {
      state.showPredicted = !state.showPredicted;
      predBtn.classList.toggle('active', state.showPredicted);
      predBtn.setAttribute('aria-pressed', String(state.showPredicted));
      predBtn.textContent = state.showPredicted ? '🔮 Predicted: ON' : '🔮 Predicted: OFF';
      announceForScreenReader(`Predicted density overlay ${state.showPredicted ? 'enabled' : 'disabled'}`);
      renderStadium();
    });
  }

  [heatBtn, flowBtn, predBtn].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        btn.click();
      }
    });
  });
}

// -------------------- TIME SLIDER --------------------
function setupTimeSlider() {
  const slider = document.getElementById('time-slider');
  const label = document.getElementById('time-slider-value');

  if (!slider) return;

  slider.addEventListener('input', () => {
    const val = parseInt(slider.value, 10);
    state.timeSlider = val;
    if (label) {
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
    }
  });
}

// -------------------- WHAT-IF MODE --------------------
function setupWhatIf() {
  const cb = document.getElementById('whatif-checkbox');
  const toggle = document.getElementById('whatif-toggle');

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

// -------------------- DASHBOARD REFRESH --------------------
async function refreshDashboard() {
  try {
    if (state.isSimulationRunning) {
      state.simulationTime += 1.5;
      
      // Simulate density changes
      state.zones.forEach((zone) => {
        zone.prev_density = zone.density;
        const neighborAvg = zone.neighbors.length 
          ? zone.neighbors.reduce((s, nId) => {
              const n = state.zones.find(z => z.id === nId);
              return s + (n ? n.density : 0);
            }, 0) / zone.neighbors.length
          : zone.density;
        
        const drift = (Math.random() - 0.5) * 0.02;
        const networkPull = (neighborAvg - zone.density) * 0.08;
        zone.density = Math.max(0.05, Math.min(0.95, zone.density + drift + networkPull));
        zone.predicted_density = zone.density + (Math.random() - 0.5) * 0.1;
        zone.trend_rate = zone.density - zone.prev_density;
        
        // Update history
        if (zone.history.length > 30) zone.history.shift();
        zone.history.push(zone.density);
      });
    }

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
    console.error('Dashboard refresh failed:', err);
  }
}

// -------------------- EVENT LISTENERS --------------------
function setupEventListeners() {
  const getRouteBtn = document.getElementById('get-route-btn');
  if (getRouteBtn) getRouteBtn.addEventListener('click', handleGetRoute);

  const zoneSelect = document.getElementById('current-zone');
  if (zoneSelect) {
    zoneSelect.addEventListener('change', (e) => {
      if (e.target.value) selectZone(e.target.value);
    });
  }

  const chatBtn = document.getElementById('send-chat-btn');
  if (chatBtn) chatBtn.addEventListener('click', handleChatSubmit);

  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleChatSubmit();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const focused = document.activeElement;
      if (focused && focused !== document.body) focused.blur();
      announceForScreenReader('Focus cleared');
    }
  });

  const triggerBtn = document.getElementById('trigger-event-btn');
  if (triggerBtn) {
    triggerBtn.addEventListener('click', async () => {
      await triggerEventEnd();
      addChatMessage('assistant', '🚨 <strong>Event surge injected!</strong> Watch outer ring and exits for rapid density changes. Core zone at critical levels.');
      await refreshDashboard();
    });
  }

  const resetBtn = document.getElementById('sim-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      await resetSimulation();
      state.selectedRoute = [];
      state.routeResult = null;
      state.routeTiming = null;
      renderRoutePanel();
      addChatMessage('assistant', '🔄 <strong>Simulation reset.</strong> FlowSync is back to baseline conditions. All 28 zones normalized.');
      await refreshDashboard();
    });
  }

  const simToggle = document.getElementById('sim-toggle');
  if (simToggle) {
    simToggle.addEventListener('change', async (e) => {
      await setSimulationState(e.target.checked);
      await refreshDashboard();
    });
  }

  setupMapToggles();
  setupTimeSlider();
  setupWhatIf();
}

// -------------------- INITIALIZATION --------------------
async function init() {
  setupEventListeners();
  renderRoutePanel();

  updateClock();
  setInterval(updateClock, 1000);

  await refreshDashboard();
  announceForScreenReader('FlowSync dashboard loaded');

  addChatMessage('assistant',
    '🚀 <strong>FlowSync Command Center LIVE</strong><br>' +
    '✅ 28 zones active across 5 rings<br>' +
    '🎯 Click zones on map to inspect<br>' +
    '📊 Dashboard shows real-time metrics<br>' +
    '💬 Ask me about zones, routes, or facilities'
  );

  state.updateTimer = setInterval(refreshDashboard, 2000);
}

document.addEventListener('DOMContentLoaded', init);
