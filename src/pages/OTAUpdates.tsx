import React from 'react';
import { useSimulationStore } from '../state/simulationStore';
import {
  Download, ShieldCheck, ShieldAlert, RotateCcw, CheckCircle2,
  XCircle, ArrowRight, Cpu, Layers, HardDrive, Play, RefreshCw, AlertTriangle
} from 'lucide-react';

export const OTAUpdates: React.FC = () => {
  const ota = useSimulationStore(s => s.drone.ota);
  const rolloutStages = useSimulationStore(s => s.rolloutStages);
  const startOTAUpdate = useSimulationStore(s => s.startOTAUpdate);
  const rollbackFirmware = useSimulationStore(s => s.rollbackFirmware);
  const advanceRolloutStage = useSimulationStore(s => s.advanceRolloutStage);

  const isUpdating = ['CHECKING', 'DOWNLOADING', 'VERIFYING_SIGNATURE', 'VERIFYING_INTEGRITY', 'INSTALLING', 'REBOOTING', 'HEALTH_CHECK', 'ROLLING_BACK'].includes(ota.status);

  const getStageStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge-safe text-[10px]">Completed</span>;
      case 'IN_PROGRESS':
        return <span className="badge-warning text-[10px] animate-pulse">In Progress</span>;
      case 'FAILED':
        return <span className="badge-critical text-[10px]">Threshold Alert</span>;
      default:
        return <span className="text-[10px] text-gray-500 font-mono">Pending</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Download className="text-accent-cyan" size={22} />
            OTA Firmware & Dual-Slot Safety Rollout
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Simulated A/B dual-partition atomic firmware updates with cryptographic validation, automatic watchdog health-checks, and instant rollback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ota.slotB.active && (
            <button
              onClick={rollbackFirmware}
              disabled={isUpdating}
              className="btn-danger text-xs flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              Manual Rollback to Slot A
            </button>
          )}
        </div>
      </div>

      {/* Dual Flash Partitions (A/B Slots) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slot A */}
        <div className={`panel p-5 border-2 transition-all ${ota.slotA.active ? 'border-accent-blue bg-accent-blue/5' : 'border-navy-700 bg-navy-900/40'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive size={20} className={ota.slotA.active ? 'text-accent-cyan' : 'text-gray-400'} />
              <div>
                <h3 className="text-sm font-bold text-white">Partition Slot A (Primary)</h3>
                <span className="text-[10px] text-gray-400">Flash Offset: 0x08000000 (2MB)</span>
              </div>
            </div>
            {ota.slotA.active ? (
              <span className="badge-safe flex items-center gap-1">
                <CheckCircle2 size={12} /> Active Boot Slot
              </span>
            ) : (
              <span className="text-xs text-gray-400 font-mono">Inactive Standby</span>
            )}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-navy-700">
              <span className="text-gray-400">Installed Version:</span>
              <span className="font-mono font-bold text-white">{ota.slotA.version}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-navy-700">
              <span className="text-gray-400">Integrity Signature:</span>
              <span className="text-safe font-mono">ED25519 Verified ✓</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-400">Partition Status:</span>
              <span className="font-mono text-gray-300">{ota.slotA.status}</span>
            </div>
          </div>
        </div>

        {/* Slot B */}
        <div className={`panel p-5 border-2 transition-all ${ota.slotB.active ? 'border-accent-cyan bg-accent-cyan/5' : 'border-navy-700 bg-navy-900/40'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive size={20} className={ota.slotB.active ? 'text-accent-cyan' : 'text-gray-400'} />
              <div>
                <h3 className="text-sm font-bold text-white">Partition Slot B (Secondary / OTA Target)</h3>
                <span className="text-[10px] text-gray-400">Flash Offset: 0x08200000 (2MB)</span>
              </div>
            </div>
            {ota.slotB.active ? (
              <span className="badge-safe flex items-center gap-1">
                <CheckCircle2 size={12} /> Active Boot Slot
              </span>
            ) : (
              <span className="text-xs text-gray-400 font-mono">Standby Target</span>
            )}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-navy-700">
              <span className="text-gray-400">Installed Version:</span>
              <span className="font-mono font-bold text-white">{ota.slotB.version}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-navy-700">
              <span className="text-gray-400">Integrity Signature:</span>
              <span className="font-mono text-gray-300">
                {ota.slotB.verified ? <span className="text-safe">Verified ✓</span> : 'Pending / Candidate'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-400">Partition Status:</span>
              <span className="font-mono text-gray-300">{ota.slotB.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live OTA Update Pipeline Status */}
      <div className="panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-accent-blue" />
            <h3 className="text-sm font-bold text-white">OTA Upgrade Pipeline & Verification Engine</h3>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-navy-700 text-accent-cyan">
            Status: {ota.status}
          </span>
        </div>

        {/* Progress bar */}
        {isUpdating && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-300">
              <span>{ota.status.replace(/_/g, ' ')}</span>
              <span>{ota.downloadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-navy-900 rounded-full overflow-hidden border border-navy-700">
              <div
                className="h-full bg-gradient-to-r from-accent-blue to-accent-cyan transition-all duration-300"
                style={{ width: `${ota.downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Pipeline Stage Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          {[
            { key: 'CHECK', label: '1. Check', active: ['CHECKING', 'DOWNLOADING', 'VERIFYING_SIGNATURE', 'VERIFYING_INTEGRITY', 'INSTALLING', 'REBOOTING', 'HEALTH_CHECK', 'VERIFIED'].includes(ota.status) },
            { key: 'DL', label: '2. Download', active: ['DOWNLOADING', 'VERIFYING_SIGNATURE', 'VERIFYING_INTEGRITY', 'INSTALLING', 'REBOOTING', 'HEALTH_CHECK', 'VERIFIED'].includes(ota.status) },
            { key: 'SIG', label: '3. Sig Verify', active: ['VERIFYING_SIGNATURE', 'VERIFYING_INTEGRITY', 'INSTALLING', 'REBOOTING', 'HEALTH_CHECK', 'VERIFIED'].includes(ota.status), fail: ota.signatureValid === false },
            { key: 'INT', label: '4. SHA-256', active: ['VERIFYING_INTEGRITY', 'INSTALLING', 'REBOOTING', 'HEALTH_CHECK', 'VERIFIED'].includes(ota.status), fail: ota.integrityValid === false },
            { key: 'FLASH', label: '5. Flash Slot', active: ['INSTALLING', 'REBOOTING', 'HEALTH_CHECK', 'VERIFIED'].includes(ota.status), fail: ota.failureType === 'INSTALLATION_FAILURE' },
            { key: 'BOOT', label: '6. Boot Test', active: ['REBOOTING', 'HEALTH_CHECK', 'VERIFIED'].includes(ota.status) },
            { key: 'HEALTH', label: '7. Health Check', active: ['HEALTH_CHECK', 'VERIFIED'].includes(ota.status), fail: ota.healthCheckPassed === false },
          ].map(stage => (
            <div
              key={stage.key}
              className={`p-2.5 rounded border transition-colors ${
                stage.fail
                  ? 'bg-critical/20 border-critical text-critical'
                  : stage.active
                  ? 'bg-accent-blue/15 border-accent-blue text-white'
                  : 'bg-navy-900/40 border-navy-700 text-gray-500'
              }`}
            >
              <div className="font-semibold text-[11px]">{stage.label}</div>
              <div className="text-[10px] mt-1 font-mono">
                {stage.fail ? 'FAILED' : stage.active ? 'OK' : 'WAIT'}
              </div>
            </div>
          ))}
        </div>

        {/* Trigger Test Updates */}
        <div className="pt-2 border-t border-navy-700 flex flex-wrap gap-2">
          <button
            onClick={() => startOTAUpdate(null)}
            disabled={isUpdating}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Play size={14} />
            Simulate Standard OTA (Success)
          </button>
          <button
            onClick={() => startOTAUpdate('INVALID_SIGNATURE')}
            disabled={isUpdating}
            className="btn-secondary text-xs flex items-center gap-1.5 text-warning"
          >
            <ShieldAlert size={14} />
            Simulate Invalid Signature
          </button>
          <button
            onClick={() => startOTAUpdate('CORRUPTED_PACKAGE')}
            disabled={isUpdating}
            className="btn-secondary text-xs flex items-center gap-1.5 text-critical"
          >
            <XCircle size={14} />
            Simulate Corrupted Package
          </button>
          <button
            onClick={() => startOTAUpdate('HEALTH_CHECK_FAILURE')}
            disabled={isUpdating}
            className="btn-secondary text-xs flex items-center gap-1.5 text-accent-cyan"
          >
            <RotateCcw size={14} />
            Simulate Health-Check Failure (Auto-Rollback)
          </button>
        </div>
      </div>

      {/* Canary / Phased Fleet Rollout */}
      <div className="panel p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers size={18} className="text-accent-purple" />
            Canary Fleet Deployment Stages (1,000 Sim Fleet)
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Progressive staged rollout policy. If failure rate exceeds 5%, safety gates immediately halt fleet progression.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-navy-900 text-gray-400 uppercase text-[10px] border-b border-navy-700">
              <tr>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-3">Fleet Size</th>
                <th className="py-2.5 px-3">Successful</th>
                <th className="py-2.5 px-3">Failed</th>
                <th className="py-2.5 px-3">Rollbacks</th>
                <th className="py-2.5 px-3">Health Failures</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700 font-mono">
              {rolloutStages.map((st, idx) => (
                <tr key={st.stage} className="hover:bg-navy-700/30">
                  <td className="py-2.5 px-3 font-bold text-white">{st.stage}</td>
                  <td className="py-2.5 px-3">{st.fleetSize} drones</td>
                  <td className="py-2.5 px-3 text-safe">{st.successful}</td>
                  <td className="py-2.5 px-3 text-critical">{st.failed}</td>
                  <td className="py-2.5 px-3 text-warning">{st.rollbacks}</td>
                  <td className="py-2.5 px-3 text-gray-400">{st.healthCheckFailures}</td>
                  <td className="py-2.5 px-3">{getStageStatusBadge(st.status)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => advanceRolloutStage(idx)}
                      disabled={st.status === 'COMPLETED' || (idx > 0 && rolloutStages[idx - 1].status !== 'COMPLETED')}
                      className="px-2 py-1 bg-navy-700 hover:bg-navy-600 disabled:opacity-30 text-white rounded text-[11px] font-sans"
                    >
                      {st.status === 'COMPLETED' ? 'Completed' : 'Deploy Stage'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OTAUpdates;
