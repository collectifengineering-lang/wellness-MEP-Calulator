/**
 * ProcessTable Component
 * Display and manage HVAC processes with chain visualization and load calculations
 */

import { useMemo } from 'react'
import { usePsychrometricStore } from '../../store/usePsychrometricStore'
import { calculateProcess } from '../../calculations/psychrometric'
import type { PsychrometricProcess, PsychrometricPoint, StatePointResult, ProcessType, EquipmentType } from '../../types/psychrometric'

// Equipment type display info
const EQUIPMENT_OPTIONS: { id: EquipmentType | ''; icon: string; name: string }[] = [
  { id: '', icon: '—', name: 'None' },
  { id: 'cooling_coil', icon: '❄️', name: 'Cooling Coil' },
  { id: 'heating_coil', icon: '🔥', name: 'Heating Coil' },
  { id: 'humidifier', icon: '💦', name: 'Humidifier' },
  { id: 'dehumidifier', icon: '🧊', name: 'Dehumidifier' },
  { id: 'energy_recovery', icon: '♻️', name: 'Energy Recovery' },
  { id: 'other', icon: '⚙️', name: 'Other' },
]

interface ProcessTableProps {
  processes: PsychrometricProcess[]
  points: PsychrometricPoint[]
  calculatedPoints: Record<string, StatePointResult>
  onSelectProcess?: (processId: string) => void
  onEditProcess?: (processId: string) => void
  selectedProcessId?: string | null
}

// Process type display info
const PROCESS_INFO: Record<ProcessType, { icon: string; color: string; name: string }> = {
  sensible_heating: { icon: '🔥', color: '#ef4444', name: 'Sensible Heating' },
  sensible_cooling: { icon: '❄️', color: '#3b82f6', name: 'Sensible Cooling' },
  evaporative_cooling: { icon: '💧', color: '#06b6d4', name: 'Evaporative Cooling' },
  steam_humidification: { icon: '♨️', color: '#8b5cf6', name: 'Steam Humidification' },
  dx_dehumidification: { icon: '🧊', color: '#06b6d4', name: 'DX Dehumidification' },
  desiccant_dehumidification: { icon: '🌀', color: '#f59e0b', name: 'Desiccant Dehum' },
  mixing: { icon: '🔄', color: '#22c55e', name: 'Mixing' },
  oa_ra_mixing: { icon: '🌬️', color: '#22c55e', name: 'OA/RA Mixing' },
  space_load: { icon: '🏢', color: '#f59e0b', name: 'Space Load' },
  custom: { icon: '✏️', color: '#9ca3af', name: 'Custom' },
}

// Format number with appropriate units
function formatLoad(value: number, unit: 'btuh' | 'kw' | 'tons' | 'lb_hr'): string {
  switch (unit) {
    case 'btuh':
      return Math.abs(value) >= 1000 
        ? `${(value / 1000).toFixed(1)} MBH` 
        : `${value.toFixed(0)} BTU/h`
    case 'kw':
      return `${(value / 3412).toFixed(2)} kW`
    case 'tons':
      return `${value.toFixed(2)} tons`
    case 'lb_hr':
      return `${value.toFixed(2)} lb/hr`
    default:
      return value.toFixed(2)
  }
}

