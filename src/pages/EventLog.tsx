import React, { useState } from 'react';
import { useSimulationStore } from '../state/simulationStore';
import {
  FileText, Download, Trash2, Search, Filter, AlertTriangle,
  CheckCircle2, XCircle, Info, ShieldAlert, Cpu
} from 'lucide-react';
import { formatTimestamp } from '../utils/calculations';

export const EventLog: React.FC = () => {
  const events = useSimulationStore(s => s.events);
  const clearEvents = useSimulationStore(s => s.clearEvents);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const filteredEvents = events.filter(evt => {
    if (selectedCategory !== 'ALL' && evt.category !== selectedCategory) return false;
    if (selectedSeverity !== 'ALL' && evt.severity !== selectedSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        evt.message.toLowerCase().includes(q) ||
        evt.eventType.toLowerCase().includes(q) ||
        evt.flightState.toLowerCase().includes(q)
      );
    }
    return true;
  }).reverse();

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `kisandrone-audit-log-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Category', 'Severity', 'FlightState', 'EventType', 'Message'];
    const rows = events.map(e => [
      new Date(e.timestamp).toISOString(),
      e.category,
      e.severity,
      e.flightState,
      e.eventType,
      `"${e.message.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `kisandrone-audit-log-${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const criticalCount = events.filter(e => e.severity === 'CRITICAL').length;
  const warningCount = events.filter(e => e.severity === 'WARNING').length;
  const infoCount = events.filter(e => e.severity === 'INFO').length;

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <XCircle size={14} className="text-critical shrink-0" />;
      case 'WARNING':
        return <AlertTriangle size={14} className="text-warning shrink-0" />;
      default:
        return <Info size={14} className="text-accent-cyan shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="text-accent-cyan" size={22} />
            Flight Safety & Telemetry Audit Log
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Immutable chronological record of all flight state transitions, safety interventions, nozzle actions, and OTA events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={events.length === 0}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            disabled={events.length === 0}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download size={14} /> Export JSON
          </button>
          <button
            onClick={clearEvents}
            disabled={events.length === 0}
            className="btn-danger text-xs flex items-center gap-1.5"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="panel p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-semibold">Total Events</div>
            <div className="text-lg font-bold text-white font-mono">{events.length}</div>
          </div>
          <Cpu className="text-accent-blue" size={20} />
        </div>
        <div className="panel p-3 flex items-center justify-between border-critical/30 bg-critical/5">
          <div>
            <div className="text-[10px] text-critical uppercase font-semibold">Critical Alerts</div>
            <div className="text-lg font-bold text-critical font-mono">{criticalCount}</div>
          </div>
          <ShieldAlert className="text-critical" size={20} />
        </div>
        <div className="panel p-3 flex items-center justify-between border-warning/30 bg-warning/5">
          <div>
            <div className="text-[10px] text-warning uppercase font-semibold">Safety Warnings</div>
            <div className="text-lg font-bold text-warning font-mono">{warningCount}</div>
          </div>
          <AlertTriangle className="text-warning" size={20} />
        </div>
        <div className="panel p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-accent-cyan uppercase font-semibold">Info Events</div>
            <div className="text-lg font-bold text-accent-cyan font-mono">{infoCount}</div>
          </div>
          <CheckCircle2 className="text-accent-cyan" size={20} />
        </div>
      </div>

      {/* Filters and search */}
      <div className="panel p-3 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search events, reasons, states..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-navy-900 border border-navy-600 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-navy-900 border border-navy-600 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-accent-blue"
          >
            <option value="ALL">All Categories</option>
            <option value="FLIGHT">Flight</option>
            <option value="SAFETY">Safety</option>
            <option value="SPRAY">Spray</option>
            <option value="BATTERY">Battery</option>
            <option value="GPS">GPS</option>
            <option value="FAULT">Fault</option>
            <option value="OTA">OTA</option>
            <option value="SYSTEM">System</option>
          </select>
          <select
            value={selectedSeverity}
            onChange={e => setSelectedSeverity(e.target.value)}
            className="bg-navy-900 border border-navy-600 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-accent-blue"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Event table */}
      <div className="panel overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-navy-900 sticky top-0 text-gray-400 uppercase text-[10px] border-b border-navy-700 z-10">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Flight State</th>
                <th className="py-2.5 px-3">Event Code</th>
                <th className="py-2.5 px-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/50 font-mono">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-sans">
                    No simulation events match the current filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map(evt => (
                  <tr key={evt.id} className="hover:bg-navy-700/30 transition-colors">
                    <td className="py-2 px-3 text-gray-400 whitespace-nowrap text-[11px]">
                      {formatTimestamp(evt.timestamp)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-700 text-gray-200 font-sans">
                        {evt.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getSeverityIcon(evt.severity)}
                        <span
                          className={`text-[10px] font-bold ${
                            evt.severity === 'CRITICAL'
                              ? 'text-critical'
                              : evt.severity === 'WARNING'
                              ? 'text-warning'
                              : 'text-gray-300'
                          }`}
                        >
                          {evt.severity}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-accent-cyan whitespace-nowrap text-[11px]">
                      {evt.flightState}
                    </td>
                    <td className="py-2 px-3 text-gray-400 whitespace-nowrap text-[11px]">
                      {evt.eventType}
                    </td>
                    <td className="py-2 px-3 text-gray-200 font-sans text-[11px]">
                      {evt.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EventLog;
