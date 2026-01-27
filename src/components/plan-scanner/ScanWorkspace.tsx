import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import { useAuthStore } from '../../store/useAuthStore'
import { useScannerStore, ExtractedSpace, ScanDrawing } from '../../store/useScannerStore'
import { analyzeDrawing, calculateScale } from '../../lib/planAnalyzer'
import { v4 as uuidv4 } from 'uuid'
import ExportModal from './ExportModal'
import PDFViewer from './PDFViewer'

type TabType = 'drawings' | 'spaces' | 'export'

export default function ScanWorkspace() {
  const { scanId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    currentScan, scans, setCurrentScan, updateScan, addDrawing, removeDrawing,
    setExtractedSpaces, updateExtractedSpace, deleteExtractedSpace,
    calibrationMode, setCalibrationMode, calibrationPoints, addCalibrationPoint, 
    clearCalibrationPoints, setScale, selectedSpaceId, setSelectedSpaceId,
    legends
  } = useScannerStore()
  
  const [activeTab, setActiveTab] = useState<TabType>('drawings')
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [calibrationDistance, setCalibrationDistance] = useState<string>('')
  const [showCalibrationInput, setShowCalibrationInput] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Load scan on mount
  useEffect(() => {
    if (scanId && (!currentScan || currentScan.id !== scanId)) {
      const scan = scans.find(s => s.id === scanId)
      if (scan) {
        setCurrentScan(scan)
        if (scan.drawings.length > 0) {
          setSelectedDrawingId(scan.drawings[0].id)
        }
      } else {
        navigate('/plan-scanner')
      }
    }
  }, [scanId, scans])

  // Select first drawing when available
  useEffect(() => {
    if (currentScan?.drawings.length && !selectedDrawingId) {
      setSelectedDrawingId(currentScan.drawings[0].id)
    }
  }, [currentScan?.drawings])

  // Handle calibration point click
  useEffect(() => {
    if (calibrationPoints.length === 2) {
      setShowCalibrationInput(true)
    }
  }, [calibrationPoints])

  const selectedDrawing = currentScan?.drawings.find(d => d.id === selectedDrawingId)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !currentScan) return

    for (const file of files) {
      const base64 = await fileToBase64(file)
      const drawing: ScanDrawing = {
        id: uuidv4(),
        fileName: file.name,
        fileType: file.type,
        fileUrl: base64,
      }
      addDrawing(currentScan.id, drawing)
      setSelectedDrawingId(drawing.id)
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleAnalyze = async () => {
    if (!currentScan || !selectedDrawing) return
    
    setAnalyzing(true)
    setAnalysisProgress('Preparing image...')
    
    try {
      // Get base64 data (remove data URL prefix if present)
      let imageData = selectedDrawing.fileUrl
      const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/)
      let mimeType = 'image/png'
      
      if (base64Match) {
        mimeType = base64Match[1]
        imageData = base64Match[2]
      }
      
      setAnalysisProgress('AI is analyzing the drawing... 🤖🐐')
      
      // Get active legend if any
      const activeLegend = currentScan.legendId 
        ? legends.find(l => l.id === currentScan.legendId) 
        : undefined
      
      const result = await analyzeDrawing(imageData, mimeType, activeLegend)
      
      setAnalysisProgress(`Found ${result.spaces.length} spaces! Processing...`)
      
      // Merge with existing spaces (don't overwrite user edits)
      const existingNames = new Set(currentScan.extractedSpaces.map(s => s.name.toLowerCase()))
      const newSpaces = result.spaces.filter(s => !existingNames.has(s.name.toLowerCase()))
      
      const allSpaces = [...currentScan.extractedSpaces, ...newSpaces]
      setExtractedSpaces(currentScan.id, allSpaces)
      
      // Update scan status
      updateScan(currentScan.id, { 
        status: 'reviewed',
      })
      
      // Switch to spaces tab
      setActiveTab('spaces')
      
      setAnalysisProgress('')
    } catch (error) {
      console.error('Analysis failed:', error)
      setAnalysisProgress('')
      alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!calibrationMode || !imageRef.current) return
    
    const rect = imageRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    addCalibrationPoint({ x, y })
  }, [calibrationMode, addCalibrationPoint])

  const handleCalibrationSubmit = () => {
    if (!currentScan || calibrationPoints.length !== 2 || !calibrationDistance) return
    
    const distanceFeet = parseFloat(calibrationDistance)
    if (isNaN(distanceFeet) || distanceFeet <= 0) {
      alert('Please enter a valid distance in feet')
      return
    }
    
    const pixelsPerFoot = calculateScale(calibrationPoints[0], calibrationPoints[1], distanceFeet)
    setScale(currentScan.id, pixelsPerFoot, distanceFeet)
    
    // Reset calibration state
    setCalibrationMode(false)
    clearCalibrationPoints()
    setShowCalibrationInput(false)
    setCalibrationDistance('')
    
    updateScan(currentScan.id, { status: 'calibrating' })
    
    alert(`Scale set! ${pixelsPerFoot.toFixed(1)} pixels per foot 📏🐐`)
  }

  const handleAddSpace = () => {
    if (!currentScan) return
    
    const newSpace: ExtractedSpace = {
      id: uuidv4(),
      name: 'New Space',
      sf: 0,
      fixtures: {},
      equipment: [],
      confidence: 100, // Manual entry
    }
    
    setExtractedSpaces(currentScan.id, [...currentScan.extractedSpaces, newSpace])
    setSelectedSpaceId(newSpace.id)
  }

  const handleDeleteSpace = (spaceId: string) => {
    if (!currentScan) return
    deleteExtractedSpace(currentScan.id, spaceId)
    if (selectedSpaceId === spaceId) {
      setSelectedSpaceId(null)
    }
  }

  const selectedSpace = currentScan?.extractedSpaces.find(s => s.id === selectedSpaceId)

  if (!currentScan) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🐐</div>
          <p className="text-surface-400">Loading scan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-700 bg-surface-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/plan-scanner')} className="hover:opacity-80 transition-opacity">
              <Logo size="sm" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">📐</span>
              <h1 className="text-lg font-bold text-white truncate max-w-xs">{currentScan.name}</h1>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-surface-700/50 rounded-lg p-1">
            {(['drawings', 'spaces', 'export'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-violet-600 text-white'
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                {tab === 'drawings' && '📄 Drawings'}
                {tab === 'spaces' && `🏠 Spaces (${currentScan.extractedSpaces.length})`}
                {tab === 'export' && '📤 Export'}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/plan-scanner')}
              className="px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
            >
              ← Back
            </button>
            {user && <UserMenu />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'drawings' && (
          <>
            {/* Drawing List Sidebar */}
            <div className="w-64 border-r border-surface-700 bg-surface-800/50 flex flex-col">
              <div className="p-4 border-b border-surface-700">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  + Add Drawings
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {currentScan.drawings.length === 0 ? (
                  <div className="text-center py-8 text-surface-500">
                    <p className="text-sm">No drawings yet</p>
                    <p className="text-xs mt-1">Upload some plans!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentScan.drawings.map(drawing => (
                      <div
                        key={drawing.id}
                        onClick={() => setSelectedDrawingId(drawing.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedDrawingId === drawing.id
                            ? 'bg-violet-600/20 border border-violet-500'
                            : 'bg-surface-700/30 hover:bg-surface-700/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📄</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{drawing.fileName}</p>
                            <p className="text-xs text-surface-400">{drawing.fileType}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeDrawing(currentScan.id, drawing.id)
                            }}
                            className="p-1 rounded hover:bg-red-500/20 text-surface-500 hover:text-red-400"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Drawing Viewer */}
            <div className="flex-1 flex flex-col">
              {/* Toolbar */}
              <div className="px-6 py-3 border-b border-surface-700 bg-surface-800/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setCalibrationMode(!calibrationMode)
                      if (!calibrationMode) clearCalibrationPoints()
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      calibrationMode
                        ? 'bg-purple-600 text-white'
                        : 'bg-surface-700 text-surface-300 hover:text-white'
                    }`}
                  >
                    📏 {calibrationMode ? 'Calibrating...' : 'Set Scale'}
                  </button>
                  
                  {currentScan.scale && (
                    <span className="text-sm text-surface-400">
                      Scale: {currentScan.scale.pixelsPerFoot.toFixed(1)} px/ft
                      {currentScan.scale.referenceDistance && ` (${currentScan.scale.referenceDistance}' reference)`}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || !selectedDrawing}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <span className="animate-spin">🔄</span>
                      {analysisProgress || 'Analyzing...'}
                    </>
                  ) : (
                    <>🤖 Analyze with AI</>
                  )}
                </button>
              </div>

              {/* Calibration Input Modal */}
              {showCalibrationInput && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-surface-800 border border-violet-500 rounded-xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">Set Scale Distance</h3>
                  <p className="text-sm text-surface-400 mb-4">
                    Enter the real-world distance between the two points you clicked:
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="number"
                      value={calibrationDistance}
                      onChange={(e) => setCalibrationDistance(e.target.value)}
                      placeholder="10"
                      className="w-32 px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                      autoFocus
                    />
                    <span className="text-surface-400">feet</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowCalibrationInput(false)
                        clearCalibrationPoints()
                        setCalibrationMode(false)
                      }}
                      className="flex-1 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCalibrationSubmit}
                      className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg"
                    >
                      Set Scale
                    </button>
                  </div>
                </div>
              )}

              {/* Image/PDF Display */}
              <div className="flex-1 overflow-hidden relative">
                {selectedDrawing ? (
                  selectedDrawing.fileType === 'application/pdf' ? (
                    // PDF Viewer
                    <PDFViewer
                      fileUrl={selectedDrawing.fileUrl}
                      fileName={selectedDrawing.fileName}
                      calibrationMode={calibrationMode}
                    />
                  ) : (
                  <div className="h-full overflow-auto p-6 bg-surface-900/50">
                    <div className="relative inline-block">
                      {selectedDrawing.fileUrl ? (
                        <img
                          ref={imageRef}
                          src={selectedDrawing.fileUrl}
                          alt={selectedDrawing.fileName}
                          className={`max-w-full h-auto ${calibrationMode ? 'cursor-crosshair' : ''}`}
                          onClick={handleImageClick}
                          onError={(e) => {
                            console.error('Image failed to load:', selectedDrawing.fileName)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-64 bg-surface-800 rounded-xl border border-surface-700">
                          <div className="text-center">
                            <div className="text-4xl mb-2">🖼️</div>
                            <p className="text-surface-400">Image not loaded</p>
                            <p className="text-sm text-surface-500">Try re-uploading the file</p>
                          </div>
                        </div>
                      )}
                    
                    {/* Calibration Points */}
                    {calibrationMode && calibrationPoints.map((point, index) => (
                      <div
                        key={index}
                        className="absolute w-4 h-4 bg-violet-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ left: point.x, top: point.y }}
                      >
                        <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-violet-300 font-bold">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                    
                    {/* Calibration Line */}
                    {calibrationPoints.length === 2 && (
                      <svg className="absolute inset-0 pointer-events-none z-5">
                        <line
                          x1={calibrationPoints[0].x}
                          y1={calibrationPoints[0].y}
                          x2={calibrationPoints[1].x}
                          y2={calibrationPoints[1].y}
                          stroke="#8b5cf6"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                      </svg>
                    )}
                    </div>
                  </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-surface-500">
                    <div className="text-center">
                      <div className="text-5xl mb-4">📄</div>
                      <p>Select a drawing from the sidebar</p>
                      <p className="text-sm mt-1">or upload new drawings</p>
                    </div>
                  </div>
                )}
                
                {/* Calibration Instructions */}
                {calibrationMode && calibrationPoints.length < 2 && (
                  <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-violet-600 text-white px-6 py-3 rounded-full shadow-lg">
                    Click point {calibrationPoints.length + 1} of 2 on a known distance
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'spaces' && (
          <>
            {/* Spaces List */}
            <div className="w-80 border-r border-surface-700 bg-surface-800/50 flex flex-col">
              <div className="p-4 border-b border-surface-700 flex items-center justify-between">
                <h3 className="font-semibold text-white">Extracted Spaces</h3>
                <button
                  onClick={handleAddSpace}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition-colors"
                >
                  + Add
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {currentScan.extractedSpaces.length === 0 ? (
                  <div className="text-center py-8 text-surface-500">
                    <div className="text-4xl mb-3">🤖</div>
                    <p className="text-sm">No spaces extracted yet</p>
                    <p className="text-xs mt-1">Analyze a drawing to extract spaces</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentScan.extractedSpaces.map(space => (
                      <div
                        key={space.id}
                        onClick={() => setSelectedSpaceId(space.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedSpaceId === space.id
                            ? 'bg-violet-600/20 border border-violet-500'
                            : 'bg-surface-700/30 hover:bg-surface-700/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-white truncate">{space.name}</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSpace(space.id)
                            }}
                            className="p-1 rounded hover:bg-red-500/20 text-surface-500 hover:text-red-400"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-surface-400">
                          <span>{space.sf} SF</span>
                          {space.zoneType && (
                            <span className="px-1.5 py-0.5 bg-surface-600 rounded">{space.zoneType}</span>
                          )}
                        </div>
                        {Object.keys(space.fixtures).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(space.fixtures).slice(0, 4).map(([key, count]) => (
                              <span key={key} className="text-xs px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                                {count} {key}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-1">
                          <div className="flex-1 h-1 bg-surface-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${space.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-surface-500">{space.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Space Editor */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedSpace ? (
                <SpaceEditor 
                  space={selectedSpace} 
                  onUpdate={(updates) => updateExtractedSpace(currentScan.id, selectedSpace.id, updates)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-surface-500">
                  <div className="text-center">
                    <div className="text-5xl mb-4">🏠</div>
                    <p>Select a space to edit</p>
                    <p className="text-sm mt-1">or add a new one</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'export' && (
          <div className="flex-1 p-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">📤</div>
                <h2 className="text-2xl font-bold text-white mb-2">Export Extracted Data</h2>
                <p className="text-surface-400">
                  Send your {currentScan.extractedSpaces.length} spaces to another module for detailed calculations
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ExportCard
                  icon="🏗️"
                  title="Concept MEP Design"
                  description="Full MEP calculations with zones"
                  onClick={() => setShowExportModal(true)}
                />
                <ExportCard
                  icon="🚿"
                  title="Plumbing / Fire Protection"
                  description="WSFU/DFU, pipe sizing, DHW"
                  onClick={() => setShowExportModal(true)}
                />
                <ExportCard
                  icon="❄️"
                  title="HVAC"
                  description="Cooling, heating, ventilation loads"
                  disabled
                />
                <ExportCard
                  icon="⚡"
                  title="Electrical"
                  description="Lighting, power, service sizing"
                  disabled
                />
              </div>

              <div className="mt-8 bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-surface-700">
                  <h3 className="font-semibold text-white">Export Summary</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-violet-400">{currentScan.extractedSpaces.length}</p>
                      <p className="text-sm text-surface-400">Spaces</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-cyan-400">
                        {currentScan.extractedSpaces.reduce((sum, s) => sum + Object.values(s.fixtures).reduce((a, b) => a + b, 0), 0)}
                      </p>
                      <p className="text-sm text-surface-400">Fixtures</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">
                        {currentScan.extractedSpaces.reduce((sum, s) => sum + s.sf, 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-surface-400">Total SF</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          scan={currentScan}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  )
}

// Space Editor Component
function SpaceEditor({ space, onUpdate }: { space: ExtractedSpace; onUpdate: (updates: Partial<ExtractedSpace>) => void }) {
  return (
    <div className="max-w-2xl">
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Space Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-400 mb-1">Name</label>
            <input
              type="text"
              value={space.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Floor</label>
            <input
              type="text"
              value={space.floor || ''}
              onChange={(e) => onUpdate({ floor: e.target.value })}
              placeholder="e.g., Level 1"
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Square Footage</label>
            <input
              type="number"
              value={space.sf}
              onChange={(e) => onUpdate({ sf: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1">Zone Type</label>
            <select
              value={space.zoneType || ''}
              onChange={(e) => onUpdate({ zoneType: e.target.value })}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
            >
              <option value="">Select type...</option>
              <option value="lobby">Lobby</option>
              <option value="locker_room_male">Locker Room (Male)</option>
              <option value="locker_room_female">Locker Room (Female)</option>
              <option value="restroom_public">Restroom (Public)</option>
              <option value="shower_room">Shower Room</option>
              <option value="pool_lap">Lap Pool</option>
              <option value="pool_therapy">Therapy Pool</option>
              <option value="spa_treatment">Spa Treatment</option>
              <option value="fitness_cardio">Fitness - Cardio</option>
              <option value="office_private">Office</option>
              <option value="mechanical_room">Mechanical Room</option>
              <option value="storage">Storage</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fixtures */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Fixtures</h3>
        
        <div className="grid grid-cols-3 gap-4">
          {['toilets', 'urinals', 'lavatories', 'showers', 'floor_drains', 'drinking_fountains'].map(fixture => (
            <div key={fixture}>
              <label className="block text-sm text-surface-400 mb-1 capitalize">{fixture.replace('_', ' ')}</label>
              <input
                type="number"
                min="0"
                value={space.fixtures[fixture] || 0}
                onChange={(e) => onUpdate({ 
                  fixtures: { ...space.fixtures, [fixture]: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Confidence */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">AI Confidence</h3>
          <span className={`text-lg font-bold ${
            space.confidence >= 80 ? 'text-emerald-400' :
            space.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {space.confidence}%
          </span>
        </div>
        <div className="w-full h-2 bg-surface-600 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              space.confidence >= 80 ? 'bg-emerald-500' :
              space.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${space.confidence}%` }}
          />
        </div>
        <p className="text-xs text-surface-500 mt-2">
          {space.confidence >= 80 ? 'High confidence - likely accurate' :
           space.confidence >= 50 ? 'Medium confidence - please verify' :
           'Low confidence - manual review recommended'}
        </p>
      </div>
    </div>
  )
}

// Export Card Component
function ExportCard({ icon, title, description, onClick, disabled }: {
  icon: string
  title: string
  description: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-6 rounded-xl border text-left transition-all ${
        disabled
          ? 'bg-surface-800/50 border-surface-700 opacity-50 cursor-not-allowed'
          : 'bg-surface-800 border-surface-700 hover:border-violet-500 hover:bg-violet-500/10'
      }`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h4 className="text-lg font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-surface-400">{description}</p>
      {disabled && (
        <span className="inline-block mt-2 text-xs text-surface-500">Coming Soon</span>
      )}
    </button>
  )
}
