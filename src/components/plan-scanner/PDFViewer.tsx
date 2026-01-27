import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  fileUrl: string // Base64 data URL
  fileName: string
  calibrationMode?: boolean
}

export default function PDFViewer({ 
  fileUrl, 
  fileName, 
  calibrationMode
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF load error:', err)
    setError(err.message || 'Failed to load PDF')
    setLoading(false)
  }


  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-red-500/10 rounded-2xl p-8 border border-red-500/30 max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-400 mb-2">PDF Error</h3>
          <p className="text-surface-400 mb-4">{error}</p>
          <div className="text-left bg-surface-800 rounded-lg p-4 text-sm">
            <p className="text-white font-medium mb-2">💡 Try this:</p>
            <ol className="text-surface-400 space-y-1 list-decimal list-inside">
              <li>Make sure it's a valid PDF file</li>
              <li>Try a smaller PDF (under 10MB)</li>
              <li>Export as PNG/JPG as fallback</li>
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
            Page {currentPage} of {numPages || '?'}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="px-3 py-1 bg-surface-700 hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            Next →
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-surface-400 text-sm">Zoom:</span>
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            className="px-2 py-1 bg-surface-700 hover:bg-surface-600 text-white rounded transition-colors"
          >
            −
          </button>
          <span className="text-surface-300 text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="px-2 py-1 bg-surface-700 hover:bg-surface-600 text-white rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>
      
      {/* PDF Display */}
      <div className="flex-1 overflow-auto p-4 bg-surface-900/50 flex justify-center">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-bounce">📄</div>
              <p className="text-surface-400">Loading PDF...</p>
              <p className="text-sm text-surface-500">{fileName}</p>
            </div>
          </div>
        )}
        
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className={calibrationMode ? 'cursor-crosshair' : ''}
        >
          <Page 
            pageNumber={currentPage} 
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-2xl"
          />
        </Document>
      </div>
    </div>
  )
}
