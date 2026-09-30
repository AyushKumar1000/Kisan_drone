// ============================================================
// KisanDrone – Centralized Zustand Simulation Store
// All simulation logic lives here. UI only reads & dispatches.
// ============================================================

import { create } from 'zustand';
import {
  DroneState, SimulationState, SimulationEvent, FaultInjection,
  FlightState, SafetyLevel, BoundaryStatus, SensorHealth, SensorState,
  Position, TelemetrySnapshot, OTAStatus, OTAState, FirmwareSlot,
  RolloutStageData, RolloutStage, SimulationSettings, VALID_TRANSITIONS,
} from '../types/simulation';
import {
  distance, moveTowards, headingBetween, getBoundaryStatus,
  calculateNozzleFlow, shouldTriggerRTB, isGPSValid, canSpray,
  generateId, clamp, calculateRTBThreshold, remainingRouteDistance,
  calculateRiskExposure, shrinkPolygon, routeDistance, getCentroid,
} from '../utils/calculations';

// ─── Default field boundary (a farm field polygon, 600x400 area) ───
const DEFAULT_BOUNDARY: Position[] = [
  { x: 50, y: 50 },
  { x: 550, y: 50 },
  { x: 550, y: 350 },
  { x: 50, y: 350 },
];

const DEFAULT_HOME: Position = { x: 80, y: 80 };

// Generate a serpentine spray route inside the field
function generateSprayRoute(boundary: Position[], margin: number, home: Position): Position[] {
  const inner = shrinkPolygon(boundary, margin + 20);
  const minX = Math.min(...inner.map(p => p.x));
  const maxX = Math.max(...inner.map(p => p.x));
  const minY = Math.min(...inner.map(p => p.y));
  const maxY = Math.max(...inner.map(p => p.y));
  const spacing = 40;
  const waypoints: Position[] = [home];
  let goingRight = true;

  for (let y = minY + 10; y < maxY - 10; y += spacing) {
    if (goingRight) {
      waypoints.push({ x: minX + 10, y });
      waypoints.push({ x: maxX - 10, y });
    } else {
      waypoints.push({ x: maxX - 10, y });
      waypoints.push({ x: minX + 10, y });
    }
    goingRight = !goingRight;
  }
  waypoints.push(home); // Return to home at end
  return waypoints;
}

const defaultRoute = generateSprayRoute(DEFAULT_BOUNDARY, 30, DEFAULT_HOME);

// ─── Default settings ───
const DEFAULT_SETTINGS: SimulationSettings = {
  fieldBoundary: DEFAULT_BOUNDARY,
  safetyMargin: 30,
  rtbThreshold: 20,
  gpsAccuracyThreshold: 5,
  simulationSpeed: 1,
  batteryDrainRate: 0.15,
  defaultGroundSpeed: 5,
  nozzleFlowBase: 2.0,
  nozzleFlowSpeedFactor: 0.3,
};

// ─── Initial drone state ───
function createInitialDrone(): DroneState {
  return {
    id: 'KD-2026-ALPHA',
    position: { ...DEFAULT_HOME },
    heading: 0,
    groundSpeed: 0,
    battery: { percentage: 100, drainRate: DEFAULT_SETTINGS.batteryDrainRate, estimatedFlightTime: 666, state: 'FULL' },
    gps: { valid: true, accuracy: 1.2, positionJump: false },
    sensors: {
      gps: 'HEALTHY', imu: 'HEALTHY', batterySensor: 'HEALTHY',
      positionSensor: 'HEALTHY', flightController: 'HEALTHY',
      sprayController: 'HEALTHY', communication: 'HEALTHY',
    },
    flightState: 'INIT',
    spray: { active: false, nozzleFlow: 0, targetFlow: 0, permitted: false, blockReason: 'Mission not active' },
    rtb: {
      active: false, reason: '', threshold: DEFAULT_SETTINGS.rtbThreshold,
      responseTime: null, thresholdCrossedAt: null, decisionMadeAt: null,
      distanceToBase: 0, estimatedArrival: null, passed: null,
    },
    ota: createInitialOTA(),
    boundaryStatus: 'INSIDE',
    distanceFromBoundary: 50,
    networkConnected: true,
    firmwareVersion: 'v1.0.0',
    distanceTraveled: 0,
    missionActive: false,
    missionPaused: false,
    homePosition: { ...DEFAULT_HOME },
    currentWaypointIndex: 0,
  };
}

function createInitialOTA(): OTAState {
  return {
    status: 'IDLE',
    currentVersion: 'v1.0.0',
    availableVersion: 'v1.1.0',
    slotA: { version: 'v1.0.0', verified: true, active: true, status: 'VERIFIED' },
    slotB: { version: 'v1.1.0', verified: false, active: false, status: 'CANDIDATE' },
    downloadProgress: 0,
    signatureValid: null,
    integrityValid: null,
    healthCheckPassed: null,
    rollbackActive: false,
    failureType: null,
  };
}

const DEFAULT_ROLLOUT_STAGES: RolloutStageData[] = [
  { stage: 'DEV_TEST', fleetSize: 5, successful: 0, failed: 0, rollbacks: 0, healthCheckFailures: 0, status: 'PENDING' },
  { stage: '1%', fleetSize: 10, successful: 0, failed: 0, rollbacks: 0, healthCheckFailures: 0, status: 'PENDING' },
  { stage: '10%', fleetSize: 100, successful: 0, failed: 0, rollbacks: 0, healthCheckFailures: 0, status: 'PENDING' },
  { stage: '25%', fleetSize: 250, successful: 0, failed: 0, rollbacks: 0, healthCheckFailures: 0, status: 'PENDING' },
  { stage: '50%', fleetSize: 500, successful: 0, failed: 0, rollbacks: 0, healthCheckFailures: 0, status: 'PENDING' },
  { stage: '100%', fleetSize: 1000, successful: 0, failed: 0, rollbacks: 0, healthCheckFailures: 0, status: 'PENDING' },
];

