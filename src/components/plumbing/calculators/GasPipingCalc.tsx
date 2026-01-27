import { useState } from 'react'
import { usePlumbingStore } from '../../../store/usePlumbingStore'

interface GasAppliance {
  id: string
  name: string
  btuInput: number
  count: number
}

export default function GasPipingCalc() {
  const { currentProject, updateProjectSettings } = usePlumbingStore()
  const settings = currentProject?.settings

  // Local state for gas appliances
  const [appliances, setAppliances] = useState<GasAppliance[]>([
    { id: '1', name: 'Water Heater', btuInput: 199000, count: 1 },
  ])

  if (!settings) return null

  // Add appliance
  const addAppliance = () => {
    setAppliances([...appliances, { 
      id: Date.now().toString(), 
      name: 'New Appliance', 
      btuInput: 50000, 
      count: 1 
    }])
  }

  // Update appliance
  const updateAppliance = (id: string, updates: Partial<GasAppliance>) => {
    setAppliances(appliances.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  // Remove appliance
  const removeAppliance = (id: string) => {
    setAppliances(appliances.filter(a => a.id !== id))
  }

  // Calculate totals
  const totalConnectedBTU = appliances.reduce((sum, a) => sum + (a.btuInput * a.count), 0)
  const totalConnectedMBH = totalConnectedBTU / 1000
  const diversifiedMBH = totalConnectedMBH * settings.gasDiversityFactor
  const diversifiedCFH = diversifiedMBH / 1.0 // Approximate: 1 MBH ≈ 1 CFH for natural gas

  // Gas pipe sizing table (simplified)
  const getPipeSize = (cfh: number, _length: number = 50): string => {
    // Based on NFPA 54 / IFGC tables for natural gas at 0.5" WC drop
    if (cfh <= 20) return '1/2"'
    if (cfh <= 40) return '3/4"'
    if (cfh <= 90) return '1"'
    if (cfh <= 175) return '1-1/4"'
    if (cfh <= 360) return '1-1/2"'
    if (cfh <= 625) return '2"'
    if (cfh <= 1400) return '2-1/2"'
    if (cfh <= 2500) return '3"'
    return '4"'
  }

  const recommendedPipeSize = getPipeSize(diversifiedCFH)

  // Preset appliances
  const presets = [
    { name: 'Water Heater (199 MBH)', btu: 199000 },
    { name: 'Water Heater (100 MBH)', btu: 100000 },
    { name: 'Boiler (500 MBH)', btu: 500000 },
    { name: 'Boiler (1000 MBH)', btu: 1000000 },
    { name: 'Commercial Range', btu: 75000 },
    { name: 'Commercial Oven', btu: 60000 },
    { name: 'Fryer', btu: 80000 },
    { name: 'Clothes Dryer', btu: 35000 },
    { name: 'Unit Heater', btu: 100000 },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Gas Piping Calculator 🔥🐐</h2>
        <p className="text-surface-400">
          Gas load calculation and pipe sizing based on NFPA 54 / IFGC
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings & Presets */}
        <div className="lg:col-span-1 space-y-6">
          {/* Diversity Factor */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4">⚙️ Settings</h3>
            <div>
              <label className="block text-sm text-surface-400 mb-1">Diversity Factor</label>
              <input
                type="number"
                step="0.1"
                value={settings.gasDiversityFactor}
                onChange={(e) => updateProjectSettings({ gasDiversityFactor: parseFloat(e.target.value) || 0.8 })}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              />
              <p className="text-xs text-surface-500 mt-1">Simultaneous use factor (0.5-1.0)</p>
            </div>
          </div>

          {/* Quick Add Presets */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4">Quick Add</h3>
            <div className="space-y-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setAppliances([...appliances, {
                    id: Date.now().toString(),
                    name: preset.name,
                    btuInput: preset.btu,
                    count: 1,
                  }])}
                  className="w-full px-3 py-2 text-left text-sm bg-surface-700 hover:bg-surface-600 rounded-lg text-surface-300 transition-colors"
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Appliances & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-800 border border-orange-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-orange-400 mb-1">{totalConnectedMBH.toFixed(0)}</p>
              <p className="text-sm text-surface-400">Connected MBH</p>
            </div>
            <div className="bg-surface-800 border border-red-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-400 mb-1">{diversifiedMBH.toFixed(0)}</p>
              <p className="text-sm text-surface-400">Diversified MBH</p>
            </div>
            <div className="bg-surface-800 border border-amber-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-amber-400 mb-1">{recommendedPipeSize}</p>
              <p className="text-sm text-surface-400">Main Pipe Size</p>
            </div>
          </div>

          {/* Appliance List */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-700 bg-surface-700/50 flex items-center justify-between">
              <h3 className="font-semibold text-white">Gas Appliances</h3>
              <button
                onClick={addAppliance}
                className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
              >
                + Add Appliance
              </button>
            </div>
            
            {appliances.length === 0 ? (
              <div className="text-center py-8 text-surface-500">
                <p>No appliances added yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-700 text-sm text-surface-400">
                    <th className="px-4 py-2 text-left">Appliance</th>
                    <th className="px-4 py-2 text-center">BTU/hr Input</th>
                    <th className="px-4 py-2 text-center">Count</th>
                    <th className="px-4 py-2 text-center">Total MBH</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appliances.map((appliance) => (
                    <tr key={appliance.id} className="border-b border-surface-700/30">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={appliance.name}
                          onChange={(e) => updateAppliance(appliance.id, { name: e.target.value })}
                          className="w-full px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={appliance.btuInput}
                          onChange={(e) => updateAppliance(appliance.id, { btuInput: parseInt(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white text-sm text-center"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={appliance.count}
                          onChange={(e) => updateAppliance(appliance.id, { count: parseInt(e.target.value) || 1 })}
                          className="w-16 px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white text-sm text-center"
                        />
                      </td>
                      <td className="px-4 py-2 text-center text-orange-400 font-medium">
                        {((appliance.btuInput * appliance.count) / 1000).toFixed(0)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => removeAppliance(appliance.id)}
                          className="p-1 hover:bg-red-500/20 rounded text-surface-500 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-700/50 font-bold">
                    <td className="px-4 py-2 text-white" colSpan={3}>TOTAL</td>
                    <td className="px-4 py-2 text-center text-orange-400">{totalConnectedMBH.toFixed(0)} MBH</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Calculation Breakdown */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-4">Calculation Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-400">Total Connected Load</span>
                <span className="text-white">{totalConnectedMBH.toFixed(0)} MBH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Diversity Factor</span>
                <span className="text-white">{(settings.gasDiversityFactor * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between border-t border-surface-700 pt-2 mt-2">
                <span className="text-surface-400">Diversified Load</span>
                <span className="text-red-400 font-medium">{diversifiedMBH.toFixed(0)} MBH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Estimated CFH</span>
                <span className="text-white">{diversifiedCFH.toFixed(0)} CFH</span>
              </div>
              <div className="flex justify-between border-t border-surface-700 pt-2 mt-2">
                <span className="text-surface-400">Recommended Pipe Size</span>
                <span className="text-amber-400 font-bold">{recommendedPipeSize}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
