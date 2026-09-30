import React, { useMemo } from 'react';
import { useSimulationStore } from '../state/simulationStore';
import { shrinkPolygon } from '../utils/calculations';

interface FieldMapProps {
  width?: number;
  height?: number;
  showRoute?: boolean;
  showDrone?: boolean;
  showLabels?: boolean;
  compact?: boolean;
}

const FieldMap: React.FC<FieldMapProps> = ({
  width = 620,
  height = 420,
  showRoute = true,
  showDrone = true,
  showLabels = true,
  compact = false,
}) => {
  const drone = useSimulationStore(s => s.drone);
  const fieldBoundary = useSimulationStore(s => s.fieldBoundary);
  const route = useSimulationStore(s => s.route);
  const settings = useSimulationStore(s => s.settings);

  const innerBoundary = useMemo(
    () => shrinkPolygon(fieldBoundary.points, fieldBoundary.safetyMargin),
    [fieldBoundary]
  );

  const boundaryPath = fieldBoundary.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
  const innerPath = innerBoundary.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  const routePath = route.waypoints.map((wp, i) => `${i === 0 ? 'M' : 'L'}${wp.position.x},${wp.position.y}`).join(' ');

  // Traveled path
  const traveledPath = route.waypoints.slice(0, drone.currentWaypointIndex).map((wp, i) => `${i === 0 ? 'M' : 'L'}${wp.position.x},${wp.position.y}`).join(' ');

  const droneColor = drone.spray.active ? '#10b981' : drone.flightState === 'SAFE_MODE' ? '#f59e0b' : drone.flightState === 'EMERGENCY' ? '#ef4444' : '#3b82f6';

  return (
    <div className={`relative bg-navy-900 rounded-xl border border-navy-600 overflow-hidden ${compact ? '' : 'p-2'}`}>
      {/* Grid pattern */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a2234" strokeWidth="0.5" />
          </pattern>
          <pattern id="gridSmall" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#111827" strokeWidth="0.3" />
          </pattern>
          {/* Spray pattern */}
          <radialGradient id="sprayGlow">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background grid */}
        <rect width={width} height={height} fill="url(#gridSmall)" />
        <rect width={width} height={height} fill="url(#grid)" />

        {/* No-spray zone (between boundary and inner) */}
        <path d={boundaryPath} fill="#ef444410" stroke="#ef4444" strokeWidth="2" strokeDasharray="8,4" />

        {/* Safe spray area */}
        <path d={innerPath} fill="#10b98108" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4,4" />

        {/* Route */}
        {showRoute && (
          <>
            <path d={routePath} fill="none" stroke="#3b82f640" strokeWidth="1.5" strokeDasharray="6,3" />
            {/* Traveled part */}
            {traveledPath && (
              <path d={traveledPath} fill="none" stroke="#3b82f6" strokeWidth="2" />
            )}
            {/* Waypoints */}
            {route.waypoints.map((wp, i) => (
              <g key={wp.id}>
                <circle
                  cx={wp.position.x} cy={wp.position.y} r={i === 0 ? 5 : 2.5}
                  fill={i === 0 ? '#f59e0b' : i <= drone.currentWaypointIndex ? '#3b82f6' : '#3b82f640'}
                  stroke={i === 0 ? '#f59e0b80' : 'none'} strokeWidth="2"
                />
              </g>
            ))}
          </>
        )}

        {/* Home marker */}
        <g>
          <circle cx={drone.homePosition.x} cy={drone.homePosition.y} r="8" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1.5" />
          <text x={drone.homePosition.x} y={drone.homePosition.y + 3.5} textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">H</text>
          {showLabels && (
            <text x={drone.homePosition.x + 12} y={drone.homePosition.y + 3} fill="#f59e0b" fontSize="9" fontFamily="monospace">BASE</text>
          )}
        </g>

        {/* Drone */}
        {showDrone && (
          <g transform={`translate(${drone.position.x},${drone.position.y})`}>
            {/* Spray radius */}
            {drone.spray.active && (
              <circle r="20" fill="url(#sprayGlow)" className="pulse-dot" />
            )}

            {/* Drone body */}
            <g transform={`rotate(${drone.heading})`}>
              {/* Direction indicator */}
              <line x1="0" y1="0" x2="14" y2="0" stroke={droneColor} strokeWidth="2" />
              {/* Drone circle */}
              <circle r="7" fill={droneColor} stroke="white" strokeWidth="1.5" />
              {/* Cross arms */}
              <line x1="-5" y1="-5" x2="5" y2="5" stroke="white" strokeWidth="1" opacity="0.5" />
              <line x1="5" y1="-5" x2="-5" y2="5" stroke="white" strokeWidth="1" opacity="0.5" />
            </g>

            {/* State label */}
            {showLabels && (
              <text y="-14" textAnchor="middle" fill={droneColor} fontSize="8" fontWeight="bold" fontFamily="monospace">
                {drone.flightState}
              </text>
            )}
          </g>
        )}

        {/* Legend */}
        {showLabels && !compact && (
          <g transform={`translate(${width - 160}, 20)`}>
            <rect x="-5" y="-5" width="155" height="80" rx="6" fill="#0a0f1ecc" stroke="#243049" />
            <line x1="0" y1="8" x2="15" y2="8" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2" />
            <text x="20" y="11" fill="#9ca3af" fontSize="9">Field Boundary</text>
            <line x1="0" y1="24" x2="15" y2="24" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,3" />
            <text x="20" y="27" fill="#9ca3af" fontSize="9">Safe Spray Area</text>
            <line x1="0" y1="40" x2="15" y2="40" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="20" y="43" fill="#9ca3af" fontSize="9">Flight Route</text>
            <circle cx="7" cy="55" r="4" fill="#f59e0b" />
            <text x="20" y="58" fill="#9ca3af" fontSize="9">Home / Base</text>
            <circle cx="7" cy="68" r="4" fill="#3b82f6" />
            <text x="20" y="71" fill="#9ca3af" fontSize="9">Drone</text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default FieldMap;