// ─── Store interface ───
interface SimulationStore extends SimulationState {
  // Actions
  tick: (deltaMs: number) => void;
  startMission: () => void;
  pauseMission: () => void;
  resumeMission: () => void;
  stopMission: () => void;
  resetMission: () => void;
  setFlightState: (state: FlightState) => void;
  setGroundSpeed: (speed: number) => void;
  setBatteryLevel: (level: number) => void;
  setGPSAccuracy: (accuracy: number) => void;
  setSimulationSpeed: (speed: number) => void;
  toggleSpray: () => void;
  injectFault: (type: string) => void;
  clearFault: (id: string) => void;
  clearAllFaults: () => void;
  addEvent: (category: SimulationEvent['category'], severity: SimulationEvent['severity'], message: string, eventType: string) => void;
  clearEvents: () => void;
  updateSettings: (settings: Partial<SimulationSettings>) => void;
  startOTAUpdate: (failureType?: string | null) => void;
  rollbackFirmware: () => void;
  advanceRolloutStage: (stageIndex: number) => void;
  startDemo: () => void;
  stopDemo: () => void;
  advanceDemo: () => void;
  resetAll: () => void;
  setDronePosition: (pos: Position) => void;
  setBatteryDrainRate: (rate: number) => void;
  setGPSValid: (valid: boolean) => void;
}

