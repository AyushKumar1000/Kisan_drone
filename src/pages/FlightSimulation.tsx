import React from 'react';
import { useSimulationStore } from '../state/simulationStore';
import { Play, Pause, Square, RotateCcw, Gauge, Navigation, Battery, MapPin, Compass } from 'lucide-react';
import FieldMap from '../components/FieldMap';

const FlightSimulation: React.FC = () => {
  const drone = useSimulationStore(s => s.drone);
  const speed = useSimulationStore(s => s.speed);
  const running = useSimulationStore(s => s.running);
  const route = useSimulationStore(s => s.route);
  const startMission = useSimulationStore(s => s.startMission);
  const pauseMission = useSimulationStore(s => s.pauseMission);
  const resumeMission = useSimulationStore(s => s.resumeMission);
  const stopMission = useSimulationStore(s => s.stopMission);
  const resetMission = useSimulationStore(s => s.resetMission);
  const setGroundSpeed = useSimulationStore(s => s.setGroundSpeed);
  const setBatteryDrainRate = useSimulationStore(s => s.setBatteryDrainRate);
  const setGPSAccuracy = useSimulationStore(s => s.setGPSAccuracy);
  const setSimulationSpeed = useSimulationStore(s => s.setSimulationSpeed);
  const setBatteryLevel = useSimulationStore(s => s.setBatteryLevel);

  const speedOptions = [0.5, 1, 2, 5];
  const remainingWP = Math.max(0, route.waypoints.length - drone.currentWaypointIndex);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Flight Simulation</h2>
        <div className="flex items-center gap-2">
          {!drone.missionActive ? (
            <button onClick={startMission} className="btn-primary" aria-label="Start flight">
              <Play size={16} /> Start
            </button>
          ) : (
            <>
              {drone.missionPaused ? (
                <button onClick={resumeMission} className="btn-primary" aria-label="Resume">
                  <Play size={16} /> Resume
                </button>
              ) : (
                <button onClick={pauseMission} className="btn-warning" aria-label="Pause">
                  <Pause size={16} /> Pause
                </button>
              )}
              <button onClick={stopMission} className="btn-danger" aria-label="Stop">
                <Square size={16} /> Stop
              </button>
            </>
          )}
          <button onClick={resetMission} className="btn-ghost" aria-label="Reset">
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Map */}
        <div className="xl:col-span-2">
          <FieldMap width={620} height={420} />
        </div>

        {/* Controls & Telemetry */}
        <div className="space-y-4">
          {/* Flight Data */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Flight Data</h3>
            <div className="grid grid-cols-2 gap-3">
              <DataCell icon={<MapPin size={13} className="text-accent-cyan" />} label="Position" value={`(${drone.position.x.toFixed(0)}, ${drone.position.y.toFixed(0)})`} />
              <DataCell icon={<Compass size={13} className="text-accent-purple" />} label="Heading" value={`${drone.heading.toFixed(0)}°`} />
              <DataCell icon={<Gauge size={13} className="text-accent-blue" />} label="Speed" value={`${drone.groundSpeed.toFixed(1)} m/s`} />
              <DataCell icon={<Navigation size={13} className="text-safe" />} label="Distance" value={`${drone.distanceTraveled.toFixed(0)}m`} />
              <DataCell icon={<Battery size={13} className={drone.battery.percentage > 30 ? 'text-safe' : 'text-critical'} />} label="Battery" value={`${drone.battery.percentage.toFixed(1)}%`} />
              <DataCell label="Flight Mode" value={drone.flightState} valueClass={drone.flightState === 'EMERGENCY' ? 'text-critical' : 'text-accent-cyan'} />
              <DataCell label="Remaining WP" value={`${remainingWP}`} />
              <DataCell label="Spray" value={drone.spray.active ? 'ACTIVE' : 'OFF'} valueClass={drone.spray.active ? 'text-safe' : 'text-gray-500'} />
            </div>
          </div>

          {/* Simulation Speed */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Simulation Speed</h3>
            <div className="flex gap-2">
              {speedOptions.map(s => (
                <button
                  key={s}
                  onClick={() => setSimulationSpeed(s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${speed === s ? 'bg-accent-blue text-white' : 'bg-navy-700 text-gray-400 hover:bg-navy-600'}`}
                  aria-label={`Set simulation speed to ${s}x`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Simulation Controls</h3>
            <div className="space-y-3">
              <SliderControl
                label="Ground Speed"
                value={drone.groundSpeed}
                min={0} max={15} step={0.5}
                unit="m/s"
                onChange={setGroundSpeed}
              />
              <SliderControl
                label="Battery Drain Rate"
                value={drone.battery.drainRate}
                min={0} max={2} step={0.05}
                unit="%/s"
                onChange={setBatteryDrainRate}
              />
              <SliderControl
                label="GPS Accuracy"
                value={drone.gps.accuracy}
                min={0.1} max={20} step={0.1}
                unit="m"
                onChange={setGPSAccuracy}
              />
              <SliderControl
                label="Battery Level"
                value={drone.battery.percentage}
                min={0} max={100} step={1}
                unit="%"
                onChange={setBatteryLevel}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function DataCell({ icon, label, value, valueClass }: { icon?: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-navy-800 rounded-lg p-2.5">
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] text-gray-500 uppercase">{label}</span>
      </div>
      <span className={`text-sm font-mono font-bold ${valueClass || 'text-gray-100'}`}>{value}</span>
    </div>
  );
}

function SliderControl({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <label className="text-gray-500">{label}</label>
        <span className="text-gray-300 font-mono">{value.toFixed(step < 1 ? 1 : 0)} {unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-navy-700 rounded-full appearance-none cursor-pointer accent-accent-blue"
        aria-label={label}
      />
    </div>
  );
}

export default FlightSimulation;
