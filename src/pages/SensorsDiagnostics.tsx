import React, { useState } from 'react';
import { useSimulationStore } from '../state/simulationStore';
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Zap,
  Satellite, Compass, Battery, Radio, ShieldAlert, Cpu, Wrench
} from 'lucide-react';
import { SensorHealth } from '../types/simulation';

const FAULT_OPTIONS = [
  {
    type: 'GPS_FAILURE',
    label: 'GPS Failure',
    desc: 'Simulates complete loss of GPS lock and telemetry',
    severity: 'CRITICAL',
    icon: Satellite,
  },
  {
    type: 'GPS_POSITION_JUMP',
    label: 'GPS Position Jump',
    desc: 'Injects sudden 100m coordinate anomaly',
    severity: 'WARNING',
    icon: Compass,
  },
  {
    type: 'GPS_ACCURACY_DEGRADATION',
    label: 'GPS Accuracy Degradation',
    desc: 'Increases HDOP error beyond safety limits (>15m)',
    severity: 'WARNING',
    icon: Satellite,
  },
  {
    type: 'SENSOR_DRIFT',
    label: 'IMU Sensor Drift',
    desc: 'Injects gyro & accelerometer noise/drift',
    severity: 'WARNING',
    icon: Activity,
  },
  {
    type: 'BATTERY_SENSOR_FAULT',
    label: 'Battery Sensor Fault',
    desc: 'Simulates corrupted BMS telemetry and voltage sag',
    severity: 'CRITICAL',
    icon: Battery,
  },
  {
    type: 'COMMUNICATION_LOSS',
    label: 'Communication Loss',
    desc: 'Simulates RC/Telemetry link blackout',
    severity: 'WARNING',
    icon: Radio,
  },
];