// ─── Load persisted settings ───
function loadPersistedSettings(): Partial<SimulationSettings> {
  try {
    const saved = localStorage.getItem('kisandrone-settings');
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {};
}

function persistSettings(settings: SimulationSettings) {
  try {
    localStorage.setItem('kisandrone-settings', JSON.stringify(settings));
  } catch { /* ignore */ }
}

export const useSimulationStore = create<SimulationStore>((set, get) => {
  const persistedSettings = loadPersistedSettings();
  const settings = { ...DEFAULT_SETTINGS, ...persistedSettings };

  return {
    drone: createInitialDrone(),
    fieldBoundary: { points: settings.fieldBoundary, safetyMargin: settings.safetyMargin },
    route: {
      waypoints: generateSprayRoute(settings.fieldBoundary, settings.safetyMargin, DEFAULT_HOME).map((p, i) => ({
        id: `wp-${i}`,
        position: p,
        type: i === 0 ? 'HOME' as const : i === 1 ? 'SPRAY_START' as const : 'WAYPOINT' as const,
      })),
      totalDistance: routeDistance(generateSprayRoute(settings.fieldBoundary, settings.safetyMargin, DEFAULT_HOME)),
    },
    events: [],
    faults: [],
    settings,
    safetyLevel: 'SAFE',
    running: false,
    speed: settings.simulationSpeed,
    telemetryHistory: [],
    rolloutStages: [...DEFAULT_ROLLOUT_STAGES],
    demoMode: false,
    demoStep: 0,

    // ─────────────────── SIMULATION TICK ───────────────────
    tick: (deltaMs: number) => {
      const state = get();
      if (!state.running || state.drone.missionPaused) return;

      const dt = (deltaMs / 1000) * state.speed;
      const drone = { ...state.drone };
      const battery = { ...drone.battery };
      const gps = { ...drone.gps };
      const spray = { ...drone.spray };
      const rtb = { ...drone.rtb };
      const events: SimulationEvent[] = [];

      // 1. Battery drain
      if (drone.flightState !== 'INIT') {
        const drain = battery.drainRate * dt * (spray.active ? 1.3 : 1);
        battery.percentage = clamp(battery.percentage - drain, 0, 100);
        battery.state = battery.percentage > 75 ? 'FULL' : battery.percentage > 30 ? 'NORMAL' : battery.percentage > 15 ? 'LOW' : 'CRITICAL';
        battery.estimatedFlightTime = battery.drainRate > 0 ? battery.percentage / battery.drainRate : 9999;
      }

      // 2. Move along route
      if (['FLYING', 'SPRAYING', 'TAKEOFF'].includes(drone.flightState) && drone.currentWaypointIndex < state.route.waypoints.length) {
        const target = state.route.waypoints[drone.currentWaypointIndex].position;
        const step = drone.groundSpeed * dt;
        const prevPos = { ...drone.position };
        drone.position = moveTowards(drone.position, target, step);
        drone.heading = headingBetween(prevPos, target);
        const moved = distance(prevPos, drone.position);
        drone.distanceTraveled += moved;

        if (distance(drone.position, target) < 2) {
          drone.currentWaypointIndex++;
          if (drone.currentWaypointIndex >= state.route.waypoints.length) {
            // Mission complete
            events.push(createEvent('FLIGHT', 'INFO', 'Mission route completed', 'MISSION_COMPLETE', drone.flightState));
          }
        }
      }

      // 2b. RTB navigation – head straight home
      if (drone.flightState === 'RETURN_TO_BASE') {
        const step = drone.groundSpeed * dt;
        const prevPos = { ...drone.position };
        drone.position = moveTowards(drone.position, drone.homePosition, step);
        drone.heading = headingBetween(prevPos, drone.homePosition);
        drone.distanceTraveled += distance(prevPos, drone.position);

        if (distance(drone.position, drone.homePosition) < 5) {
          drone.flightState = 'LANDING';
          events.push(createEvent('FLIGHT', 'INFO', 'Drone reached base, landing', 'RTB_COMPLETED', drone.flightState));
        }
      }

      // 2c. Landing logic
      if (drone.flightState === 'LANDING') {
        if (distance(drone.position, drone.homePosition) < 5) {
          drone.flightState = 'INIT';
          drone.groundSpeed = 0;
          drone.missionActive = false;
          rtb.active = false;
          events.push(createEvent('FLIGHT', 'INFO', 'Drone landed safely', 'LANDED', drone.flightState));
        }
      }

      // 3. Boundary check
      const boundaryCheck = getBoundaryStatus(drone.position, state.fieldBoundary);
      const prevBoundaryStatus = drone.boundaryStatus;
      drone.boundaryStatus = boundaryCheck.status;
      drone.distanceFromBoundary = boundaryCheck.distance;

      if (prevBoundaryStatus !== 'OUTSIDE' && boundaryCheck.status === 'OUTSIDE') {
        events.push(createEvent('SAFETY', 'CRITICAL', 'Drone crossed field boundary!', 'BOUNDARY_VIOLATION', drone.flightState));
      } else if (prevBoundaryStatus === 'INSIDE' && boundaryCheck.status === 'NEAR') {
        events.push(createEvent('SAFETY', 'WARNING', 'Drone approaching boundary', 'BOUNDARY_WARNING', drone.flightState));
      }

      // 4. Safety / canSpray evaluation
      const sensorHealthy = !Object.values(drone.sensors).includes('FAULT');
      const gpsOk = isGPSValid(gps.accuracy, state.settings.gpsAccuracyThreshold, gps.valid);
      const sprayCheck = canSpray({
        insideBoundary: drone.boundaryStatus !== 'OUTSIDE',
        gpsValid: gps.valid,
        gpsAccuracy: gps.accuracy,
        gpsAccuracyThreshold: state.settings.gpsAccuracyThreshold,
        flightState: drone.flightState,
        sensorHealthy,
        safetyLevel: computeSafetyLevel(drone, gpsOk, sensorHealthy, state.settings),
        missionActive: drone.missionActive,
        rtbActive: rtb.active,
      });
      spray.permitted = sprayCheck.allowed;
      spray.blockReason = sprayCheck.reason;

      // If spraying but not allowed -> stop spray
      if (spray.active && !spray.permitted) {
        spray.active = false;
        spray.nozzleFlow = 0;
        events.push(createEvent('SPRAY', 'WARNING', `Spraying disabled: ${sprayCheck.reason}`, 'SPRAY_BLOCKED', drone.flightState));
      }

      // Nozzle flow
      if (spray.active) {
        spray.targetFlow = calculateNozzleFlow(drone.groundSpeed, state.settings.nozzleFlowBase, state.settings.nozzleFlowSpeedFactor);
        spray.nozzleFlow = spray.targetFlow;
      } else {
        spray.nozzleFlow = 0;
        spray.targetFlow = 0;
      }

      // 5. State transitions
      // Auto-enter spraying in the spray zone
      if (drone.flightState === 'FLYING' && spray.permitted && drone.currentWaypointIndex > 1 && drone.currentWaypointIndex < state.route.waypoints.length - 1 && !rtb.active) {
        drone.flightState = 'SPRAYING';
        spray.active = true;
        events.push(createEvent('SPRAY', 'INFO', 'Drone entered spraying zone', 'SPRAY_ENABLED', drone.flightState));
      }

      // Boundary violation -> SAFE_MODE
      if (drone.boundaryStatus === 'OUTSIDE' && drone.flightState === 'SPRAYING') {
        drone.flightState = 'SAFE_MODE';
        spray.active = false;
        spray.nozzleFlow = 0;
        events.push(createEvent('SAFETY', 'CRITICAL', 'SAFE_MODE activated: boundary violation', 'SAFE_MODE_ACTIVATED', drone.flightState));
      }

      // GPS invalid -> SAFE_MODE
      if (!gpsOk && ['FLYING', 'SPRAYING'].includes(drone.flightState)) {
        drone.flightState = 'SAFE_MODE';
        spray.active = false;
        spray.nozzleFlow = 0;
        events.push(createEvent('GPS', 'CRITICAL', 'SAFE_MODE activated: GPS unreliable', 'SAFE_MODE_GPS', drone.flightState));
      }

      // 6. RTB logic
      rtb.distanceToBase = distance(drone.position, drone.homePosition);
      const dynamicThreshold = calculateRTBThreshold(rtb.distanceToBase, drone.groundSpeed, battery.drainRate);
      rtb.threshold = Math.max(state.settings.rtbThreshold, dynamicThreshold);

      if (!rtb.active && shouldTriggerRTB(battery.percentage, rtb.threshold, false) &&
        ['FLYING', 'SPRAYING', 'SAFE_MODE'].includes(drone.flightState)) {
        const crossedAt = performance.now();
        rtb.thresholdCrossedAt = crossedAt;

        // RTB decision
        rtb.active = true;
        rtb.reason = `Battery at ${battery.percentage.toFixed(1)}% (threshold: ${rtb.threshold.toFixed(1)}%)`;
        const decisionAt = performance.now();
        rtb.decisionMadeAt = decisionAt;
        rtb.responseTime = decisionAt - crossedAt;
        rtb.passed = rtb.responseTime <= 50;
        rtb.estimatedArrival = drone.groundSpeed > 0 ? rtb.distanceToBase / drone.groundSpeed : null;

        drone.flightState = 'RETURN_TO_BASE';
        spray.active = false;
        spray.nozzleFlow = 0;

        events.push(createEvent('BATTERY', 'WARNING', `Battery threshold crossed at ${battery.percentage.toFixed(1)}%`, 'BATTERY_THRESHOLD', drone.flightState));
        events.push(createEvent('FLIGHT', 'WARNING', `RTB initiated – response time: ${rtb.responseTime.toFixed(2)}ms (${rtb.passed ? 'PASS' : 'FAIL'})`, 'RTB_INITIATED', drone.flightState));
      }

      if (rtb.active) {
        rtb.distanceToBase = distance(drone.position, drone.homePosition);
        rtb.estimatedArrival = drone.groundSpeed > 0 ? rtb.distanceToBase / drone.groundSpeed : null;
      }

      // 7. Safety level
      const safetyLevel = computeSafetyLevel(drone, gpsOk, sensorHealthy, state.settings);

      // Critical sensor fault → EMERGENCY
      if (safetyLevel === 'CRITICAL' && !['EMERGENCY', 'INIT', 'LANDING'].includes(drone.flightState)) {
        const hasCriticalFault = Object.values(drone.sensors).filter(s => s === 'FAULT').length >= 2;
        if (hasCriticalFault) {
          drone.flightState = 'EMERGENCY';
          spray.active = false;
          spray.nozzleFlow = 0;
          events.push(createEvent('SAFETY', 'CRITICAL', 'EMERGENCY: multiple critical sensor faults', 'EMERGENCY_ACTIVATED', drone.flightState));
        }
      }

      // 8. Telemetry snapshot
      const telemetryHistory = [...state.telemetryHistory];
      telemetryHistory.push({
        timestamp: Date.now(),
        battery: battery.percentage,
        groundSpeed: drone.groundSpeed,
        nozzleFlow: spray.nozzleFlow,
        gpsAccuracy: gps.accuracy,
        altitude: 10,
      });
      // Keep last 200 snapshots
      if (telemetryHistory.length > 200) telemetryHistory.splice(0, telemetryHistory.length - 200);

      // Apply updates
      drone.battery = battery;
      drone.gps = gps;
      drone.spray = spray;
      drone.rtb = rtb;

      const allEvents = [...state.events, ...events];

      set({
        drone,
        safetyLevel,
        telemetryHistory,
        events: allEvents,
      });
    },

    // ─────────────────── MISSION CONTROL ───────────────────
    startMission: () => {
      const state = get();
      if (state.drone.missionActive) return;

      const drone = { ...state.drone };
      drone.missionActive = true;
      drone.missionPaused = false;
      drone.flightState = 'PRE_FLIGHT';
      drone.groundSpeed = state.settings.defaultGroundSpeed;
      drone.currentWaypointIndex = 0;
      drone.distanceTraveled = 0;
      drone.position = { ...drone.homePosition };
      drone.battery.percentage = drone.battery.percentage < 20 ? 100 : drone.battery.percentage;

      const newEvent = createEvent('FLIGHT', 'INFO', 'Mission started – Pre-flight checks initiated', 'FLIGHT_STARTED', drone.flightState);

      // Auto-advance through PRE_FLIGHT -> TAKEOFF -> FLYING
      setTimeout(() => {
        set(s => {
          const d = { ...s.drone };
          if (d.flightState === 'PRE_FLIGHT') {
            d.flightState = 'TAKEOFF';
            return {
              drone: d,
              events: [...s.events, createEvent('FLIGHT', 'INFO', 'Pre-flight checks passed, taking off', 'PREFLIGHT_PASS', d.flightState)]
            };
          }
          return {};
        });
      }, 1500);

      setTimeout(() => {
        set(s => {
          const d = { ...s.drone };
          if (d.flightState === 'TAKEOFF') {
            d.flightState = 'FLYING';
            return {
              drone: d,
              events: [...s.events, createEvent('FLIGHT', 'INFO', 'Takeoff complete, entering flight mode', 'TAKEOFF_COMPLETE', d.flightState)]
            };
          }
          return {};
        });
      }, 3000);

      set({
        drone,
        running: true,
        events: [...state.events, newEvent],
      });
    },

    pauseMission: () => set(s => ({
      drone: { ...s.drone, missionPaused: true },
      events: [...s.events, createEvent('FLIGHT', 'INFO', 'Mission paused', 'MISSION_PAUSED', s.drone.flightState)],
    })),

    resumeMission: () => set(s => ({
      drone: { ...s.drone, missionPaused: false },
      events: [...s.events, createEvent('FLIGHT', 'INFO', 'Mission resumed', 'MISSION_RESUMED', s.drone.flightState)],
    })),

    stopMission: () => set(s => {
      const drone = { ...s.drone };
      drone.missionActive = false;
      drone.missionPaused = false;
      drone.flightState = 'INIT';
      drone.groundSpeed = 0;
      drone.spray = { active: false, nozzleFlow: 0, targetFlow: 0, permitted: false, blockReason: 'Mission not active' };
      drone.rtb = { ...drone.rtb, active: false, reason: '' };
      return {
        drone,
        running: false,
        events: [...s.events, createEvent('FLIGHT', 'INFO', 'Mission stopped', 'MISSION_STOPPED', drone.flightState)],
      };
    }),

    resetMission: () => {
      const state = get();
      const drone = createInitialDrone();
      drone.battery.drainRate = state.settings.batteryDrainRate;
      set({
        drone,
        running: false,
        telemetryHistory: [],
        events: [createEvent('SYSTEM', 'INFO', 'Mission reset', 'MISSION_RESET', 'INIT')],
        faults: [],
        demoMode: false,
        demoStep: 0,
      });
    },

    setFlightState: (newState: FlightState) => set(s => {
      const currentState = s.drone.flightState;
      if (!VALID_TRANSITIONS[currentState]?.includes(newState)) {
        return {
          events: [...s.events, createEvent('SYSTEM', 'WARNING', `Invalid transition: ${currentState} → ${newState}`, 'INVALID_TRANSITION', currentState)]
        };
      }
      return {
        drone: { ...s.drone, flightState: newState },
        events: [...s.events, createEvent('FLIGHT', 'INFO', `State: ${currentState} → ${newState}`, 'STATE_CHANGE', newState)],
      };
    }),

    setGroundSpeed: (speed: number) => set(s => ({
      drone: { ...s.drone, groundSpeed: clamp(speed, 0, 20) },
    })),

    setBatteryLevel: (level: number) => set(s => ({
      drone: {
        ...s.drone,
        battery: {
          ...s.drone.battery,
          percentage: clamp(level, 0, 100),
          state: level > 75 ? 'FULL' : level > 30 ? 'NORMAL' : level > 15 ? 'LOW' : 'CRITICAL',
        },
      },
    })),

    setGPSAccuracy: (accuracy: number) => set(s => ({
      drone: { ...s.drone, gps: { ...s.drone.gps, accuracy: clamp(accuracy, 0.1, 50) } },
    })),

    setSimulationSpeed: (speed: number) => set({ speed }),

    toggleSpray: () => set(s => {
      const spray = { ...s.drone.spray };
      if (!spray.active && !spray.permitted) {
        return {
          events: [...s.events, createEvent('SPRAY', 'WARNING', `Cannot enable spray: ${spray.blockReason}`, 'SPRAY_BLOCKED', s.drone.flightState)],
        };
      }
      spray.active = !spray.active;
      if (!spray.active) {
        spray.nozzleFlow = 0;
      }
      return {
        drone: { ...s.drone, spray },
        events: [...s.events, createEvent('SPRAY', 'INFO', spray.active ? 'Spray enabled' : 'Spray disabled', spray.active ? 'SPRAY_ENABLED' : 'SPRAY_DISABLED', s.drone.flightState)],
      };
    }),

    // ─────────────────── FAULT INJECTION ───────────────────
    injectFault: (type: string) => set(s => {
      const drone = { ...s.drone };
      const sensors = { ...drone.sensors };
      const gps = { ...drone.gps };
      const fault: FaultInjection = {
        id: generateId(),
        type,
        time: Date.now(),
        severity: 'WARNING',
        active: true,
        response: '',
        recoveryStatus: 'ACTIVE',
      };

      switch (type) {
        case 'GPS_FAILURE':
          gps.valid = false;
          sensors.gps = 'FAULT';
          fault.severity = 'CRITICAL';
          fault.response = 'GPS marked invalid, spray disabled, SAFE_MODE';
          break;
        case 'GPS_POSITION_JUMP':
          gps.positionJump = true;
          drone.position = { x: drone.position.x + 100, y: drone.position.y + 100 };
          fault.response = 'Position anomaly detected';
          break;
        case 'GPS_ACCURACY_DEGRADATION':
          gps.accuracy = 15;
          fault.response = 'GPS accuracy degraded below threshold';
          break;
        case 'SENSOR_DRIFT':
          sensors.imu = 'WARNING';
          fault.response = 'IMU drift detected, warning issued';
          break;
        case 'BATTERY_SENSOR_FAULT':
          sensors.batterySensor = 'FAULT';
          fault.severity = 'CRITICAL';
          fault.response = 'Battery sensor unreliable';
          break;
        case 'COMMUNICATION_LOSS':
          drone.networkConnected = false;
          sensors.communication = 'FAULT';
          fault.response = 'Communication lost, local safety active';
          break;
      }

      drone.sensors = sensors;
      drone.gps = gps;

      return {
        drone,
        faults: [...s.faults, fault],
        events: [...s.events, createEvent('FAULT', fault.severity, `Fault injected: ${type}`, type, drone.flightState)],
      };
    }),

    clearFault: (id: string) => set(s => {
      const fault = s.faults.find(f => f.id === id);
      if (!fault) return {};

      const drone = { ...s.drone };
      const sensors = { ...drone.sensors };
      const gps = { ...drone.gps };

      switch (fault.type) {
        case 'GPS_FAILURE':
          gps.valid = true;
          sensors.gps = 'HEALTHY';
          break;
        case 'GPS_POSITION_JUMP':
          gps.positionJump = false;
          break;
        case 'GPS_ACCURACY_DEGRADATION':
          gps.accuracy = 1.2;
          break;
        case 'SENSOR_DRIFT':
          sensors.imu = 'HEALTHY';
          break;
        case 'BATTERY_SENSOR_FAULT':
          sensors.batterySensor = 'HEALTHY';
          break;
        case 'COMMUNICATION_LOSS':
          drone.networkConnected = true;
          sensors.communication = 'HEALTHY';
          break;
      }

      drone.sensors = sensors;
      drone.gps = gps;

      // If in SAFE_MODE and faults cleared, can go to FLYING
      if (drone.flightState === 'SAFE_MODE' && drone.missionActive) {
        const remaining = s.faults.filter(f => f.id !== id && f.active);
        if (remaining.length === 0 && gps.valid && sensors.gps !== 'FAULT') {
          drone.flightState = 'FLYING';
        }
      }

      return {
        drone,
        faults: s.faults.map(f => f.id === id ? { ...f, active: false, recoveryStatus: 'RECOVERED' as const } : f),
        events: [...s.events, createEvent('FAULT', 'INFO', `Fault cleared: ${fault.type}`, `${fault.type}_CLEARED`, drone.flightState)],
      };
    }),

    clearAllFaults: () => set(s => {
      const drone = { ...s.drone };
      drone.gps = { valid: true, accuracy: 1.2, positionJump: false };
      drone.sensors = {
        gps: 'HEALTHY', imu: 'HEALTHY', batterySensor: 'HEALTHY',
        positionSensor: 'HEALTHY', flightController: 'HEALTHY',
        sprayController: 'HEALTHY', communication: 'HEALTHY',
      };
      drone.networkConnected = true;
      if (drone.flightState === 'SAFE_MODE' && drone.missionActive) {
        drone.flightState = 'FLYING';
      }
      if (drone.flightState === 'EMERGENCY' && drone.missionActive) {
        drone.flightState = 'FLYING';
      }
      return {
        drone,
        faults: s.faults.map(f => ({ ...f, active: false, recoveryStatus: 'RECOVERED' as const })),
        events: [...s.events, createEvent('FAULT', 'INFO', 'All faults cleared', 'ALL_FAULTS_CLEARED', drone.flightState)],
      };
    }),

    addEvent: (category, severity, message, eventType) => set(s => ({
      events: [...s.events, createEvent(category, severity, message, eventType, s.drone.flightState)],
    })),

    clearEvents: () => set({ events: [] }),

    updateSettings: (newSettings: Partial<SimulationSettings>) => set(s => {
      const settings = { ...s.settings, ...newSettings };
      persistSettings(settings);

      // Regenerate route if boundary changed
      let route = s.route;
      let fieldBoundary = s.fieldBoundary;
      if (newSettings.fieldBoundary || newSettings.safetyMargin !== undefined) {
        const boundary = newSettings.fieldBoundary || settings.fieldBoundary;
        const margin = newSettings.safetyMargin ?? settings.safetyMargin;
        fieldBoundary = { points: boundary, safetyMargin: margin };
        const routePoints = generateSprayRoute(boundary, margin, DEFAULT_HOME);
        route = {
          waypoints: routePoints.map((p, i) => ({
            id: `wp-${i}`,
            position: p,
            type: i === 0 ? 'HOME' as const : 'WAYPOINT' as const,
          })),
          totalDistance: routeDistance(routePoints),
        };
      }

      return { settings, route, fieldBoundary };
    }),

    // ─────────────────── OTA ───────────────────
    startOTAUpdate: (failureType: string | null = null) => {
      const state = get();
      if (state.drone.ota.status !== 'IDLE' && state.drone.ota.status !== 'ROLLBACK_COMPLETE' && state.drone.ota.status !== 'FAILED') return;

      const addEvt = (msg: string, type: string, sev: SimulationEvent['severity'] = 'INFO') => {
        set(s => ({ events: [...s.events, createEvent('OTA', sev, msg, type, s.drone.flightState)] }));
      };

      const setOTA = (partial: Partial<OTAState>) => {
        set(s => ({ drone: { ...s.drone, ota: { ...s.drone.ota, ...partial } } }));
      };

      // Reset OTA state
      setOTA({ status: 'CHECKING', downloadProgress: 0, signatureValid: null, integrityValid: null, healthCheckPassed: null, rollbackActive: false, failureType });
      addEvt('Checking for firmware update...', 'OTA_STARTED');

      // Simulated OTA pipeline
      setTimeout(() => {
        setOTA({ status: 'DOWNLOADING', downloadProgress: 0 });
        addEvt('Downloading firmware package...', 'OTA_DOWNLOADING');

        // Simulate download progress
        let progress = 0;
        const dlInterval = setInterval(() => {
          progress += 20;
          setOTA({ downloadProgress: Math.min(progress, 100) });
          if (progress >= 100) {
            clearInterval(dlInterval);

            // Verify signature
            setTimeout(() => {
              setOTA({ status: 'VERIFYING_SIGNATURE' });
              addEvt('Verifying digital signature...', 'OTA_VERIFYING_SIG');

              setTimeout(() => {
                if (failureType === 'INVALID_SIGNATURE') {
                  setOTA({ status: 'FAILED', signatureValid: false, failureType: 'INVALID_SIGNATURE' });
                  addEvt('Firmware signature INVALID – update rejected', 'OTA_SIGNATURE_FAILED', 'CRITICAL');
                  return;
                }
                setOTA({ signatureValid: true });
                addEvt('Signature verified ✓', 'OTA_SIGNATURE_OK');

                // Verify integrity
                setTimeout(() => {
                  setOTA({ status: 'VERIFYING_INTEGRITY' });
                  addEvt('Verifying package integrity...', 'OTA_VERIFYING_INT');

                  setTimeout(() => {
                    if (failureType === 'CORRUPTED_PACKAGE') {
                      setOTA({ status: 'FAILED', integrityValid: false, failureType: 'CORRUPTED_PACKAGE' });
                      addEvt('Package integrity check FAILED – update rejected', 'OTA_INTEGRITY_FAILED', 'CRITICAL');
                      return;
                    }
                    setOTA({ integrityValid: true });
                    addEvt('Integrity verified ✓', 'OTA_INTEGRITY_OK');

                    // Install
                    setTimeout(() => {
                      setOTA({ status: 'INSTALLING' });
                      addEvt('Installing firmware to inactive slot...', 'OTA_INSTALLING');

                      setTimeout(() => {
                        if (failureType === 'INSTALLATION_FAILURE') {
                          setOTA({ status: 'FAILED', failureType: 'INSTALLATION_FAILURE' });
                          addEvt('Installation FAILED – update rejected', 'OTA_INSTALL_FAILED', 'CRITICAL');
                          return;
                        }
                        addEvt('Installation complete ✓', 'OTA_INSTALLED');

                        // Reboot
                        setTimeout(() => {
                          setOTA({ status: 'REBOOTING' });
                          addEvt('Simulating reboot...', 'OTA_REBOOTING');

                          setTimeout(() => {
                            // Health check
                            setOTA({ status: 'HEALTH_CHECK' });
                            addEvt('Running health checks...', 'OTA_HEALTH_CHECK');

                            setTimeout(() => {
                              if (failureType === 'HEALTH_CHECK_FAILURE') {
                                setOTA({ healthCheckPassed: false, status: 'ROLLING_BACK', failureType: 'HEALTH_CHECK_FAILURE' });
                                addEvt('Health check FAILED – initiating rollback', 'OTA_HEALTH_CHECK_FAILED', 'CRITICAL');

                                // Rollback
                                setTimeout(() => {
                                  set(s => {
                                    const ota = { ...s.drone.ota };
                                    ota.status = 'ROLLBACK_COMPLETE';
                                    ota.rollbackActive = true;
                                    // Slot A stays active
                                    ota.slotB = { ...ota.slotB, status: 'FAILED', verified: false };
                                    return {
                                      drone: { ...s.drone, ota },
                                      events: [...s.events, createEvent('OTA', 'WARNING', 'Rollback complete – previous firmware active', 'ROLLBACK_COMPLETED', s.drone.flightState)],
                                    };
                                  });
                                }, 1500);
                                return;
                              }

                              // Success!
                              setOTA({ healthCheckPassed: true, status: 'VERIFIED' });
                              addEvt('Health check passed ✓', 'OTA_HEALTH_OK');

                              setTimeout(() => {
                                set(s => {
                                  const ota = { ...s.drone.ota };
                                  ota.slotB = { version: ota.availableVersion, verified: true, active: true, status: 'VERIFIED' };
                                  ota.slotA = { ...ota.slotA, active: false };
                                  ota.currentVersion = ota.availableVersion;
                                  ota.availableVersion = `v${parseInt(ota.availableVersion.split('.')[0].replace('v', ''))}.${parseInt(ota.availableVersion.split('.')[1]) + 1}.0`;
                                  ota.status = 'IDLE';
                                  return {
                                    drone: { ...s.drone, ota, firmwareVersion: ota.currentVersion },
                                    events: [...s.events, createEvent('OTA', 'INFO', `Firmware updated to ${ota.currentVersion}`, 'OTA_COMPLETE', s.drone.flightState)],
                                  };
                                });
                              }, 1000);
                            }, 2000);
                          }, 1500);
                        }, 1000);
                      }, 1500);
                    }, 500);
                  }, 1000);
                }, 500);
              }, 1000);
            }, 500);
          }
        }, 400);
      }, 1000);
    },

    rollbackFirmware: () => set(s => {
      const ota = { ...s.drone.ota };
      if (ota.slotA.active) {
        // Already on slot A, nothing to rollback to in this simple model
        return {
          events: [...s.events, createEvent('OTA', 'WARNING', 'Already on primary firmware slot', 'ROLLBACK_NOOP', s.drone.flightState)],
        };
      }
      // Swap back to slot A
      ota.slotB = { ...ota.slotB, active: false };
      ota.slotA = { ...ota.slotA, active: true };
      ota.currentVersion = ota.slotA.version;
      ota.rollbackActive = true;
      ota.status = 'ROLLBACK_COMPLETE';
      return {
        drone: { ...s.drone, ota, firmwareVersion: ota.slotA.version },
        events: [...s.events, createEvent('OTA', 'WARNING', `Rolled back to ${ota.slotA.version}`, 'ROLLBACK_STARTED', s.drone.flightState)],
      };
    }),

    advanceRolloutStage: (stageIndex: number) => set(s => {
      const stages = [...s.rolloutStages];
      // Check previous stage completed
      if (stageIndex > 0 && stages[stageIndex - 1].status !== 'COMPLETED') {
        return {
          events: [...s.events, createEvent('OTA', 'WARNING', 'Previous stage not completed', 'ROLLOUT_BLOCKED', s.drone.flightState)],
        };
      }

      const stage = { ...stages[stageIndex] };
      stage.status = 'IN_PROGRESS';

      // Simulate results
      const failRate = Math.random() * 0.1;
      const failed = Math.floor(stage.fleetSize * failRate);
      const rollbacks = Math.floor(failed * 0.5);
      const hcFails = Math.floor(failed * 0.3);
      stage.successful = stage.fleetSize - failed;
      stage.failed = failed;
      stage.rollbacks = rollbacks;
      stage.healthCheckFailures = hcFails;
      stage.status = failed > stage.fleetSize * 0.05 ? 'FAILED' : 'COMPLETED';

      stages[stageIndex] = stage;
      return {
        rolloutStages: stages,
        events: [...s.events, createEvent('OTA', stage.status === 'FAILED' ? 'CRITICAL' : 'INFO',
          `Rollout stage ${stage.stage}: ${stage.successful}/${stage.fleetSize} success`, 'ROLLOUT_STAGE', s.drone.flightState)],
      };
    }),

    // ─────────────────── DEMO MODE ───────────────────
    startDemo: () => {
      set({ demoMode: true, demoStep: 0 });
      get().resetMission();
      setTimeout(() => get().advanceDemo(), 500);
    },

    stopDemo: () => set({ demoMode: false, demoStep: 0 }),

    advanceDemo: () => {
      const state = get();
      if (!state.demoMode) return;
      const step = state.demoStep;

      const next = (delayMs: number) => {
        set(s => ({ demoStep: s.demoStep + 1 }));
        setTimeout(() => get().advanceDemo(), delayMs);
      };

      switch (step) {
        case 0: // Start mission
          get().startMission();
          next(4000);
          break;
        case 1: // Flying, let it run
          next(5000);
          break;
        case 2: // Spraying should have started
          next(4000);
          break;
        case 3: // Decrease battery
          get().setBatteryLevel(60);
          next(3000);
          break;
        case 4: // Simulate boundary violation
          get().setDronePosition({ x: 10, y: 10 }); // Outside boundary
          get().addEvent('SAFETY', 'WARNING', 'Demo: Boundary approach simulated', 'DEMO_BOUNDARY');
          next(3000);
          break;
        case 5: // Observe spray blocked
          next(3000);
          break;
        case 6: // GPS fault
          get().injectFault('GPS_FAILURE');
          next(3000);
          break;
        case 7: // Observe SAFE_MODE
          next(3000);
          break;
        case 8: // Clear fault
          get().clearAllFaults();
          get().setDronePosition({ x: 300, y: 200 }); // Back inside
          next(3000);
          break;
        case 9: // Continue mission
          next(4000);
          break;
        case 10: // Low battery → RTB
          get().setBatteryLevel(18);
          next(3000);
          break;
        case 11: // RTB active, observe
          next(5000);
          break;
        case 12: // Stop mission, do OTA
          get().stopMission();
          next(2000);
          break;
        case 13: // Start OTA with health check failure
          get().startOTAUpdate('HEALTH_CHECK_FAILURE');
          next(15000);
          break;
        case 14: // Demo complete
          get().addEvent('SYSTEM', 'INFO', 'Demo sequence completed', 'DEMO_COMPLETE');
          set({ demoMode: false });
          break;
      }
    },

    resetAll: () => {
      localStorage.removeItem('kisandrone-settings');
      set({
        drone: createInitialDrone(),
        fieldBoundary: { points: DEFAULT_BOUNDARY, safetyMargin: DEFAULT_SETTINGS.safetyMargin },
        route: {
          waypoints: defaultRoute.map((p, i) => ({
            id: `wp-${i}`,
            position: p,
            type: i === 0 ? 'HOME' as const : 'WAYPOINT' as const,
          })),
          totalDistance: routeDistance(defaultRoute),
        },
        events: [],
        faults: [],
        settings: { ...DEFAULT_SETTINGS },
        safetyLevel: 'SAFE',
        running: false,
        speed: 1,
        telemetryHistory: [],
        rolloutStages: [...DEFAULT_ROLLOUT_STAGES],
        demoMode: false,
        demoStep: 0,
      });
    },

    setDronePosition: (pos: Position) => set(s => ({
      drone: { ...s.drone, position: pos },
    })),

    setBatteryDrainRate: (rate: number) => set(s => ({
      drone: { ...s.drone, battery: { ...s.drone.battery, drainRate: clamp(rate, 0, 5) } },
      settings: { ...s.settings, batteryDrainRate: clamp(rate, 0, 5) },
    })),

    setGPSValid: (valid: boolean) => set(s => ({
      drone: { ...s.drone, gps: { ...s.drone.gps, valid } },
    })),
  };
});

// ─── Helpers ───
function createEvent(
  category: SimulationEvent['category'],
  severity: SimulationEvent['severity'],
  message: string,
  eventType: string,
  flightState: FlightState
): SimulationEvent {
  return {
    id: generateId(),
    timestamp: Date.now(),
    category,
    severity,
    message,
    flightState,
    eventType,
  };
}

function computeSafetyLevel(
  drone: DroneState,
  gpsOk: boolean,
  sensorHealthy: boolean,
  settings: SimulationSettings
): SafetyLevel {
  const faultCount = Object.values(drone.sensors).filter(s => s === 'FAULT').length;
  const warningCount = Object.values(drone.sensors).filter(s => s === 'WARNING').length;

  if (faultCount >= 2 || drone.boundaryStatus === 'OUTSIDE' || drone.battery.percentage < 5 || drone.flightState === 'EMERGENCY') {
    return 'CRITICAL';
  }
  if (faultCount >= 1 || !gpsOk || drone.boundaryStatus === 'NEAR' || drone.battery.percentage < 20 ||
    warningCount >= 2 || drone.flightState === 'SAFE_MODE' || !drone.networkConnected) {
    return 'WARNING';
  }
  return 'SAFE';
}
