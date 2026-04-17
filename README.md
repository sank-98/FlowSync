# 🚀 FlowSync: Real-Time Crowd Intelligence & Dynamic Routing Platform

**A sophisticated venue intelligence system for large-scale spaces using predictive analytics, AI-powered routing, and real-time crowd management.**

---

## 📋 Overview
**FlowSync** is a comprehensive real-time crowd intelligence and dynamic routing optimization platform engineered for large-scale venues including stadiums, airports, shopping malls, and convention centers.

### Key Capabilities
* **Live Crowd Visualization:** Interactive SVG-based heatmap with 28 zones.
* **Intelligent Routing:** A* pathfinding with 5-factor weighted optimization.
* **Predictive Analytics:** Forecasts crowd conditions 10-15 minutes in advance.
* **Anomaly Detection:** Identifies density spikes, flow stagnation, and safety threats.
* **Time Arbitrage Analysis:** Compares "Move Now vs. Wait & Later" scenarios.
* **AI Copilot:** Google Gemini integration for natural language assistance.

### Key Metrics
| Metric | Value |
| :--- | :--- |
| **Venue Capacity** | 50,000+ attendees |
| **Active Zones** | 28 concentric zones across 5 rings |
| **Simulation Cycle** | 1.5 seconds per update |
| **Routing Latency** | 48 milliseconds (average) |
| **Prediction Window** | 10-15 minute forward-looking analytics |
| **Repository Size** | 220 KB (highly optimized) |

---

## ⚠️ Problem Statement

### Challenges in Large Venue Management
* **Crowd Safety & Congestion:** Uncontrolled accumulation leads to dangerous density. Bottlenecks create hazards during mass departures, and real-time visibility is often limited.
* **Inefficient User Navigation:** Attendees lack real-time info. Static signage cannot adapt, leading users into congested zones due to suboptimal path choices.
* **Operational Blindness:** Operators lack live zone-level distribution data and predictive capabilities, resulting in reactive rather than proactive management.
* **Service Quality Degradation:** Unpredictable queues at facilities decrease satisfaction and extend overall event duration.

### Impact of Current State
Without real-time insights, venues experience safety incidents, poor attendee reviews, operational inefficiency, and an inability to optimize for peak periods.

---

## ✨ Unique Solutions & Innovations

### 1. Multi-Dimensional Predictive Routing Engine
🎯 **Innovation:** Advanced A* pathfinding with 5-factor weighted optimization.
The routing engine uses a sophisticated cost function:
$$MovementCost = BaseRingCost + (CurrentDensity \times Dw) + (PredictedDensity \times Pw) + (QueueTime \times Qw) + (CapacityPressure \times Cw) + (RouteReservation \times Rw)$$

* **Preference-Based Modes:**
    * **Fastest:** Minimizes travel time.
    * **Least Crowded:** Avoids congestion for comfort.
    * **Balanced:** Equilibrium approach.
    * **Accessible:** Prioritizes ease of navigation.
* **Route Reservation System:** Selected routes are "reserved" (with a decay mechanism) to prevent over-concentration in specific corridors.

### 2. Time Arbitrage Analysis Engine
⏱️ **Innovation:** "Move Now vs. Wait & Later" Strategic Decision Framework.
* **Scenario 1 (Move Now):** Travel immediately through current density.
* **Scenario 2 (Wait & Travel):** Strategic delay (2-6 min) to travel through predicted cleared zones.
* **Logic:** Selects the option providing the earliest arrival combined with the best user experience.

### 3. Real-Time Anomaly Detection System
🚨 **Innovation:** Multi-category classification with intelligent severity scoring.
* **Crowd Spike:** Triggers when density increases >11%.
* **Flow Stagnation:** Triggered when velocity < 0.3 and density > 62%.
* **Critical Threshold:** Triggered when predicted density > 84%.
* **Severity Formula:** `severity = clamp((trend_rate × 320) + (threshold_breach ? 28 : 0) + (stagnation ? 22 : 0) + (predicted_density × 42), 15, 100)`

### 4. Context-Aware AI Integration (Google Gemini)
🤖 **Innovation:** Two-tier system combining cloud AI with a sophisticated fallback.
* **Tier 1:** Gemini API for nuanced, context-specific advice (90-word limit).
* **Tier 2:** Intelligent Fallback using pattern-based logic (e.g., detecting keywords like 'route', 'food', 'exit') to ensure 100% uptime.

### 5. Physics-Inspired Crowd Dynamics Simulation
🔬 **Innovation:** Model balancing accuracy with computational efficiency.
* **Density Evolution:** Includes factors like Type Attraction (0.2-0.62), Ring Bias, Event Surges, and Network Pull.
* **Velocity Calculation:** `velocity = clamp(1.24 - (density × 0.92) - max(trend_rate, 0) × 0.9, 0.08, 1.25)`

