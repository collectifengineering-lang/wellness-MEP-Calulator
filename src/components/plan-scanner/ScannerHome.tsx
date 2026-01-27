import { useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'

export default function ScannerHome() {
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
            <span className="text-2xl">📐</span>
            <h1 className="text-xl font-bold text-white">Plan Scanner</h1>
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
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="text-6xl mb-6">📐🤖🐐</div>
          <h2 className="text-3xl font-bold text-white mb-4">
            AI-Powered Plan Scanner
          </h2>
          <p className="text-lg text-surface-400 max-w-2xl mx-auto">
            Upload architectural plans and let our GOAT AI extract rooms, fixtures, 
            and equipment automatically. Export data to any calculation module.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-surface-800 rounded-2xl border-2 border-dashed border-surface-600 p-12 text-center mb-8 hover:border-violet-500 transition-colors cursor-pointer group">
          <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📄</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Drop Plans Here
          </h3>
          <p className="text-surface-400 mb-4">
            or click to browse • PDF, PNG, JPG supported
          </p>
          <button className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors">
            Upload Plans 🐐
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
            <div className="text-3xl mb-3">🎯</div>
            <h4 className="text-lg font-semibold text-white mb-2">Room Detection</h4>
            <p className="text-surface-400 text-sm">
              Automatically identifies rooms, their names, and square footages from floor plans.
            </p>
          </div>
          
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
            <div className="text-3xl mb-3">🚿</div>
            <h4 className="text-lg font-semibold text-white mb-2">Fixture Counting</h4>
            <p className="text-surface-400 text-sm">
              Counts toilets, sinks, showers, and other plumbing fixtures in each space.
            </p>
          </div>
          
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
            <div className="text-3xl mb-3">📏</div>
            <h4 className="text-lg font-semibold text-white mb-2">Scale Detection</h4>
            <p className="text-surface-400 text-sm">
              Reads drawing scale from title blocks or dimension lines for accurate measurements.
            </p>
          </div>
          
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
            <div className="text-3xl mb-3">📤</div>
            <h4 className="text-lg font-semibold text-white mb-2">Export Anywhere</h4>
            <p className="text-surface-400 text-sm">
              Send extracted data to HVAC, Electrical, or Plumbing modules with one click.
            </p>
          </div>
        </div>

        {/* Symbol Legend Section */}
        <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/30 rounded-2xl border border-violet-700/50 p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="text-4xl">📋</div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">
                Pro Tip: Upload Your Symbol Legend First!
              </h4>
              <p className="text-surface-300 text-sm mb-4">
                Upload your cover sheet or symbol legend before floor plans. 
                The AI will use YOUR firm's specific symbols to identify fixtures more accurately.
              </p>
              <button className="px-4 py-2 bg-violet-600/50 hover:bg-violet-600 text-white text-sm rounded-lg transition-colors">
                Upload Symbol Legend
              </button>
            </div>
          </div>
        </div>

        {/* Recent Scans (placeholder) */}
        <div className="bg-surface-800 rounded-2xl border border-surface-700 p-8">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Scans</h3>
          <div className="text-center py-8 text-surface-500">
            <div className="text-4xl mb-3">🐐</div>
            <p>No scans yet. Feed me some plans!</p>
          </div>
        </div>
      </main>
    </div>
  )
}
