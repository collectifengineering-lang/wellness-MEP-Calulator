import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Logo } from '../shared/Logo'
import UserMenu from '../auth/UserMenu'
import { useAuthStore } from '../../store/useAuthStore'
import { useScannerStore, ExtractedSpace, ScanDrawing } from '../../store/useScannerStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { analyzeDrawing, calculateScale, detectSpaceBoundaries, formatFloorPrefix, readTagFromRegion, detectFloorLevel, type DetectedRegion } from '../../lib/planAnalyzer'
import { extractZonesFromPDF, type ExtractedZone } from '../../lib/xai'
import { v4 as uuidv4 } from 'uuid'
import ExportModal from './ExportModal'
import { NYC_FIXTURE_DATABASE, getFixtureById } from '../../data/nycFixtures'

type TabType = 'drawings' | 'spaces' | 'export'

export default function ScanWorkspace() {
  const { scanId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    currentScan, scans, setCurrentScan, updateScan, addDrawing, removeDrawing, updateDrawing,
    setExtractedSpaces, updateExtractedSpace, deleteExtractedSpace,
    calibrationMode, setCalibrationMode, calibrationPoints, addCalibrationPoint, 
    clearCalibrationPoints, setScale, selectedSpaceId, setSelectedSpaceId,
    legends, confirmDrawingSpaces
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
  
  // For MEP-style full PDF extraction
  const [extractingAllPages, setExtractingAllPages] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0 })
  const [pendingPdfData, setPendingPdfData] = useState<ArrayBuffer | null>(null)
  const [showExtractionPrompt, setShowExtractionPrompt] = useState(false)
  const [uploadedPdfPageCount, setUploadedPdfPageCount] = useState(0)
  
  // Drawing mode for space boundaries
  const [drawingMode, setDrawingMode] = useState<'none' | 'rectangle' | 'polygon' | 'tagReader'>('none')
  
  // Tag Reader mode state
  const [tagBoxSize, setTagBoxSize] = useState({ width: 150, height: 80 }) // Default tag box size in pixels (at display scale)
  const [showTagModal, setShowTagModal] = useState(false)
  const [tagModalData, setTagModalData] = useState<{
    croppedImageUrl: string
    clickX: number  // percentage
    clickY: number  // percentage
    aiResult: { roomName: string | null; roomNumber: string | null; squareFeet: number | null; confidence: string } | null
    isLoading: boolean
  } | null>(null)
  const [tagEditName, setTagEditName] = useState('')
  const [tagEditSF, setTagEditSF] = useState('')
  const [tagEditFloor, setTagEditFloor] = useState('')
  const [lastFloorUsed, setLastFloorUsed] = useState('1') // Remember last floor for subsequent tags
  const [detectingFloor, setDetectingFloor] = useState(false)
  
  // Store regions as PERCENTAGES (0-100) so they scale with image display
  // Supports both rectangles and polygons
  const [drawnRegions, setDrawnRegions] = useState<Array<{
    id: string
    type: 'rectangle' | 'polygon'
    // For rectangles
    xPercent?: number
    yPercent?: number
    widthPercent?: number
    heightPercent?: number
    // For polygons - array of {xPercent, yPercent} points
    points?: Array<{ xPercent: number; yPercent: number }>
    name: string
    analyzed: boolean
    // New fields
    userCreated: boolean  // true = manual, false = AI detected
    areaSF?: number       // Calculated area in square feet
    floor?: string        // Floor level prefix
    seatCount?: number    // AI-detected seat count
    confidenceSource?: 'explicit' | 'estimated'  // SF from text label vs geometric calculation
  }>>([])
  
  // Rectangle drawing state
  const [currentDrawing, setCurrentDrawing] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
  
  // Polygon drawing state
  const [currentPolygon, setCurrentPolygon] = useState<Array<{ x: number; y: number }>>([])
  const [polygonPreviewPoint, setPolygonPreviewPoint] = useState<{ x: number; y: number } | null>(null)
  const [imageBounds, setImageBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [showRegionNameModal, setShowRegionNameModal] = useState(false)
  const [newRegionName, setNewRegionName] = useState('')
  const [readingTagRegionId, setReadingTagRegionId] = useState<string | null>(null) // Track which region is being AI-read
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
  const renderPdfPageToImage = async (pdfDataUrl: string, pageNumber: number = 1): Promise<{ base64: string; mime: string }> => {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
    
    // Extract base64 from data URL
    const base64Match = pdfDataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!base64Match) throw new Error('Invalid PDF data URL')
    
    const pdfBase64 = base64Match[2]
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
    
    const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise
    const page = await pdf.getPage(pageNumber) // Get specific page
    
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

  // Auto-detect floor when entering tag reader mode on a new page
  useEffect(() => {
    const detectFloor = async () => {
      // Only detect if in tag reader mode, have a drawing, have an image, and floor not already detected
      if (drawingMode !== 'tagReader' || !selectedDrawing || !renderedImageUrl || selectedDrawing.floor) {
        return
      }
      
      setDetectingFloor(true)
      console.log('[Floor Detect] Auto-detecting floor for page:', selectedDrawing.fileName)
      
      try {
        // Extract base64 data from data URL
        const base64Data = renderedImageUrl.replace(/^data:image\/\w+;base64,/, '')
        const result = await detectFloorLevel(base64Data, 'image/png')
        console.log('[Floor Detect] Result:', result)
        
        // detectFloorLevel returns "Unknown" if not found, so check for valid floor
        if (result.floor && result.floor !== 'Unknown' && result.confidence > 30 && currentScan) {
          // Update the drawing with detected floor
          updateDrawing(currentScan.id, selectedDrawing.id, { floor: result.floor })
          // Also update lastFloorUsed so tags default to this
          setLastFloorUsed(result.floor)
          console.log('[Floor Detect] Set floor to:', result.floor)
        }
      } catch (error) {
        console.error('[Floor Detect] Error:', error)
      } finally {
        setDetectingFloor(false)
      }
    }
    
    detectFloor()
  }, [drawingMode, selectedDrawing?.id, renderedImageUrl, selectedDrawing?.floor, updateDrawing])

  // When switching pages, use that page's detected floor (if any)
  useEffect(() => {
    if (selectedDrawing?.floor) {
      setLastFloorUsed(selectedDrawing.floor)
    }
  }, [selectedDrawing?.id, selectedDrawing?.floor])

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
      
      // Render PDF to image - CRITICAL: pass the pageNumber!
      setRenderingPdf(true)
      try {
        const pageNum = selectedDrawing.pageNumber || 1
        console.log(`📄 Rendering PDF page ${pageNum}...`)
        const { base64, mime } = await renderPdfPageToImage(selectedDrawing.fileUrl, pageNum)
        setRenderedImageUrl(`data:${mime};base64,${base64}`)
      } catch (err) {
        console.error('Failed to render PDF:', err)
        setRenderedImageUrl(null)
      }
      setRenderingPdf(false)
    }
    
    renderPdfToImage()
  }, [selectedDrawing?.id, selectedDrawing?.fileUrl, selectedDrawing?.fileType, selectedDrawing?.pageNumber])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !currentScan) return

    for (const file of files) {
      const base64 = await fileToBase64(file)
      
      // Check if PDF has multiple pages
      if (file.type === 'application/pdf') {
        try {
          const pdfjs = await import('pdfjs-dist')
          pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
          
          const base64Match = base64.match(/^data:([^;]+);base64,(.+)$/)
          if (base64Match) {
            const pdfBase64 = base64Match[2]
            const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
            
            // Store PDF data for "Extract All" feature (same as MEP Concept Design)
            setPendingPdfData(pdfBytes.buffer.slice(0))
            
            const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise
            const pageCount = pdf.numPages
            
            console.log(`📄 PDF has ${pageCount} pages - stored for full extraction`)
            
            // Store page count for extraction prompt
            setUploadedPdfPageCount(pageCount)
            
            if (pageCount > 1) {
              // Multi-page PDF: create a separate drawing for each page
              for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
                const drawing: ScanDrawing = {
                  id: uuidv4(),
                  fileName: `${file.name} (Page ${pageNum})`,
                  fileType: file.type,
                  fileUrl: base64,
                  pageNumber: pageNum,
                }
                addDrawing(currentScan.id, drawing)
                if (pageNum === 1) {
                  setSelectedDrawingId(drawing.id)
                }
              }
              
              // Show extraction prompt after multi-page PDF upload
              setShowExtractionPrompt(true)
              continue // Skip single-page handling below
            } else {
              // Single page PDF - still show extraction prompt
              setShowExtractionPrompt(true)
            }
          }
        } catch (err) {
          console.error('Error checking PDF pages:', err)
        }
      }
      
      // Single page PDF or regular image
      const drawing: ScanDrawing = {
        id: uuidv4(),
        fileName: file.name,
        fileType: file.type,
        fileUrl: base64,
        pageNumber: 1,
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
        const pageNum = selectedDrawing.pageNumber || 1
        setAnalysisProgress(`Converting PDF page ${pageNum} to image...`)
        const { base64, mime } = await renderPdfPageToImage(selectedDrawing.fileUrl, pageNum)
        imageData = base64
        mimeType = mime
        console.log(`PDF page ${pageNum} converted to image: ${Math.round(imageData.length / 1024)}KB`)
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

  // ============================================
  // Extract All Pages - Uses MEP Concept Design Logic
  // This is the same robust extraction as PDFImportModal
  // ============================================
  const handleExtractAllPages = async () => {
    if (!currentScan) return
    
    // Get PDF data from first drawing or pending upload
    let pdfData: ArrayBuffer | null = pendingPdfData
    
    // If no pending data, try to get from first PDF drawing
    if (!pdfData && currentScan.drawings.length > 0) {
      const firstPdfDrawing = currentScan.drawings.find(d => d.fileType === 'application/pdf')
      if (firstPdfDrawing) {
        const base64Match = firstPdfDrawing.fileUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (base64Match) {
          const pdfBase64 = base64Match[2]
          const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
          pdfData = pdfBytes.buffer.slice(0)
        }
      }
    }
    
    if (!pdfData) {
      alert('No PDF found. Please upload a PDF first.')
      return
    }
    
    setExtractingAllPages(true)
    setExtractionProgress({ current: 0, total: 0 })
    
    try {
      console.log('🚀 Starting full PDF extraction (MEP Concept Design logic)...')
      
      const result = await extractZonesFromPDF(pdfData, (current, total) => {
        setExtractionProgress({ current, total })
      })
      
      console.log(`✅ Extraction complete: ${result.zones.length} zones from ${result.pageCount} pages`)
      
      // Convert ExtractedZone[] to ExtractedSpace[]
      const newSpaces: ExtractedSpace[] = result.zones.map((zone: ExtractedZone) => ({
        id: uuidv4(),
        name: zone.name,
        floor: zone.floor || 'Unknown',
        sf: zone.sf,
        zoneType: zone.suggestedZoneType,
        fixtures: {},
        equipment: [],
        confidence: zone.confidence === 'high' ? 90 : zone.confidence === 'medium' ? 70 : 50,
      }))
      
      // Merge with existing spaces (don't overwrite user edits)
      const existingNames = new Set(currentScan.extractedSpaces.map(s => s.name.toLowerCase()))
      const uniqueNewSpaces = newSpaces.filter(s => !existingNames.has(s.name.toLowerCase()))
      
      const allSpaces = [...currentScan.extractedSpaces, ...uniqueNewSpaces]
      setExtractedSpaces(currentScan.id, allSpaces)
      
      // Update scan status
      updateScan(currentScan.id, { 
        status: 'reviewed',
      })
      
      // Switch to spaces tab
      setActiveTab('spaces')
      
      alert(`✅ Extracted ${uniqueNewSpaces.length} spaces from ${result.pageCount} pages!`)
    } catch (error) {
      console.error('Full extraction failed:', error)
      alert(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setExtractingAllPages(false)
      setExtractionProgress({ current: 0, total: 0 })
    }
  }

  const handleImageClick = useCallback(async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return
    
    const rect = imageRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Calibration mode
    if (calibrationMode) {
      addCalibrationPoint({ x, y })
      return
    }
    
    // Tag Reader mode - click to read a tag
    if (drawingMode === 'tagReader') {
      const imgDisplayWidth = rect.width
      const imgDisplayHeight = rect.height
      const imgNaturalWidth = imageRef.current.naturalWidth
      const imgNaturalHeight = imageRef.current.naturalHeight
      
      // Convert click position to percentage
      const clickXPercent = (x / imgDisplayWidth) * 100
      const clickYPercent = (y / imgDisplayHeight) * 100
      
      // Calculate crop box in natural image pixels (centered on click)
      // Scale the tag box size from display to natural resolution
      const scaleRatio = imgNaturalWidth / imgDisplayWidth
      const cropWidthNatural = tagBoxSize.width * scaleRatio
      const cropHeightNatural = tagBoxSize.height * scaleRatio
      
      const clickXNatural = (clickXPercent / 100) * imgNaturalWidth
      const clickYNatural = (clickYPercent / 100) * imgNaturalHeight
      
      // Center the box on the click point
      let cropX = Math.floor(clickXNatural - cropWidthNatural / 2)
      let cropY = Math.floor(clickYNatural - cropHeightNatural / 2)
      
      // Clamp to image bounds
      cropX = Math.max(0, Math.min(cropX, imgNaturalWidth - cropWidthNatural))
      cropY = Math.max(0, Math.min(cropY, imgNaturalHeight - cropHeightNatural))
      
      const cropWidth = Math.min(cropWidthNatural, imgNaturalWidth - cropX)
      const cropHeight = Math.min(cropHeightNatural, imgNaturalHeight - cropY)
      
      console.log(`[Tag Reader] Click at ${clickXPercent.toFixed(1)}%, ${clickYPercent.toFixed(1)}%`)
      console.log(`[Tag Reader] Cropping ${cropWidth}x${cropHeight} at ${cropX},${cropY} from ${imgNaturalWidth}x${imgNaturalHeight}`)
      
      // Create canvas to crop the image
      const canvas = document.createElement('canvas')
      canvas.width = cropWidth
      canvas.height = cropHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      ctx.drawImage(
        imageRef.current,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      )
      
      const croppedImageUrl = canvas.toDataURL('image/png')
      
      // Open modal with loading state
      setTagModalData({
        croppedImageUrl,
        clickX: clickXPercent,
        clickY: clickYPercent,
        aiResult: null,
        isLoading: true
      })
      setTagEditName('')
      setTagEditSF('')
      setTagEditFloor(lastFloorUsed) // Use last floor used for continuity
      setShowTagModal(true)
      
      // Send to AI for reading
      try {
        const result = await readTagFromRegion(croppedImageUrl)
        console.log('[Tag Reader] AI Result:', result)
        
        setTagModalData(prev => prev ? {
          ...prev,
          aiResult: result,
          isLoading: false
        } : null)
        
        // Pre-fill the edit fields with AI result
        if (result.roomName) {
          const roomNumber = result.roomNumber ? ` ${result.roomNumber}` : ''
          setTagEditName(`${result.roomName}${roomNumber}`)
        }
        if (result.squareFeet) {
          setTagEditSF(String(result.squareFeet))
        }
      } catch (error) {
        console.error('[Tag Reader] AI Error:', error)
        setTagModalData(prev => prev ? {
          ...prev,
          aiResult: { roomName: null, roomNumber: null, squareFeet: null, confidence: 'low' },
          isLoading: false
        } : null)
      }
    }
  }, [calibrationMode, addCalibrationPoint, drawingMode, tagBoxSize, currentScan?.extractedSpaces])
  
  // ============================================
  // Area Calculation Helpers (must be before callbacks that use them)
  // ============================================
  
  // Calculate area in square feet from region dimensions using scale
  const calculateAreaSF = useCallback((
    widthPercent: number, 
    heightPercent: number,
    imageWidthPx?: number,
    imageHeightPx?: number
  ): number | undefined => {
    if (!currentScan?.scale?.pixelsPerFoot || !imageWidthPx || !imageHeightPx) return undefined
    
    const pxPerFoot = currentScan.scale.pixelsPerFoot
    const widthPx = (widthPercent / 100) * imageWidthPx
    const heightPx = (heightPercent / 100) * imageHeightPx
    const widthFt = widthPx / pxPerFoot
    const heightFt = heightPx / pxPerFoot
    return Math.round(widthFt * heightFt)
  }, [currentScan?.scale?.pixelsPerFoot])
  
  // Calculate polygon area using Shoelace formula
  const calculatePolygonAreaSF = useCallback((
    points: Array<{ xPercent: number; yPercent: number }>,
    imageWidthPx?: number,
    imageHeightPx?: number
  ): number | undefined => {
    if (!currentScan?.scale?.pixelsPerFoot || !imageWidthPx || !imageHeightPx || points.length < 3) return undefined
    
    const pxPerFoot = currentScan.scale.pixelsPerFoot
    
    // Convert to feet
    const pointsFt = points.map(p => ({
      x: ((p.xPercent / 100) * imageWidthPx) / pxPerFoot,
      y: ((p.yPercent / 100) * imageHeightPx) / pxPerFoot,
    }))
    
    // Shoelace formula
    let area = 0
    for (let i = 0; i < pointsFt.length; i++) {
      const j = (i + 1) % pointsFt.length
      area += pointsFt[i].x * pointsFt[j].y
      area -= pointsFt[j].x * pointsFt[i].y
    }
    return Math.round(Math.abs(area) / 2)
  }, [currentScan?.scale?.pixelsPerFoot])
  
  // Get current drawing's floor level
  const currentFloor = useMemo(() => {
    return selectedDrawing?.floor || 'Unknown'
  }, [selectedDrawing?.floor])

  // Drawing mode handlers
  // Rectangle drawing handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode !== 'rectangle' || !imageContainerRef.current || !imageBounds) return
    
    const containerRect = imageContainerRef.current.getBoundingClientRect()
    const x = e.clientX - containerRect.left - imageBounds.left
    const y = e.clientY - containerRect.top - imageBounds.top
    
    // Only start drawing if click is within image bounds
    if (x >= 0 && y >= 0 && x <= imageBounds.width && y <= imageBounds.height) {
      setCurrentDrawing({ startX: x, startY: y, endX: x, endY: y })
    }
  }, [drawingMode, imageBounds])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current || !imageBounds) return
    
    const containerRect = imageContainerRef.current.getBoundingClientRect()
    let x = e.clientX - containerRect.left - imageBounds.left
    let y = e.clientY - containerRect.top - imageBounds.top
    
    // Clamp to image bounds
    x = Math.max(0, Math.min(x, imageBounds.width))
    y = Math.max(0, Math.min(y, imageBounds.height))
    
    // Rectangle mode: update drawing preview
    if (currentDrawing) {
      setCurrentDrawing(prev => prev ? { ...prev, endX: x, endY: y } : null)
    }
    
    // Polygon mode: update preview line to cursor
    if (drawingMode === 'polygon' && currentPolygon.length > 0) {
      setPolygonPreviewPoint({ x, y })
    }
  }, [currentDrawing, drawingMode, currentPolygon.length, imageBounds])

  const handleCanvasMouseUp = useCallback(() => {
    if (!currentDrawing || !imageBounds) return
    
    const width = Math.abs(currentDrawing.endX - currentDrawing.startX)
    const height = Math.abs(currentDrawing.endY - currentDrawing.startY)
    
    // Only create region if it's big enough (min 20px on screen)
    if (width > 20 && height > 20) {
      // Convert pixel coordinates to percentages
      const xPx = Math.min(currentDrawing.startX, currentDrawing.endX)
      const yPx = Math.min(currentDrawing.startY, currentDrawing.endY)
      
      const widthPercent = (width / imageBounds.width) * 100
      const heightPercent = (height / imageBounds.height) * 100
      
      // Calculate area if scale is set
      const imageWidthPx = imageRef.current?.naturalWidth || imageBounds.width
      const imageHeightPx = imageRef.current?.naturalHeight || imageBounds.height
      const areaSF = calculateAreaSF(widthPercent, heightPercent, imageWidthPx, imageHeightPx)
      
      // Get floor prefix
      const floorPrefix = formatFloorPrefix(currentFloor)
      
      const newRegion = {
        id: uuidv4(),
        type: 'rectangle' as const,
        xPercent: (xPx / imageBounds.width) * 100,
        yPercent: (yPx / imageBounds.height) * 100,
        widthPercent,
        heightPercent,
        name: `${floorPrefix} - Space ${drawnRegions.length + 1}`,
        analyzed: false,
        userCreated: true,
        areaSF,
        floor: currentFloor,
      }
      setDrawnRegions(prev => [...prev, newRegion])
      setSelectedRegionId(newRegion.id)
      setNewRegionName(newRegion.name)
      setShowRegionNameModal(true)
    }
    
    setCurrentDrawing(null)
  }, [currentDrawing, drawnRegions.length, imageBounds, calculateAreaSF, currentFloor])
  
  // Polygon drawing handlers
  const handlePolygonClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode !== 'polygon' || !imageContainerRef.current || !imageBounds) return
    
    const containerRect = imageContainerRef.current.getBoundingClientRect()
    let x = e.clientX - containerRect.left - imageBounds.left
    let y = e.clientY - containerRect.top - imageBounds.top
    
    // Clamp to image bounds
    x = Math.max(0, Math.min(x, imageBounds.width))
    y = Math.max(0, Math.min(y, imageBounds.height))
    
    // Check if clicking near first point to close polygon (within 15px)
    if (currentPolygon.length >= 3) {
      const firstPoint = currentPolygon[0]
      const distance = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2))
      
      if (distance < 15) {
        // Close the polygon and create region
        finishPolygon()
        return
      }
    }
    
    // Add point to polygon
    setCurrentPolygon(prev => [...prev, { x, y }])
  }, [drawingMode, currentPolygon, imageBounds])
  
  const handlePolygonDoubleClick = useCallback(() => {
    if (currentPolygon.length >= 3) {
      finishPolygon()
    }
  }, [currentPolygon])
  
  const finishPolygon = useCallback(() => {
    if (!imageBounds || currentPolygon.length < 3) return
    
    // Convert pixel points to percentages
    const percentPoints = currentPolygon.map(p => ({
      xPercent: (p.x / imageBounds.width) * 100,
      yPercent: (p.y / imageBounds.height) * 100,
    }))
    
    // Calculate area if scale is set
    const imageWidthPx = imageRef.current?.naturalWidth || imageBounds.width
    const imageHeightPx = imageRef.current?.naturalHeight || imageBounds.height
    const areaSF = calculatePolygonAreaSF(percentPoints, imageWidthPx, imageHeightPx)
    
    // Get floor prefix
    const floorPrefix = formatFloorPrefix(currentFloor)
    
    const newRegion = {
      id: uuidv4(),
      type: 'polygon' as const,
      points: percentPoints,
      name: `${floorPrefix} - Space ${drawnRegions.length + 1}`,
      analyzed: false,
      userCreated: true,
      areaSF,
      floor: currentFloor,
    }
    
    setDrawnRegions(prev => [...prev, newRegion])
    setSelectedRegionId(newRegion.id)
    setNewRegionName(newRegion.name)
    setShowRegionNameModal(true)
    
    // Reset polygon state
    setCurrentPolygon([])
    setPolygonPreviewPoint(null)
  }, [imageBounds, currentPolygon, drawnRegions.length, calculatePolygonAreaSF, currentFloor])
  
  // Cancel current polygon with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentPolygon.length > 0) {
        setCurrentPolygon([])
        setPolygonPreviewPoint(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPolygon.length])

  // Helper to get bounding box from polygon points (for display)
  const getPolygonBounds = (points: Array<{ xPercent: number; yPercent: number }>) => {
    if (!points || points.length === 0) return null
    const xValues = points.map(p => p.xPercent)
    const yValues = points.map(p => p.yPercent)
    return {
      xPercent: Math.min(...xValues),
      yPercent: Math.min(...yValues),
      widthPercent: Math.max(...xValues) - Math.min(...xValues),
      heightPercent: Math.max(...yValues) - Math.min(...yValues),
    }
  }

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
    
    // Calculate bounding box for both rectangles and polygons
    let boundingBox: { xPercent: number; yPercent: number; widthPercent: number; heightPercent: number }
    
    if (region.type === 'polygon' && region.points) {
      const bounds = getPolygonBounds(region.points)
      if (!bounds) return
      boundingBox = bounds
    } else {
      boundingBox = {
        xPercent: region.xPercent || 0,
        yPercent: region.yPercent || 0,
        widthPercent: region.widthPercent || 0,
        heightPercent: region.heightPercent || 0,
      }
    }
    
    const newSpace: ExtractedSpace = {
      id: uuidv4(),
      name: region.name,
      sf: region.areaSF || 0,
      floor: region.floor,
      fixtures: {},
      equipment: [],
      confidence: region.userCreated ? 100 : 75, // Manual entry vs AI
      // Store bounding box (for polygons, this is the enclosing rectangle)
      boundingBox,
      // Store polygon points if this is a polygon region
      polygonPoints: region.type === 'polygon' ? region.points : undefined,
      // Page/drawing tracking
      pageNumber: selectedDrawing?.pageNumber,
      drawingId: selectedDrawing?.id,
      userCreated: region.userCreated,
      // Occupancy will be set later via seat detection
      seatCountAI: region.seatCount,
    }
    
    setExtractedSpaces(currentScan.id, [...currentScan.extractedSpaces, newSpace])
    setDrawnRegions(prev => prev.map(r => 
      r.id === region.id ? { ...r, analyzed: true } : r
    ))
    
    // Switch to spaces tab to edit
    setActiveTab('spaces')
    setSelectedSpaceId(newSpace.id)
  }

  // Read Tag from a drawn region using AI (high-res crop)
  const handleReadTag = async (region: typeof drawnRegions[0]) => {
    if (!imageRef.current || !renderedImageUrl) return
    
    setReadingTagRegionId(region.id)
    
    try {
      // Get region bounds (in percentages)
      let xPercent: number, yPercent: number, widthPercent: number, heightPercent: number
      
      if (region.type === 'polygon' && region.points) {
        const bounds = getPolygonBounds(region.points)
        if (!bounds) throw new Error('Could not calculate polygon bounds')
        xPercent = bounds.xPercent
        yPercent = bounds.yPercent
        widthPercent = bounds.widthPercent
        heightPercent = bounds.heightPercent
      } else {
        xPercent = region.xPercent || 0
        yPercent = region.yPercent || 0
        widthPercent = region.widthPercent || 0
        heightPercent = region.heightPercent || 0
      }
      
      // Convert percentages to actual pixels on the FULL resolution image
      const imgNaturalWidth = imageRef.current.naturalWidth
      const imgNaturalHeight = imageRef.current.naturalHeight
      
      const cropX = Math.floor((xPercent / 100) * imgNaturalWidth)
      const cropY = Math.floor((yPercent / 100) * imgNaturalHeight)
      const cropWidth = Math.floor((widthPercent / 100) * imgNaturalWidth)
      const cropHeight = Math.floor((heightPercent / 100) * imgNaturalHeight)
      
      // Add padding around the tag (20% on each side) to capture context
      const padding = 0.2
      const paddedX = Math.max(0, Math.floor(cropX - cropWidth * padding))
      const paddedY = Math.max(0, Math.floor(cropY - cropHeight * padding))
      const paddedWidth = Math.min(imgNaturalWidth - paddedX, Math.floor(cropWidth * (1 + 2 * padding)))
      const paddedHeight = Math.min(imgNaturalHeight - paddedY, Math.floor(cropHeight * (1 + 2 * padding)))
      
      console.log(`[Read Tag] Cropping region: ${paddedX},${paddedY} ${paddedWidth}x${paddedHeight} from ${imgNaturalWidth}x${imgNaturalHeight}`)
      
      // Create a canvas to crop the image
      const canvas = document.createElement('canvas')
      canvas.width = paddedWidth
      canvas.height = paddedHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      
      // Draw the cropped region
      ctx.drawImage(
        imageRef.current,
        paddedX, paddedY, paddedWidth, paddedHeight,  // Source rect
        0, 0, paddedWidth, paddedHeight                // Dest rect
      )
      
      // Get base64 of cropped region
      const croppedBase64 = canvas.toDataURL('image/png')
      
      // Send to AI for reading
      const result = await readTagFromRegion(croppedBase64)
      
      console.log('[Read Tag] AI Result:', result)
      
      if (result.roomName) {
        // Update the region with the read values
        setDrawnRegions(prev => prev.map(r => {
          if (r.id === region.id) {
            const roomNumber = result.roomNumber ? ` ${result.roomNumber}` : ''
            return {
              ...r,
              name: `${result.roomName}${roomNumber}`,
              areaSF: result.squareFeet || r.areaSF,
              confidenceSource: result.squareFeet ? 'explicit' as const : r.confidenceSource
            }
          }
          return r
        }))
        
        alert(`✅ Tag Read!\n\nRoom: ${result.roomName}${result.roomNumber ? ` (${result.roomNumber})` : ''}\nSF: ${result.squareFeet ? result.squareFeet + ' SF' : 'Not found'}\nConfidence: ${result.confidence}`)
      } else {
        alert('❌ Could not read tag. Try:\n• Drawing a tighter box around just the tag\n• Making sure the tag text is clearly visible\n• Drawing a larger selection if text is small')
      }
    } catch (error) {
      console.error('[Read Tag] Error:', error)
      alert(`Error reading tag: ${error}`)
    } finally {
      setReadingTagRegionId(null)
    }
  }

  // Confirm tag from modal and add as extracted space
  const handleConfirmTag = () => {
    if (!currentScan || !tagModalData || !tagEditName.trim()) return
    
    const sf = parseInt(tagEditSF) || 0
    const floor = tagEditFloor.trim() || '1'
    
    // Remember this floor for the next tag
    setLastFloorUsed(floor)
    
    // Create new extracted space
    const newSpace: ExtractedSpace = {
      id: uuidv4(),
      name: tagEditName.trim(),
      sf,
      floor,
      fixtures: {},
      equipment: [],
      confidence: tagModalData.aiResult?.confidence === 'high' ? 90 : 70,
      // Store approximate bounding box based on click position and tag box size
      boundingBox: {
        xPercent: Math.max(0, tagModalData.clickX - 2),
        yPercent: Math.max(0, tagModalData.clickY - 1.5),
        widthPercent: 4,
        heightPercent: 3
      },
      pageNumber: selectedDrawing?.pageNumber,
      drawingId: selectedDrawing?.id,
      userCreated: false,
      confidenceSource: sf > 0 ? 'explicit' : 'estimated'
    }
    
    setExtractedSpaces(currentScan.id, [...currentScan.extractedSpaces, newSpace])
    
    // Close modal
    setShowTagModal(false)
    setTagModalData(null)
    
    // Stay in tag reader mode for next tag
    // Don't switch tabs - let user continue clicking tags
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
        // Use the rendered image URL - pass correct page number
        const pageNum = selectedDrawing.pageNumber || 1
        const { base64, mime } = await renderPdfPageToImage(selectedDrawing.fileUrl, pageNum)
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
      
      // Get floor prefix from detected floor
      const floorPrefix = formatFloorPrefix(result.floor)
      
      // Update drawing with detected floor
      if (selectedDrawing && result.floor !== 'Unknown') {
        updateDrawing(currentScan.id, selectedDrawing.id, { floor: result.floor })
      }
      
      // Add detected regions to the drawn regions (keep as percentages)
      const newRegions = result.regions.map((region: DetectedRegion) => {
        const widthPercent = (region.width / imageWidth) * 100
        const heightPercent = (region.height / imageHeight) * 100
        
        // Calculate geometric area as fallback (only if scale is set)
        const geometricSF = calculateAreaSF(widthPercent, heightPercent, imageWidth, imageHeight)
        
        // CRITICAL FIX: Prefer text-read SF over geometric calculation
        // Text-read SF is directly from the plan labels and is always more accurate
        const areaSF = region.textSF ? region.textSF : geometricSF
        
        return {
          id: region.id,
          type: 'rectangle' as const,
          // Store as percentages - the region already has pixel values, convert back to %
          xPercent: (region.x / imageWidth) * 100,
          yPercent: (region.y / imageHeight) * 100,
          widthPercent,
          heightPercent,
          name: `${floorPrefix} - ${region.name}`,
          analyzed: false,
          userCreated: false, // AI-detected
          areaSF,
          floor: result.floor,
          // Track confidence source for UI display
          confidenceSource: (region.textSF ? 'explicit' : 'estimated') as 'explicit' | 'estimated',
        }
      })
      
      setDrawnRegions(prev => [...prev, ...newRegions])
      
      // Enable rectangle mode to show the regions (AI returns rectangles)
      setDrawingMode('rectangle')
      
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
    
    // CORRECTION: If we are viewing a high-res PDF render (3x scale), 
    // we need to warn the user that standard 96 DPI scales won't work correctly.
    const isPDF = selectedDrawing?.fileType === 'application/pdf'
    
    if (isPDF) {
      const confirmed = window.confirm(
        `⚠️ WARNING: You are applying a standard scale (${label}) to a High-Res PDF.\n\n` +
        `Because PDFs are rendered at high resolution for AI analysis, standard print scales will likely result in MASSIVE area errors (up to 5x).\n\n` +
        `Strongly recommended: Use "Two-Point Calibration" instead.\n\n` +
        `Do you still want to apply this scale?`
      )
      if (!confirmed) return
    }

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
            {(['drawings', 'spaces', 'export'] as TabType[]).map(tab => {
              const lowConfCount = currentScan.extractedSpaces.filter(s => s.confidenceSource === 'estimated').length
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === tab
                      ? 'bg-violet-600 text-white'
                      : 'text-surface-400 hover:text-white'
                  }`}
                >
                  {tab === 'drawings' && '📄 Drawings'}
                  {tab === 'spaces' && (
                    <>
                      🏠 Spaces ({currentScan.extractedSpaces.length})
                      {lowConfCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                          {lowConfCount} ⚠️
                        </span>
                      )}
                    </>
                  )}
                  {tab === 'export' && '📤 Export'}
                </button>
              )
            })}
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
              {/* Page Navigation Bar */}
              {currentScan.drawings.length > 1 && (
                <div className="px-6 py-2 border-b border-surface-700 bg-surface-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const currentIndex = currentScan.drawings.findIndex(d => d.id === selectedDrawingId)
                        if (currentIndex > 0) {
                          setSelectedDrawingId(currentScan.drawings[currentIndex - 1].id)
                        }
                      }}
                      disabled={currentScan.drawings.findIndex(d => d.id === selectedDrawingId) === 0}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-surface-700 text-surface-300 hover:text-white hover:bg-surface-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    
                    <span className="text-sm font-medium text-surface-300">
                      Page {(currentScan.drawings.findIndex(d => d.id === selectedDrawingId) + 1)} of {currentScan.drawings.length}
                    </span>
                    
                    <button
                      onClick={() => {
                        const currentIndex = currentScan.drawings.findIndex(d => d.id === selectedDrawingId)
                        if (currentIndex < currentScan.drawings.length - 1) {
                          setSelectedDrawingId(currentScan.drawings[currentIndex + 1].id)
                        }
                      }}
                      disabled={currentScan.drawings.findIndex(d => d.id === selectedDrawingId) === currentScan.drawings.length - 1}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-surface-700 text-surface-300 hover:text-white hover:bg-surface-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Floor indicator */}
                    <span className="text-sm text-surface-400">
                      Floor: <span className="text-violet-400 font-medium">{selectedDrawing?.floor || 'Not detected'}</span>
                    </span>
                    
                    {/* Page confirmation status */}
                    {selectedDrawing?.confirmed ? (
                      <span className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 text-xs font-medium">
                        ✓ Confirmed
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (selectedDrawing) {
                            confirmDrawingSpaces(currentScan.id, selectedDrawing.id)
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        ✓ Confirm Page
                      </button>
                    )}
                    
                    {/* Confirmed pages count */}
                    <span className="text-xs text-surface-500">
                      {currentScan.drawings.filter(d => d.confirmed).length}/{currentScan.drawings.length} confirmed
                    </span>
                  </div>
                </div>
              )}
              
              {/* Toolbar */}
              <div className="px-6 py-3 border-b border-surface-700 bg-surface-800/30">
                {/* Primary Action Row - Extract All (same as MEP Concept Design) */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">📊 Quick Extract:</span>
                    {/* MEP-Style Full PDF Extraction - PRIMARY ACTION */}
                    <button
                      onClick={handleExtractAllPages}
                      disabled={extractingAllPages || currentScan?.drawings.length === 0}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                      title="Extracts ALL rooms with sqft from ALL pages - same AI as MEP Concept Design"
                    >
                      {extractingAllPages ? (
                        <>
                          <span className="animate-spin">🔄</span>
                          {extractionProgress.total > 0 
                            ? `Page ${extractionProgress.current}/${extractionProgress.total}...`
                            : 'Extracting...'
                          }
                        </>
                      ) : (
                        <>⚡ Extract All Spaces from PDF</>
                      )}
                    </button>
                    
                    {extractingAllPages && extractionProgress.total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-surface-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                            style={{ width: `${(extractionProgress.current / extractionProgress.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-surface-400">
                          {Math.round((extractionProgress.current / extractionProgress.total) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-surface-500 flex items-center gap-1">
                    <span>💡</span>
                    <span>Same AI extraction as MEP Concept Design - reads sqft from plans</span>
                  </div>
                </div>
                
                {/* Secondary Actions Row - Manual Tools */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-500 mr-1">Manual tools:</span>
                    
                    {/* AI Auto-Detect Boundaries (for this page) */}
                    <button
                      onClick={handleAIAutoDetect}
                      disabled={detectingBoundaries || !renderedImageUrl}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        detectingBoundaries
                          ? 'bg-amber-600 text-white animate-pulse'
                          : 'bg-surface-700 text-surface-300 hover:text-white hover:bg-surface-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="Detect boundaries on this page (requires scale calibration for sqft)"
                    >
                      {detectingBoundaries ? '🤖 Detecting...' : '🔲 Detect Boundaries'}
                    </button>
                    
                    {/* Rectangle Drawing Mode */}
                    <button
                      onClick={() => {
                        setDrawingMode(drawingMode === 'rectangle' ? 'none' : 'rectangle')
                        setCalibrationMode(false)
                        setCurrentPolygon([])
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        drawingMode === 'rectangle'
                          ? 'bg-violet-600 text-white'
                          : 'bg-surface-700 text-surface-300 hover:text-white hover:bg-surface-600'
                      }`}
                      title="Draw rectangle boundaries manually"
                    >
                      ▢ Draw Rect
                    </button>
                    
                    {/* Polygon Drawing Mode */}
                    <button
                      onClick={() => {
                        setDrawingMode(drawingMode === 'polygon' ? 'none' : 'polygon')
                        setCalibrationMode(false)
                        setCurrentDrawing(null)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        drawingMode === 'polygon'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-surface-700 text-surface-300 hover:text-white hover:bg-surface-600'
                      }`}
                      title="Draw polygon boundaries (click to add points, double-click to close)"
                    >
                      ⬡ Draw Poly
                    </button>
                    
                    {/* Tag Reader Mode - Click to read room tags */}
                    <button
                      onClick={() => {
                        setDrawingMode(drawingMode === 'tagReader' ? 'none' : 'tagReader')
                        setCalibrationMode(false)
                        setCurrentDrawing(null)
                        setCurrentPolygon([])
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        drawingMode === 'tagReader'
                          ? 'bg-amber-600 text-white'
                          : 'bg-surface-700 text-surface-300 hover:text-white hover:bg-surface-600'
                      }`}
                      title="Click on room tags to read them with AI"
                    >
                      🏷️ Read Tags
                    </button>
                    
                    {/* Show detected floor badge when in tag reader mode */}
                    {drawingMode === 'tagReader' && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        detectingFloor 
                          ? 'bg-amber-500/20 text-amber-400 animate-pulse' 
                          : selectedDrawing?.floor 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-surface-600 text-surface-400'
                      }`}>
                        {detectingFloor 
                          ? '🔍 Detecting floor...' 
                          : selectedDrawing?.floor 
                            ? `📍 ${selectedDrawing.floor}` 
                            : '📍 Floor: ?'
                        }
                      </span>
                    )}
                    
                    <button
                      onClick={() => setShowScaleModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 bg-surface-700 text-surface-300 hover:text-white hover:bg-surface-600"
                      title="Set drawing scale for area calculations"
                    >
                      📏 Scale
                    </button>
                    
                    {drawnRegions.length > 0 && (
                      <span className="text-xs text-violet-400 font-medium ml-1">
                        {drawnRegions.length} region{drawnRegions.length !== 1 ? 's' : ''}
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
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        ➕ Add Regions as Spaces
                      </button>
                    )}
                    
                    <button
                      onClick={handleAnalyzeAllDrawings}
                      disabled={analyzing || !selectedDrawing}
                      className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                      title="Analyze just this page"
                    >
                      {analyzing ? (
                        <>
                          <span className="animate-spin">🔄</span>
                          <span className="max-w-[100px] truncate">{analysisProgress || 'Analyzing...'}</span>
                        </>
                      ) : (
                        <>🤖 Analyze Page</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* PDF Extraction Prompt Modal */}
              {showExtractionPrompt && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-surface-800 border border-emerald-500/30 rounded-2xl p-8 shadow-2xl max-w-md w-full">
                    <div className="text-center mb-6">
                      <div className="text-5xl mb-4">📄✨</div>
                      <h3 className="text-xl font-bold text-white mb-2">PDF Uploaded!</h3>
                      <p className="text-surface-400">
                        {uploadedPdfPageCount > 1 
                          ? `Your PDF has ${uploadedPdfPageCount} pages.`
                          : 'Your PDF is ready for processing.'}
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setShowExtractionPrompt(false)
                          handleExtractAllPages()
                        }}
                        className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3"
                      >
                        <span className="text-xl">⚡</span>
                        <div className="text-left">
                          <div>Extract All Spaces Now</div>
                          <div className="text-xs opacity-80">AI reads room names & sqft from all pages</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setShowExtractionPrompt(false)}
                        className="w-full px-6 py-3 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-xl font-medium transition-colors"
                      >
                        Skip - I'll do it manually
                      </button>
                    </div>
                    
                    <p className="text-xs text-surface-500 text-center mt-4">
                      💡 Uses the same AI as MEP Concept Design for accurate space extraction
                    </p>
                  </div>
                </div>
              )}

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

              {/* Tag Reader Modal - Shows cropped tag image + AI result + editable fields */}
              {showTagModal && tagModalData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-surface-800 border border-amber-500/50 rounded-xl p-6 shadow-2xl max-w-md w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        🏷️ Read Room Tag
                      </h3>
                      <button 
                        onClick={() => {
                          setShowTagModal(false)
                          setTagModalData(null)
                        }}
                        className="text-surface-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* Cropped Image Preview */}
                    <div className="mb-4 p-2 bg-surface-900 rounded-lg border border-surface-700">
                      <img 
                        src={tagModalData.croppedImageUrl} 
                        alt="Cropped tag" 
                        className="max-w-full h-auto mx-auto"
                        style={{ maxHeight: '150px' }}
                      />
                    </div>
                    
                    {/* Tag Box Size Adjuster */}
                    <div className="mb-4 p-3 bg-surface-700/50 rounded-lg">
                      <label className="text-xs text-surface-400 block mb-2">
                        Tag Box Size (adjust if tags are larger/smaller)
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-surface-500">W:</span>
                          <input
                            type="number"
                            value={tagBoxSize.width}
                            onChange={(e) => setTagBoxSize(prev => ({ ...prev, width: parseInt(e.target.value) || 100 }))}
                            className="w-16 px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-surface-500">H:</span>
                          <input
                            type="number"
                            value={tagBoxSize.height}
                            onChange={(e) => setTagBoxSize(prev => ({ ...prev, height: parseInt(e.target.value) || 60 }))}
                            className="w-16 px-2 py-1 bg-surface-700 border border-surface-600 rounded text-white text-sm"
                          />
                        </div>
                        <span className="text-xs text-surface-500">px</span>
                      </div>
                    </div>
                    
                    {/* AI Status */}
                    {tagModalData.isLoading && (
                      <div className="mb-4 text-center text-amber-400 text-sm">
                        🔍 AI is reading the tag...
                      </div>
                    )}
                    
                    {/* AI Result Badge */}
                    {!tagModalData.isLoading && tagModalData.aiResult && (
                      <div className={`mb-4 p-2 rounded-lg text-sm ${
                        tagModalData.aiResult.roomName 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {tagModalData.aiResult.roomName 
                          ? `✓ AI detected: ${tagModalData.aiResult.roomName}${tagModalData.aiResult.squareFeet ? ` (${tagModalData.aiResult.squareFeet} SF)` : ''}`
                          : '⚠️ AI could not read tag clearly. Enter manually below.'
                        }
                      </div>
                    )}
                    
                    {/* Editable Fields */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="text-xs text-surface-400 block mb-1">Room Name *</label>
                        <input
                          type="text"
                          value={tagEditName}
                          onChange={(e) => setTagEditName(e.target.value)}
                          placeholder="e.g., Bedroom, Kitchen, Living Room"
                          className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-amber-500 focus:outline-none"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-surface-400 block mb-1">Square Feet</label>
                          <input
                            type="number"
                            value={tagEditSF}
                            onChange={(e) => setTagEditSF(e.target.value)}
                            placeholder="150"
                            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                        <div className="w-24">
                          <label className="text-xs text-surface-400 block mb-1">Floor</label>
                          <input
                            type="text"
                            value={tagEditFloor}
                            onChange={(e) => setTagEditFloor(e.target.value)}
                            placeholder="1"
                            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowTagModal(false)
                          setTagModalData(null)
                        }}
                        className="flex-1 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg"
                      >
                        Skip
                      </button>
                      <button
                        onClick={handleConfirmTag}
                        disabled={!tagEditName.trim()}
                        className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                      >
                        ➕ Add Space
                      </button>
                    </div>
                    
                    <p className="text-xs text-surface-500 mt-3 text-center">
                      Click another tag after adding to continue. Tag box size is remembered.
                    </p>
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
                    className={`h-full overflow-auto p-6 bg-surface-900/50 ${
                      drawingMode === 'rectangle' ? 'cursor-crosshair' : 
                      drawingMode === 'polygon' ? 'cursor-cell' : ''
                    }`}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onClick={handlePolygonClick}
                    onDoubleClick={handlePolygonDoubleClick}
                    onMouseLeave={() => {
                      setCurrentDrawing(null)
                      setPolygonPreviewPoint(null)
                    }}
                  >
                    <div ref={imageContainerRef} className="relative inline-block">
                      {renderedImageUrl ? (
                        <img
                          ref={imageRef}
                          src={renderedImageUrl}
                          alt={selectedDrawing.fileName}
                          className={`max-w-full h-auto ${calibrationMode || drawingMode === 'tagReader' ? 'cursor-crosshair' : ''} ${drawingMode !== 'none' && drawingMode !== 'tagReader' ? 'pointer-events-none' : ''}`}
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
                    {/* Only show spaces for the CURRENT drawing/page */}
                    {imageBounds && currentScan.extractedSpaces.filter(s => s.boundingBox && s.drawingId === selectedDrawing?.id).map(space => (
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
                    
                    {/* Drawn Rectangle Regions - positioned using percentages */}
                    {/* User-created: cyan, AI with text SF: cyan, AI estimated: amber */}
                    {imageBounds && drawnRegions.filter(r => r.type === 'rectangle').map(region => (
                      <div
                        key={region.id}
                        className={`absolute border-2 ${
                          selectedRegionId === region.id 
                            ? 'border-violet-500 bg-violet-500/20' 
                            : region.analyzed 
                              ? 'border-emerald-500 bg-emerald-500/10' 
                              : region.userCreated
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : region.confidenceSource === 'explicit'
                                  ? 'border-cyan-500 bg-cyan-500/10'  // AI with text-read SF (high confidence)
                                  : 'border-amber-500 bg-amber-500/10' // AI estimated (low confidence)
                        } cursor-pointer transition-colors`}
                        style={{
                          left: ((region.xPercent || 0) / 100) * imageBounds.width,
                          top: ((region.yPercent || 0) / 100) * imageBounds.height,
                          width: ((region.widthPercent || 0) / 100) * imageBounds.width,
                          height: ((region.heightPercent || 0) / 100) * imageBounds.height,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedRegionId(region.id)
                        }}
                      >
                        {/* Region Label with Area - shows confidence source */}
                        <div className={`absolute -top-7 left-0 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                          region.analyzed 
                            ? 'bg-emerald-600 text-white' 
                            : region.userCreated
                              ? 'bg-cyan-600 text-white'
                              : region.confidenceSource === 'explicit'
                                ? 'bg-cyan-600 text-white'  // Text-read SF (high confidence)
                                : 'bg-amber-600 text-white' // Geometric SF (low confidence)
                        }`}>
                          {region.userCreated ? '▢' : region.confidenceSource === 'explicit' ? '📖' : '📐'} {region.name}
                          {region.areaSF && ` • ${region.areaSF.toLocaleString()} SF`}
                          {!region.userCreated && region.confidenceSource === 'estimated' && ' (est)'}
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
                        
                        {/* Read Tag Button - AI reads the cropped region */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReadTag(region)
                          }}
                          disabled={readingTagRegionId === region.id}
                          className={`absolute bottom-1 left-1 px-2 py-0.5 text-white rounded text-xs ${
                            readingTagRegionId === region.id 
                              ? 'bg-amber-600 cursor-wait' 
                              : 'bg-cyan-600 hover:bg-cyan-500'
                          }`}
                          title="AI reads the room name and SF from this tag"
                        >
                          {readingTagRegionId === region.id ? '🔍...' : '🔍 Read'}
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
                    
                    {/* SVG Layer for Polygons */}
                    {imageBounds && (
                      <svg 
                        className="absolute inset-0 pointer-events-none" 
                        style={{ width: imageBounds.width, height: imageBounds.height }}
                      >
                        {/* Rendered Polygon Regions */}
                        {drawnRegions.filter(r => r.type === 'polygon' && r.points).map(region => {
                          const pixelPoints = region.points!.map(p => ({
                            x: (p.xPercent / 100) * imageBounds.width,
                            y: (p.yPercent / 100) * imageBounds.height,
                          }))
                          const pointsString = pixelPoints.map(p => `${p.x},${p.y}`).join(' ')
                          
                          return (
                            <polygon
                              key={`poly-${region.id}`}
                              points={pointsString}
                              className={`pointer-events-auto cursor-pointer transition-colors ${
                                selectedRegionId === region.id 
                                  ? 'fill-violet-500/20 stroke-violet-500' 
                                  : region.analyzed 
                                    ? 'fill-emerald-500/10 stroke-emerald-500' 
                                    : 'fill-cyan-500/10 stroke-cyan-500'
                              }`}
                              strokeWidth="2"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedRegionId(region.id)
                              }}
                            />
                          )
                        })}
                        
                        {/* Current Polygon Being Drawn */}
                        {currentPolygon.length > 0 && (
                          <>
                            {/* Lines connecting points */}
                            <polyline
                              points={[...currentPolygon, polygonPreviewPoint].filter(Boolean).map(p => `${p!.x},${p!.y}`).join(' ')}
                              fill="none"
                              stroke="#a78bfa"
                              strokeWidth="2"
                              strokeDasharray="5,5"
                            />
                            
                            {/* Points */}
                            {currentPolygon.map((point, index) => (
                              <circle
                                key={index}
                                cx={point.x}
                                cy={point.y}
                                r={index === 0 ? 8 : 5}
                                className={index === 0 ? 'fill-cyan-400 stroke-white' : 'fill-violet-400 stroke-white'}
                                strokeWidth="2"
                              />
                            ))}
                            
                            {/* Close hint on first point */}
                            {currentPolygon.length >= 3 && polygonPreviewPoint && (
                              <text
                                x={currentPolygon[0].x + 12}
                                y={currentPolygon[0].y - 5}
                                className="fill-cyan-300 text-xs"
                                fontSize="11"
                              >
                                Click to close
                              </text>
                            )}
                          </>
                        )}
                        
                        {/* Extracted Space Polygons - Only show for current drawing/page */}
                        {currentScan.extractedSpaces.filter(s => s.polygonPoints && s.drawingId === selectedDrawing?.id).map(space => {
                          const pixelPoints = space.polygonPoints!.map(p => ({
                            x: (p.xPercent / 100) * imageBounds.width,
                            y: (p.yPercent / 100) * imageBounds.height,
                          }))
                          const pointsString = pixelPoints.map(p => `${p.x},${p.y}`).join(' ')
                          
                          return (
                            <polygon
                              key={`space-poly-${space.id}`}
                              points={pointsString}
                              className={`pointer-events-auto cursor-pointer ${
                                selectedSpaceId === space.id 
                                  ? 'fill-emerald-400/20 stroke-emerald-400' 
                                  : 'fill-emerald-500/10 stroke-emerald-500/70'
                              }`}
                              strokeWidth="2"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedSpaceId(space.id)
                              }}
                            />
                          )
                        })}
                      </svg>
                    )}
                    
                    {/* Polygon Region Labels (HTML overlay) */}
                    {imageBounds && drawnRegions.filter(r => r.type === 'polygon' && r.points).map(region => {
                      const firstPoint = region.points![0]
                      const labelX = (firstPoint.xPercent / 100) * imageBounds.width
                      const labelY = (firstPoint.yPercent / 100) * imageBounds.height
                      
                      return (
                        <div
                          key={`label-${region.id}`}
                          className="absolute pointer-events-auto"
                          style={{ left: labelX, top: labelY - 28 }}
                        >
                          <div className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap inline-flex items-center gap-1 ${
                            region.analyzed 
                              ? 'bg-emerald-600 text-white' 
                              : region.userCreated
                                ? 'bg-cyan-600 text-white'
                                : region.confidenceSource === 'explicit'
                                  ? 'bg-cyan-600 text-white'  // Text-read SF (high confidence)
                                  : 'bg-amber-600 text-white' // Geometric SF (low confidence)
                          }`}>
                            {region.userCreated ? '⬡' : region.confidenceSource === 'explicit' ? '📖' : '📐'} {region.name}
                            {region.areaSF && ` • ${region.areaSF.toLocaleString()} SF`}
                            {!region.userCreated && region.confidenceSource === 'estimated' && ' (est)'}
                            {region.analyzed && ' ✓'}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteRegion(region.id)
                              }}
                              className="ml-1 w-4 h-4 bg-red-500 hover:bg-red-400 text-white rounded-full text-xs flex items-center justify-center"
                            >
                              ×
                            </button>
                            {!region.analyzed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddRegionAsSpace(region)
                                }}
                                className="ml-1 px-1.5 py-0 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Current Rectangle Drawing Preview - uses screen pixels during active drawing */}
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
                {drawingMode === 'rectangle' && !currentDrawing && (
                  <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-violet-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
                    <span>▢</span> Click and drag to draw a rectangle boundary
                  </div>
                )}
                {drawingMode === 'polygon' && (
                  <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-cyan-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
                    <span>⬡</span> 
                    {currentPolygon.length === 0 
                      ? 'Click to place first point of polygon' 
                      : currentPolygon.length < 3 
                        ? `Click to add more points (${currentPolygon.length}/3 min)` 
                        : 'Click first point or double-click to close polygon • ESC to cancel'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'spaces' && (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Extracted Spaces</h2>
                <p className="text-sm text-surface-400 mt-1">
                  {currentScan.extractedSpaces.length} spaces • {currentScan.extractedSpaces.reduce((sum, s) => sum + s.sf, 0).toLocaleString()} SF total
                </p>
              </div>
              <button
                onClick={handleAddSpace}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <span>+</span> Add Space
              </button>
            </div>

            {currentScan.extractedSpaces.length === 0 ? (
              <div className="text-center py-16 text-surface-500">
                <div className="text-5xl mb-4">🤖</div>
                <p className="text-lg">No spaces extracted yet</p>
                <p className="text-sm mt-2">Go to Drawings tab and analyze a floor plan</p>
              </div>
            ) : (
              <>
                {/* Summary banner for low-confidence spaces */}
                {(() => {
                  const lowConfCount = currentScan.extractedSpaces.filter(s => s.confidenceSource === 'estimated').length
                  if (lowConfCount > 0) {
                    return (
                      <div className="flex items-center gap-2 p-3 mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{lowConfCount} space{lowConfCount > 1 ? 's' : ''} with estimated SF - click to review and correct</span>
                      </div>
                    )
                  }
                  return null
                })()}

                {/* Spaces grouped by floor */}
                {(() => {
                  // Group spaces by floor
                  const floorGroups: Record<string, ExtractedSpace[]> = {}
                  currentScan.extractedSpaces.forEach(space => {
                    const floor = space.floor || 'Unknown Floor'
                    if (!floorGroups[floor]) floorGroups[floor] = []
                    floorGroups[floor].push(space)
                  })
                  
                  // Sort floors logically
                  const sortedFloors = Object.keys(floorGroups).sort((a, b) => {
                    const order = ['Cellar', 'Basement', 'Ground', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor', 'Roof', 'Unknown Floor']
                    const aIdx = order.findIndex(f => a.toLowerCase().includes(f.toLowerCase()))
                    const bIdx = order.findIndex(f => b.toLowerCase().includes(f.toLowerCase()))
                    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
                    if (aIdx !== -1) return -1
                    if (bIdx !== -1) return 1
                    return a.localeCompare(b)
                  })
                  
                  return (
                    <div className="space-y-6">
                      {sortedFloors.map(floor => {
                        const spaces = floorGroups[floor]
                        const floorSF = spaces.reduce((sum, s) => sum + s.sf, 0)
                        
                        return (
                          <div key={floor} className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
                            {/* Floor Header */}
                            <div className="px-4 py-3 bg-surface-700/50 border-b border-surface-700 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">🏢</span>
                                <div>
                                  <h3 className="font-semibold text-white">{floor}</h3>
                                  <p className="text-xs text-surface-400">{spaces.length} spaces • {floorSF.toLocaleString()} SF</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Spaces Grid */}
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                              {spaces.map(space => {
                                const isLowConfidence = space.confidenceSource === 'estimated'
                                const fixtureCount = Object.values(space.fixtures).reduce((a, b) => a + b, 0)
                                
                                return (
                                  <div
                                    key={space.id}
                                    onClick={() => setSelectedSpaceId(space.id)}
                                    className={`p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] ${
                                      isLowConfidence
                                        ? 'bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/50'
                                        : 'bg-surface-700/50 border border-surface-600 hover:border-violet-500/50'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h4 className="font-medium text-white text-sm leading-tight">{space.name}</h4>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteSpace(space.id)
                                        }}
                                        className="p-1 rounded hover:bg-red-500/20 text-surface-500 hover:text-red-400 flex-shrink-0"
                                      >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className={`font-medium ${isLowConfidence ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {space.sf.toLocaleString()} SF
                                      </span>
                                      {isLowConfidence && (
                                        <span className="px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">est</span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mt-2 text-xs text-surface-400">
                                      {space.zoneType && (
                                        <span className="px-1.5 py-0.5 bg-surface-600 rounded truncate max-w-[100px]">{space.zoneType}</span>
                                      )}
                                      {fixtureCount > 0 && (
                                        <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">🚿 {fixtureCount}</span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </>
            )}

            {/* Space Editor Modal */}
            {selectedSpace && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-surface-700 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedSpace.name}</h3>
                      <p className="text-sm text-surface-400">{selectedSpace.floor} • {selectedSpace.sf.toLocaleString()} SF</p>
                    </div>
                    <button 
                      onClick={() => setSelectedSpaceId(null)}
                      className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 hover:text-white transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <SpaceEditor 
                      space={selectedSpace} 
                      onUpdate={(updates) => updateExtractedSpace(currentScan.id, selectedSpace.id, updates)}
                    />
                  </div>
                  
                  {/* Modal Footer */}
                  <div className="px-6 py-4 border-t border-surface-700 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        handleDeleteSpace(selectedSpace.id)
                        setSelectedSpaceId(null)
                      }}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete Space
                    </button>
                    <button
                      onClick={() => setSelectedSpaceId(null)}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
                  onClick={() => setShowExportModal(true)}
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
  
  // Get zone types from database
  const { dbZoneTypeDefaults, fetchZoneTypeDefaults, getDbZoneTypeDefault } = useSettingsStore()
  
  // Fetch zone types on mount if not loaded
  useEffect(() => {
    if (dbZoneTypeDefaults.length === 0) {
      fetchZoneTypeDefaults()
    }
  }, [dbZoneTypeDefaults.length, fetchZoneTypeDefaults])
  
  // Group zone types by category for dropdown
  const zoneTypesByCategory = useMemo(() => {
    const grouped: Record<string, typeof dbZoneTypeDefaults> = {}
    dbZoneTypeDefaults.forEach(zt => {
      const category = zt.category || 'Other'
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(zt)
    })
    return grouped
  }, [dbZoneTypeDefaults])
  
  // Handle zone type selection - bring in defaults
  const handleZoneTypeChange = (zoneTypeId: string) => {
    const updates: Partial<ExtractedSpace> = { zoneType: zoneTypeId }
    
    if (zoneTypeId) {
      const zoneDefaults = getDbZoneTypeDefault(zoneTypeId)
      if (zoneDefaults) {
        // Bring in default fixtures if available
        if (zoneDefaults.default_fixtures && Object.keys(zoneDefaults.default_fixtures).length > 0) {
          // Merge with existing fixtures (don't overwrite user edits)
          updates.fixtures = { ...space.fixtures, ...zoneDefaults.default_fixtures }
        }
        
        // Bring in default equipment if available
        if (zoneDefaults.default_equipment && zoneDefaults.default_equipment.length > 0) {
          // Merge with existing equipment
          const existingEquipTypes = new Set(space.equipment.map(e => e.type))
          const newEquipment = zoneDefaults.default_equipment.filter(
            (e: any) => !existingEquipTypes.has(e.type)
          )
          if (newEquipment.length > 0) {
            updates.equipment = [...space.equipment, ...newEquipment]
          }
        }
        
        console.log(`[Zone Type] Applied defaults for ${zoneDefaults.display_name}:`, {
          fixtures: zoneDefaults.default_fixtures,
          equipment: zoneDefaults.default_equipment
        })
      }
    }
    
    onUpdate(updates)
  }

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
  // Prioritize fixtures from the zone type's visibleFixtures list
  const [showAllFixtures, setShowAllFixtures] = useState(false)
  
  const availableFixtures = useMemo(() => {
    const search = fixtureSearch.toLowerCase()
    const zoneDefaults = space.zoneType ? getDbZoneTypeDefault(space.zoneType) : null
    const visibleFixtureIds = zoneDefaults?.visible_fixtures || []
    
    // If zone type has visible fixtures and we're not showing all, filter to those
    if (visibleFixtureIds.length > 0 && !showAllFixtures && !search) {
      return NYC_FIXTURE_DATABASE.filter(f => 
        visibleFixtureIds.includes(f.id)
      )
    }
    
    // Otherwise show all fixtures, filtered by search
    return NYC_FIXTURE_DATABASE.filter(f => 
      f.name.toLowerCase().includes(search) ||
      f.category.toLowerCase().includes(search)
    ).slice(0, 30) // Limit to 30 results
  }, [fixtureSearch, space.zoneType, getDbZoneTypeDefault, showAllFixtures])

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
              onChange={(e) => handleZoneTypeChange(e.target.value)}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:border-violet-500 focus:outline-none"
            >
              <option value="">Select type...</option>
              {dbZoneTypeDefaults.length > 0 ? (
                // Use database zone types grouped by category
                Object.entries(zoneTypesByCategory).map(([category, types]) => (
                  <optgroup key={category} label={category}>
                    {types.map(zt => (
                      <option key={zt.id} value={zt.id}>{zt.display_name}</option>
                    ))}
                  </optgroup>
                ))
              ) : (
                // Fallback to hardcoded list if database not loaded
                <>
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
                </>
              )}
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
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:border-violet-500 focus:outline-none mb-2"
                autoFocus
              />
              
              {/* Toggle for recommended vs all fixtures */}
              {space.zoneType && getDbZoneTypeDefault(space.zoneType)?.visible_fixtures?.length > 0 && !fixtureSearch && (
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setShowAllFixtures(false)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      !showAllFixtures ? 'bg-violet-600 text-white' : 'bg-surface-700 text-surface-400 hover:text-white'
                    }`}
                  >
                    Recommended ({getDbZoneTypeDefault(space.zoneType)?.visible_fixtures?.length || 0})
                  </button>
                  <button
                    onClick={() => setShowAllFixtures(true)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      showAllFixtures ? 'bg-violet-600 text-white' : 'bg-surface-700 text-surface-400 hover:text-white'
                    }`}
                  >
                    All Fixtures
                  </button>
                </div>
              )}
              
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
