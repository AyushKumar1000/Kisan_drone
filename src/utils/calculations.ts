// ============================================================
// Utility calculations for KisanDrone simulation
// ============================================================

import { Position, FieldBoundary } from '../types/simulation';

/** Euclidean distance between two points */
export function distance(a: Position, b: Position): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Angle in degrees from point a to point b */
export function headingBetween(a: Position, b: Position): number {
  const rad = Math.atan2(b.y - a.y, b.x - a.x);
  return ((rad * 180) / Math.PI + 360) % 360;
}

/** Move a position towards a target by a given step distance */
export function moveTowards(from: Position, to: Position, step: number): Position {
  const d = distance(from, to);
  if (d <= step) return { ...to };
  const ratio = step / d;
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

/** 
 * Point-in-polygon test using ray casting algorithm
 * Determines if a point is inside a polygon defined by vertices
 */
export function isPointInPolygon(point: Position, polygon: Position[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Distance from a point to the nearest edge of a polygon */
export function distanceToPolygon(point: Position, polygon: Position[]): number {
  let minDist = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const d = distanceToSegment(point, polygon[i], polygon[j]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/** Distance from a point to a line segment */
function distanceToSegment(p: Position, a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Shrink a polygon inward by a margin (simplified approach) */
export function shrinkPolygon(polygon: Position[], margin: number): Position[] {
  if (polygon.length < 3) return polygon;
  const centroid = getCentroid(polygon);
  return polygon.map(p => {
    const d = distance(p, centroid);
    if (d === 0) return p;
    const ratio = Math.max(0, (d - margin) / d);
    return {
      x: centroid.x + (p.x - centroid.x) * ratio,
      y: centroid.y + (p.y - centroid.y) * ratio,
    };
  });
}

/** Get centroid of a polygon */
export function getCentroid(polygon: Position[]): Position {
  const n = polygon.length;
  const sum = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / n, y: sum.y / n };
}

/** Calculate total route distance */
export function routeDistance(waypoints: Position[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += distance(waypoints[i - 1], waypoints[i]);
  }
  return total;
}

/** Calculate remaining route distance from current index */
export function remainingRouteDistance(waypoints: Position[], currentPos: Position, currentIndex: number): number {
  if (currentIndex >= waypoints.length) return 0;
  let total = distance(currentPos, waypoints[currentIndex]);
  for (let i = currentIndex; i < waypoints.length - 1; i++) {
    total += distance(waypoints[i], waypoints[i + 1]);
  }
  return total;
}

/** Determine boundary status */
export function getBoundaryStatus(
  position: Position,
  boundary: FieldBoundary
): { status: 'INSIDE' | 'NEAR' | 'OUTSIDE'; distance: number } {
  const inside = isPointInPolygon(position, boundary.points);
  const dist = distanceToPolygon(position, boundary.points);

  if (!inside) {
    return { status: 'OUTSIDE', distance: -dist };
  }
  if (dist <= boundary.safetyMargin) {
    return { status: 'NEAR', distance: dist };
  }
  return { status: 'INSIDE', distance: dist };
}

/** Calculate nozzle flow based on ground speed */
export function calculateNozzleFlow(groundSpeed: number, baseFlow: number, speedFactor: number): number {
  // Flow = baseFlow * (1 + speedFactor * groundSpeed)
  // Higher speed → higher flow to maintain coverage
  return Math.max(0, baseFlow * (1 + speedFactor * groundSpeed));
}

/** Calculate RTB threshold dynamically */
export function calculateRTBThreshold(
  distanceToBase: number,
  groundSpeed: number,
  batteryDrainRate: number,
  safetyBuffer: number = 10 // extra % safety buffer
): number {
  if (groundSpeed <= 0) return 30; // default
  const timeToBase = distanceToBase / groundSpeed; // seconds
  const batteryNeeded = timeToBase * batteryDrainRate;
  return Math.min(50, Math.max(15, batteryNeeded + safetyBuffer));
}

/** Determine if RTB should trigger */
export function shouldTriggerRTB(
  batteryPercentage: number,
  rtbThreshold: number,
  alreadyActive: boolean
): boolean {
  if (alreadyActive) return true;
  return batteryPercentage <= rtbThreshold;
}

/** Check if GPS is valid based on accuracy threshold */
export function isGPSValid(accuracy: number, threshold: number, valid: boolean): boolean {
  return valid && accuracy <= threshold;
}

/** Centralized spray permission check */
export function canSpray(params: {
  insideBoundary: boolean;
  gpsValid: boolean;
  gpsAccuracy: number;
  gpsAccuracyThreshold: number;
  flightState: string;
  sensorHealthy: boolean;
  safetyLevel: string;
  missionActive: boolean;
  rtbActive: boolean;
}): { allowed: boolean; reason: string } {
  if (!params.missionActive) return { allowed: false, reason: 'Mission not active' };
  if (!params.insideBoundary) return { allowed: false, reason: 'Drone outside configured boundary' };
  if (!params.gpsValid) return { allowed: false, reason: 'GPS signal invalid' };
  if (params.gpsAccuracy > params.gpsAccuracyThreshold) return { allowed: false, reason: `GPS accuracy degraded (${params.gpsAccuracy.toFixed(1)}m > ${params.gpsAccuracyThreshold}m threshold)` };
  if (params.flightState === 'SAFE_MODE') return { allowed: false, reason: 'Drone in SAFE_MODE' };
  if (params.flightState === 'EMERGENCY') return { allowed: false, reason: 'Drone in EMERGENCY state' };
  if (params.flightState !== 'SPRAYING' && params.flightState !== 'FLYING') return { allowed: false, reason: `Invalid flight state: ${params.flightState}` };
  if (!params.sensorHealthy) return { allowed: false, reason: 'Critical sensor fault detected' };
  if (params.safetyLevel === 'CRITICAL') return { allowed: false, reason: 'System safety level is CRITICAL' };
  if (params.rtbActive) return { allowed: false, reason: 'Return-to-base is active' };
  return { allowed: true, reason: 'All safety checks passed' };
}

/** Validate firmware signature (simulated) */
export function validateFirmwareSignature(signatureType: 'valid' | 'invalid'): boolean {
  return signatureType === 'valid';
}

/** Validate firmware integrity (simulated) */
export function validateFirmwareIntegrity(integrityType: 'valid' | 'corrupted'): boolean {
  return integrityType === 'valid';
}

/** Run firmware health check (simulated) */
export function runFirmwareHealthCheck(shouldPass: boolean): boolean {
  return shouldPass;
}

/** Calculate risk exposure score 0-100 */
export function calculateRiskExposure(params: {
  boundaryStatus: string;
  gpsValid: boolean;
  gpsAccuracy: number;
  batteryPercentage: number;
  sensorFaults: number;
  networkConnected: boolean;
}): number {
  let risk = 0;
  if (params.boundaryStatus === 'OUTSIDE') risk += 40;
  else if (params.boundaryStatus === 'NEAR') risk += 15;
  if (!params.gpsValid) risk += 25;
  else if (params.gpsAccuracy > 3) risk += 10;
  if (params.batteryPercentage < 15) risk += 20;
  else if (params.batteryPercentage < 25) risk += 10;
  if (params.sensorFaults > 0) risk += params.sensorFaults * 10;
  if (!params.networkConnected) risk += 5;
  return Math.min(100, risk);
}

/** Generate unique ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** Format timestamp */
export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Format duration in seconds to readable */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

/** Clamp a number to a range */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
