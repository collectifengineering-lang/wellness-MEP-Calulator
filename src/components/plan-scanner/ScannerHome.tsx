import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import { useAuthStore } from '../../store/useAuthStore'
import { useScannerStore, ScanProject } from '../../store/useScannerStore'
import { v4 as uuidv4 } from 'uuid'
import SymbolLegendEditor from './SymbolLegendEditor'

export default function ScannerHome() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { scans, legends, createScan, deleteScan, setCurrentScan, addDrawing, deleteLegend } = useScannerStore()
  
  const [showNewScanModal, setShowNewScanModal] = useState(false)
  const [newScanName, setNewScanName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showLegendEditor, setShowLegendEditor] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreateScan = () => {
    if (!newScanName.trim()) return
    const userId = user?.id || 'dev-user'
    const scan = createScan(userId, newScanName.trim())
    setShowNewScanModal(false)
    setNewScanName('')
    navigate(`/plan-scanner/scan/${scan.id}`)
  }

  const handleOpenScan = (scan: ScanProject) => {
    setCurrentScan(scan)
    navigate(`/plan-scanner/scan/${scan.id}`)
  }

  const handleDeleteScan = (scanId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this scan? This cannot be undone. 🐐')) {
      deleteScan(scanId)
    }
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return
    
    // Create a new scan for these files
    const userId = user?.id || 'dev-user'
    const scanName = files.length === 1 
      ? files[0].name.replace(/\.[^/.]+$/, '') 
      : `Scan - ${new Date().toLocaleDateString()}`
    
    const scan = createScan(userId, scanName)
    
    // Process each file
    for (const file of files) {
      const base64 = await fileToBase64(file)
      const drawing = {
        id: uuidv4(),
        fileName: file.name,
        fileType: file.type,
        fileUrl: base64,
      }
      addDrawing(scan.id, drawing)
    }
    
    // Navigate to the scan workspace
    navigate(`/plan-scanner/scan/${scan.id}`)
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix for storage
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const getStatusBadge = (status: ScanProject['status']) => {
    const styles: Record<typeof status, string> = {
      uploading: 'bg-yellow-500/20 text-yellow-400',
      processing: 'bg-blue-500/20 text-blue-400',
      calibrating: 'bg-purple-500/20 text-purple-400',
      reviewed: 'bg-emerald-500/20 text-emerald-400',
      exported: 'bg-cyan-500/20 text-cyan-400',
    }
    const labels: Record<typeof status, string> = {
      uploading: '📤 Uploading',
      processing: '🤖 Processing',
      calibrating: '📏 Calibrating',
      reviewed: '✅ Reviewed',
      exported: '📦 Exported',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }
  
  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="border-b border-surface-700 bg-surface-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
              <Logo size="sm" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📐</span>
              <h1 className="text-xl font-bold text-white">Plan Scanner</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
            >
              ← Back to Hub
            </button>
            {user && <UserMenu />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">📐🤖🐐</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Feed the GOAT Your Plans!
          </h2>
          <p className="text-surface-400 max-w-xl mx-auto">
            Upload architectural plans and our AI will extract rooms, fixtures, 
            and equipment. Export to any calculation module.
          </p>
        </div>

        {/* Upload Section */}
        <div
          className={`bg-surface-800 rounded-2xl border-2 border-dashed p-10 text-center mb-8 transition-all cursor-pointer group
            ${dragOver 
              ? 'border-violet-500 bg-violet-500/10 scale-[1.02]' 
              : 'border-surface-600 hover:border-violet-500/50'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <div className={`text-5xl mb-4 transition-transform ${dragOver ? 'scale-125' : 'group-hover:scale-110'}`}>
            {dragOver ? '🎯' : '📄'}
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {dragOver ? 'Drop it like it\'s hot! 🐐' : 'Drop Plans Here'}
          </h3>
          <p className="text-surface-400 mb-4">
            or click to browse • PDF, PNG, JPG supported
          </p>
          <button 
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
          >
            Upload Plans 🐐
          </button>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Symbol Legend Section */}
          <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 rounded-xl border border-violet-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📋</span>
              <h3 className="text-lg font-semibold text-white">Symbol Legends</h3>
            </div>
            <p className="text-surface-300 text-sm mb-4">
              Define your firm's symbols for accurate fixture detection.
            </p>
            
            <button
              onClick={() => setShowLegendEditor(true)}
              className="w-full px-4 py-2 bg-violet-600/50 hover:bg-violet-600 text-white text-sm rounded-lg transition-colors"
            >
              + Create Symbol Legend
            </button>
            
            {legends.length > 0 && (
              <div className="mt-4 space-y-2">
                {legends.slice(0, 3).map(legend => (
                  <div key={legend.id} className="flex items-center justify-between p-2 bg-surface-800/50 rounded-lg text-sm group">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white truncate">{legend.name}</span>
                      <span className="text-surface-500 text-xs whitespace-nowrap">{legend.symbols.length} symbols</span>
                    </div>
                    <button
                      onClick={() => deleteLegend(legend.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-surface-500 hover:text-red-400 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4 text-center">
              <p className="text-3xl font-bold text-violet-400">{scans.length}</p>
              <p className="text-sm text-surface-400">Total Scans</p>
            </div>
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">
                {scans.filter(s => s.status === 'reviewed').length}
              </p>
              <p className="text-sm text-surface-400">Reviewed</p>
            </div>
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4 text-center">
              <p className="text-3xl font-bold text-cyan-400">
                {scans.filter(s => s.status === 'exported').length}
              </p>
              <p className="text-sm text-surface-400">Exported</p>
            </div>
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4 text-center">
              <p className="text-3xl font-bold text-pink-400">{legends.length}</p>
              <p className="text-sm text-surface-400">Legends</p>
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="bg-surface-800 rounded-2xl border border-surface-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Recent Scans</h3>
            <button
              onClick={() => setShowNewScanModal(true)}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
            >
              + New Scan
            </button>
          </div>
          
          {scans.length === 0 ? (
            <div className="text-center py-12 text-surface-500">
              <div className="text-5xl mb-3">🐐</div>
              <p className="text-lg">No scans yet. Feed me some plans!</p>
              <p className="text-sm mt-1">Drop files above or click to upload</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-700">
              {scans.map(scan => (
                <div
                  key={scan.id}
                  className="px-6 py-4 hover:bg-surface-700/30 cursor-pointer transition-colors flex items-center justify-between group"
                  onClick={() => handleOpenScan(scan)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <span className="text-2xl">📄</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{scan.name}</h4>
                      <p className="text-sm text-surface-400">
                        {scan.drawings.length} drawing{scan.drawings.length !== 1 ? 's' : ''} • 
                        {scan.extractedSpaces.length} space{scan.extractedSpaces.length !== 1 ? 's' : ''} • 
                        {new Date(scan.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(scan.status)}
                    <button
                      onClick={(e) => handleDeleteScan(scan.id, e)}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-surface-500 hover:text-red-400 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
            <div className="text-2xl mb-2">🎯</div>
            <h4 className="font-semibold text-white mb-1">Room Detection</h4>
            <p className="text-surface-400 text-sm">
              Identifies rooms and estimates square footages
            </p>
          </div>
          
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
            <div className="text-2xl mb-2">🚿</div>
            <h4 className="font-semibold text-white mb-1">Fixture Counting</h4>
            <p className="text-surface-400 text-sm">
              Counts toilets, sinks, showers, and more
            </p>
          </div>
          
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
            <div className="text-2xl mb-2">📏</div>
            <h4 className="font-semibold text-white mb-1">Scale Calibration</h4>
            <p className="text-surface-400 text-sm">
              Click two points to set accurate scale
            </p>
          </div>
          
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
            <div className="text-2xl mb-2">📤</div>
            <h4 className="font-semibold text-white mb-1">Export Anywhere</h4>
            <p className="text-surface-400 text-sm">
              Send data to HVAC, Electrical, or Plumbing
            </p>
          </div>
        </div>
      </main>

      {/* New Scan Modal */}
      {showNewScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6">New Scan 🐐</h2>
            
            <div className="mb-6">
              <label className="block text-sm text-surface-400 mb-2">Scan Name</label>
              <input
                type="text"
                value={newScanName}
                onChange={(e) => setNewScanName(e.target.value)}
                placeholder="e.g., 123 Main St Floor Plans"
                className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateScan()}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewScanModal(false)
                  setNewScanName('')
                }}
                className="flex-1 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateScan}
                disabled={!newScanName.trim()}
                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Create Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Symbol Legend Editor Modal */}
      {showLegendEditor && (
        <SymbolLegendEditor onClose={() => setShowLegendEditor(false)} />
      )}
    </div>
  )
}
