import { useState, useRef } from 'react'
import { extractZonesFromPDF, isXAIConfigured, type ExtractedZone } from '../../lib/xai'
import { useProjectStore } from '../../store/useProjectStore'
import { zoneDefaults } from '../../data/zoneDefaults'
import type { ZoneType } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type ImportStep = 'upload' | 'processing' | 'review' | 'error'

export default function PDFImportModal({ isOpen, onClose }: Props) {
  const { addZone } = useProjectStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState<ImportStep>('upload')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [extractedZones, setExtractedZones] = useState<ExtractedZone[]>([])
  const [selectedZones, setSelectedZones] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  
  // Zone type options for dropdown
  const zoneTypeOptions = Object.entries(zoneDefaults).map(([id, def]) => ({
    id,
    label: def.displayName,
    category: def.category,
  }))

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      setError('Please upload a PDF or image file')
      setStep('error')
      return
    }
    
    setStep('processing')
    setError(null)
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      
      if (file.type.includes('pdf')) {
        const result = await extractZonesFromPDF(arrayBuffer, (current, total) => {
          setProgress({ current, total })
        })
        setExtractedZones(result.zones)
        setSelectedZones(new Set(result.zones.map((_, i) => i)))
      } else {
        // Handle image directly
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        const { extractZonesFromImage } = await import('../../lib/xai')
        const result = await extractZonesFromImage(base64, file.type)
        setExtractedZones(result.zones)
        setSelectedZones(new Set(result.zones.map((_, i) => i)))
      }
      
      setStep('review')
    } catch (err) {
      console.error('PDF extraction error:', err)
      setError(err instanceof Error ? err.message : 'Failed to extract zones from PDF')
      setStep('error')
    }
  }
  
  const handleZoneTypeChange = (index: number, newType: string) => {
    setExtractedZones(zones => 
      zones.map((z, i) => i === index ? { ...z, suggestedZoneType: newType } : z)
    )
  }
  
  const handleSFChange = (index: number, newSF: number) => {
    setExtractedZones(zones => 
      zones.map((z, i) => i === index ? { ...z, sf: newSF } : z)
    )
  }
  
  const handleNameChange = (index: number, newName: string) => {
    setExtractedZones(zones => 
      zones.map((z, i) => i === index ? { ...z, name: newName } : z)
    )
  }
  
  const toggleZoneSelection = (index: number) => {
    setSelectedZones(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }
  
  const selectAll = () => {
    setSelectedZones(new Set(extractedZones.map((_, i) => i)))
  }
  
  const selectNone = () => {
    setSelectedZones(new Set())
  }
  
  const handleImport = () => {
    extractedZones.forEach((zone, index) => {
      if (selectedZones.has(index)) {
        addZone(zone.suggestedZoneType as ZoneType, zone.name, zone.sf)
      }
    })
    handleClose()
  }
  
  const handleClose = () => {
    setStep('upload')
    setExtractedZones([])
    setSelectedZones(new Set())
    setError(null)
    setProgress({ current: 0, total: 0 })
    onClose()
  }
  
  const totalSelectedSF = extractedZones
    .filter((_, i) => selectedZones.has(i))
    .reduce((sum, z) => sum + z.sf, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Import Zones from PDF</h2>
            <p className="text-sm text-surface-400 mt-1">
              Upload a floor plan or area schedule to automatically extract zones
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12">
              {!isXAIConfigured() ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">AI Not Configured</h3>
                  <p className="text-surface-400 max-w-md">
                    Add VITE_XAI_API_KEY to your environment variables to enable AI-powered PDF extraction.
                  </p>
                </div>
              ) : (
                <>
                  <div 
                    className="w-full max-w-md border-2 border-dashed border-surface-600 rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Upload Floor Plan</h3>
                    <p className="text-surface-400 text-sm mb-4">
                      PDF or image of floor plans, area schedules, or zone lists
                    </p>
                    <span className="inline-block px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors">
                      Choose File
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="mt-4 text-xs text-surface-500">
                    Powered by Grok Vision AI • Supports PDFs and images
                  </p>
                </>
              )}
            </div>
          )}
          
          {/* Processing Step */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 mb-6 relative">
                <div className="absolute inset-0 border-4 border-surface-600 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Analyzing Document</h3>
              <p className="text-surface-400 text-sm">
                {progress.total > 0 
                  ? `Processing page ${progress.current} of ${progress.total}...`
                  : 'Extracting zones and areas...'}
              </p>
            </div>
          )}
          
          {/* Review Step */}
          {step === 'review' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-surface-400">
                  Found <span className="text-white font-medium">{extractedZones.length}</span> zones • 
                  Selected <span className="text-white font-medium">{selectedZones.size}</span> • 
                  Total <span className="text-primary-400 font-medium">{totalSelectedSF.toLocaleString()} SF</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-primary-400 hover:text-primary-300">
                    Select All
                  </button>
                  <span className="text-surface-600">|</span>
                  <button onClick={selectNone} className="text-xs text-surface-400 hover:text-surface-300">
                    Select None
                  </button>
                </div>
              </div>
              
              <div className="border border-surface-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface-700/50">
                    <tr>
                      <th className="w-10 px-3 py-2"></th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-surface-400 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-surface-400 uppercase">Zone Type</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-surface-400 uppercase">SF</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-surface-400 uppercase">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700">
                    {extractedZones.map((zone, index) => (
                      <tr 
                        key={index} 
                        className={`${selectedZones.has(index) ? 'bg-primary-500/5' : 'bg-surface-800'} hover:bg-surface-700/50`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedZones.has(index)}
                            onChange={() => toggleZoneSelection(index)}
                            className="w-4 h-4 rounded border-surface-600 bg-surface-700 text-primary-500 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={zone.name}
                            onChange={(e) => handleNameChange(index, e.target.value)}
                            className="w-full bg-transparent border-0 text-white text-sm focus:ring-0 p-0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={zone.suggestedZoneType}
                            onChange={(e) => handleZoneTypeChange(index, e.target.value)}
                            className="w-full bg-surface-700 border-0 text-white text-sm rounded px-2 py-1 focus:ring-1 focus:ring-primary-500"
                          >
                            {zoneTypeOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={zone.sf}
                            onChange={(e) => handleSFChange(index, parseInt(e.target.value) || 0)}
                            className="w-20 bg-surface-700 border-0 text-white text-sm rounded px-2 py-1 text-right focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            zone.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-400' :
                            zone.confidence === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            {zone.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {extractedZones.length === 0 && (
                <div className="text-center py-8 text-surface-400">
                  No zones were extracted. Try uploading a clearer image or a different page.
                </div>
              )}
            </div>
          )}
          
          {/* Error Step */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Extraction Failed</h3>
              <p className="text-surface-400 text-sm text-center max-w-md mb-4">
                {error || 'An unknown error occurred'}
              </p>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {step === 'review' && extractedZones.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-surface-700">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
            >
              Upload Different File
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedZones.size === 0}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-600 disabled:text-surface-400 text-white rounded-lg font-medium transition-colors"
              >
                Import {selectedZones.size} Zone{selectedZones.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
