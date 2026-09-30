import React from 'react';
import { useSimulationStore } from '../state/simulationStore';
import { Battery, Home, ArrowDown, ArrowUp, Timer, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { formatDuration } from '../utils/calculations';

const BatteryRTB: React.FC = () => {
  const drone = useSimulationStore(s => s.drone);
  const settings = useSimulationStore(s => s.settings);
  const telemetryHistory = useSimulationStore(s => s.telemetryHistory);
  const setBatteryLevel = useSimulationStore(s => s.setBatteryLevel);
  const setBatteryDrainRate = useSimulationStore(s => s.setBatteryDrainRate);

  const batteryData = telemetryHistory.slice(-60).map((t, i) => ({ idx: i, battery: t.battery }));
  const { battery, rtb } = drone;

  const batteryColor = battery.percentage > 75 ? '#10b981' : battery.percentage > 30 ? '#3b82f6' : battery.percentage > 15 ? '#f59e0b' : '#ef4444';

  // Battery gauge
  const gaugeRadius = 70;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference * (1 - battery.percentage / 100);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Battery & Return-to-Base</h2>
        {rtb.active && <div className="badge-warning"><Home size={12} /> RTB ACTIVE</div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Battery Gauge */}
        <div className="card flex flex-col items-center justify-center py-6">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r={gaugeRadius} fill="none" stroke="#1a2234" strokeWidth="12" />
            <circle
              cx="90" cy="90" r={gaugeRadius}
              fill="none"
              stroke={batteryColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={gaugeCircumference}
              strokeDashoffset={gaugeOffset}
              transform="rotate(-90 90 90)"
              className="gauge-ring"
            />
            <text x="90" y="82" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="monospace">
              {battery.percentage.toFixed(1)}%
            </text>
            <text x="90" y="102" textAnchor="middle" fill="#6b7280" fontSize="11">
              {battery.state}
            </text>
          </svg>
          <div className="mt-4 grid grid-cols-2 gap-4 w-full max-w-xs">
            <div className="text-center">
              <p className="text-xs text-gray-500">Est. Flight Time</p>
              <p className="text-sm font-mono font-bold text-gray-200">{formatDuration(battery.estimatedFlightTime)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Drain Rate</p>
              <p className="text-sm font-mono font-bold text-gray-200">{battery.drainRate.toFixed(2)} %/s</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Battery Control</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Battery Level</span>
                  <span className="text-gray-300 font-mono">{battery.percentage.toFixed(0)}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={1}
                  value={battery.percentage}
                  onChange={e => setBatteryLevel(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-navy-700 rounded-full appearance-none cursor-pointer accent-accent-blue"
                  aria-label="Battery level"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Drain Rate</span>
                  <span className="text-gray-300 font-mono">{battery.drainRate.toFixed(2)} %/s</span>
                </div>
                <input
                  type="range" min={0} max={2} step={0.05}
                  value={battery.drainRate}
                  onChange={e => setBatteryDrainRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-navy-700 rounded-full appearance-none cursor-pointer accent-accent-blue"
                  aria-label="Battery drain rate"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setBatteryLevel(Math.min(100, battery.percentage + 10))} className="btn-ghost btn-sm flex-1" aria-label="Increase battery">
                  <ArrowUp size={14} /> +10%
                </button>
                <button onClick={() => setBatteryLevel(Math.max(0, battery.percentage - 10))} className="btn-ghost btn-sm flex-1" aria-label="Decrease battery">
                  <ArrowDown size={14} /> -10%
                </button>
                <button onClick={() => setBatteryLevel(100)} className="btn-success btn-sm flex-1" aria-label="Full charge">
                  Full
                </button>
              </div>
            </div>
          </div>

          {/* RTB Config */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">RTB Configuration</h3>
            <div className="space-y-2">
              <InfoRow label="RTB Threshold" value={`${rtb.threshold.toFixed(1)}%`} />
              <InfoRow label="Config Threshold" value={`${settings.rtbThreshold}%`} />
              <InfoRow label="Distance to Base" value={`${rtb.distanceToBase.toFixed(0)}m`} />
              {rtb.estimatedArrival !== null && (
                <InfoRow label="Est. Arrival" value={formatDuration(rtb.estimatedArrival)} />
              )}
            </div>
          </div>
        </div>

        {/* RTB Status */}
        <div className="space-y-4">
          <div className={`card border-2 ${rtb.active ? 'border-warning/40' : 'border-navy-600'}`}>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              <Home size={14} className="inline mr-1" /> Return-to-Base Status
            </h3>
            <div className={`text-xl font-bold mb-3 ${rtb.active ? 'text-warning' : 'text-safe'}`}>
              {rtb.active ? 'RTB ACTIVE' : 'Normal Operation'}
            </div>
            {rtb.active && (
              <div className="space-y-2">
                <InfoRow label="Reason" value={rtb.reason} />
                <InfoRow label="Battery" value={`${battery.percentage.toFixed(1)}%`} valueClass="text-critical" />
                <InfoRow label="Distance to Base" value={`${rtb.distanceToBase.toFixed(0)}m`} />
                {rtb.estimatedArrival !== null && (
                  <InfoRow label="Est. Arrival" value={formatDuration(rtb.estimatedArrival)} />
                )}
              </div>
            )}
          </div>

          {/* RTB Response Time */}
          {rtb.responseTime !== null && (
            <div className={`card border-2 ${rtb.passed ? 'border-safe/40' : 'border-critical/40'}`}>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                <Timer size={14} className="inline mr-1" /> RTB Response Time
              </h3>
              <div className="flex items-center gap-2 mb-2">
                {rtb.passed ? (
                  <CheckCircle2 size={20} className="text-safe" />
                ) : (
                  <XCircle size={20} className="text-critical" />
                )}
                <span className={`text-lg font-bold font-mono ${rtb.passed ? 'text-safe' : 'text-critical'}`}>
                  {rtb.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="space-y-2">
                <InfoRow label="Response Time" value={`${rtb.responseTime.toFixed(2)} ms`} />
                <InfoRow label="Target" value="≤ 50 ms" />
                <InfoRow label="Result" value={rtb.passed ? 'RTB decision within 50ms' : 'RTB decision exceeded 50ms'} />
              </div>
              <p className="text-[10px] text-gray-600 mt-3 italic">
                * This is a software simulation timing measurement, not real aircraft hardware timing.
              </p>
            </div>
          )}

          {/* Battery Chart */}
          <div className="card">
            <h3 className="text-xs text-gray-500 mb-2">Battery History</h3>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={batteryData}>
                  <defs>
                    <linearGradient id="battGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={batteryColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={batteryColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#243049" />
                  <YAxis width={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #243049', borderRadius: '8px', fontSize: '11px' }} labelStyle={{ display: 'none' }} />
                  <Area type="monotone" dataKey="battery" stroke={batteryColor} fill="url(#battGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
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

export default BatteryRTB;