export const SensorsDiagnostics: React.FC = () => {
  const drone = useSimulationStore(s => s.drone);
  const faults = useSimulationStore(s => s.faults);
  const injectFault = useSimulationStore(s => s.injectFault);
  const clearFault = useSimulationStore(s => s.clearFault);
  const clearAllFaults = useSimulationStore(s => s.clearAllFaults);
  const addEvent = useSimulationStore(s => s.addEvent);

  const [isSelfTesting, setIsSelfTesting] = useState(false);
  const [calibratingSensor, setCalibratingSensor] = useState<string | null>(null);

  const activeFaults = faults.filter(f => f.active);

  const handleSelfTest = () => {
    setIsSelfTesting(true);
    addEvent('SYSTEM', 'INFO', 'Initiating 7-point hardware self-test diagnostic...', 'SELF_TEST_START');
    setTimeout(() => {
      setIsSelfTesting(false);
      addEvent('SYSTEM', 'INFO', 'Diagnostic self-test completed: All sensors verified.', 'SELF_TEST_COMPLETE');
    }, 2000);
  };

  const handleCalibrate = (sensorName: string) => {
    setCalibratingSensor(sensorName);
    addEvent('SYSTEM', 'INFO', `Calibrating ${sensorName}...`, 'CALIBRATION_START');
    setTimeout(() => {
      setCalibratingSensor(null);
      addEvent('SYSTEM', 'INFO', `${sensorName} zero-offset calibration stored successfully.`, 'CALIBRATION_DONE');
    }, 1500);
  };

  const getStatusBadge = (health: SensorHealth) => {
    switch (health) {
      case 'HEALTHY':
        return (
          <span className="badge-safe flex items-center gap-1">
            <CheckCircle2 size={12} /> Healthy
          </span>
        );
      case 'WARNING':
        return (
          <span className="badge-warning flex items-center gap-1">
            <AlertTriangle size={12} /> Warning
          </span>
        );
      case 'FAULT':
        return (
          <span className="badge-critical flex items-center gap-1">
            <XCircle size={12} /> Fault
          </span>
        );
    }
  };

  const sensorList = [
    {
      key: 'gps',
      name: 'GNSS / GPS Receiver',
      health: drone.sensors.gps,
      icon: Satellite,
      specs: `Satellites: ${drone.gps.valid ? '14 (3D Fix)' : '0 (No Fix)'} | Accuracy: ±${drone.gps.accuracy.toFixed(1)}m`,
      telemetry: drone.gps.valid ? 'Active Lock' : 'Signal Lost',
    },
    {
      key: 'imu',
      name: '6-DOF IMU (Gyro/Acc)',
      health: drone.sensors.imu,
      icon: Activity,
      specs: `Heading: ${drone.heading.toFixed(1)}° | Pitch: ${(Math.sin(Date.now() / 1000) * 1.5).toFixed(1)}° | Roll: ${(Math.cos(Date.now() / 1000) * 1.2).toFixed(1)}°`,
      telemetry: '200 Hz Sampling',
    },
    {
      key: 'batterySensor',
      name: 'Smart BMS & Current Shunt',
      health: drone.sensors.batterySensor,
      icon: Battery,
      specs: `Voltage: ${(22.2 * (drone.battery.percentage / 100) + 0.1).toFixed(2)}V | Drain: ${drone.battery.drainRate.toFixed(2)}%/s`,
      telemetry: `${drone.battery.percentage.toFixed(1)}% Capacity`,
    },
    {
      key: 'positionSensor',
      name: 'Optical Flow & LiDAR Altimeter',
      health: drone.sensors.positionSensor,
      icon: Compass,
      specs: `Altitude AGL: 2.5m | Ground Speed: ${drone.groundSpeed.toFixed(1)} m/s`,
      telemetry: 'Ranging Nominal',
    },
    {
      key: 'flightController',
      name: 'STM32 Dual-Core Flight Controller',
      health: drone.sensors.flightController,
      icon: Cpu,
      specs: 'CPU Load: 18% | Loop Rate: 1000 Hz | RTOS: FreeRTOS',
      telemetry: drone.flightState,
    },
    {
      key: 'sprayController',
      name: 'Variable Flow PWM Solenoid Valve',
      health: drone.sensors.sprayController,
      icon: Zap,
      specs: `Flow: ${drone.spray.nozzleFlow.toFixed(2)} L/min | Target: ${drone.spray.targetFlow.toFixed(2)} L/min`,
      telemetry: drone.spray.active ? 'Spraying' : 'Standby',
    },
    {
      key: 'communication',
      name: 'Telemetry Radio & Cloud Uplink',
      health: drone.sensors.communication,
      icon: Radio,
      specs: `RSSI: ${drone.networkConnected ? '-58 dBm' : 'Disconnected'} | Packet Loss: ${drone.networkConnected ? '0.1%' : '100%'}`,
      telemetry: drone.networkConnected ? 'Online' : 'Offline',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="text-accent-cyan" size={22} />
            Sensors & Diagnostics
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time avionics telemetry, hardware health matrix, and safety fault-injection sandbox.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelfTest}
            disabled={isSelfTesting}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={isSelfTesting ? 'animate-spin text-accent-cyan' : ''} />
            {isSelfTesting ? 'Running Self-Test...' : 'Run Diagnostics Self-Test'}
          </button>
          {activeFaults.length > 0 && (
            <button
              onClick={clearAllFaults}
              className="btn-danger text-xs flex items-center gap-1.5"
            >
              <Wrench size={14} />
              Clear All Faults ({activeFaults.length})
            </button>
          )}
        </div>
      </div>

      {/* Active Fault Alerts */}
      {activeFaults.length > 0 && (
        <div className="panel bg-critical/10 border-critical/40 p-4 space-y-3 animate-pulse">
          <div className="flex items-center gap-2 text-critical font-semibold text-sm">
            <ShieldAlert size={18} />
            <span>Active Injected Faults ({activeFaults.length}) – Safety Subsystem Intercepted</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {activeFaults.map(f => (
              <div key={f.id} className="flex items-center justify-between bg-navy-900/80 p-2.5 rounded border border-critical/30">
                <div>
                  <div className="text-xs font-bold text-white">{f.type.replace(/_/g, ' ')}</div>
                  <div className="text-[11px] text-gray-400">{f.response}</div>
                </div>
                <button
                  onClick={() => clearFault(f.id)}
                  className="px-2.5 py-1 text-xs bg-navy-700 hover:bg-navy-600 text-gray-200 rounded border border-navy-500 hover:text-white"
                >
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sensor Health Matrix */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Avionics Sensor Status Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sensorList.map(sensor => {
            const Icon = sensor.icon;
            const isCalibrating = calibratingSensor === sensor.name;
            return (
              <div key={sensor.key} className="panel p-4 flex flex-col justify-between hover:border-navy-500 transition-colors">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center text-accent-cyan">
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{sensor.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">{sensor.telemetry}</div>
                      </div>
                    </div>
                    {getStatusBadge(sensor.health)}
                  </div>
                  <div className="mt-3 text-xs text-gray-300 font-mono bg-navy-900/60 p-2 rounded border border-navy-700/50">
                    {sensor.specs}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-navy-700/50 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">Calibration: Factory Zero</span>
                  <button
                    onClick={() => handleCalibrate(sensor.name)}
                    disabled={isCalibrating || sensor.health === 'FAULT'}
                    className="text-accent-blue hover:text-accent-cyan disabled:text-gray-600 flex items-center gap-1 font-medium"
                  >
                    <RefreshCw size={11} className={isCalibrating ? 'animate-spin' : ''} />
                    {isCalibrating ? 'Calibrating...' : 'Calibrate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fault Injection Sandbox */}
      <div className="panel p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert size={16} className="text-warning" />
            Safety Testbed & Fault Injection Sandbox
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Test real-time autonomous safety transitions (SAFE_MODE, RTB, Spray Disabling) under catastrophic failure simulations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FAULT_OPTIONS.map(opt => {
            const isFaultActive = activeFaults.some(f => f.type === opt.type);
            const Icon = opt.icon;
            return (
              <div
                key={opt.type}
                className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all ${
                  isFaultActive
                    ? 'bg-critical/10 border-critical/50'
                    : 'bg-navy-900/60 border-navy-700 hover:border-navy-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Icon size={14} className={isFaultActive ? 'text-critical' : 'text-accent-cyan'} />
                      {opt.label}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        opt.severity === 'CRITICAL' ? 'bg-critical/20 text-critical' : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {opt.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">{opt.desc}</p>
                </div>

                {isFaultActive ? (
                  <button
                    onClick={() => {
                      const fault = activeFaults.find(f => f.type === opt.type);
                      if (fault) clearFault(fault.id);
                    }}
                    className="w-full py-1.5 text-xs font-semibold bg-safe hover:bg-emerald-600 text-white rounded transition-colors"
                  >
                    Clear Fault
                  </button>
                ) : (
                  <button
                    onClick={() => injectFault(opt.type)}
                    className="w-full py-1.5 text-xs font-semibold bg-navy-700 hover:bg-critical hover:text-white text-gray-200 rounded border border-navy-600 transition-colors"
                  >
                    Inject Fault
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SensorsDiagnostics;
