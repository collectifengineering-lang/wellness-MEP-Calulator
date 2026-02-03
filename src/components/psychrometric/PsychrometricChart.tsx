/**
 * Psychrometric Chart
 * Interactive SVG-based psychrometric chart with click-to-place and context menu
 */

import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import {
  generateSaturationCurve,
  generateConstantRhCurve,
  generateConstantWbLine,
  stateToChartCoords,
} from '../../calculations/psychrometric'
import { DEFAULT_CHART_CONFIG } from '../../data/psychrometricConstants'
import type { StatePointResult, PsychrometricPoint, ProcessType } from '../../types/psychrometric'

interface PointWithResult {
  point: PsychrometricPoint
  result: StatePointResult | null
}

interface ProcessLine {
  id: string
  name: string
  processType: ProcessType
  startPoint: StatePointResult | null
  endPoint: StatePointResult | null
  color: string
}

interface ContextMenuState {
  show: boolean
  x: number
  y: number
  chartX: number
  chartY: number
  dryBulbF: number
  humidityRatioGrains: number
}

interface PsychrometricChartProps {
  points: PointWithResult[]
  processLines?: ProcessLine[]
  barometricPressure: number
  helpMode?: boolean
  onPlacePoint?: (label: string, coords: { dryBulbF: number; humidityRatioGrains: number }) => void
  onDragPoint?: (pointId: string, coords: { dryBulbF: number; humidityRatioGrains: number }) => void
  onStartProcess?: (processType: ProcessType, startCoords: { dryBulbF: number; humidityRatioGrains: number }) => void
}

const CHART_CONFIG = {
  ...DEFAULT_CHART_CONFIG,
  padding: { top: 30, right: 60, bottom: 50, left: 60 },
}

// Point colors for different labels
const POINT_COLORS: Record<string, string> = {
  A: '#22c55e', // green
  B: '#3b82f6', // blue
  Mixed: '#f59e0b', // amber
  Entering: '#06b6d4', // cyan
  Leaving: '#ef4444', // red
  '1': '#8b5cf6', // violet
  '2': '#ec4899', // pink
  '3': '#14b8a6', // teal
  '4': '#f97316', // orange
  default: '#a855f7', // purple
}

// Process type colors
const PROCESS_COLORS: Record<ProcessType, string> = {
  sensible_heating: '#ef4444', // red
  sensible_cooling: '#3b82f6', // blue
  evaporative_cooling: '#06b6d4', // cyan
  steam_humidification: '#8b5cf6', // violet
  dx_dehumidification: '#06b6d4', // cyan
  desiccant_dehumidification: '#f59e0b', // amber
  mixing: '#22c55e', // green
  custom: '#9ca3af', // gray
}

// Help tooltips for chart elements
const HELP_TOOLTIPS: Record<string, string> = {
  saturation: 'Saturation Curve (100% RH): Air at this state is fully saturated. Any cooling causes condensation (dehumidification).',
  rh_curve: 'Constant Relative Humidity: Shows air states at the same RH percentage. RH = actual vapor pressure / saturation pressure.',
  wb_line: 'Constant Wet Bulb: Lines of constant wet bulb temperature. Follows adiabatic saturation (evaporative cooling) path.',
  db_axis: 'Dry Bulb Temperature: The "true" air temperature measured by a standard thermometer.',
  w_axis: 'Humidity Ratio (Specific Humidity): Mass of water vapor per mass of dry air, in grains/lb (7000 grains = 1 lb).',
}

