import { useSettingsStore } from '../../store/useSettingsStore'

export default function GlobalSettingsPanel() {
  const { 
    electrical, 
    gas, 
    dhw, 
    plumbing,
    climate,
    updateElectricalSettings,
    updateGasSettings,
    updateDHWSettings,
    updatePlumbingSettings,
    updateClimateMultipliers,
    resetGlobalSettings 
  } = useSettingsStore()

  return (
    <div className="space-y-6">
      {/* Electrical Settings */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-amber-400">⚡</span> Electrical Settings
            </h3>
            <p className="text-sm text-surface-400 mt-1">Voltage, power factor, and service sizing</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Primary Voltage</label>
            <select
              value={electrical.voltage_primary}
              onChange={(e) => updateElectricalSettings({ voltage_primary: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            >
              <option value={208}>208V (3-Phase)</option>
              <option value={480}>480V (3-Phase)</option>
              <option value={240}>240V (Single-Phase)</option>
              <option value={120}>120V (Single-Phase)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Secondary Voltage</label>
            <select
              value={electrical.voltage_secondary}
              onChange={(e) => updateElectricalSettings({ voltage_secondary: Number(e.target.value) })}
              className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
            >
              <option value={480}>480V (3-Phase)</option>
              <option value={208}>208V (3-Phase)</option>
              <option value={240}>240V (Single-Phase)</option>
              <option value={120}>120V (Single-Phase)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Power Factor</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.70"
                max="1.00"
                value={electrical.power_factor}
                onChange={(e) => updateElectricalSettings({ power_factor: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">PF</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">Typical: 0.80-0.95</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Spare Capacity</label>
            <div className="relative">
              <input
                type="number"
                step="5"
                min="0"
                max="50"
                value={electrical.spare_capacity * 100}
                onChange={(e) => updateElectricalSettings({ spare_capacity: Number(e.target.value) / 100 })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">%</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">Added to service size</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">General VA/SF</label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="1"
                max="10"
                value={electrical.general_va_sf}
                onChange={(e) => updateElectricalSettings({ general_va_sf: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">VA/SF</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">Lighting + receptacles</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Demand Factor (Default)</label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min="0.50"
                max="1.00"
                value={electrical.demand_factor}
                onChange={(e) => updateElectricalSettings({ demand_factor: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">% of connected load (0.90 = 90%)</p>
          </div>
        </div>
      </div>

      {/* Gas Settings */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-orange-400">🔥</span> Gas Settings
          </h3>
          <p className="text-sm text-surface-400 mt-1">Pressure thresholds and sizing</p>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Min. Pressure</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="20"
                value={gas.min_pressure_wc}
                onChange={(e) => updateGasSettings({ min_pressure_wc: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">" W.C.</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">Inches water column</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">High Pressure Threshold</label>
            <div className="relative">
              <input
                type="number"
                step="500"
                min="1000"
                max="20000"
                value={gas.high_pressure_threshold_cfh}
                onChange={(e) => updateGasSettings({ high_pressure_threshold_cfh: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">CFH</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">Above = high pressure service</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">BTU per Cubic Foot</label>
            <div className="relative">
              <input
                type="number"
                step="10"
                min="900"
                max="1100"
                value={gas.btu_per_cf}
                onChange={(e) => updateGasSettings({ btu_per_cf: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">BTU</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">Natural gas ~1,000</p>
          </div>
        </div>
      </div>

      {/* DHW Settings */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-cyan-400">💧</span> DHW Settings
          </h3>
          <p className="text-sm text-surface-400 mt-1">Hot water system defaults</p>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Tankless Unit BTU</label>
            <div className="relative">
              <input
                type="number"
                step="10000"
                min="50000"
                max="500000"
                value={dhw.tankless_unit_btu}
                onChange={(e) => updateDHWSettings({ tankless_unit_btu: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">BTU</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">Per tankless heater</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Storage Factor</label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min="0.50"
                max="0.90"
                value={dhw.storage_factor}
                onChange={(e) => updateDHWSettings({ storage_factor: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white"
              />
            </div>
            <p className="text-xs text-surface-500 mt-1">Usable tank capacity</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Default Peak Duration</label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="8"
                value={dhw.default_peak_duration}
                onChange={(e) => updateDHWSettings({ default_peak_duration: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">hrs</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">For tank sizing</p>
          </div>
        </div>
      </div>

      {/* Plumbing Settings */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-blue-400">🚿</span> Plumbing Settings
          </h3>
          <p className="text-sm text-surface-400 mt-1">Water and drainage parameters</p>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Backwash Pit Threshold</label>
            <div className="relative">
              <input
                type="number"
                step="25"
                min="100"
                max="500"
                value={plumbing.backwash_pit_threshold_gpm}
                onChange={(e) => updatePlumbingSettings({ backwash_pit_threshold_gpm: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">GPM</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">Above = pit/tank required</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Hot Water Demand Factor</label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                min="0.40"
                max="0.80"
                value={plumbing.hot_water_demand_factor}
                onChange={(e) => updatePlumbingSettings({ hot_water_demand_factor: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
            </div>
            <p className="text-xs text-surface-500 mt-1">HW as % of cold water</p>
          </div>
        </div>
      </div>

      {/* Climate Multipliers */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-green-400">🌡️</span> Climate / Regional Multipliers
          </h3>
          <p className="text-sm text-surface-400 mt-1">
            Adjust cooling, heating, and ventilation based on region (ASHRAE-based defaults)
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Hot & Humid */}
          <div>
            <h4 className="text-md font-medium text-amber-400 mb-3 flex items-center gap-2">
              ☀️ Hot & Humid <span className="text-surface-500 text-sm font-normal">(Miami, LA, Houston)</span>
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-surface-300 mb-1">Cooling</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.50"
                    max="2.00"
                    value={climate.hot_humid.cooling}
                    onChange={(e) => updateClimateMultipliers('hot_humid', { cooling: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-surface-300 mb-1">Heating</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.50"
                    max="2.00"
                    value={climate.hot_humid.heating}
                    onChange={(e) => updateClimateMultipliers('hot_humid', { heating: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-surface-300 mb-1">Ventilation</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.50"
                    max="2.00"
                    value={climate.hot_humid.ventilation}
                    onChange={(e) => updateClimateMultipliers('hot_humid', { ventilation: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cold & Dry */}
          <div>
            <h4 className="text-md font-medium text-blue-400 mb-3 flex items-center gap-2">
              ❄️ Cold & Dry <span className="text-surface-500 text-sm font-normal">(NYC, Chicago, Boston)</span>
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-surface-300 mb-1">Cooling</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.50"
                    max="2.00"
                    value={climate.cold_dry.cooling}
                    onChange={(e) => updateClimateMultipliers('cold_dry', { cooling: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-surface-300 mb-1">Heating</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.50"
                    max="2.00"
                    value={climate.cold_dry.heating}
                    onChange={(e) => updateClimateMultipliers('cold_dry', { heating: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-surface-300 mb-1">Ventilation</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.50"
                    max="2.00"
                    value={climate.cold_dry.ventilation}
                    onChange={(e) => updateClimateMultipliers('cold_dry', { ventilation: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
                </div>
              </div>
            </div>
          </div>

          {/* Temperate */}
          <div>
            <h4 className="text-md font-medium text-emerald-400 mb-3 flex items-center gap-2">
              🌤️ Temperate <span className="text-surface-500 text-sm font-normal">(SF, Seattle, Portland) - Baseline</span>
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-surface-300 mb-1">Cooling</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.50"
                    max="2.00"
                    value={climate.temperate.cooling}
                    onChange={(e) => updateClimateMultipliers('temperate', { cooling: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-surface-300 mb-1">Heating</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.50"
                    max="2.00"
                    value={climate.temperate.heating}
                    onChange={(e) => updateClimateMultipliers('temperate', { heating: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-surface-300 mb-1">Ventilation</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.50"
                    max="2.00"
                    value={climate.temperate.ventilation}
                    onChange={(e) => updateClimateMultipliers('temperate', { ventilation: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">×</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-surface-500 mt-2">
            💡 Multipliers apply to base zone loads. 1.0 = no change. 1.15 = +15% increase. 0.85 = -15% decrease.
          </p>
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (confirm('Reset all global settings to defaults?')) {
              resetGlobalSettings()
            }
          }}
          className="px-4 py-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg text-sm transition-colors"
        >
          Reset Global Settings to Defaults
        </button>
      </div>
    </div>
  )
}
