import React from 'react';
import { useSimulationStore } from '../state/simulationStore';
import {
  Battery, MapPin, Gauge, Satellite, Droplets, Navigation, Wifi, WifiOff,
  Shield, ArrowUpRight, Cpu, Home
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import FieldMap from '../components/FieldMap';
import { formatTimestamp, formatDuration } from '../utils/calculations';

const Dashboard: React.FC = () => {
  const drone = useSimulationStore(s => s.drone);
  const safetyLevel = useSimulationStore(s => s.safetyLevel);
  const telemetryHistory = useSimulationStore(s => s.telemetryHistory);
  const events = useSimulationStore(s => s.events);

  const recentEvents = events.slice(-8).reverse();
  const chartData = telemetryHistory.slice(-60).map((t, i) => ({
    idx: i,
    battery: t.battery,
    speed: t.groundSpeed,
    flow: t.nozzleFlow,
    gpsAcc: t.gpsAccuracy,
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mission Overview</h2>
        <div className={safetyLevel === 'SAFE' ? 'badge-safe' : safetyLevel === 'WARNING' ? 'badge-warning' : 'badge-critical'}>
          <Shield size={12} />
          {safetyLevel === 'SAFE' ? 'SYSTEM SAFE' : safetyLevel === 'WARNING' ? 'SYSTEM WARNING' : 'SYSTEM CRITICAL'}
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusCard
          icon={<Cpu size={16} className="text-accent-blue" />}
          label="Flight Mode"
          value={drone.flightState}
          valueColor={drone.flightState === 'EMERGENCY' ? 'text-critical' : drone.flightState === 'SAFE_MODE' ? 'text-warning' : 'text-accent-cyan'}
        />
        <StatusCard
          icon={<Battery size={16} className={drone.battery.percentage > 30 ? 'text-safe' : drone.battery.percentage > 15 ? 'text-warning' : 'text-critical'} />}
          label="Battery"
          value={`${drone.battery.percentage.toFixed(1)}%`}
          sub={drone.battery.state}
          valueColor={drone.battery.percentage > 30 ? 'text-safe' : drone.battery.percentage > 15 ? 'text-warning' : 'text-critical'}
        />
        <StatusCard
          icon={<Gauge size={16} className="text-accent-purple" />}
          label="Ground Speed"
          value={`${drone.groundSpeed.toFixed(1)} m/s`}
        />
        <StatusCard
          icon={<Satellite size={16} className={drone.gps.valid ? 'text-safe' : 'text-critical'} />}
          label="GPS Status"
          value={drone.gps.valid ? 'VALID' : 'GPS INVALID'}
          sub={`Accuracy: ${drone.gps.accuracy.toFixed(1)}m`}
          valueColor={drone.gps.valid ? 'text-safe' : 'text-critical'}
        />
        <StatusCard
          icon={<MapPin size={16} className="text-accent-cyan" />}
          label="Position"
          value={`(${drone.position.x.toFixed(0)}, ${drone.position.y.toFixed(0)})`}
          sub={`Heading: ${drone.heading.toFixed(0)}°`}
        />
        <StatusCard
          icon={<Shield size={16} className={drone.boundaryStatus === 'INSIDE' ? 'text-safe' : drone.boundaryStatus === 'NEAR' ? 'text-warning' : 'text-critical'} />}
          label="Boundary"
          value={drone.boundaryStatus}
          sub={`Distance: ${Math.abs(drone.distanceFromBoundary).toFixed(1)}m`}
          valueColor={drone.boundaryStatus === 'INSIDE' ? 'text-safe' : drone.boundaryStatus === 'NEAR' ? 'text-warning' : 'text-critical'}
        />
        <StatusCard
          icon={<Droplets size={16} className={drone.spray.active ? 'text-safe' : 'text-gray-500'} />}
          label="Spray"
          value={drone.spray.active ? 'ACTIVE' : drone.spray.permitted ? 'READY' : 'SPRAY BLOCKED'}
          sub={drone.spray.active ? `Flow: ${drone.spray.nozzleFlow.toFixed(2)} L/min` : drone.spray.blockReason}
          valueColor={drone.spray.active ? 'text-safe' : !drone.spray.permitted ? 'text-critical' : 'text-gray-400'}
        />
        <StatusCard
          icon={<Home size={16} className={drone.rtb.active ? 'text-warning' : 'text-gray-500'} />}
          label="RTB Status"
          value={drone.rtb.active ? 'RTB ACTIVE' : 'Normal'}
          sub={drone.rtb.active ? drone.rtb.reason : `Dist to base: ${drone.rtb.distanceToBase.toFixed(0)}m`}
          valueColor={drone.rtb.active ? 'text-warning' : 'text-gray-400'}
        />
      </div>

      {/* Charts + Map + Events */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Charts */}
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TelemetryChart title="Battery (%)" data={chartData} dataKey="battery" color="#10b981" />
            <TelemetryChart title="Ground Speed (m/s)" data={chartData} dataKey="speed" color="#8b5cf6" />
            <TelemetryChart title="Nozzle Flow (L/min)" data={chartData} dataKey="flow" color="#06b6d4" />
            <TelemetryChart title="GPS Accuracy (m)" data={chartData} dataKey="gpsAcc" color="#f59e0b" />
          </div>
        </div>

        {/* Events Timeline */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Live Events</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {recentEvents.length === 0 ? (
              <p className="text-xs text-gray-600">No events yet. Start a mission.</p>
            ) : (
              recentEvents.map(ev => (
                <div key={ev.id} className="flex gap-2 text-xs animate-slide-in">
                  <div className={`w-1.5 rounded-full shrink-0 ${ev.severity === 'CRITICAL' ? 'bg-critical' : ev.severity === 'WARNING' ? 'bg-warning' : 'bg-accent-blue'}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-mono">{formatTimestamp(ev.timestamp)}</span>
                      <span className={`uppercase text-[10px] font-bold ${ev.severity === 'CRITICAL' ? 'text-critical' : ev.severity === 'WARNING' ? 'text-warning' : 'text-gray-500'}`}>
                        {ev.category}
                      </span>
                    </div>
                    <p className="text-gray-300 truncate">{ev.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Compact Map */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Field View</h3>
        <FieldMap width={620} height={400} compact />
      </div>
    </div>
  );
};

// Reusable status card
function StatusCard({ icon, label, value, sub, valueColor }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; valueColor?: string;
}) {
  return (
    <div className="card-hover">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-bold font-mono ${valueColor || 'text-gray-100'}`}>{value}</div>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

// Reusable telemetry chart
function TelemetryChart({ title, data, dataKey, color }: {
  title: string; data: any[]; dataKey: string; color: string;
}) {
  return (
    <div className="card">
      <h4 className="text-xs text-gray-500 mb-2">{title}</h4>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#243049" />
            <XAxis dataKey="idx" hide />
            <YAxis width={35} tick={{ fontSize: 10, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #243049', borderRadius: '8px', fontSize: '11px' }}
              labelStyle={{ display: 'none' }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#grad-${dataKey})`} strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Dashboard;
