import { useState, useRef } from 'react'
import { ExtractedSpace } from '../../store/useScannerStore'
import * as pdfjsLib from 'pdfjs-dist'

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface Props {
  isOpen: boolean
  onClose: () => void
  onImport: (spaces: ExtractedSpace[]) => void
  existingFloors: string[]
}

type FileType = 'pdf' | 'excel' | 'word' | 'csv' | 'paste'

interface ParsedRow {
  name: string
  sf: number
  floor?: string
  selected: boolean
}

const AI_TABLE_EXTRACTION_PROMPT = `
Extract room/space data from this document. Look for tables or lists containing:
- Room names (e.g., "Living Room", "Bedroom 1", "Kitchen")
- Area/square footage values (look for SF, sq ft, ft², or just numbers)
- Floor information if present (e.g., "1st Floor", "Level 2", "Ground")

Return ONLY valid JSON in this exact format:
{
  "spaces": [
    { "name": "Living Room", "sf": 350, "floor": "1st Floor" },
    { "name": "Kitchen", "sf": 180, "floor": "1st Floor" }
  ]
}

Rules:
- Extract ALL rooms/spaces you can find
- SF should be a number (no units)
- Floor is optional - omit if not mentioned
- DO NOT invent data - only extract what you see
- If you see a total row, skip it
- Common room names: Bedroom, Living Room, Kitchen, Bathroom, Dining Room, Office, Garage, Basement, etc.
`