export default function ProcessTable({
  processes,
  points,
  calculatedPoints,
  onSelectProcess,
  onEditProcess,
  selectedProcessId,
}: ProcessTableProps) {
  const { updateProcess, deleteProcess, isPointShared } = usePsychrometricStore()
  
  // Detect process chains (where one process ends at the same point another starts)
  const chainInfo = useMemo(() => {
    const chains: { processId: string; chainedFrom: string | null; chainedTo: string | null }[] = []
    
    processes.forEach((process, idx) => {
      let chainedFrom: string | null = null
      let chainedTo: string | null = null
      
      // Check if this process's start point is the end point of a previous process
      if (process.startPointId) {
        const prevProcess = processes.find((p, i) => 
          i < idx && p.endPointId === process.startPointId
        )
        if (prevProcess) {
          chainedFrom = prevProcess.id
        }
      }
      
      // Check if this process's end point is the start point of a later process
      if (process.endPointId) {
        const nextProcess = processes.find((p, i) => 
          i > idx && p.startPointId === process.endPointId
        )
        if (nextProcess) {
          chainedTo = nextProcess.id
        }
      }
      
      chains.push({ processId: process.id, chainedFrom, chainedTo })
    })
    
    return chains
  }, [processes])
  
  // Calculate results for each process
  const processResults = useMemo(() => {
    return processes.map(process => {
      let startPoint = process.startPointId 
        ? calculatedPoints[process.startPointId] 
        : null
      let endPoint = process.endPointId 
        ? calculatedPoints[process.endPointId] 
        : null
      
      let result = null
      let isVentilationLoad = false
      
      // For OA/RA Mixing, calculate ventilation load as RA → MA (what OA adds)
      if (process.processType === 'oa_ra_mixing') {
        const raPoint = process.raPointId ? calculatedPoints[process.raPointId] : null
        const maPoint = process.mixedPointId ? calculatedPoints[process.mixedPointId] : null
        
        if (raPoint && maPoint && process.cfm > 0) {
          try {
            // Ventilation load = difference between RA and MA at total CFM
            result = calculateProcess(raPoint, maPoint, process.cfm)
            isVentilationLoad = true
            // Use RA as "start" and MA as "end" for display
            startPoint = raPoint
            endPoint = maPoint
          } catch (e) {
            console.warn('Failed to calculate ventilation load:', e)
          }
        }
      } else if (startPoint && endPoint && process.cfm > 0) {
        try {
          result = calculateProcess(startPoint, endPoint, process.cfm)
        } catch (e) {
          console.warn('Failed to calculate process:', e)
        }
      }
      
      return {
        process,
        startPoint,
        endPoint,
        result,
        isVentilationLoad,
      }
    })
  }, [processes, calculatedPoints])
  
  // Calculate totals
  const totals = useMemo(() => {
    return processResults.reduce((acc, { result }) => {
      if (result) {
        return {
          sensible: acc.sensible + result.sensibleLoadBtuh,
          latent: acc.latent + result.latentLoadBtuh,
          total: acc.total + result.totalLoadBtuh,
          tons: acc.tons + Math.abs(result.totalLoadTons),
          moisture: acc.moisture + result.moistureLbHr,
        }
      }
      return acc
    }, { sensible: 0, latent: 0, total: 0, tons: 0, moisture: 0 })
  }, [processResults])
  
  // Get point label by ID
  const getPointLabel = (pointId: string | null) => {
    if (!pointId) return '—'
    const point = points.find(p => p.id === pointId)
    return point?.pointLabel || '—'
  }
  
  // Check if point is shared
  const pointIsShared = (pointId: string | null) => {
    if (!pointId) return false
    return isPointShared(pointId)
  }
  
  if (processes.length === 0) {
    return (
      <div className="bg-gray-800/30 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">⚡</div>
        <h3 className="text-lg font-medium text-white mb-1">No Processes Defined</h3>
        <p className="text-sm text-gray-400">
          Add processes using the Process Builder above to calculate HVAC loads
        </p>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-800/30 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          📊 Process Summary
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {processes.length} process{processes.length > 1 ? 'es' : ''} 
          {chainInfo.filter(c => c.chainedFrom || c.chainedTo).length > 0 && (
            <span className="text-cyan-400 ml-2">
              • ⛓️ {chainInfo.filter(c => c.chainedFrom).length} chained
            </span>
          )}
          <span className="ml-4">Click a row to highlight • Edit CFM in table</span>
        </p>
      </div>
      
      {/* Process Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-2 py-2 text-center w-8">#</th>
              <th className="px-3 py-2 text-left">Process / Label</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-center" title="Equipment for HVAC sizing">Equipment</th>
              <th className="px-3 py-2 text-center">Start</th>
              <th className="px-3 py-2 text-center">End</th>
              <th className="px-3 py-2 text-right">CFM</th>
              <th className="px-3 py-2 text-right">Sensible</th>
              <th className="px-3 py-2 text-right">Latent</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Tons</th>
              <th className="px-3 py-2 text-right" title="Moisture Added/Removed">Moisture</th>
              <th className="px-3 py-2 text-center">SHR</th>
              <th className="px-3 py-2 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {processResults.map(({ process, startPoint, endPoint, result, isVentilationLoad }, idx) => {
              const info = PROCESS_INFO[process.processType] || PROCESS_INFO.custom
              const isSelected = selectedProcessId === process.id
              const isHeating = result && result.sensibleLoadBtuh > 0
              const isCooling = result && result.sensibleLoadBtuh < 0
              const chain = chainInfo[idx]
              const hasChainIn = !!chain?.chainedFrom
              const hasChainOut = !!chain?.chainedTo
              const startShared = pointIsShared(process.startPointId)
              const endShared = pointIsShared(process.endPointId)
              
              return (
                <tr
                  key={process.id}
                  onClick={() => onSelectProcess?.(process.id)}
                  className={`border-b border-gray-800 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-cyan-900/30' 
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  {/* Chain indicator column */}
                  <td className="px-2 py-2 text-center">
                    <div className="flex flex-col items-center">
                      {hasChainIn && <span className="text-cyan-400 text-xs">⛓️</span>}
                      <span className="text-gray-500 text-xs font-medium">{idx + 1}</span>
                      {hasChainOut && <span className="text-cyan-400 text-xs">⛓️</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-white">{process.name}</div>
                    {/* Editable label for exports */}
                    <input
                      type="text"
                      value={process.label || ''}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateProcess(process.id, { label: e.target.value })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Label..."
                      className="w-full bg-transparent border-0 text-xs text-cyan-400 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-0 py-0.5 mt-0.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {/* Editable description for exports */}
                    <input
                      type="text"
                      value={process.description || ''}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateProcess(process.id, { description: e.target.value })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Description..."
                      className="w-full bg-transparent border-0 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-0 py-0.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span>{info.icon}</span>
                      <span className="text-gray-300 text-xs">{info.name}</span>
                    </div>
                    {isVentilationLoad && (
                      <div className="mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-400 rounded border border-emerald-700/50" title="Load calculated from Return Air to Mixed Air">
                          🌬️ Ventilation Load
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {/* Equipment Type dropdown */}
                    <select
                      value={process.equipmentType || ''}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateProcess(process.id, { 
                          equipmentType: (e.target.value as EquipmentType) || null 
                        })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs w-full"
                      title="Identify as HVAC equipment for system sizing"
                    >
                      {EQUIPMENT_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.icon} {opt.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {startShared && <span className="text-amber-400 text-xs" title="Shared point">🔗</span>}
                      <span className={startShared ? 'text-amber-400' : 'text-cyan-400'}>
                        {isVentilationLoad ? 'RA' : getPointLabel(process.startPointId)}
                      </span>
                    </div>
                    {startPoint && (
                      <div className="text-xs text-gray-500">
                        {startPoint.dryBulbF.toFixed(0)}°F / {startPoint.wetBulbF.toFixed(0)}°F WB
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {endShared && <span className="text-amber-400 text-xs" title="Shared point">🔗</span>}
                      <span className={endShared ? 'text-amber-400' : 'text-red-400'}>
                        {isVentilationLoad ? 'MA' : getPointLabel(process.endPointId)}
                      </span>
                    </div>
                    {endPoint && (
                      <div className="text-xs text-gray-500">
                        {endPoint.dryBulbF.toFixed(0)}°F / {endPoint.wetBulbF.toFixed(0)}°F WB
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={process.cfm}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateProcess(process.id, { cfm: parseInt(e.target.value) || 0 })
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-xs"
                      min={0}
                      step={100}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {result ? (
                      <span className={isHeating ? 'text-red-400' : 'text-blue-400'}>
                        {formatLoad(result.sensibleLoadBtuh, 'btuh')}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {result ? (
                      <span className={result.latentLoadBtuh > 0 ? 'text-violet-400' : 'text-cyan-400'}>
                        {formatLoad(result.latentLoadBtuh, 'btuh')}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {result ? (
                      <span className={isHeating ? 'text-red-300' : isCooling ? 'text-blue-300' : 'text-gray-300'}>
                        {formatLoad(result.totalLoadBtuh, 'btuh')}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {result ? (
                      <span className="text-amber-400 font-medium">
                        {Math.abs(result.totalLoadTons).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {result ? (
                      <span className={`font-medium ${
                        result.moistureLbHr > 0 
                          ? 'text-violet-400' 
                          : result.moistureLbHr < 0 
                            ? 'text-cyan-400' 
                            : 'text-gray-400'
                      }`}>
                        {result.moistureLbHr > 0 ? '+' : ''}
                        {result.moistureLbHr.toFixed(2)} lb/hr
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {result ? (
                      <span className="text-gray-400 text-xs">
                        {(result.sensibleHeatRatio * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      {onEditProcess && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditProcess(process.id)
                          }}
                          className="text-amber-500 hover:text-amber-400 p-1"
                          title="Edit process"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteProcess(process.id)
                        }}
                        className="text-red-500 hover:text-red-400 p-1"
                        title="Delete process"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          
          {/* Totals Row */}
          <tfoot>
            <tr className="bg-gray-900/70 border-t-2 border-gray-600 font-medium">
              <td colSpan={8} className="px-3 py-2 text-right text-gray-400">
                TOTALS:
              </td>
              <td className="px-3 py-2 text-right text-white">
                {formatLoad(totals.sensible, 'btuh')}
              </td>
              <td className="px-3 py-2 text-right text-white">
                {formatLoad(totals.latent, 'btuh')}
              </td>
              <td className="px-3 py-2 text-right text-white font-bold">
                {formatLoad(totals.total, 'btuh')}
              </td>
              <td className="px-3 py-2 text-right text-amber-400 font-bold">
                {totals.tons.toFixed(2)}
              </td>
              <td className="px-3 py-2 text-right font-bold">
                <span className={`${
                  totals.moisture > 0 
                    ? 'text-violet-400' 
                    : totals.moisture < 0 
                      ? 'text-cyan-400' 
                      : 'text-gray-400'
                }`}>
                  {totals.moisture > 0 ? '+' : ''}
                  {totals.moisture.toFixed(2)} lb/hr
                </span>
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {/* Legend / Help */}
      <div className="px-4 py-3 bg-gray-900/30 border-t border-gray-800 text-xs text-gray-500">
        <div className="flex items-center gap-4 flex-wrap">
          <span>
            <span className="text-cyan-400">⛓️</span> = Chained process
          </span>
          <span>
            <span className="text-amber-400">🔗</span> = Shared point
          </span>
          <span>
            <span className="text-red-400">Red</span> = Heating
          </span>
          <span>
            <span className="text-blue-400">Blue</span> = Cooling
          </span>
          <span>
            <span className="text-violet-400">Violet</span> = Humidify
          </span>
          <span>
            <span className="text-cyan-400">Cyan</span> = Dehumidify
          </span>
          <span className="ml-auto">
            SHR = Sensible Heat Ratio
          </span>
        </div>
      </div>
    </div>
  )
}
