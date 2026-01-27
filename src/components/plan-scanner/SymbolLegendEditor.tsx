import { useState, useRef, useCallback } from 'react'
import { useScannerStore, SymbolLegend, SymbolDefinition } from '../../store/useScannerStore'
import { v4 as uuidv4 } from 'uuid'

interface SymbolLegendEditorProps {
  onClose: () => void
}

// Fixture type options for labeling symbols
const FIXTURE_TYPES = [
  { category: 'Baths', items: ['bathtub_corner', 'bathtub_recessed', 'bathtub_angle', 'bathtub_whirlpool', 'bathtub_institutional'] },
  { category: 'Showers', items: ['shower_stall', 'shower_corner', 'shower_gang'] },
  { category: 'Water Closets', items: ['wc_tank', 'wc_flush_valve', 'bidet'] },
  { category: 'Urinals', items: ['urinal_wall', 'urinal_stall', 'urinal_trough'] },
  { category: 'Lavatories', items: ['lav_vanity', 'lav_wall', 'lav_counter', 'lav_pedestal'] },
  { category: 'Sinks', items: ['sink_kitchen', 'sink_service', 'sink_mop'] },
  { category: 'Other', items: ['floor_drain', 'drinking_fountain', 'hose_bibb', 'washing_machine', 'dishwasher'] },
]

