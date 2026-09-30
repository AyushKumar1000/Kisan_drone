import React from 'react';
import { useSimulationStore } from '../state/simulationStore';
import { Droplets, AlertTriangle, CheckCircle2, Gauge, Power, ShieldX } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, CartesianGrid, YAxis, Tooltip } from 'recharts';
import { isGPSValid, canSpray } from '../utils/calculations';

const SprayControl: React.FC = () => {
  const drone = useSimulationStore(s => s.drone);
  const settings = useSimulationStore(s => s.settings);
  const safetyLevel = useSimulationStore(s => s.safetyLevel);
  const telemetryHistory = useSimulationStore(s => s.telemetryHistory);
  const toggleSpray = useSimulationStore(s => s.toggleSpray);
  const setGroundSpeed = useSimulationStore(s => s.setGroundSpeed);

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

  const flowData = telemetryHistory.slice(-60).map((t, i) => ({ idx: i, flow: t.nozzleFlow, speed: t.groundSpeed }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Spray Control</h2>
        <div className={drone.spray.active ? 'badge-safe' : !drone.spray.permitted ? 'badge-critical' : 'badge-neutral'}>
          <Droplets size={12} />
          {drone.spray.active ? 'SPRAY ACTIVE' : !drone.spray.permitted ? 'SPRAY BLOCKED' : 'SPRAY OFF'}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Spray Status */}
        <div className="space-y-4">
          {/* Main spray card */}
          <div className={`card border-2 ${drone.spray.active ? 'border-safe/40' : !drone.spray.permitted ? 'border-critical/40' : 'border-navy-600'}`}>
            <div className="flex flex-col items-center py-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${drone.spray.active ? 'bg-safe/20' : !drone.spray.permitted ? 'bg-critical/20' : 'bg-navy-700'}`}>
                <Droplets size={36} className={drone.spray.active ? 'text-safe' : !drone.spray.permitted ? 'text-critical' : 'text-gray-500'} />
              </div>
              <div className={`text-xl font-bold mb-1 ${drone.spray.active ? 'text-safe' : !drone.spray.permitted ? 'text-critical' : 'text-gray-400'}`}>
                {drone.spray.active ? 'SPRAYING' : !drone.spray.permitted ? 'SPRAY BLOCKED' : 'SPRAY OFF'}
              </div>
              {!drone.spray.permitted && (
                <div className="flex items-center gap-1 mt-2">
                  <AlertTriangle size={14} className="text-critical" />
                  <span className="text-xs text-critical">{drone.spray.blockReason}</span>
                </div>
              )}
              <button
                onClick={toggleSpray}
                disabled={!drone.spray.permitted && !drone.spray.active}
                className={`mt-4 ${drone.spray.active ? 'btn-danger' : 'btn-success'} ${(!drone.spray.permitted && !drone.spray.active) ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={drone.spray.active ? 'Disable spray' : 'Enable spray'}
              >
                <Power size={16} />
                {drone.spray.active ? 'Disable Spray' : 'Enable Spray'}
              </button>
            </div>
          </div>

          {/* Safety checks for spray */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Spray Safety Checks</h3>
            <div className="space-y-2">
              <SprayCheck label="Inside Boundary" ok={drone.boundaryStatus !== 'OUTSIDE'} status={drone.boundaryStatus} />
              <SprayCheck label="GPS Valid" ok={drone.gps.valid} status={drone.gps.valid ? 'YES' : 'GPS INVALID'} />
              <SprayCheck label="GPS Accuracy" ok={gpsOk} status={`${drone.gps.accuracy.toFixed(1)}m`} />
              <SprayCheck label="Flight State" ok={['FLYING', 'SPRAYING'].includes(drone.flightState)} status={drone.flightState} />
              <SprayCheck label="Sensors" ok={sensorHealthy} status={sensorHealthy ? 'HEALTHY' : 'SENSOR FAULT'} />
              <SprayCheck label="Mission Active" ok={drone.missionActive} status={drone.missionActive ? 'YES' : 'NO'} />
              <SprayCheck label="RTB" ok={!drone.rtb.active} status={drone.rtb.active ? 'RTB ACTIVE' : 'Normal'} />
              <SprayCheck label="Safety Level" ok={safetyLevel !== 'CRITICAL'} status={safetyLevel} />
            </div>
          </div>
        </div>

        {/* Nozzle Flow */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Nozzle Flow</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-navy-800 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Target Flow</p>
                <p className="text-lg font-bold font-mono text-accent-cyan">{drone.spray.targetFlow.toFixed(2)}</p>
                <p className="text-[10px] text-gray-500">L/min</p>
              </div>
              <div className="bg-navy-800 rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Actual Flow</p>
                <p className="text-lg font-bold font-mono text-safe">{drone.spray.nozzleFlow.toFixed(2)}</p>
                <p className="text-[10px] text-gray-500">L/min</p>
              </div>
            </div>

            {/* Formula explanation */}
            <div className="bg-navy-800 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-400 mb-2">Flow Calculation</h4>
              <p className="text-xs text-gray-500 font-mono">
                flow = baseFlow × (1 + speedFactor × groundSpeed)
              </p>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                flow = {settings.nozzleFlowBase} × (1 + {settings.nozzleFlowSpeedFactor} × {drone.groundSpeed.toFixed(1)})
              </p>
              <p className="text-xs text-gray-400 mt-1 font-mono font-bold">
                = {(settings.nozzleFlowBase * (1 + settings.nozzleFlowSpeedFactor * drone.groundSpeed)).toFixed(2)} L/min
              </p>
              <p className="text-[10px] text-gray-600 mt-2 italic">
                Higher ground speed → higher flow to maintain coverage.
              </p>
            </div>
          </div>

          {/* Speed control */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              <Gauge size={14} className="inline mr-1" /> Ground Speed
            </h3>
            <div className="text-center mb-3">
              <span className="text-2xl font-bold font-mono text-accent-purple">{drone.groundSpeed.toFixed(1)}</span>
              <span className="text-sm text-gray-500 ml-1">m/s</span>
            </div>
            <input
              type="range" min={0} max={15} step={0.5}
              value={drone.groundSpeed}
              onChange={e => setGroundSpeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-navy-700 rounded-full appearance-none cursor-pointer accent-accent-purple"
              aria-label="Ground speed"
            />
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-xs text-gray-500 mb-2">Nozzle Flow History</h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowData}>
                  <defs>
                    <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#243049" />
                  <YAxis width={30} tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #243049', borderRadius: '8px', fontSize: '11px' }} labelStyle={{ display: 'none' }} />
                  <Area type="monotone" dataKey="flow" stroke="#06b6d4" fill="url(#flowGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xs text-gray-500 mb-2">Speed vs Flow Relationship</h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#243049" />
                  <YAxis width={30} tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #243049', borderRadius: '8px', fontSize: '11px' }} labelStyle={{ display: 'none' }} />
                  <Area type="monotone" dataKey="speed" stroke="#8b5cf6" fill="none" strokeWidth={1.5} dot={false} name="Speed (m/s)" />
                  <Area type="monotone" dataKey="flow" stroke="#06b6d4" fill="none" strokeWidth={1.5} dot={false} name="Flow (L/min)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function SprayCheck({ label, ok, status }: { label: string; ok: boolean; status: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-navy-800">
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 size={12} className="text-safe" /> : <ShieldX size={12} className="text-critical" />}
        <span className="text-gray-400">{label}</span>
      </div>
      <span className={`font-mono font-medium ${ok ? 'text-safe' : 'text-critical'}`}>{status}</span>
    </div>
  );
}

export default SprayControl;
