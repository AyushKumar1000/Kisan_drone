import React from 'react';
import { useSimulationStore } from '../state/simulationStore';
import { Shield, ShieldAlert, ShieldX, AlertTriangle, CheckCircle2 } from 'lucide-react';
import FieldMap from '../components/FieldMap';
import { canSpray, isGPSValid } from '../utils/calculations';

const SafetyBoundary: React.FC = () => {
  const drone = useSimulationStore(s => s.drone);
  const settings = useSimulationStore(s => s.settings);
  const safetyLevel = useSimulationStore(s => s.safetyLevel);
  const events = useSimulationStore(s => s.events);
  const setDronePosition = useSimulationStore(s => s.setDronePosition);

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

  const safetyEvents = events.filter(e => e.category === 'SAFETY').slice(-10).reverse();

  // Test positions
  const testPositions = [
    { label: 'Inside Field (Center)', pos: { x: 300, y: 200 }, safe: true },
    { label: 'Near Boundary', pos: { x: 70, y: 70 }, safe: false },
    { label: 'Outside Boundary', pos: { x: 20, y: 20 }, safe: false },
    { label: 'Far Outside', pos: { x: -50, y: -50 }, safe: false },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Safety & Boundary Protection</h2>
        <div className={safetyLevel === 'SAFE' ? 'badge-safe' : safetyLevel === 'WARNING' ? 'badge-warning' : 'badge-critical'}>
          {safetyLevel === 'SAFE' && <Shield size={12} />}
          {safetyLevel === 'WARNING' && <ShieldAlert size={12} />}
          {safetyLevel === 'CRITICAL' && <ShieldX size={12} />}
          {safetyLevel}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Map */}
        <div className="xl:col-span-2">
          <FieldMap width={620} height={420} />

          {/* Test buttons */}
          <div className="card mt-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Boundary Test: Move Drone</h3>
            <p className="text-xs text-gray-500 mb-3">Click to move the drone to test positions and observe safety response.</p>
            <div className="flex flex-wrap gap-2">
              {testPositions.map((tp, i) => (
                <button
                  key={i}
                  onClick={() => setDronePosition(tp.pos)}
                  className={tp.safe ? 'btn-ghost btn-sm' : 'btn-danger btn-sm'}
                  aria-label={`Move drone to ${tp.label}`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Safety Status */}
        <div className="space-y-4">
          {/* Boundary Status */}
          <div className={`card border-2 ${drone.boundaryStatus === 'INSIDE' ? 'border-safe/40' : drone.boundaryStatus === 'NEAR' ? 'border-warning/40' : 'border-critical/40'}`}>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Boundary Status</h3>
            <div className={`text-2xl font-bold font-mono mb-2 ${drone.boundaryStatus === 'INSIDE' ? 'text-safe' : drone.boundaryStatus === 'NEAR' ? 'text-warning' : 'text-critical'}`}>
              {drone.boundaryStatus === 'INSIDE' ? 'INSIDE BOUNDARY' : drone.boundaryStatus === 'NEAR' ? 'NEAR BOUNDARY' : 'OUTSIDE BOUNDARY'}
            </div>
            <p className="text-xs text-gray-500">
              Distance: {Math.abs(drone.distanceFromBoundary).toFixed(1)}m {drone.boundaryStatus === 'OUTSIDE' ? '(outside)' : '(from edge)'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Safety Margin: {settings.safetyMargin}m
            </p>
          </div>

          {/* Spray Permission */}
          <div className={`card border-2 ${sprayCheck.allowed ? 'border-safe/40' : 'border-critical/40'}`}>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Spray Permission</h3>
            <div className="flex items-center gap-2 mb-2">
              {sprayCheck.allowed ? (
                <CheckCircle2 size={20} className="text-safe" />
              ) : (
                <AlertTriangle size={20} className="text-critical" />
              )}
              <span className={`text-lg font-bold ${sprayCheck.allowed ? 'text-safe' : 'text-critical'}`}>
                {sprayCheck.allowed ? 'SPRAY PERMITTED' : 'SPRAY BLOCKED'}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              <span className="font-semibold">Reason: </span>
              {sprayCheck.reason}
            </p>
          </div>

          {/* Safety Checks */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Safety Checks</h3>
            <div className="space-y-2">
              <SafetyCheck label="Boundary" ok={drone.boundaryStatus !== 'OUTSIDE'} status={drone.boundaryStatus} />
              <SafetyCheck label="GPS Valid" ok={drone.gps.valid} status={drone.gps.valid ? 'VALID' : 'GPS INVALID'} />
              <SafetyCheck label="GPS Accuracy" ok={gpsOk} status={`${drone.gps.accuracy.toFixed(1)}m (threshold: ${settings.gpsAccuracyThreshold}m)`} />
              <SafetyCheck label="Sensor Health" ok={sensorHealthy} status={sensorHealthy ? 'HEALTHY' : 'SENSOR FAULT'} />
              <SafetyCheck label="Flight State" ok={!['SAFE_MODE', 'EMERGENCY'].includes(drone.flightState)} status={drone.flightState} />
              <SafetyCheck label="Mission Active" ok={drone.missionActive} status={drone.missionActive ? 'YES' : 'NO'} />
              <SafetyCheck label="RTB Active" ok={!drone.rtb.active} status={drone.rtb.active ? 'RTB ACTIVE' : 'Normal'} />
              <SafetyCheck label="Network" ok={drone.networkConnected} status={drone.networkConnected ? 'CONNECTED' : 'DISCONNECTED'} />
            </div>
          </div>

          {/* Safety Events */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Safety Events</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {safetyEvents.length === 0 ? (
                <p className="text-xs text-gray-600">No safety events</p>
              ) : (
                safetyEvents.map(ev => (
                  <div key={ev.id} className="text-xs flex gap-2 py-1">
                    <AlertTriangle size={12} className={ev.severity === 'CRITICAL' ? 'text-critical' : 'text-warning'} />
                    <span className="text-gray-400">{ev.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="card border-navy-500">
        <p className="text-xs text-gray-600 text-center">
          ⚠️ This is a software engineering safety simulation. It does NOT control real drones, aircraft, flight controllers, pesticide sprayers, or agricultural equipment.
        </p>
      </div>
    </div>
  );
};

function SafetyCheck({ label, ok, status }: { label: string; ok: boolean; status: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-navy-800">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${ok ? 'bg-safe' : 'bg-critical'}`} />
        <span className="text-gray-400">{label}</span>
      </div>
      <span className={`font-mono font-medium ${ok ? 'text-safe' : 'text-critical'}`}>{status}</span>
    </div>
  );
}

export default SafetyBoundary;
