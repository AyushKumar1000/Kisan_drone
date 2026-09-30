// ============================================================
// KisanDrone – Simulation Types
// This is a SOFTWARE SIMULATION for academic purposes.
// It does NOT control real drones or aircraft.
// ============================================================

export type FlightState =
  | 'INIT'
  | 'PRE_FLIGHT'
  | 'TAKEOFF'
  | 'FLYING'
  | 'SPRAYING'
  | 'RETURN_TO_BASE'
  | 'LANDING'
  | 'SAFE_MODE'
  | 'EMERGENCY';

export type SafetyLevel = 'SAFE' | 'WARNING' | 'CRITICAL';

export type BoundaryStatus = 'INSIDE' | 'NEAR' | 'OUTSIDE';

export type SensorHealth = 'HEALTHY' | 'WARNING' | 'FAULT';

export type OTAStatus =
  | 'IDLE'
  | 'CHECKING'
  | 'DOWNLOADING'
  | 'VERIFYING_SIGNATURE'
  | 'VERIFYING_INTEGRITY'
  | 'INSTALLING'
  | 'REBOOTING'
  | 'HEALTH_CHECK'
  | 'VERIFIED'
  | 'FAILED'
  | 'ROLLING_BACK'
  | 'ROLLBACK_COMPLETE';

export type RolloutStage = 'DEV_TEST' | '1%' | '10%' | '25%' | '50%' | '100%';

export type EventCategory = 'SAFETY' | 'FLIGHT' | 'BATTERY' | 'GPS' | 'SPRAY' | 'OTA' | 'FAULT' | 'SYSTEM';

export type EventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Position {
  x: number;
  y: number;
}

export interface Waypoint {
  id: string;
  position: Position;
  type: 'WAYPOINT' | 'HOME' | 'SPRAY_START' | 'SPRAY_END';
}

export interface FieldBoundary {
  points: Position[];
  safetyMargin: number; // metres
}

export interface Route {
  waypoints: Waypoint[];
  totalDistance: number;
}

export interface GPSState {
  valid: boolean;
  accuracy: number; // metres, lower = better
  positionJump: boolean;
}

export interface SensorState {
  gps: SensorHealth;
  imu: SensorHealth;
  batterySensor: SensorHealth;
  positionSensor: SensorHealth;
  flightController: SensorHealth;
  sprayController: SensorHealth;
  communication: SensorHealth;
}

export interface SprayState {
  active: boolean;
  nozzleFlow: number; // L/min
  targetFlow: number;
  permitted: boolean;
  blockReason: string;
}

export interface BatteryState {
  percentage: number;
  drainRate: number; // %/sec
  estimatedFlightTime: number; // seconds
  state: 'FULL' | 'NORMAL' | 'LOW' | 'CRITICAL';
}

export interface RTBState {
  active: boolean;
  reason: string;
  threshold: number; // %
  responseTime: number | null; // ms
  thresholdCrossedAt: number | null;
  decisionMadeAt: number | null;
  distanceToBase: number;
  estimatedArrival: number | null; // seconds
  passed: boolean | null; // threshold test
}

export interface FirmwareSlot {
  version: string;
  verified: boolean;
  active: boolean;
  status: 'EMPTY' | 'CANDIDATE' | 'VERIFIED' | 'FAILED';
}

export interface OTAState {
  status: OTAStatus;
  currentVersion: string;
  availableVersion: string;
  slotA: FirmwareSlot;
  slotB: FirmwareSlot;
  downloadProgress: number;
  signatureValid: boolean | null;
  integrityValid: boolean | null;
  healthCheckPassed: boolean | null;
  rollbackActive: boolean;
  failureType: string | null;
}

export interface RolloutStageData {
  stage: RolloutStage;
  fleetSize: number;
  successful: number;
  failed: number;
  rollbacks: number;
  healthCheckFailures: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
}

export interface SimulationEvent {
  id: string;
  timestamp: number;
  category: EventCategory;
  severity: EventSeverity;
  message: string;
  flightState: FlightState;
  eventType: string;
}

export interface FaultInjection {
  id: string;
  type: string;
  time: number;
  severity: EventSeverity;
  active: boolean;
  response: string;
  recoveryStatus: 'ACTIVE' | 'RECOVERING' | 'RECOVERED';
}

export interface SimulationSettings {
  fieldBoundary: Position[];
  safetyMargin: number;
  rtbThreshold: number;
  gpsAccuracyThreshold: number;
  simulationSpeed: number;
  batteryDrainRate: number;
  defaultGroundSpeed: number;
  nozzleFlowBase: number;
  nozzleFlowSpeedFactor: number;
}

export interface DroneState {
  id: string;
  position: Position;
  heading: number; // degrees
  groundSpeed: number; // m/s
  battery: BatteryState;
  gps: GPSState;
  sensors: SensorState;
  flightState: FlightState;
  spray: SprayState;
  rtb: RTBState;
  ota: OTAState;
  boundaryStatus: BoundaryStatus;
  distanceFromBoundary: number;
  networkConnected: boolean;
  firmwareVersion: string;
  distanceTraveled: number;
  missionActive: boolean;
  missionPaused: boolean;
  homePosition: Position;
  currentWaypointIndex: number;
}

export interface SimulationState {
  drone: DroneState;
  fieldBoundary: FieldBoundary;
  route: Route;
  events: SimulationEvent[];
  faults: FaultInjection[];
  settings: SimulationSettings;
  safetyLevel: SafetyLevel;
  running: boolean;
  speed: number;
  telemetryHistory: TelemetrySnapshot[];
  rolloutStages: RolloutStageData[];
  demoMode: boolean;
  demoStep: number;
}

export interface TelemetrySnapshot {
  timestamp: number;
  battery: number;
  groundSpeed: number;
  nozzleFlow: number;
  gpsAccuracy: number;
  altitude: number;
}

// Valid state transitions
export const VALID_TRANSITIONS: Record<FlightState, FlightState[]> = {
  INIT: ['PRE_FLIGHT'],
  PRE_FLIGHT: ['TAKEOFF'],
  TAKEOFF: ['FLYING', 'EMERGENCY'],
  FLYING: ['SPRAYING', 'RETURN_TO_BASE', 'SAFE_MODE', 'EMERGENCY'],
  SPRAYING: ['FLYING', 'SAFE_MODE', 'RETURN_TO_BASE', 'EMERGENCY'],
  RETURN_TO_BASE: ['LANDING', 'EMERGENCY'],
  LANDING: ['INIT', 'EMERGENCY'],
  SAFE_MODE: ['FLYING', 'RETURN_TO_BASE', 'EMERGENCY', 'INIT'],
  EMERGENCY: ['INIT'],
};
