import React from 'react';
import {
  LayoutDashboard, Map, Plane, Shield, Battery, Droplets,
  Activity, Download, FileText, Settings, Zap
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'mission', label: 'Mission Planner', icon: Map },
  { id: 'flight', label: 'Flight Simulation', icon: Plane },
  { id: 'safety', label: 'Safety & Boundary', icon: Shield },
  { id: 'battery', label: 'Battery & RTB', icon: Battery },
  { id: 'spray', label: 'Spray Control', icon: Droplets },
  { id: 'diagnostics', label: 'Sensors & Diagnostics', icon: Activity },
  { id: 'ota', label: 'OTA Updates', icon: Download },
  { id: 'events', label: 'Event Log', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  return (
    <aside className="w-60 bg-navy-800 border-r border-navy-600 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-navy-600">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">KisanDrone</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Flight Control</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={isActive ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer disclaimer */}
      <div className="px-4 py-3 border-t border-navy-600">
        <p className="text-[9px] text-gray-600 leading-tight">
          Academic Simulation Only.
          <br />
          Does NOT control real drones.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
