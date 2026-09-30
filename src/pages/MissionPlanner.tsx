import React from 'react';
import { useSimulationStore } from '../state/simulationStore';
import { Play, Pause, Square, RotateCcw, MapPin, Route, Ruler } from 'lucide-react';
import FieldMap from '../components/FieldMap';
import { formatDuration } from '../utils/calculations';

const MissionPlanner: React.FC = () => {
  const drone = useSimulationStore(s => s.drone);
  const route = useSimulationStore(s => s.route);
  const fieldBoundary = useSimulationStore(s => s.fieldBoundary);
  const startMission = useSimulationStore(s => s.startMission);
  const pauseMission = useSimulationStore(s => s.pauseMission);
  const resumeMission = useSimulationStore(s => s.resumeMission);
  const stopMission = useSimulationStore(s => s.stopMission);
  const resetMission = useSimulationStore(s => s.resetMission);

  const waypointCount = route.waypoints.length;
  const completedWaypoints = Math.min(drone.currentWaypointIndex, waypointCount);
  const progressPct = waypointCount > 0 ? (completedWaypoints / waypointCount) * 100 : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mission Planner</h2>
        <div className="flex items-center gap-2">
          {!drone.missionActive ? (
            <button onClick={startMission} className="btn-primary" aria-label="Start mission">
              <Play size={16} /> Start Mission
            </button>
          ) : (
            <>
              {drone.missionPaused ? (
                <button onClick={resumeMission} className="btn-primary" aria-label="Resume mission">
                  <Play size={16} /> Resume
                </button>
              ) : (
                <button onClick={pauseMission} className="btn-warning" aria-label="Pause mission">
                  <Pause size={16} /> Pause
                </button>
              )}
              <button onClick={stopMission} className="btn-danger" aria-label="Stop mission">
                <Square size={16} /> Stop
              </button>
            </>
          )}
          <button onClick={resetMission} className="btn-ghost" aria-label="Reset mission">
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Map */}
        <div className="xl:col-span-2">
          <FieldMap width={620} height={420} />
        </div>

        {/* Mission Info */}
        <div className="space-y-4">
          {/* Mission Status */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Mission Status</h3>
            <div className="space-y-3">
              <InfoRow label="Status" value={drone.missionActive ? (drone.missionPaused ? 'PAUSED' : 'ACTIVE') : 'IDLE'} valueClass={drone.missionActive ? 'text-safe' : 'text-gray-500'} />
              <InfoRow label="Flight State" value={drone.flightState} valueClass="text-accent-cyan" />
              <InfoRow label="Route Progress" value={`${completedWaypoints} / ${waypointCount} waypoints`} />
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{progressPct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-blue rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <InfoRow label="Distance Traveled" value={`${drone.distanceTraveled.toFixed(0)}m`} />
              <InfoRow label="Total Route" value={`${route.totalDistance.toFixed(0)}m`} />
            </div>
          </div>

          {/* Field Info */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Field Configuration</h3>
            <div className="space-y-3">
              <InfoRow label="Boundary Points" value={`${fieldBoundary.points.length}`} />
              <InfoRow label="Safety Margin" value={`${fieldBoundary.safetyMargin}m`} />
              <InfoRow label="Home Position" value={`(${drone.homePosition.x}, ${drone.homePosition.y})`} />
            </div>
          </div>

          {/* Waypoints */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              <Route size={14} className="inline mr-1" /> Route Waypoints
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {route.waypoints.slice(0, 20).map((wp, i) => (
                <div key={wp.id} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${i === drone.currentWaypointIndex ? 'bg-accent-blue/15 text-accent-blue' : i < drone.currentWaypointIndex ? 'text-gray-600' : 'text-gray-400'}`}>
                  <MapPin size={10} />
                  <span className="font-mono">WP{i}</span>
                  <span>({wp.position.x.toFixed(0)}, {wp.position.y.toFixed(0)})</span>
                  {i === 0 && <span className="badge-info text-[9px] py-0 px-1">HOME</span>}
                  {i === drone.currentWaypointIndex && <span className="badge-safe text-[9px] py-0 px-1">CURRENT</span>}
                </div>
              ))}
              {route.waypoints.length > 20 && (
                <p className="text-xs text-gray-600 px-2">...and {route.waypoints.length - 20} more</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono font-medium ${valueClass || 'text-gray-300'}`}>{value}</span>
    </div>
  );
}

export default MissionPlanner;
