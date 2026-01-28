import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import Ductulator from './calculators/Ductulator'

type CalculatorTab = 'ductulator' | 'pipe_pressure' | 'duct_pressure' | 'psychrometric'

export default function HVACCalculators() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<CalculatorTab>('ductulator')
  
  const tabs: { id: CalculatorTab; name: string; icon: string; available: boolean }[] = [
    { id: 'ductulator', name: 'Ductulator', icon: '🌀', available: true },
    { id: 'pipe_pressure', name: 'Pipe Pressure Drop', icon: '🔧', available: false },
    { id: 'duct_pressure', name: 'Duct Pressure Drop', icon: '📏', available: false },
    { id: 'psychrometric', name: 'Psychrometric', icon: '💧', available: false },
  ]
  
  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface-900/80 backdrop-blur-lg border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/hvac')} className="hover:opacity-80 transition-opacity">
                <Logo size="sm" />
              </button>
              <div className="h-8 w-px bg-surface-700" />
              <div>
                <h1 className="text-lg font-semibold text-white">🧮 HVAC Calculators</h1>
                <p className="text-xs text-surface-400">Standalone engineering tools</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/hvac')}
                className="px-3 py-1.5 text-sm text-surface-400 hover:text-white transition-colors"
              >
                ← Back to Projects
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* GOAT banner */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🐐🧮💨</div>
          <p className="text-surface-400">Standalone calculators - not tied to any project! The GOAT does quick math.</p>
        </div>
        
        {/* Calculator Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => tab.available && setActiveTab(tab.id)}
              disabled={!tab.available}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white'
                  : tab.available
                    ? 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                    : 'bg-surface-800/50 text-surface-500 cursor-not-allowed'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
              {!tab.available && <span className="text-xs">(Soon)</span>}
            </button>
          ))}
        </div>
        
        {/* Calculator Content */}
        <div className="bg-surface-800/50 rounded-xl border border-surface-700">
          {activeTab === 'ductulator' && <Ductulator />}
          {activeTab === 'pipe_pressure' && (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold text-white mb-2">Pipe Pressure Drop Calculator</h3>
              <p className="text-surface-400">Coming Soon - The GOAT is learning fluid dynamics! 🐐💨</p>
            </div>
          )}
          {activeTab === 'duct_pressure' && (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📏</div>
              <h3 className="text-xl font-semibold text-white mb-2">Duct Pressure Drop Calculator</h3>
              <p className="text-surface-400">Coming Soon - Stay tuned! 🐐</p>
            </div>
          )}
          {activeTab === 'psychrometric' && (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">💧</div>
              <h3 className="text-xl font-semibold text-white mb-2">Psychrometric Calculator</h3>
              <p className="text-surface-400">Coming Soon - The GOAT doesn't sweat the humidity! 🐐💦</p>
            </div>
          )}
        </div>
        
        {/* Export Options */}
        <div className="mt-6 flex justify-center gap-4">
          <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2">
            📊 Export to Excel
          </button>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center gap-2">
            📄 Export to PDF
          </button>
        </div>
      </div>
    </div>
  )
}
