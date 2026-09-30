import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import MissionPlanner from './pages/MissionPlanner';
import FlightSimulation from './pages/FlightSimulation';
import SafetyBoundary from './pages/SafetyBoundary';
import BatteryRTB from './pages/BatteryRTB';
import SprayControl from './pages/SprayControl';
import SensorsDiagnostics from './pages/SensorsDiagnostics';
import OTAUpdates from './pages/OTAUpdates';
import EventLog from './pages/EventLog';
import Settings from './pages/Settings';
import { useSimulationStore } from './state/simulationStore';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<string>('overview');
  const tick = useSimulationStore(s => s.tick);

  // Simulation tick loop (runs continuously at 50ms intervals)
  useEffect(() => {
    const interval = setInterval(() => {
      tick(50);
    }, 50);

    return () => clearInterval(interval);
  }, [tick]);

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <Dashboard />;
      case 'mission':
        return <MissionPlanner />;
      case 'flight':
        return <FlightSimulation />;
      case 'safety':
        return <SafetyBoundary />;
      case 'battery':
        return <BatteryRTB />;
      case 'spray':
        return <SprayControl />;
      case 'diagnostics':
        return <SensorsDiagnostics />;
      case 'ota':
        return <OTAUpdates />;
      case 'events':
        return <EventLog />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-navy-900 text-gray-100 font-sans select-none">
      {/* Sidebar Navigation */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <TopBar />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-6 overflow-y-auto bg-navy-900/95">
          <div className="max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
