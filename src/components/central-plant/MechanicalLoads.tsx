import { useProjectStore } from '../../store/useProjectStore'
import type { CalculationResults, MechanicalElectricalSettings, HVACSystemType } from '../../types'
import { gasHeatingEfficiencyPresets, HVAC_SYSTEM_CONFIGS, getHVACSystemConfig } from '../../data/defaults'

interface MechanicalLoadsProps {
  results: CalculationResults
}

export default function MechanicalLoads({ results }: MechanicalLoadsProps) {
  const { currentProject, zones, updateMechanicalSettings } = useProjectStore()
  
  // Debug: Log what we're receiving
  console.log('⚡ MechanicalLoads rendering:')
  console.log(`   - results.hvac.dehumidLbHr: ${results.hvac.dehumidLbHr}`)
  console.log(`   - results.hvac.poolChillerTons: ${results.hvac.poolChillerTons}`)
  console.log(`   - Zone line items:`, zones.map(z => ({ name: z.name, items: z.lineItems?.length || 0 })))
  
  if (!currentProject) return null
  
  const settings = currentProject.mechanicalSettings
  const dhwSettings = currentProject.dhwSettings
  
  // Helper to update a setting
  const handleUpdate = (field: keyof MechanicalElectricalSettings, value: number | boolean | string) => {
    updateMechanicalSettings({ [field]: value })
  }
  
  // Get HVAC totals from results
  const { hvac, dhw } = results
  
  // Heating fuel type settings
  const heatingFuelType = settings.heatingFuelType ?? 'electric'
  const isGasHeating = heatingFuelType === 'gas'
  const gasHeatingEfficiency = settings.gasHeatingEfficiency ?? 0.90
  
  // Calculate kVA for each load type
  // For cooling, subtract pool chiller from total (tracked separately)
  const spaceCoolingTons = hvac.totalTons - hvac.poolChillerTons
  const coolingKVA = settings.includeChiller 
    ? spaceCoolingTons * settings.coolingKvaPerTon 
    : 0
    
  // For heating, apply the electric heating percentage (most heating via heat pumps/energy recovery)
  const heatingElectricPercent = settings.heatingElectricPercent ?? 0.15
  const heatingElectricMBH = hvac.totalMBH * heatingElectricPercent
  // Only add to electrical if using electric heating
  const heatingKVA = settings.includeHeating && !isGasHeating
    ? heatingElectricMBH * settings.heatingKvaPerMbh 
    : 0
  
  // Gas heating calculation (input MBH / efficiency = gas consumed)
  const gasHeatingInputMBH = isGasHeating ? hvac.totalMBH : 0
  const gasHeatingConsumedMBH = isGasHeating ? Math.round(gasHeatingInputMBH / gasHeatingEfficiency) : 0
    
  // Pool chiller - now comes from hvac.poolChillerTons (summed from zone line items)
  const poolChillerKVA = settings.includePoolChiller
    ? hvac.poolChillerTons * settings.poolChillerKvaPerTon
    : 0
    
  // Dehumidification - from line items (summed in hvac calculation)
  const dehumidKVA = settings.includeDehumid
    ? hvac.dehumidLbHr * settings.dehumidKvaPerLbHr
    : 0
    
  // DHW electric (only if DHW is electric)
  const dhwKVA = settings.includeDhw && dhwSettings.heaterType === 'electric'
    ? dhw.electricKW / currentProject.electricalSettings.powerFactor
    : 0
  
  // Fan power for ventilation and exhaust
  const totalCFM = hvac.totalVentCFM + hvac.totalExhaustCFM
  const fanHpPer1000Cfm = settings.fanHpPer1000Cfm ?? 0.6
  const fanHP = (totalCFM / 1000) * fanHpPer1000Cfm
  const fanKVA = fanHP * 0.746 / currentProject.electricalSettings.powerFactor // HP to kW to kVA
  const fanKVAIncluded = (settings.includeFans ?? true) ? fanKVA : 0
    
  // Total mechanical kVA
  const totalMechKVA = coolingKVA + heatingKVA + poolChillerKVA + dehumidKVA + dhwKVA + fanKVAIncluded

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
        {/* HVAC System Type Selector */}
        <div className="bg-gradient-to-r from-cyan-900/30 to-surface-900 rounded-lg p-4 border border-cyan-500/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                🏢 HVAC System Type
              </h4>
              <p className="text-xs text-surface-400 mt-1">
                Select the primary HVAC system - this affects electrical loads and report narratives
              </p>
            </div>
          </div>
          
          {/* System Type Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {(Object.keys(HVAC_SYSTEM_CONFIGS) as HVACSystemType[]).filter(t => t !== 'custom').map(systemType => {
              const config = HVAC_SYSTEM_CONFIGS[systemType]
              const isSelected = (settings.hvacSystemType || 'vrf_erv') === systemType
              return (
                <button
                  key={systemType}
                  onClick={() => {
                    // Update system type and apply its default conversion factors
                    const newConfig = getHVACSystemConfig(systemType)
                    updateMechanicalSettings({
                      hvacSystemType: systemType,
                      coolingKvaPerTon: newConfig.coolingKvaPerTon,
                      heatingKvaPerMbh: newConfig.heatingKvaPerMbh,
                      fanHpPer1000Cfm: newConfig.ventilationType === 'doas' ? 0.4 : 0.6,
                      heatingElectricPercent: newConfig.hasEnergyRecovery ? 0.10 : 0.25,
                      heatingFuelType: newConfig.supportsGasHeat ? 'gas' : 'electric',
                    })
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected 
                      ? 'bg-cyan-600/20 border-cyan-500 ring-1 ring-cyan-500' 
                      : 'bg-surface-800 border-surface-600 hover:border-surface-500'
                  }`}
                >
                  <div className={`text-sm font-medium ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                    {config.name}
                  </div>
                  <div className="text-xs text-surface-400 mt-1 line-clamp-2">
                    {config.coolingKvaPerTon} kVA/ton
                    {config.hasEnergyRecovery && ' • ERV'}
                  </div>
                </button>
              )
            })}
          </div>
          
          {/* Selected System Info */}
          {settings.hvacSystemType && (
            <div className="bg-surface-900/50 rounded-lg p-3 text-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="text-surface-300 font-medium">
                    {HVAC_SYSTEM_CONFIGS[settings.hvacSystemType || 'vrf_erv'].name}:
                  </span>
                  <span className="text-surface-400 ml-2">
                    {HVAC_SYSTEM_CONFIGS[settings.hvacSystemType || 'vrf_erv'].description}
                  </span>
                </div>
                <div className="flex gap-4 text-surface-400">
                  <div>
                    <span className="text-surface-500">Ventilation:</span>{' '}
                    <span className="text-white">{HVAC_SYSTEM_CONFIGS[settings.hvacSystemType || 'vrf_erv'].ventilationType.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-surface-500">Heat:</span>{' '}
                    <span className="text-white">
                      {HVAC_SYSTEM_CONFIGS[settings.hvacSystemType || 'vrf_erv'].supportsGasHeat ? 'Gas/Elec' : 'Electric'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
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
                <td className="py-3 px-2 text-white">Space Cooling (Chiller)</td>
                <td className="py-3 px-2 text-right text-surface-300 font-mono">
                  {spaceCoolingTons.toFixed(1)} tons
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
              
              {/* Heating - with Electric/Gas Toggle */}
              <tr className={`border-b border-surface-700/50 ${isGasHeating ? 'bg-orange-950/30' : ''}`}>
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    checked={settings.includeHeating}
                    onChange={(e) => handleUpdate('includeHeating', e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-500"
                    disabled={isGasHeating}
                  />
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    <div className={isGasHeating ? 'text-orange-400' : 'text-white'}>
                      {isGasHeating ? 'Gas Heating (RTU/Boiler)' : 'Supplemental Electric Heating'}
                    </div>
                    {/* Electric/Gas Toggle Switch */}
                    <button
                      onClick={() => handleUpdate('heatingFuelType', isGasHeating ? 'electric' : 'gas')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isGasHeating ? 'bg-orange-500' : 'bg-surface-600'
                      }`}
                      title={isGasHeating ? 'Switch to Electric' : 'Switch to Gas'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isGasHeating ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                      <span className="sr-only">{isGasHeating ? 'Gas' : 'Electric'}</span>
                    </button>
                    <span className={`text-xs font-medium ${isGasHeating ? 'text-orange-400' : 'text-cyan-400'}`}>
                      {isGasHeating ? '⛽ Gas' : '⚡ Electric'}
                    </span>
                  </div>
                  <div className="text-xs text-surface-500 mt-0.5">
                    {isGasHeating 
                      ? `100% of ${hvac.totalMBH.toFixed(0)} MBH → Gas Equipment`
                      : `${(heatingElectricPercent * 100).toFixed(0)}% of ${hvac.totalMBH.toFixed(0)} MBH total`
                    }
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  {isGasHeating ? (
                    <div className="flex flex-col items-end">
                      <span className="text-orange-400 font-mono">{hvac.totalMBH.toFixed(0)} MBH</span>
                      <span className="text-xs text-surface-500 mt-1">heating load</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="5"
                          min="0"
                          max="100"
                          value={Math.round(heatingElectricPercent * 100)}
                          onChange={(e) => handleUpdate('heatingElectricPercent', Number(e.target.value) / 100)}
                          className="w-14 px-2 py-1 bg-surface-900 border border-surface-600 rounded text-white text-right font-mono text-sm"
                        />
                        <span className="text-xs text-surface-500">%</span>
                      </div>
                      <span className="text-surface-400 font-mono text-xs mt-1">= {heatingElectricMBH.toFixed(0)} MBH</span>
                    </div>
                  )}
                </td>
                <td className="py-3 px-2 text-center text-surface-500">{isGasHeating ? '÷' : '×'}</td>
                <td className="py-3 px-2">
                  {isGasHeating ? (
                    <div className="flex flex-col items-end gap-1">
                      <select
                        value={gasHeatingEfficiency}
                        onChange={(e) => handleUpdate('gasHeatingEfficiency', Number(e.target.value))}
                        className="px-2 py-1 bg-surface-900 border border-orange-600/50 rounded text-orange-400 text-right font-mono text-sm w-full"
                      >
                        {Object.entries(gasHeatingEfficiencyPresets).map(([key, preset]) => (
                          <option key={key} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-surface-500">efficiency</span>
                    </div>
                  ) : (
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
                  )}
                </td>
                <td className="py-3 px-2 text-center text-surface-500">=</td>
                <td className="py-3 px-2 text-right font-mono font-medium">
                  {isGasHeating ? (
                    <div className="flex flex-col items-end">
                      <span className="text-orange-400">{gasHeatingConsumedMBH.toLocaleString()} MBH</span>
                      <span className="text-xs text-surface-500">gas consumed</span>
                    </div>
                  ) : (
                    <span className="text-cyan-400">
                      {settings.includeHeating ? heatingKVA.toFixed(1) : '—'}
                    </span>
                  )}
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
                  {hvac.poolChillerTons.toFixed(1)} tons
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
              
              {/* Fan Power */}
              <tr className="border-b border-surface-700/50">
                <td className="py-3 px-2">
                  <input
                    type="checkbox"
                    checked={settings.includeFans ?? true}
                    onChange={(e) => handleUpdate('includeFans', e.target.checked)}
                    className="w-4 h-4 rounded accent-cyan-500"
                  />
                </td>
                <td className="py-3 px-2">
                  <div className="text-white">Fan Power (Ventilation + Exhaust)</div>
                  <div className="text-xs text-surface-500 mt-0.5">
                    {hvac.totalVentCFM.toLocaleString()} + {hvac.totalExhaustCFM.toLocaleString()} = {totalCFM.toLocaleString()} CFM
                  </div>
                </td>
                <td className="py-3 px-2 text-right text-surface-300 font-mono">
                  {fanHP.toFixed(1)} HP
                </td>
                <td className="py-3 px-2 text-center text-surface-500">×</td>
                <td className="py-3 px-2">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.3"
                      max="1.5"
                      value={fanHpPer1000Cfm}
                      onChange={(e) => handleUpdate('fanHpPer1000Cfm', Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-surface-900 border border-surface-600 rounded text-white text-right font-mono text-sm"
                    />
                    <span className="text-xs text-surface-500">HP/kCFM</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center text-surface-500">=</td>
                <td className="py-3 px-2 text-right text-cyan-400 font-mono font-medium">
                  {(settings.includeFans ?? true) ? fanKVA.toFixed(1) : '—'}
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
        
        {/* Gas Heating Summary (when enabled) */}
        {isGasHeating && (
          <div className="bg-orange-950/40 border border-orange-600/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-400 text-lg">⛽</span>
              <h4 className="text-sm font-medium text-orange-400">Gas Heating Active</h4>
            </div>
            <div className="text-sm text-orange-300/80">
              Heating load of <strong>{hvac.totalMBH.toFixed(0)} MBH</strong> is served by gas equipment (RTU/Boiler) 
              at <strong>{(gasHeatingEfficiency * 100).toFixed(0)}%</strong> efficiency, 
              consuming <strong>{gasHeatingConsumedMBH.toLocaleString()} MBH</strong> of gas.
              This load is <em>excluded</em> from the electrical service calculation and added to the gas totals below.
            </div>
          </div>
        )}
        
        {/* Conversion Factor Notes */}
        <div className="bg-surface-900/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-surface-300 mb-2">Default Conversion Factors</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs text-surface-400">
            <div>
              <strong className="text-surface-300">Cooling:</strong> 1.5 kVA/ton
              <p className="mt-0.5">Air-cooled chiller</p>
            </div>
            <div>
              <strong className={isGasHeating ? 'text-orange-400' : 'text-surface-300'}>
                {isGasHeating ? 'Gas Heating:' : 'Heating:'} 
              </strong> {isGasHeating ? `${(gasHeatingEfficiency * 100)}% eff.` : '0.293 kVA/MBH'}
              <p className="mt-0.5">{isGasHeating ? 'RTU or boiler plant' : '1 MBH = 293W electric'}</p>
            </div>
            <div>
              <strong className="text-surface-300">Pool Chiller:</strong> 1.5 kVA/ton
              <p className="mt-0.5">Water chiller system</p>
            </div>
            <div>
              <strong className="text-surface-300">Dehumid:</strong> 0.4 kVA/(lb/hr)
              <p className="mt-0.5">Pool dehumidification unit</p>
            </div>
            <div>
              <strong className="text-surface-300">Fans:</strong> 0.6 HP/1000 CFM
              <p className="mt-0.5">Ventilation + exhaust fans</p>
            </div>
          </div>
        </div>
        
        {/* RTU/AHU Count Override */}
        <div className="bg-surface-900/50 rounded-lg p-3 flex items-center justify-between">
          <div>
            <span className="text-sm text-surface-300">RTU/AHU Count Override</span>
            <p className="text-xs text-surface-500">Used in calculations and report narratives</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-surface-400">Units:</label>
            <input
              type="number"
              value={settings.rtuCount ?? hvac.rtuCount}
              onChange={(e) => handleUpdate('rtuCount', e.target.value ? Number(e.target.value) : hvac.rtuCount)}
              placeholder={String(hvac.rtuCount)}
              min={1}
              className="w-16 px-2 py-1.5 bg-surface-800 border border-surface-600 rounded text-white text-center text-sm"
            />
            <span className="text-xs text-surface-500">(Auto: {hvac.rtuCount})</span>
          </div>
        </div>
        
        {/* Info */}
        <div className="text-xs text-surface-500">
          <p>
            💡 Mechanical loads are added to the electrical service sizing calculation.
            {isGasHeating && <span className="text-orange-400"> Gas heating loads are excluded from electrical and added to gas totals.</span>}
            {' '}Adjust conversion factors based on actual equipment specifications when available.
          </p>
        </div>
        
        {/* Debug: Show line items that should contribute */}
        <details className="mt-4 text-xs">
          <summary className="text-surface-400 cursor-pointer hover:text-surface-300">
            🔍 Debug: Zone Line Items ({zones.reduce((sum, z) => sum + (z.lineItems?.length || 0), 0)} total)
          </summary>
          <div className="mt-2 bg-surface-900 rounded p-3 max-h-48 overflow-auto">
            {zones.map(z => (
              <div key={z.id} className="mb-2">
                <div className="text-surface-300 font-medium">{z.name}:</div>
                {z.lineItems && z.lineItems.length > 0 ? (
                  <ul className="ml-4 text-surface-400">
                    {z.lineItems.map(li => (
                      <li key={li.id} className={
                        li.category === 'pool_chiller' ? 'text-cyan-400' :
                        li.category === 'dehumidification' ? 'text-blue-400' : ''
                      }>
                        [{li.category}] {li.name}: {li.quantity} × {li.value} {li.unit}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="ml-4 text-surface-500">No line items</span>
                )}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  )
}

// Gas heating result for adding to gas totals
export interface GasHeatingResult {
  isGasHeating: boolean
  inputMBH: number        // Heating load in MBH
  consumedMBH: number     // Gas consumed (input / efficiency)
  consumedCFH: number     // Gas consumed in CFH (≈ MBH for natural gas)
  efficiency: number
}

// Export the calculation function so ElectricalServiceSettings can use it
export function calculateMechanicalKVA(
  hvac: CalculationResults['hvac'],
  dhw: CalculationResults['dhw'],
  settings: MechanicalElectricalSettings,
  dhwHeaterType: 'electric' | 'gas',
  powerFactor: number,
  _electricPrimary: boolean // Prefixed with _ to indicate intentionally unused
): { total: number; breakdown: { name: string; kva: number }[]; gasHeating: GasHeatingResult } {
  const breakdown: { name: string; kva: number }[] = []
  
  // Determine if using gas heating
  const heatingFuelType = settings.heatingFuelType ?? 'electric'
  const isGasHeating = heatingFuelType === 'gas'
  const gasHeatingEfficiency = settings.gasHeatingEfficiency ?? 0.90
  
  // Space cooling (total minus pool chiller)
  if (settings.includeChiller) {
    const spaceCoolingTons = hvac.totalTons - (hvac.poolChillerTons || 0)
    const kva = spaceCoolingTons * settings.coolingKvaPerTon
    breakdown.push({ name: 'Space Cooling', kva })
  }
  
  // Supplemental electric heating (percentage of total heating) - ONLY if electric
  if (settings.includeHeating && !isGasHeating) {
    const heatingElectricPercent = settings.heatingElectricPercent ?? 0.15
    const heatingElectricMBH = hvac.totalMBH * heatingElectricPercent
    const kva = heatingElectricMBH * settings.heatingKvaPerMbh
    breakdown.push({ name: `Electric Heating (${Math.round(heatingElectricPercent * 100)}%)`, kva })
  }
  
  // Pool chiller (tracked separately from space cooling)
  if (settings.includePoolChiller && hvac.poolChillerTons > 0) {
    const kva = hvac.poolChillerTons * settings.poolChillerKvaPerTon
    breakdown.push({ name: 'Pool Chiller', kva })
  }
  
  if (settings.includeDehumid && hvac.dehumidLbHr > 0) {
    const kva = hvac.dehumidLbHr * settings.dehumidKvaPerLbHr
    breakdown.push({ name: 'Dehumidification', kva })
  }
  
  if (settings.includeDhw && dhwHeaterType === 'electric') {
    const kva = dhw.electricKW / powerFactor
    breakdown.push({ name: 'DHW Electric', kva })
  }
  
  // Fan power for ventilation and exhaust
  if (settings.includeFans ?? true) {
    const totalCFM = hvac.totalVentCFM + hvac.totalExhaustCFM
    const fanHpPer1000Cfm = settings.fanHpPer1000Cfm ?? 0.6
    const fanHP = (totalCFM / 1000) * fanHpPer1000Cfm
    const kva = fanHP * 0.746 / powerFactor // HP to kW to kVA
    if (kva > 0) {
      breakdown.push({ name: 'Fan Power', kva })
    }
  }

  const total = breakdown.reduce((sum, item) => sum + item.kva, 0)
  
  // Calculate gas heating consumption
  const gasHeatingInputMBH = isGasHeating ? hvac.totalMBH : 0
  const gasHeatingConsumedMBH = isGasHeating ? Math.round(gasHeatingInputMBH / gasHeatingEfficiency) : 0
  
  const gasHeating: GasHeatingResult = {
    isGasHeating,
    inputMBH: gasHeatingInputMBH,
    consumedMBH: gasHeatingConsumedMBH,
    consumedCFH: gasHeatingConsumedMBH, // For natural gas, CFH ≈ MBH
    efficiency: gasHeatingEfficiency,
  }
  
  return { total, breakdown, gasHeating }
}
