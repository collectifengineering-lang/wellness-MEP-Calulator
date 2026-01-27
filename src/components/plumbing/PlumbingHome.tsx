import { useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'

export default function PlumbingHome() {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="border-b border-surface-700 bg-surface-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚿</span>
            <h1 className="text-xl font-bold text-white">Plumbing / Fire Protection</h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
          >
            ← Back to Hub
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="text-8xl mb-8">🚿🔥🐐</div>
        <h2 className="text-4xl font-bold text-white mb-4">
          Plumbing Module Coming Soon!
        </h2>
        <p className="text-xl text-surface-400 mb-8">
          Our GOATs are diving deep to bring you water-tight calculations.
        </p>
        
        <div className="bg-surface-800 rounded-2xl border border-surface-700 p-8 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">What's Coming:</h3>
          <ul className="text-left text-surface-300 space-y-3 max-w-md mx-auto">
            <li className="flex items-center gap-3">
              <span className="text-blue-400">🚰</span>
              <span>Fixture Unit Calculations (WSFU/DFU)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-red-400">🔥</span>
              <span>DHW System Sizing (ASHRAE)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-cyan-400">📏</span>
              <span>Pipe Sizing (Water & Drain)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-orange-400">🔥</span>
              <span>Gas Piping Calculations</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-red-500">🧯</span>
              <span>Fire Protection Sizing</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-purple-400">📋</span>
              <span>Fixture Schedules & Reports</span>
            </li>
          </ul>
        </div>

        <p className="text-surface-500 text-sm">
          🐐 Making sure no calculation goes down the drain 🐐
        </p>
        
        <button
          onClick={() => navigate('/')}
          className="mt-8 px-6 py-3 bg-pink-500 hover:bg-pink-400 text-white font-semibold rounded-lg transition-colors"
        >
          Back to the Herd 🐐
        </button>
      </main>
    </div>
  )
}
