import React from 'react';
import { useSimulationStore } from '../state/simulationStore';
import {
  Settings as SettingsIcon, Shield, Battery, Satellite, Gauge,
  RotateCcw, Play, Sparkles, BookOpen, Check, Info
} from 'lucide-react';

export const Settings: React.FC = () => {
  const settings = useSimulationStore(s => s.settings);
  const updateSettings = useSimulationStore(s => s.updateSettings);
  const resetAll = useSimulationStore(s => s.resetAll);
  const startDemo = useSimulationStore(s => s.startDemo);
  const stopDemo = useSimulationStore(s => s.stopDemo);
  const demoMode = useSimulationStore(s => s.demoMode);
  const demoStep = useSimulationStore(s => s.demoStep);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <SettingsIcon className="text-accent-cyan" size={22} />
            Simulation Parameters & Safety Configuration
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Fine-tune avionics thresholds, safety boundaries, nozzle coefficients, and run full end-to-end academic demo flows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {demoMode ? (
            <button
              onClick={stopDemo}
              className="btn-danger text-xs flex items-center gap-1.5"
            >
              Stop Guided Demo (Step {demoStep}/14)
            </button>
          ) : (
            <button
              onClick={startDemo}
              className="btn-primary text-xs flex items-center gap-1.5 bg-gradient-to-r from-accent-purple to-accent-blue"
            >
              <Sparkles size={14} />
              Run Full Automated Demo Flow
            </button>
          )}
          <button
            onClick={resetAll}
            className="btn-secondary text-xs flex items-center gap-1.5 text-critical"
          >
            <RotateCcw size={14} />
            Reset All to Defaults
          </button>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="panel bg-accent-purple/10 border-accent-purple/40 p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="text-accent-purple" size={20} />
              <div>
                <h4 className="text-sm font-bold text-white">Automated Presentation Demo Running</h4>
                <p className="text-xs text-gray-300">Step {demoStep} of 14 in progress. Demonstrating flight, spray, safety fallback, RTB, and OTA rollback.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety & Threshold Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Safety Boundary Configuration */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-navy-700">
            <Shield className="text-accent-blue" size={18} />
            <h3 className="text-sm font-bold text-white">Geofence & Safety Margins</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Geofence Safety Margin:</span>
                <span className="font-mono text-accent-cyan font-bold">{settings.safetyMargin} meters</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={settings.safetyMargin}
                onChange={e => updateSettings({ safetyMargin: Number(e.target.value) })}
                className="w-full accent-accent-blue cursor-pointer"
              />
              <p className="text-[11px] text-gray-500 mt-0.5">
                Buffer distance inside the field boundary before issuing WARNING and disabling spray.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>GPS Accuracy Safe Threshold (HDOP):</span>
                <span className="font-mono text-accent-cyan font-bold">±{settings.gpsAccuracyThreshold} meters</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={settings.gpsAccuracyThreshold}
                onChange={e => updateSettings({ gpsAccuracyThreshold: Number(e.target.value) })}
                className="w-full accent-accent-blue cursor-pointer"
              />
              <p className="text-[11px] text-gray-500 mt-0.5">
                If GPS error exceeds this threshold, autonomous flight locks into SAFE_MODE and stops spraying.
              </p>
            </div>
          </div>
        </div>

        {/* Battery & RTB Configuration */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-navy-700">
            <Battery className="text-safe" size={18} />
            <h3 className="text-sm font-bold text-white">Battery & RTB Calculation</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Static Minimum RTB Threshold:</span>
                <span className="font-mono text-safe font-bold">{settings.rtbThreshold}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="2"
                value={settings.rtbThreshold}
                onChange={e => updateSettings({ rtbThreshold: Number(e.target.value) })}
                className="w-full accent-safe cursor-pointer"
              />
              <p className="text-[11px] text-gray-500 mt-0.5">
                Baseline battery level that forces autonomous Return-to-Base (in addition to dynamic distance model).
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Base Battery Drain Rate:</span>
                <span className="font-mono text-safe font-bold">{settings.batteryDrainRate.toFixed(2)} %/s</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={settings.batteryDrainRate}
                onChange={e => updateSettings({ batteryDrainRate: Number(e.target.value) })}
                className="w-full accent-safe cursor-pointer"
              />
              <p className="text-[11px] text-gray-500 mt-0.5">
                Simulation discharge rate during standard flight (+30% during active spraying).
              </p>
            </div>
          </div>
        </div>

        {/* Flight & Nozzle Physics */}
        <div className="panel p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-navy-700">
            <Gauge className="text-accent-cyan" size={18} />
            <h3 className="text-sm font-bold text-white">Flight & Nozzle Flow Physics</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Default Cruising Speed:</span>
                <span className="font-mono text-accent-cyan font-bold">{settings.defaultGroundSpeed} m/s</span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="0.5"
                value={settings.defaultGroundSpeed}
                onChange={e => updateSettings({ defaultGroundSpeed: Number(e.target.value) })}
                className="w-full accent-accent-cyan cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Base Nozzle Flow Rate:</span>
                <span className="font-mono text-accent-cyan font-bold">{settings.nozzleFlowBase} L/min</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.2"
                value={settings.nozzleFlowBase}
                onChange={e => updateSettings({ nozzleFlowBase: Number(e.target.value) })}
                className="w-full accent-accent-cyan cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>Speed Flow Factor (k):</span>
                <span className="font-mono text-accent-cyan font-bold">{settings.nozzleFlowSpeedFactor}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={settings.nozzleFlowSpeedFactor}
                onChange={e => updateSettings({ nozzleFlowSpeedFactor: Number(e.target.value) })}
                className="w-full accent-accent-cyan cursor-pointer"
              />
              <p className="text-[11px] text-gray-500 mt-0.5">
                Formula: <span className="font-mono text-accent-blue">Flow = Base + (GroundSpeed × k)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Academic Project Presentation Metadata */}
        <div className="panel p-5 space-y-3 bg-gradient-to-br from-navy-800 to-navy-900 border-navy-600">
          <div className="flex items-center gap-2 pb-2 border-b border-navy-700">
            <BookOpen className="text-accent-purple" size={18} />
            <h3 className="text-sm font-bold text-white">Academic Project Specification</h3>
          </div>
          <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
            <p>
              <strong className="text-white">Project Title:</strong> KisanDrone – Autonomous Flight Control & Safety Simulation
            </p>
            <p>
              <strong className="text-white">Domain:</strong> B.Tech Software Engineering & Project Management
            </p>
            <p>
              <strong className="text-white">Key Engineering Objectives Demonstrated:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 pl-1">
              <li>Deterministic Finite State Machine (FSM) flight controller</li>
              <li>Geofencing and non-fly zone boundary interlocks</li>
              <li>Ground-speed proportional variable nozzle control</li>
              <li>Dynamic real-time Return-to-Base (RTB) algorithm</li>
              <li>A/B dual partition firmware updates with auto-rollback</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