### 6. Intelligent Spatial Zone Network
🌍 **Innovation:** Concentric ring topology with smart neighbor discovery.
* **Structure:** Outer Ring (Entry/Exit), Mid Ring (Food/Lounge), Inner Ring (Premium), and Core (Stage/Control).
* **Neighbor Discovery:** Zones automatically calculate neighbors based on circumferential and radial distance metrics.

---

## 🔄 System Workflow

### End-to-End User Journey
1.  **Venue Entry:** Location identified; live zone data loads.
2.  **Intent:** User selects destination and routing preference.
3.  **Calculation:** A* algorithm finds paths; route is reserved.
4.  **Time Analysis:** System compares "Move Now" vs "Wait" and recommends.
5.  **Navigation:** Turn-by-turn directions with 1.5s density updates.
6.  **Arrival:** Feedback loop improves future predictive models.

### Operator Dashboard Workflow
* **Continuous Monitoring:** Heatmap updates, anomaly detection, and cluster trend analysis every 1.5 seconds.
* **Incident Response:** Operators receive severity alerts and auto-resolution ETAs.
* **Intervention:** Suggestions for queue management and traffic redirection.

---

## 🛠 Technical Stack

* **Backend:** Node.js 18+, Express.js 4.18.2 (RESTful JSON)
* **Frontend:** HTML5, CSS3 (Glassmorphism), Vanilla JavaScript, SVG Visualization
* **Cloud (Optional):** Firebase Firestore/Auth, Google Gemini Pro, Google Cloud Run
* **Dev Tools:** ESLint, Jest, Supertest, npm, Git
* **Design Patterns:** A* Pathfinding, Discrete-time State Machine, In-memory state caching

---

## ☁️ Google Cloud Services

- Storage, Logging, Tasks, Monitoring, and Pub/Sub integrations are available in the runtime.
- Configure GCP settings using `.env.gcp.example` or the matching keys in `.env.example`.
- See full setup and API docs: [`docs/GOOGLE_CLOUD_SERVICES.md`](docs/GOOGLE_CLOUD_SERVICES.md).

---

## 🚀 Installation & Setup

### Prerequisites
* Node.js 18+ & npm 9+
* Modern web browser

### Local Development
1.  **Clone Repository:**
    ```bash
    git clone https://github.com/sank-98/FlowSync.git && cd FlowSync
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Setup:**
    ```bash
    cp .env.example .env
    # Add your GOOGLE_GEMINI_API_KEY and PORT in .env
    ```
4.  **Start Server:**
    ```bash
    npm start
    ```
5.  **Access:** Open `http://localhost:8080`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System status and simulation time |
| `GET` | `/api/zones` | Retrieve all zone data and history |
| `POST` | `/api/route` | Calculate A* path based on preferences |
| `POST` | `/api/time-analysis`| Compare "Move Now" vs "Wait" |
| `GET` | `/api/dashboard` | Hero metrics, anomalies, and recommendations |
| `POST` | `/api/ai-chat` | Send message to Gemini/Fallback AI |
| `POST` | `/api/simulation` | Toggle live simulation on/off |

---

## 📊 Performance & Quality
* **Simulation Performance:** 28 zones processed every 1.5s; 48ms avg routing latency.
* **Memory Footprint:** ~15-20 MB in-memory state.
* **Test Coverage:** Health, Dashboard, Routing Logic, Time Analysis, Anomaly Detection.

---

## 🔐 Security, Accessibility, and Automation Additions

- Security middleware stack: `middleware/security.js`, `middleware/csrf.js`, `middleware/rate-limiter.js`, `middleware/request-validator.js`
- Central config: `config/security-config.js`, `config/logging-config.js`, `config/performance-config.js`
- Accessibility support: `public/accessibility.js`, skip link/live region in `public/index.html`
- Expanded testing: `tests/*.test.js`, `jest.config.js`, `.nycrc.json`
- Deployment and monitoring scripts: `scripts/deploy-*.sh`, `monitoring/setup-monitoring.js`, `routes/health-check.js`
- Security tooling/workflows: `.github/workflows/*.yml`, `.sonarcloud.properties`, `snyk-config.json`, `.snyk`

---

## 🤝 Contributing & License
Contributions are welcome! Please fork the repo and open a Pull Request.
This project is licensed under the **MIT License**.

---

**FlowSync** © 2024 — *Real-Time Crowd Intelligence Platform for Large-Scale Venues*
