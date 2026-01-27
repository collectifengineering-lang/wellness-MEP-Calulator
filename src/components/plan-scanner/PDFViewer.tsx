import { useState, useEffect, useRef, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker source - use unpkg for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  fileUrl: string // Base64 data URL
  fileName: string
  onImageReady?: (imageDataUrl: string, pageNumber: number) => void
  calibrationMode?: boolean
  onImageClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void
}

export default function PDFViewer({ 
  fileUrl, 
  fileName, 
  onImageReady,
  calibrationMode,
  onImageClick 
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [scale, setScale] = useState(1.5)

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Extract base64 data from data URL
        const base64Data = fileUrl.split(',')[1]
        if (!base64Data) {
          throw new Error('Invalid PDF data')
        }
        
        // Convert base64 to Uint8Array
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        // Load the PDF
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setCurrentPage(1)
      } catch (err) {
        console.error('Error loading PDF:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(`Failed to load PDF: ${errorMessage}. Try exporting as PNG/JPG instead.`)
      } finally {
        setLoading(false)
      }
    }
    
    if (fileUrl) {
      loadPDF()
    }
    
    return () => {
      if (pdfDoc) {
        pdfDoc.destroy()
      }
    }
  }, [fileUrl])

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return
      
      try {
        const page = await pdfDoc.getPage(currentPage)
        const viewport = page.getViewport({ scale })
        
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) return
        
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }
        // @ts-expect-error - pdfjs types are sometimes incorrect
        await page.render(renderContext).promise
        
        // Notify parent of the rendered image
        if (onImageReady) {
          const imageDataUrl = canvas.toDataURL('image/png')
          onImageReady(imageDataUrl, currentPage)
        }
      } catch (err) {
        console.error('Error rendering page:', err)
        setError('Failed to render page')
      }
    }
    
    renderPage()
  }, [pdfDoc, currentPage, scale, onImageReady])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (calibrationMode && onImageClick) {
      onImageClick(e)
    }
  }, [calibrationMode, onImageClick])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">📄</div>
          <p className="text-surface-400">Loading PDF...</p>
          <p className="text-sm text-surface-500">{fileName}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-red-500/10 rounded-2xl p-8 border border-red-500/30 max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-400 mb-2">PDF Error</h3>
          <p className="text-surface-400 mb-4">{error}</p>
          <div className="text-left bg-surface-800 rounded-lg p-4 text-sm">
            <p className="text-white font-medium mb-2">💡 Quick Fix:</p>
            <ol className="text-surface-400 space-y-1 list-decimal list-inside">
              <li>Open PDF in Adobe/Preview</li>
              <li>Export as PNG or JPG</li>
              <li>Upload the image instead</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-800 border-b border-surface-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-surface-700 hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            ← Prev
          </button>
          <span className="text-surface-300 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-surface-700 hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            Next →
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-surface-400 text-sm">Zoom:</span>
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="px-2 py-1 bg-surface-700 hover:bg-surface-600 text-white rounded transition-colors"
          >
            −
          </button>
          <span className="text-surface-300 text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.25))}
            className="px-2 py-1 bg-surface-700 hover:bg-surface-600 text-white rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>
      
      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto p-4 bg-surface-900/50 flex justify-center">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className={`max-w-full h-auto shadow-2xl ${calibrationMode ? 'cursor-crosshair' : ''}`}
          style={{ background: 'white' }}
        />
      </div>
    </div>
  )
}
