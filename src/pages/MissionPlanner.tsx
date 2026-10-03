import React from 'react';
import { useSimulationStore, FIELD_PRESETS } from '../state/simulationStore';
import { Play, Pause, Square, RotateCcw, MapPin, Route, Ruler, Layers, Sparkles, Shield } from 'lucide-react';
import FieldMap from '../components/FieldMap';
import { formatDuration, calculatePolygonArea, formatArea } from '../utils/calculations';

export const MissionPlanner: React.FC = () => {
  const drone = useSimulationStore(s => s.drone);
  const route = useSimulationStore(s => s.route);
  const fieldBoundary = useSimulationStore(s => s.fieldBoundary);
  const startMission = useSimulationStore(s => s.startMission);
  const pauseMission = useSimulationStore(s => s.pauseMission);
  const resumeMission = useSimulationStore(s => s.resumeMission);
  const stopMission = useSimulationStore(s => s.stopMission);
  const resetMission = useSimulationStore(s => s.resetMission);
  const applyFieldPreset = useSimulationStore(s => s.applyFieldPreset);

  const waypointCount = route.waypoints.length;
  const completedWaypoints = Math.min(drone.currentWaypointIndex, waypointCount);
  const progressPct = waypointCount > 0 ? (completedWaypoints / waypointCount) * 100 : 0;

  const areaInfo = formatArea(calculatePolygonArea(fieldBoundary.points));

  // Estimated spray volume needed (assuming 15L per hectare)
  const estLiters = (calculatePolygonArea(fieldBoundary.points) * 0.0001 * 15).toFixed(1);
  const estFlightSeconds = drone.groundSpeed > 0 ? route.totalDistance / drone.groundSpeed : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Route className="text-accent-cyan" size={22} />
            Autonomous Route & Precision Coverage Planner
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Serpentine swath planning constrained strictly within the farmer's traced geofence to prevent overspray into neighbouring lands.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!drone.missionActive ? (
            <button onClick={startMission} className="btn-primary text-xs flex items-center gap-1.5" aria-label="Start mission">
              <Play size={14} /> Start Spray Mission
            </button>
          ) : (
            <>
              {drone.missionPaused ? (
                <button onClick={resumeMission} className="btn-primary text-xs flex items-center gap-1.5" aria-label="Resume mission">
                  <Play size={14} /> Resume
                </button>
              ) : (
                <button onClick={pauseMission} className="btn-warning text-xs flex items-center gap-1.5" aria-label="Pause mission">
                  <Pause size={14} /> Pause
                </button>
              )}
              <button onClick={stopMission} className="btn-danger text-xs flex items-center gap-1.5" aria-label="Stop mission">
                <Square size={14} /> Abort
              </button>
            </>
          )}
          <button onClick={resetMission} className="btn-secondary text-xs flex items-center gap-1.5" aria-label="Reset mission">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Map & Presets */}
        <div className="xl:col-span-2 space-y-4">
          <FieldMap width={620} height={420} />

          {/* Preset Farm Quick Select */}
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers size={14} className="text-accent-blue" />
                Quick Field Preset Geometry
              </h3>
              <span className="text-[11px] text-gray-400">Adaptive coverage recalculated automatically</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(FIELD_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyFieldPreset(key)}
                  className="p-2.5 rounded-lg border bg-navy-900/60 border-navy-700 hover:border-accent-blue hover:text-white text-gray-300 text-left transition-colors"
                >
                  <div className="text-xs font-bold truncate">{preset.name.split('(')[0]}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 truncate">{preset.points.length} corners</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mission Telemetry & Waypoints */}
        <div className="space-y-4">
          {/* Mission Status */}
          <div className="panel p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mission Execution Status</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-navy-700">
                <span className="text-gray-400">Mission State:</span>
                <span className={`font-mono font-bold ${drone.missionActive ? 'text-safe' : 'text-gray-400'}`}>
                  {drone.missionActive ? (drone.missionPaused ? 'PAUSED' : 'ACTIVE IN FLIGHT') : 'STANDBY IDLE'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-700">
                <span className="text-gray-400">Current Flight Mode:</span>
                <span className="font-mono text-accent-cyan font-bold">{drone.flightState}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-700">
                <span className="text-gray-400">Route Waypoints:</span>
                <span className="font-mono text-white">{completedWaypoints} / {waypointCount} completed</span>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Coverage Progress:</span>
                  <span className="font-mono text-white">{progressPct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-navy-900 rounded-full overflow-hidden border border-navy-700">
                  <div className="h-full bg-gradient-to-r from-accent-blue to-accent-cyan rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Field Plan Calculations */}
          <div className="panel p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Traced Field Metrics</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-navy-700">
                <span className="text-gray-400">Traced Field Area:</span>
                <span className="font-mono font-bold text-white">{areaInfo.acres} ({areaInfo.hectares})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-700">
                <span className="text-gray-400">Total Swath Flight Path:</span>
                <span className="font-mono text-accent-cyan font-bold">{route.totalDistance.toFixed(0)} meters</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-700">
                <span className="text-gray-400">Estimated Mission Duration:</span>
                <span className="font-mono text-gray-200">{formatDuration(estFlightSeconds)} (@ {drone.groundSpeed || 5} m/s)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Est. Agro-Chemical Volume:</span>
                <span className="font-mono text-safe font-bold">{estLiters} Litres</span>
              </div>
            </div>
          </div>

          {/* Waypoint Coordinates */}
          <div className="panel p-4 space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Swath Waypoint Sequence</span>
              <span className="font-mono text-[10px] text-gray-500">{route.waypoints.length} Points</span>
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-[11px]">
              {route.waypoints.map((wp, i) => (
                <div
                  key={wp.id}
                  className={`flex items-center justify-between py-1 px-2 rounded ${
                    i === drone.currentWaypointIndex
                      ? 'bg-accent-blue/20 text-accent-cyan font-bold border border-accent-blue/30'
                      : i < drone.currentWaypointIndex
                      ? 'text-gray-500'
                      : 'text-gray-300 hover:bg-navy-700/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin size={10} className={i === 0 ? 'text-warning' : 'text-accent-blue'} />
                    <span>WP{i}</span>
                    <span className="text-gray-500">({wp.position.x.toFixed(0)}, {wp.position.y.toFixed(0)})</span>
                  </div>
                  {i === 0 && <span className="text-[9px] px-1.5 py-0.2 rounded bg-warning/20 text-warning font-sans">BASE</span>}
                  {i === drone.currentWaypointIndex && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-safe/20 text-safe font-sans">TARGET</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionPlanner;
