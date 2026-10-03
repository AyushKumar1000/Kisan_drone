import React, { useState } from 'react';
import { useSimulationStore, FIELD_PRESETS } from '../state/simulationStore';
import {
  Shield, ShieldAlert, ShieldX, AlertTriangle, CheckCircle2,
  PenTool, RotateCcw, Check, MapPin, Eye, Info, Sparkles, Navigation, Layers
} from 'lucide-react';
import FieldMap from '../components/FieldMap';
import { canSpray, isGPSValid, calculatePolygonArea, formatArea, Position } from '../utils/calculations';

export const SafetyBoundary: React.FC = () => {
  const drone = useSimulationStore(s => s.drone);
  const settings = useSimulationStore(s => s.settings);
  const fieldBoundary = useSimulationStore(s => s.fieldBoundary);
  const safetyLevel = useSimulationStore(s => s.safetyLevel);
  const events = useSimulationStore(s => s.events);
  const setDronePosition = useSimulationStore(s => s.setDronePosition);
  const setCustomBoundary = useSimulationStore(s => s.setCustomBoundary);
  const applyFieldPreset = useSimulationStore(s => s.applyFieldPreset);

  const [isTracingMode, setIsTracingMode] = useState(false);
  const [tracedPoints, setTracedPoints] = useState<Position[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('SUGARCANE_ALPHA');

  const sensorHealthy = !Object.values(drone.sensors).includes('FAULT');
  const gpsOk = isGPSValid(drone.gps.accuracy, settings.gpsAccuracyThreshold, drone.gps.valid);

  const sprayCheck = canSpray({
    insideBoundary: drone.boundaryStatus !== 'OUTSIDE',
    gpsValid: drone.gps.valid,
    gpsAccuracy: drone.gps.accuracy,
    gpsAccuracyThreshold: settings.gpsAccuracyThreshold,
    flightState: drone.flightState,
    sensorHealthy,
    safetyLevel,
    missionActive: drone.missionActive,
    rtbActive: drone.rtb.active,
  });

  const safetyEvents = events.filter(e => e.category === 'SAFETY').slice(-8).reverse();

  // Calculated area of current active boundary
  const currentArea = formatArea(calculatePolygonArea(fieldBoundary.points));

  // Traced polygon area preview
  const tracedArea = isTracingMode && tracedPoints.length >= 3
    ? formatArea(calculatePolygonArea(tracedPoints))
    : null;

  const handleMapClick = (pos: Position) => {
    if (!isTracingMode) return;
    setTracedPoints(prev => [...prev, pos]);
  };

  const handleStartTracing = () => {
    setIsTracingMode(true);
    setTracedPoints([]);
  };

  const handleCancelTracing = () => {
    setIsTracingMode(false);
    setTracedPoints([]);
  };

  const handleUndoPoint = () => {
    setTracedPoints(prev => prev.slice(0, -1));
  };

  const handleFinishTracing = () => {
    if (tracedPoints.length < 3) {
      alert('Please click at least 3 points on the map to define a closed field boundary.');
      return;
    }
    setCustomBoundary(tracedPoints);
    setIsTracingMode(false);
    setTracedPoints([]);
  };

  const handleSelectPreset = (key: string) => {
    setSelectedPreset(key);
    applyFieldPreset(key);
    if (isTracingMode) {
      setIsTracingMode(false);
      setTracedPoints([]);
    }
  };

  // Test positions to demonstrate boundary safety
  const testPositions = [
    { label: 'Inside My Field (Center)', pos: { x: 300, y: 220 }, safe: true },
    { label: 'Near Boundary Buffer', pos: { x: 75, y: 75 }, safe: false },
    { label: 'Over Boundary into Neighbour Farm', pos: { x: 25, y: 25 }, safe: false },
    { label: 'Deep in Neighbour Territory', pos: { x: 580, y: 30 }, safe: false },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="text-accent-cyan" size={22} />
            Field Boundary Tracing & Neighbour Protection
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Farmer interactive boundary tracing tool with dynamic 30m geofence isolation to strictly prevent chemical drift into adjacent organic farms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isTracingMode ? (
            <>
              <button
                onClick={handleFinishTracing}
                disabled={tracedPoints.length < 3}
                className="btn-success text-xs flex items-center gap-1.5"
              >
                <Check size={14} /> Lock & Apply Traced Field ({tracedPoints.length} Points)
              </button>
              <button
                onClick={handleUndoPoint}
                disabled={tracedPoints.length === 0}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                Undo Point
              </button>
              <button
                onClick={handleCancelTracing}
                className="btn-ghost text-xs text-gray-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleStartTracing}
              className="btn-primary text-xs flex items-center gap-1.5 bg-gradient-to-r from-accent-blue to-accent-cyan"
            >
              <PenTool size={14} /> Trace New Field Boundary
            </button>
          )}
        </div>
      </div>

      {/* Tracing Mode Active Banner */}
      {isTracingMode && (
        <div className="panel bg-accent-cyan/10 border-accent-cyan/40 p-4 animate-pulse">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PenTool className="text-accent-cyan shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-bold text-white">Farmer Field Tracing Active</h4>
                <p className="text-xs text-gray-300">
                  Click on the map to place boundary corners around your sugarcane field. Click at least 3 points, then click "Lock & Apply Traced Field".
                </p>
              </div>
            </div>
            {tracedArea && (
              <div className="bg-navy-900/80 px-3 py-1.5 rounded border border-accent-cyan/30 text-xs text-accent-cyan font-mono">
                Live Traced Area: <strong>{tracedArea.acres}</strong> ({tracedArea.hectares})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Map & Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Map and Field Selector */}
        <div className="xl:col-span-2 space-y-4">
          <FieldMap
            width={620}
            height={420}
            isTracing={isTracingMode}
            tracedPoints={tracedPoints}
            onMapClick={handleMapClick}
            interactiveMoveDrone={true}
          />

          {/* Preset Field Selector */}
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers size={14} className="text-accent-blue" />
                Select Farm Field Preset or Load Traced Geometry
              </h3>
              <span className="text-[11px] text-gray-400 font-mono">
                Active: {fieldBoundary.points.length} vertices
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(FIELD_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handleSelectPreset(key)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedPreset === key && !isTracingMode
                      ? 'bg-accent-blue/15 border-accent-blue text-white'
                      : 'bg-navy-900/60 border-navy-700 hover:border-navy-600 text-gray-300'
                  }`}
                >
                  <div className="text-xs font-bold">{preset.name}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Move Drone Testbed */}
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Navigation size={14} className="text-warning" />
                Anti-Drift Safety Testbed (Move Drone)
              </h3>
              <span className="text-[10px] text-gray-400">Click button or click on map to reposition drone</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {testPositions.map((tp, i) => (
                <button
                  key={i}
                  onClick={() => setDronePosition(tp.pos)}
                  className={`text-xs px-3 py-1.5 rounded transition-all ${
                    tp.safe
                      ? 'btn-secondary text-safe border-safe/30 hover:bg-safe/20'
                      : 'btn-secondary text-critical border-critical/30 hover:bg-critical/20'
                  }`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Safety Telemetry & Interlock Details */}
        <div className="space-y-4">
          {/* Current Field Metrics */}
          <div className="panel p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Farmer Field Geometry</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-navy-700">
                <span className="text-gray-400">Total Calculated Area:</span>
                <span className="font-mono font-bold text-white">{currentArea.acres} ({currentArea.hectares})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-700">
                <span className="text-gray-400">Boundary Vertices:</span>
                <span className="font-mono text-accent-cyan font-bold">{fieldBoundary.points.length} GPS Corners</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-700">
                <span className="text-gray-400">Buffer Safety Margin:</span>
                <span className="font-mono text-safe font-bold">{settings.safetyMargin} meters</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Home Base Location:</span>
                <span className="font-mono text-gray-300">({drone.homePosition.x}, {drone.homePosition.y})</span>
              </div>
            </div>
          </div>

          {/* Boundary Status Alert Box */}
          <div
            className={`panel p-4 border-2 transition-all ${
              drone.boundaryStatus === 'INSIDE'
                ? 'border-safe bg-safe/10'
                : drone.boundaryStatus === 'NEAR'
                ? 'border-warning bg-warning/10'
                : 'border-critical bg-critical/10'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-300 uppercase">Real-Time Boundary Status</span>
              <div className={safetyLevel === 'SAFE' ? 'badge-safe' : safetyLevel === 'WARNING' ? 'badge-warning' : 'badge-critical'}>
                {drone.boundaryStatus}
              </div>
            </div>
            <div
              className={`text-xl font-bold font-mono ${
                drone.boundaryStatus === 'INSIDE'
                  ? 'text-safe'
                  : drone.boundaryStatus === 'NEAR'
                  ? 'text-warning'
                  : 'text-critical'
              }`}
            >
              {drone.boundaryStatus === 'INSIDE'
                ? 'INSIDE AUTHORIZED FIELD'
                : drone.boundaryStatus === 'NEAR'
                ? 'APPROACHING 30M BUFFER'
                : 'OUTSIDE BOUNDARY (BREACH)'}
            </div>
            <p className="text-xs text-gray-300 mt-2">
              Current distance to nearest perimeter edge:{' '}
              <strong className="font-mono text-white">{Math.abs(drone.distanceFromBoundary).toFixed(1)}m</strong>{' '}
              {drone.boundaryStatus === 'OUTSIDE' ? '(inside adjacent non-fly zone)' : '(inside field)'}.
            </p>
          </div>

          {/* Spray Interlock Status */}
          <div
            className={`panel p-4 border-2 transition-all ${
              sprayCheck.allowed ? 'border-safe/50 bg-safe/5' : 'border-critical/50 bg-critical/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {sprayCheck.allowed ? (
                <CheckCircle2 size={18} className="text-safe" />
              ) : (
                <AlertTriangle size={18} className="text-critical" />
              )}
              <span className={`text-sm font-bold ${sprayCheck.allowed ? 'text-safe' : 'text-critical'}`}>
                {sprayCheck.allowed ? 'SPRAY VALVE PERMITTED' : 'SPRAY HARD-CUT ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-gray-300">
              <strong className="text-white">Interlock Reason: </strong>
              {sprayCheck.reason}
            </p>
          </div>

          {/* Safety Check Invariants */}
          <div className="panel p-4 space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Avionics Safety Invariants</h3>
            <div className="space-y-1.5 text-xs">
              <SafetyCheckRow label="Field Boundary Gating" ok={drone.boundaryStatus !== 'OUTSIDE'} status={drone.boundaryStatus} />
              <SafetyCheckRow label="GNSS Lock & Fix" ok={drone.gps.valid} status={drone.gps.valid ? 'VALID' : 'INVALID'} />
              <SafetyCheckRow label="GPS HDOP Accuracy" ok={gpsOk} status={`±${drone.gps.accuracy.toFixed(1)}m (Max: ${settings.gpsAccuracyThreshold}m)`} />
              <SafetyCheckRow label="Avionics Sensors" ok={sensorHealthy} status={sensorHealthy ? 'HEALTHY' : 'FAULT'} />
              <SafetyCheckRow label="Anti-Drift Safe Mode" ok={!['SAFE_MODE', 'EMERGENCY'].includes(drone.flightState)} status={drone.flightState} />
            </div>
          </div>

          {/* Recent Safety Logs */}
          <div className="panel p-4 space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Safety Audit Events</h3>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {safetyEvents.length === 0 ? (
                <p className="text-xs text-gray-500">No active safety warnings</p>
              ) : (
                safetyEvents.map(ev => (
                  <div key={ev.id} className="text-[11px] flex items-start gap-1.5 py-1 border-b border-navy-700/50">
                    <AlertTriangle size={12} className={ev.severity === 'CRITICAL' ? 'text-critical shrink-0 mt-0.5' : 'text-warning shrink-0 mt-0.5'} />
                    <span className="text-gray-300">{ev.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function SafetyCheckRow({ label, ok, status }: { label: string; ok: boolean; status: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-1 px-2 rounded bg-navy-900/60 border border-navy-700/40">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${ok ? 'bg-safe' : 'bg-critical'}`} />
        <span className="text-gray-400">{label}</span>
      </div>
      <span className={`font-mono text-[11px] ${ok ? 'text-safe' : 'text-critical font-bold'}`}>{status}</span>
    </div>
  );
}

export default SafetyBoundary;