export default function TableImportModal({ isOpen, onClose, onImport, existingFloors }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [importMethod, setImportMethod] = useState<FileType>('paste')
  const [pastedText, setPastedText] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [defaultFloor, setDefaultFloor] = useState('1st Floor')
  
  // Parse pasted text using AI
  const parseWithAI = async (text: string) => {
    setIsParsing(true)
    setError(null)
    
    try {
      const claudeKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      if (!claudeKey) {
        throw new Error('AI API key not configured')
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: `${AI_TABLE_EXTRACTION_PROMPT}\n\nDocument content:\n${text}`
          }]
        })
      })
      
      if (!response.ok) {
        throw new Error('AI request failed')
      }
      
      const data = await response.json()
      const responseText = data.content?.[0]?.text || ''
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse AI response')
      }
      
      const result = JSON.parse(jsonMatch[0])
      
      if (!result.spaces || !Array.isArray(result.spaces)) {
        throw new Error('No spaces found in document')
      }
      
      const rows: ParsedRow[] = result.spaces
        .filter((s: any) => s.name && s.sf > 0)
        .map((s: any) => ({
          name: s.name,
          sf: Math.round(s.sf),
          floor: s.floor || defaultFloor,
          selected: true
        }))
      
      if (rows.length === 0) {
        throw new Error('No valid spaces found in document')
      }
      
      setParsedRows(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse document')
      setParsedRows([])
    } finally {
      setIsParsing(false)
    }
  }
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsParsing(true)
    setError(null)
    
    try {
      let textContent = ''
      
      if (file.type === 'application/pdf') {
        // Extract text from PDF
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        
        const textParts: string[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          const pageText = content.items
            .map((item: any) => item.str)
            .join(' ')
          textParts.push(pageText)
        }
        textContent = textParts.join('\n')
        
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        // Parse CSV directly
        textContent = await file.text()
        
      } else if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // For Excel, we'll need to read as text and let AI parse
        // In production, you'd use a library like xlsx
        setError('Excel files: Please copy and paste the table content, or export as CSV')
        setIsParsing(false)
        return
        
      } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        // For Word docs, similar approach
        setError('Word files: Please copy and paste the table content')
        setIsParsing(false)
        return
        
      } else {
        // Try to read as text
        textContent = await file.text()
      }
      
      if (textContent.trim()) {
        await parseWithAI(textContent)
      } else {
        throw new Error('Could not extract text from file')
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
    } finally {
      setIsParsing(false)
    }
  }
  
  // Handle paste parsing
  const handleParsePaste = async () => {
    if (!pastedText.trim()) {
      setError('Please paste some content first')
      return
    }
    await parseWithAI(pastedText)
  }
  
  // Toggle row selection
  const toggleRow = (index: number) => {
    setParsedRows(rows => rows.map((r, i) => 
      i === index ? { ...r, selected: !r.selected } : r
    ))
  }
  
  // Update row data
  const updateRow = (index: number, field: 'name' | 'sf' | 'floor', value: string | number) => {
    setParsedRows(rows => rows.map((r, i) => 
      i === index ? { ...r, [field]: value } : r
    ))
  }
  
  // Import selected rows
  const handleImport = () => {
    const selectedRows = parsedRows.filter(r => r.selected)
    if (selectedRows.length === 0) {
      setError('Please select at least one space to import')
      return
    }
    
    const spaces: ExtractedSpace[] = selectedRows.map(row => ({
      id: crypto.randomUUID(),
      name: row.name,
      sf: row.sf,
      floor: row.floor || defaultFloor,
      fixtures: {},
      equipment: [],
      confidence: 100,
      confidenceSource: 'explicit' as const
    }))
    
    onImport(spaces)
    onClose()
    
    // Reset state
    setParsedRows([])
    setPastedText('')
    setError(null)
  }
  
  // Select/deselect all
  const toggleAllRows = () => {
    const allSelected = parsedRows.every(r => r.selected)
    setParsedRows(rows => rows.map(r => ({ ...r, selected: !allSelected })))
  }
  
  if (!isOpen) return null
  
  const selectedCount = parsedRows.filter(r => r.selected).length
  const totalSF = parsedRows.filter(r => r.selected).reduce((sum, r) => sum + r.sf, 0)
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Import Spaces from Table</h2>
            <p className="text-sm text-surface-400 mt-1">
              Import room data from PDF, Excel, Word, or paste directly
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Import Method Tabs */}
        <div className="px-6 py-3 border-b border-surface-700 flex items-center gap-2">
          <button
            onClick={() => setImportMethod('paste')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              importMethod === 'paste' ? 'bg-violet-600 text-white' : 'bg-surface-700 text-surface-400 hover:text-white'
            }`}
          >
            📋 Paste Text
          </button>
          <button
            onClick={() => setImportMethod('pdf')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              importMethod === 'pdf' ? 'bg-violet-600 text-white' : 'bg-surface-700 text-surface-400 hover:text-white'
            }`}
          >
            📄 Upload File
          </button>
        </div>
        
        {/* Default Floor Selection */}
        <div className="px-6 py-3 border-b border-surface-700 flex items-center gap-4">
          <label className="text-sm text-surface-400">Default Floor:</label>
          <select
            value={defaultFloor}
            onChange={(e) => setDefaultFloor(e.target.value)}
            className="px-3 py-1.5 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
          >
            <option value="Cellar">Cellar</option>
            <option value="Basement">Basement</option>
            <option value="Ground Floor">Ground Floor</option>
            <option value="1st Floor">1st Floor</option>
            <option value="2nd Floor">2nd Floor</option>
            <option value="3rd Floor">3rd Floor</option>
            <option value="4th Floor">4th Floor</option>
            <option value="5th Floor">5th Floor</option>
            <option value="Roof">Roof</option>
            {existingFloors.filter(f => !['Cellar', 'Basement', 'Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', '5th Floor', 'Roof'].includes(f)).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Paste Method */}
          {importMethod === 'paste' && parsedRows.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-surface-400">
                Paste your table content below. The AI will extract room names and square footage.
              </p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste table content here...

Example:
Room Name         Area (SF)
Living Room       350
Kitchen           180
Bedroom 1         200
Bathroom          75"
                className="w-full h-64 px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:border-violet-500 font-mono text-sm resize-none"
              />
              <button
                onClick={handleParsePaste}
                disabled={isParsing || !pastedText.trim()}
                className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2"
              >
                {isParsing ? (
                  <>
                    <span className="animate-spin">🔄</span>
                    Parsing...
                  </>
                ) : (
                  <>
                    🤖 Parse with AI
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* File Upload Method */}
          {importMethod === 'pdf' && parsedRows.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-surface-400">
                Upload a PDF or CSV file containing a table of rooms and areas.
              </p>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-surface-600 rounded-xl p-8 text-center hover:border-violet-500 cursor-pointer transition-colors"
              >
                <div className="text-4xl mb-3">📁</div>
                <p className="text-white font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-sm text-surface-400">PDF, CSV supported • Excel/Word: copy & paste instead</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              {isParsing && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="animate-spin">🔄</span>
                  Extracting text and parsing with AI...
                </div>
              )}
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {/* Parsed Results Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-surface-400">
                  Found {parsedRows.length} spaces • {selectedCount} selected • {totalSF.toLocaleString()} SF
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAllRows}
                    className="px-3 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                  >
                    {parsedRows.every(r => r.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={() => {
                      setParsedRows([])
                      setPastedText('')
                    }}
                    className="px-3 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 rounded transition-colors"
                  >
                    Re-parse
                  </button>
                </div>
              </div>
              
              <div className="border border-surface-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface-700">
                    <tr>
                      <th className="w-10 px-3 py-2"></th>
                      <th className="text-left px-3 py-2 text-sm font-medium text-surface-300">Name</th>
                      <th className="text-right px-3 py-2 text-sm font-medium text-surface-300 w-24">SF</th>
                      <th className="text-left px-3 py-2 text-sm font-medium text-surface-300 w-32">Floor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700">
                    {parsedRows.map((row, index) => (
                      <tr key={index} className={row.selected ? 'bg-violet-500/10' : 'bg-surface-800'}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRow(index)}
                            className="w-4 h-4 rounded border-surface-500 bg-surface-700 text-violet-500 focus:ring-violet-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => updateRow(index, 'name', e.target.value)}
                            className="w-full bg-transparent text-white text-sm border-none focus:outline-none focus:ring-1 focus:ring-violet-500 rounded px-1"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={row.sf}
                            onChange={(e) => updateRow(index, 'sf', parseInt(e.target.value) || 0)}
                            className="w-20 bg-transparent text-white text-sm text-right border-none focus:outline-none focus:ring-1 focus:ring-violet-500 rounded px-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={row.floor || defaultFloor}
                            onChange={(e) => updateRow(index, 'floor', e.target.value)}
                            className="w-full bg-surface-700 text-white text-sm border-none rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          >
                            <option value="Cellar">Cellar</option>
                            <option value="Basement">Basement</option>
                            <option value="Ground Floor">Ground Floor</option>
                            <option value="1st Floor">1st Floor</option>
                            <option value="2nd Floor">2nd Floor</option>
                            <option value="3rd Floor">3rd Floor</option>
                            <option value="4th Floor">4th Floor</option>
                            <option value="5th Floor">5th Floor</option>
                            <option value="Roof">Roof</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-700 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg text-sm"
          >
            Cancel
          </button>
          {parsedRows.length > 0 && (
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2"
            >
              ✓ Import {selectedCount} Space{selectedCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
