import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import { useAuthStore } from '../../store/useAuthStore'
import { useScannerStore, ExtractedSpace, ScanDrawing } from '../../store/useScannerStore'
import { analyzeDrawing, calculateScale, detectSpaceBoundaries, type DetectedRegion } from '../../lib/planAnalyzer'
import { v4 as uuidv4 } from 'uuid'
import ExportModal from './ExportModal'
import { NYC_FIXTURE_DATABASE, getFixtureById } from '../../data/nycFixtures'

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
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null)
  const [renderingPdf, setRenderingPdf] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState('')
  const [detectingBoundaries, setDetectingBoundaries] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [calibrationDistance, setCalibrationDistance] = useState<string>('')
  const [showCalibrationInput, setShowCalibrationInput] = useState(false)
  const [showScaleModal, setShowScaleModal] = useState(false)
  const [selectedScale, setSelectedScale] = useState<string>('')
  const [customScale, setCustomScale] = useState<string>('')
  
  // Drawing mode for space boundaries
  const [drawingMode, setDrawingMode] = useState<'none' | 'drawing' | 'editing'>('none')
  // Store regions as PERCENTAGES (0-100) so they scale with image display
  const [drawnRegions, setDrawnRegions] = useState<Array<{
    id: string
    xPercent: number  // Left edge as % of image width
    yPercent: number  // Top edge as % of image height
    widthPercent: number
    heightPercent: number
    name: string
    analyzed: boolean
  }>>([])
  const [currentDrawing, setCurrentDrawing] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  const [imageBounds, setImageBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [showRegionNameModal, setShowRegionNameModal] = useState(false)
  const [newRegionName, setNewRegionName] = useState('')
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  
  // Track displayed image bounds for coordinate conversion
  const updateImageBounds = useCallback(() => {
    if (imageRef.current && imageContainerRef.current) {
      const imgRect = imageRef.current.getBoundingClientRect()
      const containerRect = imageContainerRef.current.getBoundingClientRect()
      
      // Calculate image position relative to container
      setImageBounds({
        left: imgRect.left - containerRect.left,
        top: imgRect.top - containerRect.top,
        width: imgRect.width,
        height: imgRect.height,
      })
    }
  }, [])
  
  // Update bounds when image loads or window resizes
  useEffect(() => {
    updateImageBounds()
    window.addEventListener('resize', updateImageBounds)
    return () => window.removeEventListener('resize', updateImageBounds)
  }, [updateImageBounds, renderedImageUrl])
  
  // Helper function to render PDF page to image for AI analysis
  // Uses 3x scale for better text recognition (same as Concept MEP)
  const renderPdfPageToImage = async (pdfDataUrl: string): Promise<{ base64: string; mime: string }> => {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
    
    // Extract base64 from data URL
    const base64Match = pdfDataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) throw new Error('Invalid PDF data URL')
    
    const pdfBase64 = base64Match[2]
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
    
    const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise
    const page = await pdf.getPage(1) // Analyze first page
    
    // Render at 3x scale for better quality (helps read smaller text in tables)
    // This matches the Concept MEP PDF import resolution
    const scale = 3.0
    const viewport = page.getViewport({ scale })
    
    console.log(`📄 Rendering PDF at ${scale}x scale: ${viewport.width}x${viewport.height}px`)
    
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise
    
    // Convert to PNG for better quality (Claude handles it well)
    const dataUrl = canvas.toDataURL('image/png')
    const imgBase64 = dataUrl.split(',')[1]
    
    console.log(`📸 Image converted: ${Math.round(imgBase64.length / 1024)}KB`)
    
    return { base64: imgBase64, mime: 'image/png' }
  }

  // Standard architectural scales (Imperial)
  // At 96 DPI, we calculate pixels per foot based on the scale
  // e.g., 1/8" = 1'-0" means 1/8 inch on paper = 1 foot real
  // So 1 foot real = 8 inches on paper = 8 * 96 = 768 pixels
  const STANDARD_SCALES = [
    { label: '1" = 1\'-0"', pixelsPerFoot: 96 },      // Full scale
    { label: '1/2" = 1\'-0"', pixelsPerFoot: 48 },
    { label: '1/4" = 1\'-0"', pixelsPerFoot: 24 },
    { label: '3/16" = 1\'-0"', pixelsPerFoot: 18 },
    { label: '1/8" = 1\'-0"', pixelsPerFoot: 12 },    // Most common
    { label: '3/32" = 1\'-0"', pixelsPerFoot: 9 },
    { label: '1/16" = 1\'-0"', pixelsPerFoot: 6 },
    { label: '1/32" = 1\'-0"', pixelsPerFoot: 3 },
    { label: '1" = 10\'-0"', pixelsPerFoot: 9.6 },
    { label: '1" = 20\'-0"', pixelsPerFoot: 4.8 },
    { label: '1" = 30\'-0"', pixelsPerFoot: 3.2 },
    { label: '1" = 40\'-0"', pixelsPerFoot: 2.4 },
    { label: '1" = 50\'-0"', pixelsPerFoot: 1.92 },
    { label: '1" = 100\'-0"', pixelsPerFoot: 0.96 },
  ]

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

  // Convert PDF to image when selected (must be after selectedDrawing is defined)
  useEffect(() => {
    const renderPdfToImage = async () => {
      if (!selectedDrawing) {
        setRenderedImageUrl(null)
        return
      }
      
      // If it's already an image, use it directly
      if (selectedDrawing.fileType !== 'application/pdf') {
        setRenderedImageUrl(selectedDrawing.fileUrl)
        return
      }
      
      // Render PDF to image
      setRenderingPdf(true)
      try {
        const { base64, mime } = await renderPdfPageToImage(selectedDrawing.fileUrl)
        setRenderedImageUrl(`data:${mime};base64,${base64}`)
      } catch (err) {
        console.error('Failed to render PDF:', err)
        setRenderedImageUrl(null)
      }
      setRenderingPdf(false)
    }
    
    renderPdfToImage()
  }, [selectedDrawing?.id, selectedDrawing?.fileUrl, selectedDrawing?.fileType])

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
      let imageData: string
      let mimeType = 'image/png'
      
      // Check if this is a PDF - need to render to image first
      if (selectedDrawing.fileType === 'application/pdf') {
        setAnalysisProgress('Converting PDF page to image...')
        const { base64, mime } = await renderPdfPageToImage(selectedDrawing.fileUrl)
        imageData = base64
        mimeType = mime
        console.log(`PDF converted to image: ${Math.round(imageData.length / 1024)}KB`)
      } else {
        // Regular image - extract base64
        const base64Match = selectedDrawing.fileUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (base64Match) {
          mimeType = base64Match[1]
          imageData = base64Match[2]
        } else {
          imageData = selectedDrawing.fileUrl
        }
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

  // Drawing mode handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode !== 'drawing' || !imageContainerRef.current || !imageBounds) return
    
    const containerRect = imageContainerRef.current.getBoundingClientRect()
    const x = e.clientX - containerRect.left - imageBounds.left
    const y = e.clientY - containerRect.top - imageBounds.top
    
    // Only start drawing if click is within image bounds
    if (x >= 0 && y >= 0 && x <= imageBounds.width && y <= imageBounds.height) {
      setCurrentDrawing({ startX: x, startY: y, endX: x, endY: y })
    }
  }, [drawingMode, imageBounds])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentDrawing || !imageContainerRef.current || !imageBounds) return
    
    const containerRect = imageContainerRef.current.getBoundingClientRect()
    let x = e.clientX - containerRect.left - imageBounds.left
    let y = e.clientY - containerRect.top - imageBounds.top
    
    // Clamp to image bounds
    x = Math.max(0, Math.min(x, imageBounds.width))
    y = Math.max(0, Math.min(y, imageBounds.height))
    
    setCurrentDrawing(prev => prev ? { ...prev, endX: x, endY: y } : null)
  }, [currentDrawing, imageBounds])

  const handleCanvasMouseUp = useCallback(() => {
    if (!currentDrawing || !imageBounds) return
    
    const width = Math.abs(currentDrawing.endX - currentDrawing.startX)
    const height = Math.abs(currentDrawing.endY - currentDrawing.startY)
    
    // Only create region if it's big enough (min 20px on screen)
    if (width > 20 && height > 20) {
      // Convert pixel coordinates to percentages
      const xPx = Math.min(currentDrawing.startX, currentDrawing.endX)
      const yPx = Math.min(currentDrawing.startY, currentDrawing.endY)
      
      const newRegion = {
        id: uuidv4(),
        xPercent: (xPx / imageBounds.width) * 100,
        yPercent: (yPx / imageBounds.height) * 100,
        widthPercent: (width / imageBounds.width) * 100,
        heightPercent: (height / imageBounds.height) * 100,
        name: `Space ${drawnRegions.length + 1}`,
        analyzed: false,
      }
      setDrawnRegions(prev => [...prev, newRegion])
      setSelectedRegionId(newRegion.id)
      setNewRegionName(newRegion.name)
      setShowRegionNameModal(true)
    }
    
    setCurrentDrawing(null)
  }, [currentDrawing, drawnRegions.length, imageBounds])

  const handleDeleteRegion = (regionId: string) => {
    setDrawnRegions(prev => prev.filter(r => r.id !== regionId))
    if (selectedRegionId === regionId) setSelectedRegionId(null)
  }

  const handleRenameRegion = () => {
    if (selectedRegionId && newRegionName) {
      setDrawnRegions(prev => prev.map(r => 
        r.id === selectedRegionId ? { ...r, name: newRegionName } : r
      ))
    }
    setShowRegionNameModal(false)
  }

  const handleAddRegionAsSpace = (region: typeof drawnRegions[0]) => {
    if (!currentScan) return
    
    const newSpace: ExtractedSpace = {
      id: uuidv4(),
      name: region.name,
      sf: 0,
      fixtures: {},
      equipment: [],
      confidence: 100, // Manual entry
      // Store as percentages for consistent display at any scale
      boundingBox: {
        xPercent: region.xPercent,
        yPercent: region.yPercent,
        widthPercent: region.widthPercent,
        heightPercent: region.heightPercent,
      },
    }
    
    setExtractedSpaces(currentScan.id, [...currentScan.extractedSpaces, newSpace])
    setDrawnRegions(prev => prev.map(r => 
      r.id === region.id ? { ...r, analyzed: true } : r
    ))
    
    // Switch to spaces tab to edit
    setActiveTab('spaces')
    setSelectedSpaceId(newSpace.id)
  }

  const handleAnalyzeAllDrawings = async () => {
    // Original full-page analysis
    handleAnalyze()
  }

  // AI Auto-Detect Boundaries
  const handleAIAutoDetect = async () => {
    if (!currentScan || !selectedDrawing || !renderedImageUrl || !imageRef.current) return
    
    setDetectingBoundaries(true)
    setAnalysisProgress('AI is detecting room boundaries... 🔲🐐')
    
    try {
      // Get image dimensions
      const imageWidth = imageRef.current.naturalWidth || imageRef.current.width
      const imageHeight = imageRef.current.naturalHeight || imageRef.current.height
      
      console.log(`Image dimensions: ${imageWidth} x ${imageHeight}`)
      
      // Get the base64 image data
      let imageData: string
      let mimeType = 'image/png'
      
      if (selectedDrawing.fileType === 'application/pdf') {
        // Use the rendered image URL
        const { base64, mime } = await renderPdfPageToImage(selectedDrawing.fileUrl)
        imageData = base64
        mimeType = mime
      } else {
        const base64Match = renderedImageUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (base64Match) {
          mimeType = base64Match[1]
          imageData = base64Match[2]
        } else {
          imageData = renderedImageUrl
        }
      }
      
      setAnalysisProgress('AI analyzing space boundaries...')
      
      // Call the AI to detect boundaries (returns percentages)
      const result = await detectSpaceBoundaries(imageData, mimeType, imageWidth, imageHeight)
      
      setAnalysisProgress(`Found ${result.regions.length} spaces! Adding to canvas...`)
      
      // Add detected regions to the drawn regions (keep as percentages)
      const newRegions = result.regions.map((region: DetectedRegion) => ({
        id: region.id,
        // Store as percentages - the region already has pixel values, convert back to %
        xPercent: (region.x / imageWidth) * 100,
        yPercent: (region.y / imageHeight) * 100,
        widthPercent: (region.width / imageWidth) * 100,
        heightPercent: (region.height / imageHeight) * 100,
        name: region.name,
        analyzed: false,
      }))
      
      setDrawnRegions(prev => [...prev, ...newRegions])
      
      // Enable drawing mode to show the regions
      setDrawingMode('drawing')
      
      setAnalysisProgress('')
    } catch (error) {
      console.error('AI auto-detect failed:', error)
      setAnalysisProgress('')
      alert(`AI detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    setDetectingBoundaries(false)
  }

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

  const handleApplyStandardScale = (pixelsPerFoot: number, label: string) => {
    if (!currentScan) return
    setScale(currentScan.id, pixelsPerFoot, undefined)
    updateScan(currentScan.id, { status: 'calibrating' })
    setShowScaleModal(false)
    setSelectedScale(label)
  }

  const handleApplyCustomScale = () => {
    if (!currentScan || !customScale) return
    
    // Parse custom scale like "1/8" = 1'-0"" or "1:100"
    const parsed = parseCustomScale(customScale)
    if (!parsed) {
      alert('Invalid scale format. Use formats like:\n• 1/8" = 1\'-0"\n• 1" = 10\'-0"\n• 1:100')
      return
    }
    
    setScale(currentScan.id, parsed.pixelsPerFoot, undefined)
    updateScan(currentScan.id, { status: 'calibrating' })
    setShowScaleModal(false)
    setSelectedScale(customScale)
  }

  // Parse custom scale strings
  const parseCustomScale = (input: string): { pixelsPerFoot: number } | null => {
    const cleaned = input.trim()
    
    // Format: X" = Y'-Z" where X is decimal (e.g., ".4225" = 10'-0"" or "0.5" = 1'-0"")
    const decimalMatch = cleaned.match(/^\.?(\d*\.?\d+)"?\s*=\s*(\d+)'(?:-?(\d+)"?)?$/i)
    if (decimalMatch) {
      const inches = parseFloat(decimalMatch[1].startsWith('.') ? '0' + decimalMatch[1] : decimalMatch[1])
      const feet = parseInt(decimalMatch[2])
      const extraInches = decimalMatch[3] ? parseInt(decimalMatch[3]) / 12 : 0
      const totalFeet = feet + extraInches
      // X inches on paper = totalFeet real
      // So 1 foot real = (inches / totalFeet) inches on paper
      // At 96 DPI: 1 foot = (inches / totalFeet) * 96 pixels
      const pixelsPerFoot = (inches / totalFeet) * 96
      console.log(`Parsed scale: ${inches}" = ${totalFeet}' → ${pixelsPerFoot.toFixed(2)} px/ft`)
      return { pixelsPerFoot }
    }
    
    // Format: 1/X" = 1'-0" (e.g., "1/8" = 1'-0"")
    const fractionMatch = cleaned.match(/(\d+)\/(\d+)"?\s*=\s*1'/i)
    if (fractionMatch) {
      const num = parseInt(fractionMatch[1])
      const denom = parseInt(fractionMatch[2])
      // At 96 DPI: fraction inch = 1 foot, so 1 foot = (num/denom) * 96 pixels
      return { pixelsPerFoot: (num / denom) * 96 }
    }
    
    // Format: 1" = X'-0" (e.g., "1" = 10'-0"")
    const inchToFeetMatch = cleaned.match(/1"?\s*=\s*(\d+)'/i)
    if (inchToFeetMatch) {
      const feet = parseInt(inchToFeetMatch[1])
      // 1 inch on paper = X feet real, so 1 foot = 96/X pixels
      return { pixelsPerFoot: 96 / feet }
    }
    
    // Format: 1:X (metric style, e.g., "1:100")
    const ratioMatch = cleaned.match(/1\s*:\s*(\d+)/i)
    if (ratioMatch) {
      const ratio = parseInt(ratioMatch[1])
      // Assuming 96 DPI and ratio is in same units
      // 1:100 means 1 unit = 100 units, so scale down by 100
      return { pixelsPerFoot: 96 / (ratio / 12) } // Convert to feet
    }
    
    return null
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
                <div className="flex items-center gap-2">
                  {/* AI Auto-Detect Button */}
                  <button
                    onClick={handleAIAutoDetect}
                    disabled={detectingBoundaries || !renderedImageUrl}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      detectingBoundaries
                        ? 'bg-amber-600 text-white animate-pulse'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {detectingBoundaries ? (
                      <>🤖 Detecting...</>
                    ) : (
                      <>🤖 AI Auto-Detect</>
                    )}
                  </button>
                  
                  {/* Drawing Mode Toggle */}
                  <button
                    onClick={() => {
                      setDrawingMode(drawingMode === 'drawing' ? 'none' : 'drawing')
                      setCalibrationMode(false)
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      drawingMode === 'drawing'
                        ? 'bg-violet-600 text-white'
                        : 'bg-surface-700 text-surface-300 hover:text-white hover:bg-surface-600'
                    }`}
                  >
                    ✏️ {drawingMode === 'drawing' ? 'Drawing...' : 'Draw Spaces'}
                  </button>
                  
                  <button
                    onClick={() => setShowScaleModal(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-surface-700 text-surface-300 hover:text-white hover:bg-surface-600"
                  >
                    📏 Scale
                  </button>
                  
                  {drawnRegions.length > 0 && (
                    <span className="text-sm text-violet-400 font-medium ml-2">
                      {drawnRegions.length} region{drawnRegions.length !== 1 ? 's' : ''} drawn
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {drawnRegions.length > 0 && (
                    <button
                      onClick={() => {
                        drawnRegions.forEach(region => {
                          if (!region.analyzed) handleAddRegionAsSpace(region)
                        })
                      }}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      ➕ Add All as Spaces
                    </button>
                  )}
                  
                  <button
                    onClick={handleAnalyzeAllDrawings}
                    disabled={analyzing || !selectedDrawing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {analyzing ? (
                      <>
                        <span className="animate-spin">🔄</span>
                        {analysisProgress || 'Analyzing...'}
                      </>
                    ) : (
                      <>🤖 Auto-Detect All</>
                    )}
                  </button>
                </div>
              </div>

              {/* Scale Settings Modal */}
              {showScaleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        📏 Drawing Scale
                      </h3>
                      <button 
                        onClick={() => setShowScaleModal(false)}
                        className="text-surface-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* Standard Scales */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-surface-300 mb-3">Standard Architectural Scales</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {STANDARD_SCALES.map((scale) => (
                          <button
                            key={scale.label}
                            onClick={() => handleApplyStandardScale(scale.pixelsPerFoot, scale.label)}
                            className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                              selectedScale === scale.label
                                ? 'bg-violet-600 text-white'
                                : 'bg-surface-700 text-surface-300 hover:bg-surface-600 hover:text-white'
                            }`}
                          >
                            {scale.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Custom Scale */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-surface-300 mb-3">Custom Scale</h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customScale}
                          onChange={(e) => setCustomScale(e.target.value)}
                          placeholder='.4225" = 10ft'
                          className="flex-1 px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-violet-500 focus:outline-none text-sm"
                        />
                        <button
                          onClick={handleApplyCustomScale}
                          disabled={!customScale}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                      <p className="text-xs text-surface-500 mt-2">
                        {".4225\" = 10'-0\" • 1/8\" = 1'-0\" • 1\" = 20'-0\" • 1:100"}
                      </p>
                    </div>
                    
                    {/* Two-Point Calibration */}
                    {selectedDrawing && (
                      <div className="border-t border-surface-700 pt-6">
                        <h4 className="text-sm font-semibold text-surface-300 mb-3">Two-Point Calibration</h4>
                        <p className="text-xs text-surface-400 mb-3">
                          Click two points on a known dimension in the drawing
                        </p>
                        <button
                          onClick={() => {
                            setShowScaleModal(false)
                            setCalibrationMode(true)
                            clearCalibrationPoints()
                          }}
                          className="w-full px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg text-sm transition-colors"
                        >
                          Start Two-Point Calibration
                        </button>
                      </div>
                    )}
                    
                    {/* Current Scale Info */}
                    {currentScan.scale && (
                      <div className="border-t border-surface-700 pt-4 mt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-surface-400">Current scale:</span>
                          <span className="text-emerald-400 font-medium">
                            {selectedScale || `${currentScan.scale.pixelsPerFoot.toFixed(2)} px/ft`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Region Name Modal */}
              {showRegionNameModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-surface-800 border border-surface-600 rounded-xl p-6 shadow-2xl max-w-sm w-full">
                    <h3 className="text-lg font-bold text-white mb-4">Name This Space</h3>
                    <input
                      type="text"
                      value={newRegionName}
                      onChange={(e) => setNewRegionName(e.target.value)}
                      placeholder="e.g., Men's Locker Room"
                      className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-violet-500 focus:outline-none mb-4"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameRegion()}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowRegionNameModal(false)
                          // Delete the region if they cancel
                          if (selectedRegionId) handleDeleteRegion(selectedRegionId)
                        }}
                        className="flex-1 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRenameRegion}
                        className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Calibration Distance Input (for two-point) */}
              {showCalibrationInput && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-surface-800 border border-violet-500 rounded-xl p-6 shadow-2xl max-w-sm w-full">
                    <h3 className="text-lg font-bold text-white mb-4">Enter Distance</h3>
                    <p className="text-sm text-surface-400 mb-4">
                      What is the real-world distance between the two points you clicked?
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="number"
                        value={calibrationDistance}
                        onChange={(e) => setCalibrationDistance(e.target.value)}
                        placeholder="10"
                        className="flex-1 px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
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
                </div>
              )}

              {/* Image/PDF Display - All rendered as images for drawing support */}
              <div className="flex-1 overflow-hidden relative">
                {selectedDrawing ? (
                  renderingPdf ? (
                    // Loading PDF render
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="text-5xl mb-4 animate-bounce">📄</div>
                        <p className="text-surface-400">Rendering PDF for editing...</p>
                        <p className="text-sm text-surface-500">{selectedDrawing.fileName}</p>
                      </div>
                    </div>
                  ) : (
                  <div 
                    ref={canvasContainerRef}
                    className={`h-full overflow-auto p-6 bg-surface-900/50 ${drawingMode === 'drawing' ? 'cursor-crosshair' : ''}`}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={() => setCurrentDrawing(null)}
                  >
                    <div ref={imageContainerRef} className="relative inline-block">
                      {renderedImageUrl ? (
                        <img
                          ref={imageRef}
                          src={renderedImageUrl}
                          alt={selectedDrawing.fileName}
                          className={`max-w-full h-auto ${calibrationMode ? 'cursor-crosshair' : ''} ${drawingMode === 'drawing' ? 'pointer-events-none' : ''}`}
                          onClick={handleImageClick}
                          onLoad={updateImageBounds}
                          onError={(e) => {
                            console.error('Image failed to load:', selectedDrawing.fileName)
                            e.currentTarget.style.display = 'none'
                          }}
                          draggable={false}
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
                    
                    {/* Extracted Spaces (from AI analysis) - positioned using percentages */}
                    {imageBounds && currentScan.extractedSpaces.filter(s => s.boundingBox).map(space => (
                      <div
                        key={`extracted-${space.id}`}
                        className={`absolute border-2 ${
                          selectedSpaceId === space.id 
                            ? 'border-emerald-400 bg-emerald-400/20' 
                            : 'border-emerald-500/70 bg-emerald-500/10'
                        } cursor-pointer transition-colors`}
                        style={{
                          left: (space.boundingBox!.xPercent / 100) * imageBounds.width,
                          top: (space.boundingBox!.yPercent / 100) * imageBounds.height,
                          width: (space.boundingBox!.widthPercent / 100) * imageBounds.width,
                          height: (space.boundingBox!.heightPercent / 100) * imageBounds.height,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedSpaceId(space.id)
                        }}
                      >
                        <div className="absolute -top-6 left-0 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap bg-emerald-600 text-white">
                          {space.name} • {space.sf} SF
                        </div>
                      </div>
                    ))}
                    
                    {/* Drawn Regions (user-drawn) - positioned using percentages */}
                    {imageBounds && drawnRegions.map(region => (
                      <div
                        key={region.id}
                        className={`absolute border-2 ${
                          selectedRegionId === region.id 
                            ? 'border-violet-500 bg-violet-500/20' 
                            : region.analyzed 
                              ? 'border-emerald-500 bg-emerald-500/10' 
                              : 'border-cyan-500 bg-cyan-500/10'
                        } cursor-pointer transition-colors`}
                        style={{
                          left: (region.xPercent / 100) * imageBounds.width,
                          top: (region.yPercent / 100) * imageBounds.height,
                          width: (region.widthPercent / 100) * imageBounds.width,
                          height: (region.heightPercent / 100) * imageBounds.height,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedRegionId(region.id)
                        }}
                      >
                        {/* Region Label */}
                        <div className={`absolute -top-7 left-0 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                          region.analyzed ? 'bg-emerald-600 text-white' : 'bg-cyan-600 text-white'
                        }`}>
                          {region.name}
                          {region.analyzed && ' ✓'}
                        </div>
                        
                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteRegion(region.id)
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-400 text-white rounded-full text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                        
                        {/* Add as Space Button (if not analyzed) */}
                        {!region.analyzed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddRegionAsSpace(region)
                            }}
                            className="absolute bottom-1 right-1 px-2 py-0.5 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    ))}
                    
                    {/* Current Drawing Preview - uses screen pixels during active drawing */}
                    {currentDrawing && imageBounds && (
                      <div
                        className="absolute border-2 border-dashed border-violet-400 bg-violet-400/20 pointer-events-none"
                        style={{
                          left: Math.min(currentDrawing.startX, currentDrawing.endX),
                          top: Math.min(currentDrawing.startY, currentDrawing.endY),
                          width: Math.abs(currentDrawing.endX - currentDrawing.startX),
                          height: Math.abs(currentDrawing.endY - currentDrawing.startY),
                        }}
                      />
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
                
                {/* Drawing Mode Instructions */}
                {drawingMode === 'drawing' && !currentDrawing && (
                  <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-cyan-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
                    <span>✏️</span> Click and drag to draw a space boundary
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
  const [showAddFixture, setShowAddFixture] = useState(false)
  const [fixtureSearch, setFixtureSearch] = useState('')

  // Get displayed fixtures (those with count > 0)
  const displayedFixtures = useMemo(() => {
    const fixtures: Array<{ id: string; name: string; icon: string; count: number; wsfu: number; dfu: number }> = []
    
    Object.entries(space.fixtures).forEach(([id, count]) => {
      if (count > 0) {
        const def = getFixtureById(id)
        if (def) {
          fixtures.push({
            id,
            name: def.name,
            icon: def.icon,
            count,
            wsfu: def.wsfuTotal,
            dfu: def.dfu
          })
        } else {
          // Legacy fixture - show with basic info
          fixtures.push({
            id,
            name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            icon: '🔧',
            count,
            wsfu: 0,
            dfu: 0
          })
        }
      }
    })
    
    return fixtures
  }, [space.fixtures])

  // Filter available fixtures for the add modal
  const availableFixtures = useMemo(() => {
    const search = fixtureSearch.toLowerCase()
    return NYC_FIXTURE_DATABASE.filter(f => 
      f.name.toLowerCase().includes(search) ||
      f.category.toLowerCase().includes(search)
    ).slice(0, 20) // Limit to 20 results
  }, [fixtureSearch])

  const handleAddFixture = (fixtureId: string, count: number = 1) => {
    onUpdate({ 
      fixtures: { ...space.fixtures, [fixtureId]: (space.fixtures[fixtureId] || 0) + count }
    })
  }

  const handleRemoveFixture = (fixtureId: string) => {
    const newFixtures = { ...space.fixtures }
    delete newFixtures[fixtureId]
    onUpdate({ fixtures: newFixtures })
  }

  const handleUpdateFixtureCount = (fixtureId: string, count: number) => {
    if (count > 0) {
      onUpdate({ fixtures: { ...space.fixtures, [fixtureId]: count } })
    } else {
      handleRemoveFixture(fixtureId)
    }
  }

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
              <option value="locker_room">Locker Room</option>
              <option value="restroom">Restroom</option>
              <option value="shower_room">Shower Room</option>
              <option value="pool_indoor">Pool (Indoor)</option>
              <option value="hot_tub">Hot Tub / Spa</option>
              <option value="sauna_electric">Sauna</option>
              <option value="steam_room">Steam Room</option>
              <option value="open_gym">Gym / Fitness</option>
              <option value="yoga_studio">Yoga Studio</option>
              <option value="massage_room">Massage / Treatment</option>
              <option value="office">Office</option>
              <option value="conference_room">Conference Room</option>
              <option value="break_room">Break Room</option>
              <option value="cafe_light_fb">Café / F&B</option>
              <option value="kitchen_commercial">Kitchen</option>
              <option value="laundry_commercial">Laundry</option>
              <option value="mechanical_room">Mechanical Room</option>
              <option value="storage">Storage</option>
              <option value="terrace">Terrace / Outdoor</option>
              <option value="custom">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Fixtures - Dynamic UI */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">🚿 Fixtures</h3>
          <button
            onClick={() => setShowAddFixture(true)}
            className="px-3 py-1.5 text-sm bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <span>+</span> Add Fixture
          </button>
        </div>
        
        {displayedFixtures.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {displayedFixtures.map(fixture => (
              <div key={fixture.id} className="flex items-center gap-3 bg-surface-700/50 rounded-lg p-3">
                <span className="text-xl">{fixture.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{fixture.name}</div>
                  <div className="text-xs text-surface-500">
                    WSFU: {fixture.wsfu} | DFU: {fixture.dfu}
                  </div>
                </div>
                <input
                  type="number"
                  value={fixture.count}
                  onChange={(e) => handleUpdateFixtureCount(fixture.id, parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-16 px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-white text-sm text-center"
                />
                <button
                  onClick={() => handleRemoveFixture(fixture.id)}
                  className="p-1.5 hover:bg-surface-600 rounded text-surface-500 hover:text-red-400 transition-colors"
                  title="Remove fixture"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-surface-500">
            <div className="text-3xl mb-2">🚿</div>
            <p className="text-sm">No fixtures added yet</p>
            <button
              onClick={() => setShowAddFixture(true)}
              className="mt-2 text-violet-400 hover:text-violet-300 text-sm underline"
            >
              Add fixtures from NYC Plumbing Code
            </button>
          </div>
        )}

        {/* Add Fixture Modal */}
        {showAddFixture && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Add Fixture</h3>
                <button 
                  onClick={() => {
                    setShowAddFixture(false)
                    setFixtureSearch('')
                  }}
                  className="text-surface-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              {/* Search */}
              <input
                type="text"
                value={fixtureSearch}
                onChange={(e) => setFixtureSearch(e.target.value)}
                placeholder="Search fixtures..."
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-violet-500 focus:outline-none mb-4"
                autoFocus
              />
              
              {/* Fixture List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {availableFixtures.map(fixture => (
                  <button
                    key={fixture.id}
                    onClick={() => {
                      handleAddFixture(fixture.id, 1)
                      setShowAddFixture(false)
                      setFixtureSearch('')
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-surface-700/50 hover:bg-surface-700 rounded-lg text-left transition-colors"
                  >
                    <span className="text-xl">{fixture.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm text-white font-medium">{fixture.name}</div>
                      <div className="text-xs text-surface-500">
                        {fixture.category} • WSFU: {fixture.wsfuTotal} | DFU: {fixture.dfu}
                      </div>
                    </div>
                    <span className="text-violet-400 text-sm">+ Add</span>
                  </button>
                ))}
                {availableFixtures.length === 0 && (
                  <div className="text-center py-8 text-surface-500">
                    <p>No fixtures found</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
