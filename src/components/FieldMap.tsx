import React, { useMemo, useState, useRef } from 'react';
import { useSimulationStore } from '../state/simulationStore';
import { shrinkPolygon, Position } from '../utils/calculations';

interface FieldMapProps {
  width?: number;
  height?: number;
  showRoute?: boolean;
  showDrone?: boolean;
  showLabels?: boolean;
  compact?: boolean;
  isTracing?: boolean;
  tracedPoints?: Position[];
  onMapClick?: (pos: Position) => void;
  onVertexDrag?: (index: number, pos: Position) => void;
  interactiveMoveDrone?: boolean;
}

const FieldMap: React.FC<FieldMapProps> = ({
  width = 620,
  height = 420,
  showRoute = true,
  showDrone = true,
  showLabels = true,
  compact = false,
  isTracing = false,
  tracedPoints = [],
  onMapClick,
  interactiveMoveDrone = false,
}) => {
  const drone = useSimulationStore(s => s.drone);
  const fieldBoundary = useSimulationStore(s => s.fieldBoundary);
  const route = useSimulationStore(s => s.route);
  const setDronePosition = useSimulationStore(s => s.setDronePosition);

  const [hoverPos, setHoverPos] = useState<Position | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const activePolygon = isTracing && tracedPoints.length >= 3 ? tracedPoints : fieldBoundary.points;

  const innerBoundary = useMemo(
    () => shrinkPolygon(activePolygon, fieldBoundary.safetyMargin),
    [activePolygon, fieldBoundary.safetyMargin]
  );

  const boundaryPath = activePolygon.length >= 3
    ? activePolygon.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
    : '';

  const innerPath = innerBoundary.length >= 3
    ? innerBoundary.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
    : '';

  const routePath = route.waypoints.map((wp, i) => `${i === 0 ? 'M' : 'L'}${wp.position.x},${wp.position.y}`).join(' ');

  // Traveled path
  const traveledPath = route.waypoints.slice(0, drone.currentWaypointIndex).map((wp, i) => `${i === 0 ? 'M' : 'L'}${wp.position.x},${wp.position.y}`).join(' ');

  const droneColor = drone.spray.active
    ? '#10b981'
    : drone.flightState === 'SAFE_MODE'
    ? '#f59e0b'
    : drone.flightState === 'EMERGENCY'
    ? '#ef4444'
    : '#3b82f6';

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * height);
    const pos = { x, y };

    if (isTracing && onMapClick) {
      onMapClick(pos);
    } else if (interactiveMoveDrone && !drone.missionActive) {
      setDronePosition(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !isTracing) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * height);
    setHoverPos({ x, y });
  };

  return (
    <div className={`relative bg-navy-900 rounded-xl border border-navy-600 overflow-hidden ${compact ? '' : 'p-2'}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onClick={handleSvgClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPos(null)}
        className={`w-full h-auto select-none ${isTracing ? 'cursor-crosshair' : interactiveMoveDrone ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a2234" strokeWidth="0.5" />
          </pattern>
          <pattern id="gridSmall" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#111827" strokeWidth="0.3" />
          </pattern>
          {/* Hazard diagonal stripes for neighbouring farm outside */}
          <pattern id="hazardStripes" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#ef444415" strokeWidth="10" />
            <line x1="10" y1="0" x2="10" y2="20" stroke="#11182705" strokeWidth="10" />
          </pattern>
          {/* Spray pattern */}
          <radialGradient id="sprayGlow">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background grid */}
        <rect width={width} height={height} fill="url(#gridSmall)" />
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Neighboring Land / Off-Limit Hazard Overlay */}
        <rect width={width} height={height} fill="url(#hazardStripes)" />

        {/* Neighboring Land labels */}
        {!compact && showLabels && (
          <g opacity="0.6">
            <rect x="20" y="15" width="220" height="22" rx="4" fill="#111827dd" stroke="#ef444450" />
            <text x="30" y="30" fill="#ef4444" fontSize="9" fontWeight="bold">
              🚫 NEIGHBOURING ORGANIC FARM (NO-SPRAY)
            </text>
          </g>
        )}

        {/* Farmer's Authorized Field Boundary (Polygon) */}
        {boundaryPath && (
          <path
            d={boundaryPath}
            fill="#0f172a"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeDasharray={isTracing ? '5,5' : '8,4'}
          />
        )}

        {/* Safe Inner Spray Area (Buffer offset) */}
        {innerPath && !isTracing && (
          <path
            d={innerPath}
            fill="#10b98110"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
        )}

        {/* Route (only when not in active tracing mode) */}
        {showRoute && !isTracing && (
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
                  cx={wp.position.x}
                  cy={wp.position.y}
                  r={i === 0 ? 5 : 2.5}
                  fill={i === 0 ? '#f59e0b' : i <= drone.currentWaypointIndex ? '#3b82f6' : '#3b82f640'}
                  stroke={i === 0 ? '#f59e0b80' : 'none'}
                  strokeWidth="2"
                />
              </g>
            ))}
          </>
        )}

        {/* Tracing in progress vertices & guide lines */}
        {isTracing && (
          <g>
            {tracedPoints.length > 0 && (
              <polyline
                points={tracedPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                strokeDasharray="4,4"
              />
            )}

            {/* Line to mouse cursor */}
            {hoverPos && tracedPoints.length > 0 && (
              <line
                x1={tracedPoints[tracedPoints.length - 1].x}
                y1={tracedPoints[tracedPoints.length - 1].y}
                x2={hoverPos.x}
                y2={hoverPos.y}
                stroke="#06b6d480"
                strokeWidth="2"
                strokeDasharray="3,3"
              />
            )}

            {/* Traced vertex markers */}
            {tracedPoints.map((p, idx) => (
              <g key={idx} transform={`translate(${p.x},${p.y})`}>
                <circle
                  r={idx === 0 ? 8 : 6}
                  fill={idx === 0 ? '#10b981' : '#06b6d4'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="animate-pulse"
                />
                <text
                  y="3"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {idx + 1}
                </text>
              </g>
            ))}
          </g>
        )}

        {/* Existing Boundary Vertices Pins */}
        {!isTracing &&
          fieldBoundary.points.map((p, idx) => (
            <g key={idx} transform={`translate(${p.x},${p.y})`}>
              <circle r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
              {showLabels && (
                <text x="7" y="3" fill="#9ca3af" fontSize="8" fontFamily="monospace">
                  P{idx + 1}
                </text>
              )}
            </g>
          ))}

        {/* Home Base marker */}
        {!isTracing && (
          <g>
            <circle cx={drone.homePosition.x} cy={drone.homePosition.y} r="9" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1.8" />
            <text x={drone.homePosition.x} y={drone.homePosition.y + 3.5} textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">H</text>
            {showLabels && (
              <text x={drone.homePosition.x + 13} y={drone.homePosition.y + 3} fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">
                FARM BASE
              </text>
            )}
          </g>
        )}

        {/* Drone Icon */}
        {showDrone && !isTracing && (
          <g transform={`translate(${drone.position.x},${drone.position.y})`}>
            {/* Spray radius */}
            {drone.spray.active && (
              <circle r="22" fill="url(#sprayGlow)" className="pulse-dot" />
            )}

            {/* Drone body */}
            <g transform={`rotate(${drone.heading})`}>
              {/* Direction heading pointer */}
              <line x1="0" y1="0" x2="16" y2="0" stroke={droneColor} strokeWidth="2.5" />
              {/* Central hub */}
              <circle r="8" fill={droneColor} stroke="white" strokeWidth="2" />
              {/* Rotor arms */}
              <line x1="-6" y1="-6" x2="6" y2="6" stroke="white" strokeWidth="1.2" opacity="0.7" />
              <line x1="6" y1="-6" x2="-6" y2="6" stroke="white" strokeWidth="1.2" opacity="0.7" />
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
        {showLabels && !compact && !isTracing && (
          <g transform={`translate(${width - 170}, 20)`}>
            <rect x="-5" y="-5" width="165" height="90" rx="6" fill="#0a0f1edd" stroke="#243049" />
            <line x1="0" y1="8" x2="15" y2="8" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2" />
            <text x="20" y="11" fill="#9ca3af" fontSize="9">Traced Field Boundary</text>
            <line x1="0" y1="24" x2="15" y2="24" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,3" />
            <text x="20" y="27" fill="#9ca3af" fontSize="9">30m Safe Spray Zone</text>
            <line x1="0" y1="40" x2="15" y2="40" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="20" y="43" fill="#9ca3af" fontSize="9">Serpentine Route</text>
            <circle cx="7" cy="56" r="4" fill="#f59e0b" />
            <text x="20" y="59" fill="#9ca3af" fontSize="9">Farmer Base Station</text>
            <circle cx="7" cy="71" r="4" fill="#3b82f6" />
            <text x="20" y="74" fill="#9ca3af" fontSize="9">KisanDrone Position</text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default FieldMap;
