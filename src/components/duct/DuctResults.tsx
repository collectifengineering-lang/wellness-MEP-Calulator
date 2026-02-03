// =========================================== 
// DUCT RESULTS PANEL
// Display calculation results and export options
// =========================================== 

import { FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react'
import type { DuctSystem, DuctCalculationResult } from '../../types/duct'

interface DuctResultsProps {
  system: DuctSystem
  result: DuctCalculationResult | null
}

export function DuctResults({ system: _system, result }: DuctResultsProps) {
  if (!result) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No calculation results</p>
        <p className="text-sm">Add sections to see results</p>
      </div>
    )
  }
  
  const handleExportExcel = () => {
    // TODO: Implement Excel export
    alert('Excel export coming soon!')
  }
  
  const handleExportPdf = () => {
    // TODO: Implement PDF export
    alert('PDF export coming soon!')
  }
  
  return (
    <div className="p-4 space-y-4">
      {/* Total Pressure Drop - Hero Number */}
      <div className="text-center p-4 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-xl border border-cyan-700/30">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
          Total System Pressure Drop
        </div>
        <div className="text-4xl font-bold text-cyan-400">
          {result.totalSystemLoss.toFixed(2)}
        </div>
        <div className="text-sm text-gray-400">inches WC</div>
        
        {result.safetyFactorPercent > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            Includes {result.safetyFactorPercent}% safety factor (+{result.safetyFactorInWc.toFixed(3)}" WC)
          </div>
        )}
      </div>
      
      {/* Breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Pressure Breakdown</h4>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Straight Duct Loss</span>
            <span className="text-white">{result.totalStraightDuctLoss.toFixed(3)}" WC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Fittings Loss</span>
            <span className="text-white">{result.totalFittingsLoss.toFixed(3)}" WC</span>
          </div>
          <div className="flex justify-between border-t border-gray-700 pt-1">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-white">{result.subtotalLoss.toFixed(3)}" WC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Safety Factor ({result.safetyFactorPercent}%)</span>
            <span className="text-white">+{result.safetyFactorInWc.toFixed(3)}" WC</span>
          </div>
          <div className="flex justify-between border-t border-gray-700 pt-1 font-medium">
            <span className="text-cyan-400">Total</span>
            <span className="text-cyan-400">{result.totalSystemLoss.toFixed(3)}" WC</span>
          </div>
        </div>
      </div>
      
      {/* System Info */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">System Info</h4>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-xs text-gray-400">Max Velocity</div>
            <div className="text-white font-medium">
              {Math.round(result.maxVelocityFpm)} fpm
            </div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-xs text-gray-400">Sections</div>
            <div className="text-white font-medium">
              {result.sections.length}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-xs text-gray-400">Air Density</div>
            <div className="text-white font-medium">
              {result.airProperties.densityLbFt3.toFixed(4)} lb/ft³
            </div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-xs text-gray-400">Altitude</div>
            <div className="text-white font-medium">
              {result.altitudeFt} ft
            </div>
          </div>
        </div>
      </div>
      
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Warnings
          </h4>
          <div className="space-y-1">
            {result.warnings.map((warning, i) => (
              <div
                key={i}
                className="text-xs text-amber-300 bg-amber-900/20 border border-amber-700/30 rounded px-2 py-1"
              >
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Section Details */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Section Details</h4>
        
        <div className="space-y-1 max-h-48 overflow-auto">
          {result.sections.map((section, i) => (
            <div
              key={section.sectionId}
              className="flex items-center justify-between text-xs bg-gray-800/50 rounded px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-500">#{i + 1}</span>
                <span className="text-gray-300 truncate max-w-[120px]">
                  {section.sectionName}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">{Math.round(section.velocityFpm)} fpm</span>
                <span className="text-cyan-400 font-medium">
                  {section.totalSectionLossInWc.toFixed(3)}"
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Export Buttons */}
      <div className="space-y-2 pt-2 border-t border-gray-700">
        <button
          onClick={handleExportExcel}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm text-green-400 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel
        </button>
        <button
          onClick={handleExportPdf}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Export to PDF
        </button>
      </div>
    </div>
  )
}
