// =========================================== 
// HYDRONIC RESULTS DASHBOARD
// Displays calculation results with safety factor breakdown
// =========================================== 

import {
  AlertTriangle,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import { getFluidDisplayName } from '../../data/fluidProperties'
import { calculatePumpBhp, headToPsi } from '../../calculations/hydronic'
import { exportHydronicToExcel } from '../../export/hydronicExcel'
import { exportHydronicToPdf } from '../../export/hydronicPdf'
import { useHydronicStore } from '../../store/useHydronicStore'
import type { HydronicSystem, HydronicCalculationResult } from '../../types/hydronic'

interface HydronicResultsProps {
  system: HydronicSystem
  result: HydronicCalculationResult | null
}

export function HydronicResults({
  system,
  result,
}: HydronicResultsProps) {
  const { getSectionsForSystem } = useHydronicStore()
  const sections = getSectionsForSystem(system.id)
  
  const handleExportExcel = () => {
    if (!result) return
    exportHydronicToExcel(system, sections, result)
  }
  
  const handleExportPdf = () => {
    if (!result) return
    exportHydronicToPdf(system, sections, result)
  }
  
  if (!result) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Add pipe sections to see results</p>
      </div>
    )
  }
  
  const estimatedBhp = calculatePumpBhp(
    result.maxFlowGpm,
    result.totalPumpHeadFt,
    result.fluidProperties.specificGravity
  )
  
  const totalHeadPsi = headToPsi(result.totalPumpHeadFt, result.fluidProperties.specificGravity)
  
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-white mb-1">Pump Requirements</h3>
        <p className="text-xs text-gray-400">{system.name}</p>
      </div>
      
      {/* Main Results */}
      <div className="space-y-4">
        {/* Total Pump Head - Hero Number */}
        <div className="bg-gradient-to-br from-blue-600/30 to-blue-700/20 rounded-xl p-4 border border-blue-500/30">
          <div className="text-xs text-blue-300 uppercase tracking-wide mb-1">
            Total Pump Head
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">
              {result.totalPumpHeadFt.toFixed(1)}
            </span>
            <span className="text-lg text-blue-300">ft WC</span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            ({totalHeadPsi.toFixed(1)} psi)
          </div>
        </div>
        
        {/* Flow & Power */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Max Flow</div>
            <div className="text-xl font-semibold text-white">
              {result.maxFlowGpm.toFixed(0)}
              <span className="text-sm text-gray-400 ml-1">GPM</span>
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Est. BHP</div>
            <div className="text-xl font-semibold text-white">
              {estimatedBhp.toFixed(1)}
              <span className="text-sm text-gray-400 ml-1">HP</span>
            </div>
          </div>
        </div>
        
        {/* Head Breakdown */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-3 py-2 bg-gray-750 border-b border-gray-700">
            <span className="text-xs font-medium text-gray-400">Head Breakdown</span>
          </div>
          <div className="p-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Pipe Friction</span>
              <span className="text-gray-300">{result.totalPipeFrictionFt.toFixed(2)} ft</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Fittings & Devices</span>
              <span className="text-gray-300">{result.totalFittingsLossFt.toFixed(2)} ft</span>
            </div>
            {result.staticHeadFt > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Static Head</span>
                <span className="text-gray-300">{result.staticHeadFt.toFixed(2)} ft</span>
              </div>
            )}
            <div className="flex justify-between text-gray-400 border-t border-gray-700 pt-2">
              <span>Subtotal</span>
              <span className="text-gray-300">{result.calculatedHeadFt.toFixed(2)} ft</span>
            </div>
            <div className="flex justify-between text-amber-400">
              <span>Safety Factor ({result.safetyFactorPercent.toFixed(0)}%)</span>
              <span>+{result.safetyFactorFt.toFixed(2)} ft</span>
            </div>
            <div className="flex justify-between font-semibold text-white border-t border-gray-600 pt-2">
              <span>TOTAL</span>
              <span className="text-blue-400">{result.totalPumpHeadFt.toFixed(1)} ft</span>
            </div>
          </div>
        </div>
        
        {/* Fluid Properties */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-3 py-2 bg-gray-750 border-b border-gray-700">
            <span className="text-xs font-medium text-gray-400">Fluid Properties</span>
          </div>
          <div className="p-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Fluid</span>
              <span className="text-gray-300">
                {getFluidDisplayName(result.fluidType)}
                {result.glycolConcentration > 0 && ` (${result.glycolConcentration}%)`}
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Temperature</span>
              <span className="text-gray-300">{result.fluidTemp}°F</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Density</span>
              <span className="text-gray-300">{result.fluidProperties.densityLbFt3.toFixed(2)} lb/ft³</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Viscosity</span>
              <span className="text-gray-300">{result.fluidProperties.viscosityCp.toFixed(2)} cP</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Specific Gravity</span>
              <span className="text-gray-300">{result.fluidProperties.specificGravity.toFixed(3)}</span>
            </div>
          </div>
        </div>
        
        {/* System Volume */}
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">System Volume</div>
          <div className="text-xl font-semibold text-white">
            {result.totalSystemVolumeGal.toFixed(1)}
            <span className="text-sm text-gray-400 ml-1">gallons</span>
          </div>
        </div>
        
        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Warnings
            </div>
            {result.warnings.map((warning, i) => (
              <div
                key={i}
                className="text-xs text-amber-400/80 bg-amber-900/20 p-2 rounded border border-amber-700/30"
              >
                {warning}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Export Buttons */}
      <div className="pt-4 border-t border-gray-700 space-y-2">
        <button
          onClick={handleExportExcel}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel
        </button>
        <button
          onClick={handleExportPdf}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
        >
          <FileText className="w-4 h-4" />
          Export to PDF
        </button>
        
        {/* Assign to Project (Standalone only - now handled in parent header) */}
      </div>
    </div>
  )
}