export default function PsychrometricChart({
  points,
  processLines = [],
  barometricPressure,
  helpMode = false,
  onPlacePoint,
  onDragPoint,
  onStartProcess,
}: PsychrometricChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null)
  const [draggedPoint, setDraggedPoint] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null)
  const [helpTooltip, setHelpTooltip] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false, x: 0, y: 0, chartX: 0, chartY: 0, dryBulbF: 0, humidityRatioGrains: 0
  })
  
  // Chart dimensions
  const width = 700
  const height = 500
  const chartWidth = width - CHART_CONFIG.padding.left - CHART_CONFIG.padding.right
  const chartHeight = height - CHART_CONFIG.padding.top - CHART_CONFIG.padding.bottom
  
  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(prev => ({ ...prev, show: false }))
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])
  
  // Generate saturation curve
  const saturationCurve = useMemo(() => {
    return generateSaturationCurve(CHART_CONFIG, barometricPressure, 60)
  }, [barometricPressure])
  
  // Generate RH curves
  const rhCurves = useMemo(() => {
    return CHART_CONFIG.rhIntervals.slice(0, -1).map(rh => ({
      rh,
      points: generateConstantRhCurve(rh, CHART_CONFIG, barometricPressure, 40),
    }))
  }, [barometricPressure])
  
  // Generate wet bulb lines
  const wbLines = useMemo(() => {
    const wbTemps = [40, 50, 60, 70, 80, 90]
    return wbTemps.map(wb => ({
      wb,
      points: generateConstantWbLine(wb, CHART_CONFIG, barometricPressure, 25),
    }))
  }, [barometricPressure])
  
  // Convert normalized coords to SVG coords
  const toSvgCoords = useCallback((x: number, y: number) => ({
    x: CHART_CONFIG.padding.left + x * chartWidth,
    y: CHART_CONFIG.padding.top + y * chartHeight,
  }), [chartWidth, chartHeight])
  
  // Convert SVG coords to chart values
  const fromSvgCoords = useCallback((svgX: number, svgY: number) => {
    const x = (svgX - CHART_CONFIG.padding.left) / chartWidth
    const y = (svgY - CHART_CONFIG.padding.top) / chartHeight
    const dryBulbF = CHART_CONFIG.minTempF + x * (CHART_CONFIG.maxTempF - CHART_CONFIG.minTempF)
    const humidityRatioGrains = CHART_CONFIG.minWGrains + (1 - y) * (CHART_CONFIG.maxWGrains - CHART_CONFIG.minWGrains)
    return { dryBulbF, humidityRatioGrains, x, y }
  }, [chartWidth, chartHeight])
  
  // Check if coords are within chart area
  const isInChartArea = useCallback((svgX: number, svgY: number) => {
    return svgX >= CHART_CONFIG.padding.left && 
           svgX <= width - CHART_CONFIG.padding.right &&
           svgY >= CHART_CONFIG.padding.top && 
           svgY <= height - CHART_CONFIG.padding.bottom
  }, [])
  
  // Generate path string from points
  const pointsToPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return ''
    const svgPts = pts.map(p => toSvgCoords(p.x, p.y))
    return 'M ' + svgPts.map(p => `${p.x},${p.y}`).join(' L ')
  }
  
  // Get point color
  const getPointColor = (label: string) => {
    return POINT_COLORS[label] || POINT_COLORS.default
  }
  
  // Get mouse position relative to SVG
  const getMousePosition = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      clientX: e.clientX,
      clientY: e.clientY,
    }
  }, [])
  
  // Handle right-click (context menu)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const pos = getMousePosition(e)
    if (!pos || !isInChartArea(pos.x, pos.y)) return
    
    const { dryBulbF, humidityRatioGrains } = fromSvgCoords(pos.x, pos.y)
    
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      chartX: pos.x,
      chartY: pos.y,
      dryBulbF,
      humidityRatioGrains,
    })
  }
  
  // Handle context menu action
  const handleContextMenuAction = (action: string) => {
    const coords = { dryBulbF: contextMenu.dryBulbF, humidityRatioGrains: contextMenu.humidityRatioGrains }
    
    if (action.startsWith('place_')) {
      const label = action.replace('place_', '')
      onPlacePoint?.(label, coords)
    } else if (action.startsWith('process_')) {
      const processType = action.replace('process_', '') as ProcessType
      onStartProcess?.(processType, coords)
    }
    
    setContextMenu(prev => ({ ...prev, show: false }))
  }
  
  // Handle mouse down on point (start drag)
  const handlePointMouseDown = (e: React.MouseEvent, pointId: string) => {
    e.stopPropagation()
    if (e.button === 0) { // Left click
      setDraggedPoint(pointId)
    }
  }
  
  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getMousePosition(e)
    if (!pos) return
    
    // Handle dragging
    if (draggedPoint && onDragPoint && isInChartArea(pos.x, pos.y)) {
      const { dryBulbF, humidityRatioGrains } = fromSvgCoords(pos.x, pos.y)
      onDragPoint(draggedPoint, { dryBulbF, humidityRatioGrains })
    }
    
    // Update tooltip
    if (isInChartArea(pos.x, pos.y)) {
      const { dryBulbF, humidityRatioGrains } = fromSvgCoords(pos.x, pos.y)
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      setTooltip({
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top - 10,
        content: `${dryBulbF.toFixed(1)}°F DB, ${humidityRatioGrains.toFixed(1)} gr/lb`,
      })
    } else {
      setTooltip(null)
    }
  }
  
  // Handle mouse up (end drag)
  const handleMouseUp = () => {
    setDraggedPoint(null)
  }
  
  // Generate dry bulb grid lines
  const dbGridLines = useMemo(() => {
    const lines = []
    for (let db = CHART_CONFIG.minTempF; db <= CHART_CONFIG.maxTempF; db += CHART_CONFIG.dbInterval) {
      const x = (db - CHART_CONFIG.minTempF) / (CHART_CONFIG.maxTempF - CHART_CONFIG.minTempF)
      lines.push({ db, x })
    }
    return lines
  }, [])
  
  // Generate humidity ratio grid lines
  const wGridLines = useMemo(() => {
    const lines = []
    for (let w = CHART_CONFIG.minWGrains; w <= CHART_CONFIG.maxWGrains; w += CHART_CONFIG.wInterval) {
      const y = 1 - (w - CHART_CONFIG.minWGrains) / (CHART_CONFIG.maxWGrains - CHART_CONFIG.minWGrains)
      lines.push({ w, y })
    }
    return lines
  }, [])
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-gray-800 rounded-lg overflow-hidden"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="max-w-full max-h-full"
        style={{ cursor: draggedPoint ? 'grabbing' : 'crosshair' }}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setTooltip(null)
          setDraggedPoint(null)
        }}
      >
        {/* Background */}
        <rect
          x={CHART_CONFIG.padding.left}
          y={CHART_CONFIG.padding.top}
          width={chartWidth}
          height={chartHeight}
          fill="#1f2937"
          stroke="#374151"
        />
        
        {/* Grid Lines - Dry Bulb (vertical) */}
        {dbGridLines.map(({ db, x }) => {
          const svgCoords = toSvgCoords(x, 0)
          return (
            <g key={`db-${db}`}>
              <line
                x1={svgCoords.x}
                y1={CHART_CONFIG.padding.top}
                x2={svgCoords.x}
                y2={height - CHART_CONFIG.padding.bottom}
                stroke="#374151"
                strokeWidth={db % 20 === 0 ? 1 : 0.5}
                strokeDasharray={db % 20 === 0 ? '' : '2,2'}
              />
              <text
                x={svgCoords.x}
                y={height - CHART_CONFIG.padding.bottom + 15}
                fill="#9ca3af"
                fontSize="10"
                textAnchor="middle"
              >
                {db}°F
              </text>
            </g>
          )
        })}
        
        {/* Grid Lines - Humidity Ratio (horizontal) */}
        {wGridLines.map(({ w, y }) => {
          const svgCoords = toSvgCoords(0, y)
          return (
            <g key={`w-${w}`}>
              <line
                x1={CHART_CONFIG.padding.left}
                y1={svgCoords.y}
                x2={width - CHART_CONFIG.padding.right}
                y2={svgCoords.y}
                stroke="#374151"
                strokeWidth={w % 40 === 0 ? 1 : 0.5}
                strokeDasharray={w % 40 === 0 ? '' : '2,2'}
              />
              <text
                x={width - CHART_CONFIG.padding.right + 5}
                y={svgCoords.y + 3}
                fill="#9ca3af"
                fontSize="10"
                textAnchor="start"
              >
                {w}
              </text>
            </g>
          )
        })}
        
        {/* RH Curves */}
        {rhCurves.map(({ rh, points: pts }) => (
          <g 
            key={`rh-${rh}`}
            onMouseEnter={() => helpMode && setHelpTooltip(HELP_TOOLTIPS.rh_curve)}
            onMouseLeave={() => setHelpTooltip(null)}
          >
            <path
              d={pointsToPath(pts)}
              fill="none"
              stroke="#4b5563"
              strokeWidth={rh === 50 ? 1.5 : 0.8}
              strokeDasharray={rh === 50 ? '' : '3,3'}
              style={{ pointerEvents: helpMode ? 'stroke' : 'none' }}
            />
            {/* RH Label */}
            {pts.length > 5 && (
              <text
                x={toSvgCoords(pts[Math.floor(pts.length * 0.7)].x, pts[Math.floor(pts.length * 0.7)].y).x}
                y={toSvgCoords(pts[Math.floor(pts.length * 0.7)].x, pts[Math.floor(pts.length * 0.7)].y).y - 5}
                fill="#6b7280"
                fontSize="9"
              >
                {rh}%
              </text>
            )}
          </g>
        ))}
        
        {/* Wet Bulb Lines */}
        {wbLines.map(({ wb, points: pts }) => (
          <g 
            key={`wb-${wb}`}
            onMouseEnter={() => helpMode && setHelpTooltip(HELP_TOOLTIPS.wb_line)}
            onMouseLeave={() => setHelpTooltip(null)}
          >
            <path
              d={pointsToPath(pts)}
              fill="none"
              stroke="#065f46"
              strokeWidth={0.8}
              opacity={0.6}
              style={{ pointerEvents: helpMode ? 'stroke' : 'none' }}
            />
            {/* WB Label at start */}
            {pts.length > 0 && (
              <text
                x={toSvgCoords(pts[0].x, pts[0].y).x - 3}
                y={toSvgCoords(pts[0].x, pts[0].y).y - 5}
                fill="#10b981"
                fontSize="8"
              >
                {wb}°wb
              </text>
            )}
          </g>
        ))}
        
        {/* Saturation Curve (100% RH) */}
        <path
          d={pointsToPath(saturationCurve)}
          fill="none"
          stroke="#06b6d4"
          strokeWidth={2}
          onMouseEnter={() => helpMode && setHelpTooltip(HELP_TOOLTIPS.saturation)}
          onMouseLeave={() => setHelpTooltip(null)}
          style={{ pointerEvents: helpMode ? 'stroke' : 'none' }}
        />
        
        {/* Process Lines */}
        {processLines.map((process) => {
          if (!process.startPoint || !process.endPoint) return null
          const startCoords = toSvgCoords(
            stateToChartCoords(process.startPoint, CHART_CONFIG).x,
            stateToChartCoords(process.startPoint, CHART_CONFIG).y
          )
          const endCoords = toSvgCoords(
            stateToChartCoords(process.endPoint, CHART_CONFIG).x,
            stateToChartCoords(process.endPoint, CHART_CONFIG).y
          )
          const color = process.color || PROCESS_COLORS[process.processType] || '#9ca3af'
          
          return (
            <g key={process.id}>
              <line
                x1={startCoords.x}
                y1={startCoords.y}
                x2={endCoords.x}
                y2={endCoords.y}
                stroke={color}
                strokeWidth={3}
                markerEnd="url(#arrowhead)"
              />
            </g>
          )
        })}
        
        {/* State Points */}
        {points.map(({ point, result }) => {
          if (!result) return null
          
          const coords = stateToChartCoords(result, CHART_CONFIG)
          const svgCoords = toSvgCoords(coords.x, coords.y)
          const color = getPointColor(point.pointLabel)
          const isHovered = hoveredPoint === point.id
          const isDragged = draggedPoint === point.id
          
          return (
            <g
              key={point.id}
              onMouseEnter={() => setHoveredPoint(point.id)}
              onMouseLeave={() => setHoveredPoint(null)}
              onMouseDown={(e) => handlePointMouseDown(e, point.id)}
              style={{ cursor: isDragged ? 'grabbing' : 'grab' }}
            >
              {/* Outer glow when dragging */}
              {isDragged && (
                <circle
                  cx={svgCoords.x}
                  cy={svgCoords.y}
                  r={16}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.5}
                />
              )}
              
              {/* Point circle */}
              <circle
                cx={svgCoords.x}
                cy={svgCoords.y}
                r={isHovered || isDragged ? 10 : 8}
                fill={color}
                stroke="white"
                strokeWidth={2}
                opacity={isHovered || isDragged ? 1 : 0.9}
              />
              
              {/* Point label */}
              <text
                x={svgCoords.x}
                y={svgCoords.y - 14}
                fill={color}
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                {point.pointLabel}
              </text>
              
              {/* Hover info - show during hover OR drag */}
              {(isHovered || isDragged) && (
                <g>
                  <rect
                    x={svgCoords.x + 12}
                    y={svgCoords.y - 50}
                    width={160}
                    height={90}
                    fill="#1f2937"
                    stroke={isDragged ? '#f59e0b' : color}
                    strokeWidth={isDragged ? 2 : 1}
                    rx={4}
                  />
                  {isDragged && (
                    <text x={svgCoords.x + 18} y={svgCoords.y - 35} fill="#f59e0b" fontSize="9" fontWeight="bold">
                      DRAGGING - Values updating...
                    </text>
                  )}
                  <text x={svgCoords.x + 18} y={svgCoords.y - 20} fill="white" fontSize="10">
                    DB: {result.dryBulbF.toFixed(1)}°F
                  </text>
                  <text x={svgCoords.x + 18} y={svgCoords.y - 5} fill="white" fontSize="10">
                    WB: {result.wetBulbF.toFixed(1)}°F
                  </text>
                  <text x={svgCoords.x + 18} y={svgCoords.y + 10} fill="white" fontSize="10">
                    RH: {result.relativeHumidity.toFixed(1)}%
                  </text>
                  <text x={svgCoords.x + 18} y={svgCoords.y + 25} fill="#9ca3af" fontSize="9">
                    W: {result.humidityRatioGrains.toFixed(1)} gr/lb
                  </text>
                </g>
              )}
            </g>
          )
        })}
        
        {/* Mixing/Process Lines between labeled points */}
        {(() => {
          const pointA = points.find(p => p.point.pointLabel === 'A')
          const pointB = points.find(p => p.point.pointLabel === 'B')
          const mixedPoint = points.find(p => p.point.pointLabel === 'Mixed')
          const entering = points.find(p => p.point.pointLabel === 'Entering')
          const leaving = points.find(p => p.point.pointLabel === 'Leaving')
          
          // Mixing mode - draw lines from A and B to Mixed
          if (mixedPoint?.result && pointA?.result && pointB?.result) {
            const mixedCoords = toSvgCoords(stateToChartCoords(mixedPoint.result, CHART_CONFIG).x, stateToChartCoords(mixedPoint.result, CHART_CONFIG).y)
            const aCoords = toSvgCoords(stateToChartCoords(pointA.result, CHART_CONFIG).x, stateToChartCoords(pointA.result, CHART_CONFIG).y)
            const bCoords = toSvgCoords(stateToChartCoords(pointB.result, CHART_CONFIG).x, stateToChartCoords(pointB.result, CHART_CONFIG).y)
            
            return (
              <>
                <line x1={aCoords.x} y1={aCoords.y} x2={mixedCoords.x} y2={mixedCoords.y} stroke="#22c55e" strokeWidth={2} strokeDasharray="5,5" />
                <line x1={bCoords.x} y1={bCoords.y} x2={mixedCoords.x} y2={mixedCoords.y} stroke="#3b82f6" strokeWidth={2} strokeDasharray="5,5" />
              </>
            )
          }
          
          // HVAC Process mode - draw line from Entering to Leaving
          if (entering?.result && leaving?.result) {
            const enterCoords = toSvgCoords(stateToChartCoords(entering.result, CHART_CONFIG).x, stateToChartCoords(entering.result, CHART_CONFIG).y)
            const leaveCoords = toSvgCoords(stateToChartCoords(leaving.result, CHART_CONFIG).x, stateToChartCoords(leaving.result, CHART_CONFIG).y)
            
            return (
              <line 
                x1={enterCoords.x} y1={enterCoords.y} 
                x2={leaveCoords.x} y2={leaveCoords.y} 
                stroke="#f59e0b" strokeWidth={2} strokeDasharray="5,5" 
                markerEnd="url(#arrowhead)"
              />
            )
          }
          
          return null
        })()}
        
        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
          </marker>
        </defs>
        
        {/* Axis Labels */}
        <text
          x={width / 2}
          y={height - 10}
          fill="#9ca3af"
          fontSize="12"
          textAnchor="middle"
          onMouseEnter={() => helpMode && setHelpTooltip(HELP_TOOLTIPS.db_axis)}
          onMouseLeave={() => setHelpTooltip(null)}
          style={{ cursor: helpMode ? 'help' : 'default' }}
        >
          Dry Bulb Temperature (°F)
        </text>
        
        <text
          x={width - 15}
          y={CHART_CONFIG.padding.top - 10}
          fill="#9ca3af"
          fontSize="11"
          textAnchor="end"
          onMouseEnter={() => helpMode && setHelpTooltip(HELP_TOOLTIPS.w_axis)}
          onMouseLeave={() => setHelpTooltip(null)}
          style={{ cursor: helpMode ? 'help' : 'default' }}
        >
          Humidity Ratio (grains/lb)
        </text>
        
        {/* Chart Title */}
        <text
          x={CHART_CONFIG.padding.left}
          y={20}
          fill="white"
          fontSize="14"
          fontWeight="bold"
        >
          Psychrometric Chart
        </text>
        <text
          x={CHART_CONFIG.padding.left}
          y={35}
          fill="#9ca3af"
          fontSize="10"
        >
          P = {barometricPressure.toFixed(3)} psia
        </text>
        
        {/* Instructions overlay */}
        <text
          x={width - CHART_CONFIG.padding.right - 5}
          y={35}
          fill="#6b7280"
          fontSize="9"
          textAnchor="end"
        >
          Right-click to place points • Drag to move
        </text>
      </svg>
      
      {/* Tooltip */}
      {tooltip && !contextMenu.show && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-600 z-10"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
      
      {/* Help tooltip */}
      {helpMode && helpTooltip && (
        <div
          className="absolute bottom-20 left-4 right-4 bg-indigo-900/95 text-white text-sm px-4 py-3 rounded-lg border border-indigo-500 z-20"
        >
          <div className="flex items-start gap-2">
            <span className="text-indigo-300">💡</span>
            <span>{helpTooltip}</span>
          </div>
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed bg-gray-900 border border-gray-600 rounded-lg shadow-xl py-2 z-50 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-700 mb-1">
            {contextMenu.dryBulbF.toFixed(1)}°F DB, {contextMenu.humidityRatioGrains.toFixed(1)} gr/lb
          </div>
          
          <div className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wide">Place Point</div>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
            onClick={() => handleContextMenuAction('place_A')}
          >
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Set Point A
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
            onClick={() => handleContextMenuAction('place_B')}
          >
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            Set Point B
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
            onClick={() => handleContextMenuAction('place_Entering')}
          >
            <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
            Set Entering Air
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
            onClick={() => handleContextMenuAction('place_Leaving')}
          >
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Set Leaving Air
          </button>
          
          <div className="border-t border-gray-700 mt-1 pt-1">
            <div className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wide">Start Process From Here</div>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
              onClick={() => handleContextMenuAction('process_sensible_heating')}
            >
              <span className="text-red-400">🔥</span>
              Sensible Heating
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
              onClick={() => handleContextMenuAction('process_sensible_cooling')}
            >
              <span className="text-blue-400">❄️</span>
              Sensible Cooling
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
              onClick={() => handleContextMenuAction('process_evaporative_cooling')}
            >
              <span className="text-cyan-400">💧</span>
              Evaporative Cooling
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
              onClick={() => handleContextMenuAction('process_dx_dehumidification')}
            >
              <span className="text-cyan-400">🧊</span>
              DX Dehumidification
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
              onClick={() => handleContextMenuAction('process_steam_humidification')}
            >
              <span className="text-violet-400">♨️</span>
              Steam Humidification
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
              onClick={() => handleContextMenuAction('process_desiccant_dehumidification')}
            >
              <span className="text-amber-400">🌀</span>
              Desiccant Dehumidification
            </button>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 rounded-lg p-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-cyan-400"></div>
            <span className="text-surface-400">Saturation</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-gray-500 opacity-50"></div>
            <span className="text-surface-400">RH</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-emerald-700"></div>
            <span className="text-surface-400">WB</span>
          </div>
        </div>
      </div>
    </div>
  )
}
