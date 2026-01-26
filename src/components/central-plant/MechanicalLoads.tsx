import { useProjectStore } from '../../store/useProjectStore'
import type { CalculationResults, MechanicalElectricalSettings } from '../../types'

interface MechanicalLoadsProps {
  results: CalculationResults
}

export default function MechanicalLoads({ results }: MechanicalLoadsProps) {
  const { currentProject, updateMechanicalSettings } = useProjectStore()
  
  if (!currentProject) return null
  
  const settings = currentProject.mechanicalSettings
  const dhwSettings = currentProject.dhwSettings
  
  // Helper to update a setting
  const handleUpdate = (field: keyof MechanicalElectricalSettings, value: number | boolean) => {
    updateMechanicalSettings({ [field]: value })
  }
  
  // Get HVAC totals from results
  const { hvac, dhw } = results
  
  // Calculate kVA for each load type
  const coolingKVA = settings.includeChiller 
    ? hvac.totalTons * settings.coolingKvaPerTon 
    : 0
    
  // For heating, only count if it's NOT gas primary (electric heating)
  const heatingKVA = settings.includeHeating && !currentProject.electricPrimary === false
    ? hvac.totalMBH * settings.heatingKvaPerMbh 
    : 0
    
  // Pool chiller - we'll get this from zones with pool types
  // For now, estimate based on pool zone cooling loads (TODO: can be refined)
  const poolChillerTons = 0 // Will be calculated in useCalculations
  const poolChillerKVA = settings.includePoolChiller
    ? poolChillerTons * settings.poolChillerKvaPerTon
    : 0
    
  // Dehumidification
  const dehumidKVA = settings.includeDehumid
    ? hvac.dehumidLbHr * settings.dehumidKvaPerLbHr
    : 0
    
  // DHW electric (only if DHW is electric)
  const dhwKVA = settings.includeDhw && dhwSettings.heaterType === 'electric'
    ? dhw.electricKW / currentProject.electricalSettings.powerFactor
    : 0
    
  // Total mechanical kVA
  const totalMechKVA = coolingKVA + heatingKVA + poolChillerKVA + dehumidKVA + dhwKVA

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-cyan-400">⚙️</span> Mechanical Equipment Loads
        </h3>
        <p className="text-sm text-surface-400 mt-1">
          HVAC and DHW equipment converted to electrical demand
        </p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Mechanical Load Line Items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left py-3 px-2 text-surface-400 font-medium">Include</th>
                <th className="text-left py-3 px-2 text-surface-400 font-medium">Load Type</th>
                <th className="text-right py-3 px-2 text-surface-400 font-medium">Load</th>
                <th className="text-center py-3 px-2 text-surface-400 font-medium">×</th>
                <th className="text-right py-3 px-2 text-surface-400 font-medium">Factor</th>
                <th className="text-center py-3 px-2 text-surface-400 font-medium">=</th>
                <th className="text-right py-3 px-2 text-surface-400 font-medium">kVA</th>
              </tr>
            </thead>
            <tbody>
              {/* Cooling */}
              <tr className="border-b border-surface-700/50">
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    checked={settings.includeChiller}
                    onChange={(e) => handleUpdate('includeChiller', e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-500"
                  />
                </td>
                <td className="py-3 px-2 text-white">HVAC Cooling (Chiller)</td>
                <td className="py-3 px-2 text-right text-surface-300 font-mono">
                  {hvac.totalTons.toFixed(1)} tons
                </td>
                <td className="py-3 px-2 text-center text-surface-500">×</td>
                <td className="py-3 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="3"
                      value={settings.coolingKvaPerTon}
                      onChange={(e) => handleUpdate('coolingKvaPerTon', Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-surface-900 border border-surface-600 rounded text-white text-right font-mono text-sm"
                    />
                    <span className="text-xs text-surface-500">kVA/ton</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center text-surface-500">=</td>
                <td className="py-3 px-2 text-right text-cyan-400 font-mono font-medium">
                  {settings.includeChiller ? coolingKVA.toFixed(1) : '—'}
                </td>
              </tr>
              
              {/* Heating */}
              <tr className="border-b border-surface-700/50">
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    checked={settings.includeHeating}
                    onChange={(e) => handleUpdate('includeHeating', e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-500"
                  />
                </td>
                <td className="py-3 px-2 text-white">
                  Space Heating (Electric)
                  {currentProject.electricPrimary === false && (
                    <span className="ml-2 text-xs text-amber-400">(Gas primary)</span>
                  )}
                </td>
                <td className="py-3 px-2 text-right text-surface-300 font-mono">
                  {hvac.totalMBH.toFixed(0)} MBH
                </td>
                <td className="py-3 px-2 text-center text-surface-500">×</td>
                <td className="py-3 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="1"
                      value={settings.heatingKvaPerMbh}
                      onChange={(e) => handleUpdate('heatingKvaPerMbh', Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-surface-900 border border-surface-600 rounded text-white text-right font-mono text-sm"
                    />
                    <span className="text-xs text-surface-500">kVA/MBH</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center text-surface-500">=</td>
                <td className="py-3 px-2 text-right text-cyan-400 font-mono font-medium">
                  {settings.includeHeating ? heatingKVA.toFixed(1) : '—'}
                </td>
              </tr>
              
              {/* Pool Chiller */}
              <tr className="border-b border-surface-700/50">
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    checked={settings.includePoolChiller}
                    onChange={(e) => handleUpdate('includePoolChiller', e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-500"
                  />
                </td>
                <td className="py-3 px-2 text-white">Pool Water Chiller</td>
                <td className="py-3 px-2 text-right text-surface-300 font-mono">
                  {poolChillerTons.toFixed(1)} tons
                </td>
                <td className="py-3 px-2 text-center text-surface-500">×</td>
                <td className="py-3 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="3"
                      value={settings.poolChillerKvaPerTon}
                      onChange={(e) => handleUpdate('poolChillerKvaPerTon', Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-surface-900 border border-surface-600 rounded text-white text-right font-mono text-sm"
                    />
                    <span className="text-xs text-surface-500">kVA/ton</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center text-surface-500">=</td>
                <td className="py-3 px-2 text-right text-cyan-400 font-mono font-medium">
                  {settings.includePoolChiller ? poolChillerKVA.toFixed(1) : '—'}
                </td>
              </tr>
              
              {/* Dehumidification */}
              <tr className="border-b border-surface-700/50">
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    checked={settings.includeDehumid}
                    onChange={(e) => handleUpdate('includeDehumid', e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-500"
                  />
                </td>
                <td className="py-3 px-2 text-white">Dehumidification</td>
                <td className="py-3 px-2 text-right text-surface-300 font-mono">
                  {hvac.dehumidLbHr.toFixed(0)} lb/hr
                </td>
                <td className="py-3 px-2 text-center text-surface-500">×</td>
                <td className="py-3 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="0.2"
                      value={settings.dehumidKvaPerLbHr}
                      onChange={(e) => handleUpdate('dehumidKvaPerLbHr', Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-surface-900 border border-surface-600 rounded text-white text-right font-mono text-sm"
                    />
                    <span className="text-xs text-surface-500">kVA/(lb/hr)</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center text-surface-500">=</td>
                <td className="py-3 px-2 text-right text-cyan-400 font-mono font-medium">
                  {settings.includeDehumid ? dehumidKVA.toFixed(1) : '—'}
                </td>
              </tr>
              
              {/* DHW Electric */}
              <tr className="border-b border-surface-700/50">
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    checked={settings.includeDhw}
                    onChange={(e) => handleUpdate('includeDhw', e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-500"
                    disabled={dhwSettings.heaterType !== 'electric'}
                  />
                </td>
                <td className="py-3 px-2 text-white">
                  DHW - Electric Heaters
                  {dhwSettings.heaterType !== 'electric' && (
                    <span className="ml-2 text-xs text-amber-400">(Gas DHW)</span>
                  )}
                </td>
                <td className="py-3 px-2 text-right text-surface-300 font-mono">
                  {dhwSettings.heaterType === 'electric' ? `${dhw.electricKW.toFixed(1)} kW` : '—'}
                </td>
                <td className="py-3 px-2 text-center text-surface-500">÷</td>
                <td className="py-3 px-2 text-right text-surface-400 font-mono text-sm">
                  PF {currentProject.electricalSettings.powerFactor}
                </td>
                <td className="py-3 px-2 text-center text-surface-500">=</td>
                <td className="py-3 px-2 text-right text-cyan-400 font-mono font-medium">
                  {settings.includeDhw && dhwSettings.heaterType === 'electric' ? dhwKVA.toFixed(1) : '—'}
                </td>
              </tr>
            </tbody>
            
            {/* Total */}
            <tfoot>
              <tr className="bg-surface-900">
                <td colSpan={6} className="py-3 px-2 text-white font-semibold text-right">
                  Total Mechanical Load:
                </td>
                <td className="py-3 px-2 text-right text-cyan-400 font-mono font-bold text-lg">
                  {totalMechKVA.toFixed(1)} kVA
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {/* Conversion Factor Notes */}
        <div className="bg-surface-900/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-surface-300 mb-2">Default Conversion Factors</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-surface-400">
            <div>
              <strong className="text-surface-300">Cooling:</strong> 1.2 kVA/ton
              <p className="mt-0.5">Air-cooled chiller efficiency</p>
            </div>
            <div>
              <strong className="text-surface-300">Heating:</strong> 0.293 kVA/MBH
              <p className="mt-0.5">1 MBH = 293W electric</p>
            </div>
            <div>
              <strong className="text-surface-300">Pool Chiller:</strong> 1.5 kVA/ton
              <p className="mt-0.5">Water-cooled system</p>
            </div>
            <div>
              <strong className="text-surface-300">Dehumid:</strong> 0.05 kVA/(lb/hr)
              <p className="mt-0.5">~5 kW per 100 lb/hr</p>
            </div>
          </div>
        </div>
        
        {/* Info */}
        <div className="text-xs text-surface-500">
          <p>
            💡 Mechanical loads are added to the electrical service sizing calculation.
            Adjust conversion factors based on actual equipment specifications when available.
          </p>
        </div>
      </div>
    </div>
  )
}

// Export the calculation function so ElectricalServiceSettings can use it
export function calculateMechanicalKVA(
  hvac: CalculationResults['hvac'],
  dhw: CalculationResults['dhw'],
  settings: MechanicalElectricalSettings,
  dhwHeaterType: 'electric' | 'gas',
  powerFactor: number,
  electricPrimary: boolean
): { total: number; breakdown: { name: string; kva: number }[] } {
  const breakdown: { name: string; kva: number }[] = []
  
  if (settings.includeChiller) {
    const kva = hvac.totalTons * settings.coolingKvaPerTon
    breakdown.push({ name: 'HVAC Cooling', kva })
  }
  
  if (settings.includeHeating && electricPrimary) {
    const kva = hvac.totalMBH * settings.heatingKvaPerMbh
    breakdown.push({ name: 'Electric Heating', kva })
  }
  
  // Pool chiller would be added here when we have the data
  
  if (settings.includeDehumid && hvac.dehumidLbHr > 0) {
    const kva = hvac.dehumidLbHr * settings.dehumidKvaPerLbHr
    breakdown.push({ name: 'Dehumidification', kva })
  }
  
  if (settings.includeDhw && dhwHeaterType === 'electric') {
    const kva = dhw.electricKW / powerFactor
    breakdown.push({ name: 'DHW Electric', kva })
  }
  
  const total = breakdown.reduce((sum, item) => sum + item.kva, 0)
  
  return { total, breakdown }
}
