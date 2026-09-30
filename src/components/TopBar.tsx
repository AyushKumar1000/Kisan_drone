import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, Shield, ShieldAlert, ShieldX, ChevronDown, X } from 'lucide-react';
import { useSimulationStore } from '../state/simulationStore';

const TopBar: React.FC = () => {
  const drone = useSimulationStore(s => s.drone);
  const safetyLevel = useSimulationStore(s => s.safetyLevel);
  const demoMode = useSimulationStore(s => s.demoMode);
  const startDemo = useSimulationStore(s => s.startDemo);
  const stopDemo = useSimulationStore(s => s.stopDemo);
  const [time, setTime] = useState(new Date());
  const [showSafetyDetail, setShowSafetyDetail] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const safetyConfig = {
    SAFE: { icon: Shield, label: 'SYSTEM SAFE', cls: 'badge-safe', glow: 'glow-safe' },
    WARNING: { icon: ShieldAlert, label: 'SYSTEM WARNING', cls: 'badge-warning', glow: 'glow-warning' },
    CRITICAL: { icon: ShieldX, label: 'SYSTEM CRITICAL', cls: 'badge-critical', glow: 'glow-critical' },
  };

  const sc = safetyConfig[safetyLevel];
  const SafetyIcon = sc.icon;

  const safetyDetails = getSafetyDetails(drone, safetyLevel);

  return (
    <header className="h-14 bg-navy-800 border-b border-navy-600 flex items-center justify-between px-4 shrink-0 relative z-50">
      {/* Left */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Drone:</span>
          <span className="font-mono font-semibold text-accent-cyan">{drone.id}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {drone.networkConnected ? (
            <Wifi size={14} className="text-safe" />
          ) : (
            <WifiOff size={14} className="text-critical" />
          )}
          <span className={drone.networkConnected ? 'text-safe' : 'text-critical'}>
            {drone.networkConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">FW:</span>
          <span className="font-mono text-gray-300">{drone.firmwareVersion}</span>
        </div>
      </div>

      {/* Center - Safety Status */}
      <div className="relative">
        <button
          onClick={() => setShowSafetyDetail(!showSafetyDetail)}
          className={`${sc.cls} ${sc.glow} cursor-pointer flex items-center gap-2 pr-2`}
          aria-label="View safety status details"
        >
          <SafetyIcon size={14} />
          <span>{sc.label}</span>
          <ChevronDown size={12} />
        </button>

        {showSafetyDetail && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowSafetyDetail(false)} />
            <div className="absolute top-full mt-2 right-0 w-80 card z-50 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Safety Status Details</h3>
                <button onClick={() => setShowSafetyDetail(false)} className="text-gray-500 hover:text-gray-300" aria-label="Close">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2">
                {safetyDetails.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{d.label}</span>
                    <span className={d.ok ? 'text-safe' : 'text-critical'}>{d.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button
          onClick={demoMode ? stopDemo : startDemo}
          className={demoMode ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
          aria-label={demoMode ? 'Stop demo' : 'Start demo'}
        >
          {demoMode ? 'Stop Demo' : 'Start Demo'}
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock size={14} />
          <span className="font-mono">{time.toLocaleTimeString('en-IN', { hour12: false })}</span>
        </div>
      </div>
    </header>
  );
};

function getSafetyDetails(drone: ReturnType<typeof useSimulationStore.getState>['drone'], level: string) {
  return [
    { label: 'Boundary Safety', ok: drone.boundaryStatus !== 'OUTSIDE', status: drone.boundaryStatus === 'OUTSIDE' ? 'OUTSIDE' : drone.boundaryStatus === 'NEAR' ? 'NEAR BOUNDARY' : 'INSIDE' },
    { label: 'GPS Safety', ok: drone.gps.valid, status: drone.gps.valid ? 'VALID' : 'GPS INVALID' },
    { label: 'GPS Accuracy', ok: drone.gps.accuracy <= 5, status: `${drone.gps.accuracy.toFixed(1)}m` },
    { label: 'Battery Safety', ok: drone.battery.percentage > 15, status: `${drone.battery.percentage.toFixed(1)}%` },
    { label: 'Sensor Health', ok: !Object.values(drone.sensors).includes('FAULT'), status: Object.values(drone.sensors).includes('FAULT') ? 'SENSOR FAULT' : 'HEALTHY' },
    { label: 'Flight State', ok: !['EMERGENCY', 'SAFE_MODE'].includes(drone.flightState), status: drone.flightState },
    { label: 'Spray Safety', ok: !drone.spray.active || drone.spray.permitted, status: drone.spray.active ? (drone.spray.permitted ? 'ACTIVE' : 'SPRAY BLOCKED') : 'OFF' },
    { label: 'Network', ok: drone.networkConnected, status: drone.networkConnected ? 'CONNECTED' : 'DISCONNECTED' },
  ];
}

export default TopBar;