export default function SymbolLegendEditor({ onClose }: SymbolLegendEditorProps) {
  const { addLegend } = useScannerStore()
  
  const [step, setStep] = useState<'upload' | 'define' | 'review'>('upload')
  const [legendName, setLegendName] = useState('')
  const [legendImage, setLegendImage] = useState<string | null>(null)
  const [symbols, setSymbols] = useState<SymbolDefinition[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null)
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null)
  
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = () => {
      setLegendImage(reader.result as string)
      setLegendName(file.name.replace(/\.[^/.]+$/, ''))
      setStep('define')
    }
    reader.readAsDataURL(file)
  }

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return
    
    const rect = imageRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setIsDrawing(true)
    setStartPos({ x, y })
    setCurrentBox({ x, y, width: 0, height: 0 })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPos || !imageRef.current) return
    
    const rect = imageRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setCurrentBox({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    })
  }, [isDrawing, startPos])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentBox || currentBox.width < 10 || currentBox.height < 10) {
      setIsDrawing(false)
      setCurrentBox(null)
      return
    }
    
    // Create a new symbol from the selection
    const newSymbol: SymbolDefinition = {
      id: uuidv4(),
      name: `Symbol ${symbols.length + 1}`,
      category: 'fixture',
    }
    
    // Crop the image region
    if (imageRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Scale factor between displayed size and natural size
        const scaleX = imageRef.current.naturalWidth / imageRef.current.width
        const scaleY = imageRef.current.naturalHeight / imageRef.current.height
        
        canvas.width = currentBox.width * scaleX
        canvas.height = currentBox.height * scaleY
        
        ctx.drawImage(
          imageRef.current,
          currentBox.x * scaleX,
          currentBox.y * scaleY,
          currentBox.width * scaleX,
          currentBox.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        )
        
        newSymbol.imageData = canvas.toDataURL('image/png')
      }
    }
    
    setSymbols([...symbols, newSymbol])
    setSelectedSymbolId(newSymbol.id)
    setIsDrawing(false)
    setCurrentBox(null)
  }, [isDrawing, currentBox, symbols])

  const updateSymbol = (id: string, updates: Partial<SymbolDefinition>) => {
    setSymbols(symbols.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const deleteSymbol = (id: string) => {
    setSymbols(symbols.filter(s => s.id !== id))
    if (selectedSymbolId === id) {
      setSelectedSymbolId(null)
    }
  }

  const handleSave = () => {
    if (!legendName.trim() || symbols.length === 0) return
    
    const legend: SymbolLegend = {
      id: uuidv4(),
      name: legendName,
      symbols,
      uploadedAt: new Date().toISOString(),
    }
    
    addLegend(legend)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Symbol Legend Editor 📋</h2>
            <p className="text-sm text-surface-400">
              {step === 'upload' && 'Upload your symbol legend image'}
              {step === 'define' && 'Draw boxes around each symbol to define them'}
              {step === 'review' && 'Review and save your symbol definitions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {step === 'upload' && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="legend-upload"
                />
                <label
                  htmlFor="legend-upload"
                  className="block cursor-pointer"
                >
                  <div className="w-64 h-64 border-2 border-dashed border-surface-600 rounded-2xl flex flex-col items-center justify-center hover:border-violet-500 transition-colors">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="text-white font-medium mb-2">Upload Symbol Legend</p>
                    <p className="text-sm text-surface-400">PNG, JPG, or PDF</p>
                  </div>
                </label>
                
                <p className="mt-6 text-surface-400 max-w-md">
                  Upload an image of your plumbing fixture symbols. You'll then draw boxes around each symbol to define them.
                </p>
              </div>
            </div>
          )}

          {step === 'define' && legendImage && (
            <>
              {/* Image Area */}
              <div className="flex-1 overflow-auto p-4 bg-surface-900/50">
                <div className="mb-4 flex items-center gap-4">
                  <input
                    type="text"
                    value={legendName}
                    onChange={(e) => setLegendName(e.target.value)}
                    placeholder="Legend name..."
                    className="px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
                  />
                  <span className="text-surface-400 text-sm">
                    {symbols.length} symbol{symbols.length !== 1 ? 's' : ''} defined
                  </span>
                </div>
                
                <div className="inline-block text-sm text-violet-400 mb-2 px-3 py-1 bg-violet-500/20 rounded-full">
                  🖱️ Click and drag to draw a box around each symbol
                </div>
                
                <div
                  className="relative inline-block cursor-crosshair select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <img
                    ref={imageRef}
                    src={legendImage}
                    alt="Symbol Legend"
                    className="max-w-full h-auto"
                    draggable={false}
                  />
                  
                  {/* Current drawing box */}
                  {currentBox && (
                    <div
                      className="absolute border-2 border-violet-500 bg-violet-500/20 pointer-events-none"
                      style={{
                        left: currentBox.x,
                        top: currentBox.y,
                        width: currentBox.width,
                        height: currentBox.height,
                      }}
                    />
                  )}
                </div>
                
                {/* Hidden canvas for cropping */}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Symbols Panel */}
              <div className="w-80 border-l border-surface-700 bg-surface-800 flex flex-col">
                <div className="p-4 border-b border-surface-700">
                  <h3 className="font-semibold text-white">Defined Symbols</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                  {symbols.length === 0 ? (
                    <div className="text-center py-8 text-surface-500">
                      <p className="text-sm">No symbols defined yet</p>
                      <p className="text-xs mt-1">Draw boxes on the image</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {symbols.map((symbol) => (
                        <div
                          key={symbol.id}
                          onClick={() => setSelectedSymbolId(symbol.id)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedSymbolId === symbol.id
                              ? 'bg-violet-600/20 border border-violet-500'
                              : 'bg-surface-700/50 border border-transparent hover:bg-surface-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {symbol.imageData && (
                              <img
                                src={symbol.imageData}
                                alt={symbol.name}
                                className="w-12 h-12 object-contain bg-white rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                value={symbol.name}
                                onChange={(e) => updateSymbol(symbol.id, { name: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-transparent text-white text-sm font-medium focus:outline-none"
                                placeholder="Symbol name..."
                              />
                              <select
                                value={symbol.fixtureType || ''}
                                onChange={(e) => updateSymbol(symbol.id, { fixtureType: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 w-full bg-surface-600 text-surface-300 text-xs rounded px-2 py-1 focus:outline-none"
                              >
                                <option value="">Select fixture type...</option>
                                {FIXTURE_TYPES.map(group => (
                                  <optgroup key={group.category} label={group.category}>
                                    {group.items.map(item => (
                                      <option key={item} value={item}>
                                        {item.replace(/_/g, ' ')}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteSymbol(symbol.id)
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
                
                {/* Actions */}
                <div className="p-4 border-t border-surface-700 space-y-2">
                  <button
                    onClick={handleSave}
                    disabled={symbols.length === 0 || !legendName.trim()}
                    className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Save Legend ({symbols.length} symbols) 🐐
                  </button>
                  <button
                    onClick={() => setStep('upload')}
                    className="w-full px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
                  >
                    Upload Different Image
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
