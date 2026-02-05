import { useState, useEffect, useCallback, useRef } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { exportToExcelFile } from '../../export'
import { exportConceptPDF, exportConceptWord, setReportLogo, getReportLogo } from '../../export/conceptReport'
import { getZoneDefaults } from '../../data/zoneDefaults'
import { getLegacyFixtureCounts } from '../../data/fixtureUtils'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { CalculationResults, ZoneFixtures, SavedReport } from '../../types'
import SDPackageReport from './SDPackageReport'

interface ResultsTabProps {
  calculations: {
    results: CalculationResults | null
    aggregatedFixtures: ZoneFixtures
    totalSF: number
    mechanicalKVA?: { total: number; breakdown: { name: string; kva: number }[] }
  }
  onNavigateToTab?: (tab: 'builder' | 'pool' | 'central') => void
}

export default function ResultsTab({ calculations }: ResultsTabProps) {
  const { currentProject, zones, updateProject } = useProjectStore()
  const { results, aggregatedFixtures, totalSF } = calculations
  const [includeDetailed, setIncludeDetailed] = useState(false)
  const [showDetailedReport, setShowDetailedReport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  
  // Saved reports state
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const [showReportHistory, setShowReportHistory] = useState(false)
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null)
  const [newReportName, setNewReportName] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)
  
  // Edit mode state for inline report editing - track which sections are being edited
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set())
  
  // SD Package Report state
  const [showSDPackage, setShowSDPackage] = useState(false)
  
  // Logo state - initialize from project or global storage
  const GLOBAL_LOGO_HISTORY_KEY = 'mep_calculator_logo_history'
  const [showLogoHistory, setShowLogoHistory] = useState(false)
  const [logoHistory, setLogoHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(GLOBAL_LOGO_HISTORY_KEY)
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  
  // Get initial logo from project, then global history, then old storage
  const getInitialLogo = () => {
    if (currentProject?.reportLogo?.currentLogoUrl) return currentProject.reportLogo.currentLogoUrl
    if (logoHistory.length > 0) return logoHistory[0]
    return getReportLogo().dataUrl
  }
  
  const [logoPreview, setLogoPreview] = useState<string | null>(getInitialLogo)
  const logoInputRef = useRef<HTMLInputElement>(null)
  
  // Track when calculations change to show "updated" indicator
  useEffect(() => {
    if (results) {
      setLastUpdated(new Date())
    }
  }, [results, zones, currentProject?.dhwSettings, currentProject?.mechanicalSettings])
  
  // Load saved reports when project changes
  const loadSavedReports = useCallback(async () => {
    if (!currentProject?.id || !isSupabaseConfigured()) return
    
    setLoadingReports(true)
    try {
      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Cast to any to handle untyped table
      const reports = (data || []) as Array<{
        id: string
        project_id: string
        name: string
        version: number
        created_at: string
        notes?: string
        snapshot: SavedReport['snapshot']
      }>
      
      setSavedReports(reports.map(r => ({
        id: r.id,
        projectId: r.project_id,
        name: r.name,
        version: r.version,
        createdAt: new Date(r.created_at),
        notes: r.notes,
        snapshot: r.snapshot
      })))
    } catch (error) {
      console.error('Error loading saved reports:', error)
    }
    setLoadingReports(false)
  }, [currentProject?.id])
  
  useEffect(() => {
    loadSavedReports()
  }, [loadSavedReports])
  
  // Generate and save a new report
  const generateReport = async (name: string) => {
    if (!currentProject || !results) return
    
    setSavingReport(true)
    try {
      const nextVersion = savedReports.length > 0 
        ? Math.max(...savedReports.map(r => r.version)) + 1 
        : 1
      
      const snapshot: SavedReport['snapshot'] = {
        totalSF,
        zoneCount: zones.length,
        hvac: {
          totalTons: results.hvac.totalTons,
          totalMBH: results.hvac.totalMBH,
          totalVentCFM: results.hvac.totalVentCFM,
          totalExhaustCFM: results.hvac.totalExhaustCFM,
          dehumidLbHr: results.hvac.dehumidLbHr,
          dehumidTons: results.hvac.dehumidTons,
          poolChillerTons: results.hvac.poolChillerTons,
          totalPlantTons: results.hvac.totalPlantTons,
          rtuCount: results.hvac.rtuCount
        },
        electrical: {
          totalKW: results.electrical.totalKW,
          totalKVA: results.electrical.totalKVA,
          amps_208v: results.electrical.amps_208v,
          amps_480v: results.electrical.amps_480v,
          recommendedService: results.electrical.recommendedService,
          panelCount: results.electrical.panelCount
        },
        plumbing: {
          totalWSFU: results.plumbing.totalWSFU,
          totalDFU: results.plumbing.totalDFU,
          peakGPM: results.plumbing.peakGPM,
          coldWaterMainSize: results.plumbing.coldWaterMainSize,
          hotWaterMainSize: results.plumbing.hotWaterMainSize,
          recommendedDrainSize: results.plumbing.recommendedDrainSize
        },
        dhw: {
          peakGPH: results.dhw.peakGPH,
          grossBTU: results.dhw.grossBTU,
          storageGallons: results.dhw.storageGallons,
          tanklessUnits: results.dhw.tanklessUnits
        },
        gas: {
          totalMBH: results.gas.totalMBH,
          totalCFH: results.gas.totalCFH,
          recommendedPipeSize: results.gas.recommendedPipeSize
        },
        zones: zones.map(z => ({
          name: z.name,
          type: z.type,
          sf: z.sf
        }))
      }
      
      if (isSupabaseConfigured()) {
        // Use any type to bypass strict Supabase typing for custom table
        const { data, error } = await (supabase
          .from('saved_reports') as any)
          .insert({
            project_id: currentProject.id,
            name: name || `Report v${nextVersion}`,
            version: nextVersion,
            snapshot
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Cast response to handle untyped table
        const reportData = data as { id: string; name: string; version: number; created_at: string }
        
        // Add to local state
        const newReport: SavedReport = {
          id: reportData.id,
          projectId: currentProject.id,
          name: reportData.name,
          version: reportData.version,
          createdAt: new Date(reportData.created_at),
          snapshot
        }
        setSavedReports(prev => [newReport, ...prev])
      }
      
      setShowNameModal(false)
      setNewReportName('')
    } catch (error) {
      console.error('Error saving report:', error)
      alert('Failed to save report. Check console for details.')
    }
    setSavingReport(false)
  }
  
  // Delete a saved report
  const deleteReport = async (reportId: string) => {
    if (!confirm('Delete this saved report?')) return
    
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('saved_reports')
          .delete()
          .eq('id', reportId)
        
        if (error) throw error
      }
      
      setSavedReports(prev => prev.filter(r => r.id !== reportId))
      if (selectedReport?.id === reportId) {
        setSelectedReport(null)
      }
    } catch (error) {
      console.error('Error deleting report:', error)
    }
  }

  if (!currentProject || !results) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-surface-400">Add zones to generate the report</p>
      </div>
    )
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await exportConceptPDF(currentProject, zones, results, aggregatedFixtures, totalSF, includeDetailed)
    } catch (error) {
      console.error('PDF export error:', error)
    }
    setExporting(false)
  }

  const handleExportWord = async () => {
    setExporting(true)
    try {
      await exportConceptWord(currentProject, zones, results, aggregatedFixtures, totalSF)
    } catch (error) {
      console.error('Word export error:', error)
    }
    setExporting(false)
  }

  const handleExportExcel = () => {
    setExporting(true)
    try {
      exportToExcelFile(currentProject, zones, results, aggregatedFixtures)
    } catch (error) {
      console.error('Excel export error:', error)
    }
    setExporting(false)
  }
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2MB')
      return
    }
    
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      // Extract base64 portion (without data:image/... prefix)
      const base64 = dataUrl.split(',')[1]
      setLogoPreview(dataUrl)
      setReportLogo(base64, dataUrl)
      
      // Save to project
      if (currentProject) {
        updateProject({
          reportLogo: {
            currentLogoUrl: dataUrl,
            previousLogos: currentProject.reportLogo?.previousLogos || []
          }
        })
      }
      
      // Add to global history (at front, limit to 10)
      const newHistory = [dataUrl, ...logoHistory.filter(l => l !== dataUrl)].slice(0, 10)
      setLogoHistory(newHistory)
      localStorage.setItem(GLOBAL_LOGO_HISTORY_KEY, JSON.stringify(newHistory))
    }
    reader.readAsDataURL(file)
    
    // Clear input for re-upload of same file
    if (logoInputRef.current) logoInputRef.current.value = ''
  }
  
  const selectLogo = (logoUrl: string) => {
    setLogoPreview(logoUrl)
    const base64 = logoUrl.split(',')[1]
    setReportLogo(base64, logoUrl)
    
    // Save to project
    if (currentProject) {
      updateProject({
        reportLogo: {
          currentLogoUrl: logoUrl,
          previousLogos: currentProject.reportLogo?.previousLogos || []
        }
      })
    }
    
    // Move to front of history
    const newHistory = [logoUrl, ...logoHistory.filter(l => l !== logoUrl)].slice(0, 10)
    setLogoHistory(newHistory)
    localStorage.setItem(GLOBAL_LOGO_HISTORY_KEY, JSON.stringify(newHistory))
    setShowLogoHistory(false)
  }
  
  const clearLogo = () => {
    setLogoPreview(null)
    setReportLogo(null, null)
    if (logoInputRef.current) logoInputRef.current.value = ''
    
    // Clear from project
    if (currentProject) {
      updateProject({
        reportLogo: {
          currentLogoUrl: undefined,
          previousLogos: currentProject.reportLogo?.previousLogos || []
        }
      })
    }
  }

  const climateLabels: Record<string, string> = {
    hot_humid: 'Hot & Humid',
    temperate: 'Temperate',
    cold_dry: 'Cold & Dry',
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto bg-surface-950">
      {/* Export Bar */}
      <div className="sticky top-0 z-10 bg-surface-800 border-b border-surface-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo Upload */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            {logoPreview ? (
              <div className="flex items-center gap-2 bg-surface-700 px-2 py-1 rounded-lg relative">
                <button
                  onClick={() => setShowLogoHistory(!showLogoHistory)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  title="Click to change logo"
                >
                  <img src={logoPreview} alt="Logo" className="h-6 w-auto max-w-[60px] object-contain" />
                  <svg className="w-3 h-3 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={clearLogo}
                  className="text-surface-400 hover:text-red-400 transition-colors"
                  title="Remove logo"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* Logo History Dropdown */}
                {showLogoHistory && logoHistory.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 bg-surface-800 border border-surface-600 rounded-lg shadow-xl z-50 p-2 min-w-[200px]">
                    <p className="text-xs text-surface-400 mb-2">Select from previous logos:</p>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {logoHistory.map((logo, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectLogo(logo)}
                          className={`p-1.5 bg-white rounded hover:ring-2 hover:ring-primary-500 transition-all ${
                            logo === logoPreview ? 'ring-2 ring-primary-500' : ''
                          }`}
                        >
                          <img src={logo} alt={`Logo ${idx + 1}`} className="h-6 w-full object-contain" />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { logoInputRef.current?.click(); setShowLogoHistory(false) }}
                      className="w-full text-xs text-primary-400 hover:text-primary-300 py-1"
                    >
                      + Upload new logo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <label 
                htmlFor="logo-upload"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add Logo
              </label>
            )}
          </div>
          <span className="text-surface-600">|</span>
          <label className="flex items-center gap-2 text-sm text-surface-300">
            <input
              type="checkbox"
              checked={includeDetailed}
              onChange={(e) => setIncludeDetailed(e.target.checked)}
              className="rounded bg-surface-700 border-surface-600 text-primary-500 focus:ring-primary-500"
            />
            Include detailed
          </label>
          <span className="text-surface-600">|</span>
          <button
            onClick={() => setShowDetailedReport(!showDetailedReport)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showDetailedReport 
                ? 'bg-primary-600 text-white' 
                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {showDetailedReport ? 'Hide' : 'Show'} Details
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Generate Report Button */}
          <button
            onClick={() => setShowNameModal(true)}
            disabled={savingReport}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {savingReport ? 'Saving...' : 'Save Snapshot'}
          </button>
          
          {/* Report History Button */}
          <button
            onClick={() => setShowReportHistory(!showReportHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showReportHistory || savedReports.length > 0
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-surface-700 hover:bg-surface-600 text-surface-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History {savedReports.length > 0 && `(${savedReports.length})`}
          </button>
          
          <span className="text-surface-600">|</span>
          
          {/* SD Package Report Button */}
          <button
            onClick={() => setShowSDPackage(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            📄 SD Package
          </button>
          
          <span className="text-surface-600">|</span>
          
          {/* Concept Report Exports */}
          <div className="flex items-center gap-1 bg-surface-700/50 rounded-lg p-1">
            <span className="text-xs text-surface-400 px-2">Concept:</span>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
            <button
              onClick={handleExportWord}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Word
            </button>
          </div>
          
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
        </div>
      </div>

      {/* Report Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Save Report Snapshot</h3>
            <p className="text-sm text-surface-400 mb-4">
              This will save a copy of the current calculations for historical reference.
            </p>
            <input
              type="text"
              value={newReportName}
              onChange={(e) => setNewReportName(e.target.value)}
              placeholder={`Report v${savedReports.length + 1}`}
              className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  generateReport(newReportName || `Report v${savedReports.length + 1}`)
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowNameModal(false); setNewReportName('') }}
                className="px-4 py-2 text-surface-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => generateReport(newReportName || `Report v${savedReports.length + 1}`)}
                disabled={savingReport}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {savingReport ? 'Saving...' : 'Save Report'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Report History Panel */}
      {showReportHistory && (
        <div className="bg-surface-800 border-b border-surface-700">
          <div className="max-w-4xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Saved Report History</h3>
              <button 
                onClick={() => setShowReportHistory(false)}
                className="text-surface-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {loadingReports ? (
              <p className="text-surface-400 text-sm">Loading reports...</p>
            ) : savedReports.length === 0 ? (
              <p className="text-surface-400 text-sm">No saved reports yet. Click "Save Snapshot" to create one.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedReport?.id === report.id
                        ? 'bg-primary-600/20 border border-primary-500'
                        : 'bg-surface-700 hover:bg-surface-600'
                    }`}
                    onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{report.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-surface-600 text-surface-300 rounded">
                          v{report.version}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-surface-400">
                        <span>{report.createdAt.toLocaleDateString()} {report.createdAt.toLocaleTimeString()}</span>
                        <span>{report.snapshot.totalSF.toLocaleString()} SF</span>
                        <span>{report.snapshot.zoneCount} zones</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteReport(report.id) }}
                        className="p-1.5 text-surface-400 hover:text-red-400 transition-colors"
                        title="Delete report"
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
            
            {/* Selected Report Comparison */}
            {selectedReport && results && (
              <div className="mt-4 p-4 bg-surface-900 rounded-lg">
                <h4 className="text-sm font-semibold text-white mb-3">
                  Comparing: {selectedReport.name} vs Current
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <ComparisonItem
                    label="Total SF"
                    saved={selectedReport.snapshot.totalSF}
                    current={totalSF}
                    unit=""
                  />
                  <ComparisonItem
                    label="Cooling"
                    saved={selectedReport.snapshot.hvac.totalTons}
                    current={results.hvac.totalTons}
                    unit=" tons"
                  />
                  <ComparisonItem
                    label="Electrical"
                    saved={selectedReport.snapshot.electrical.totalKW}
                    current={results.electrical.totalKW}
                    unit=" kW"
                  />
                  <ComparisonItem
                    label="Service"
                    saved={selectedReport.snapshot.electrical.amps_208v}
                    current={results.electrical.amps_208v}
                    unit="A"
                  />
                  <ComparisonItem
                    label="Heating"
                    saved={selectedReport.snapshot.hvac.totalMBH}
                    current={results.hvac.totalMBH}
                    unit=" MBH"
                  />
                  <ComparisonItem
                    label="Ventilation"
                    saved={selectedReport.snapshot.hvac.totalVentCFM}
                    current={results.hvac.totalVentCFM}
                    unit=" CFM"
                  />
                  <ComparisonItem
                    label="DHW Storage"
                    saved={selectedReport.snapshot.dhw.storageGallons}
                    current={results.dhw.storageGallons}
                    unit=" gal"
                  />
                  <ComparisonItem
                    label="Gas"
                    saved={selectedReport.snapshot.gas.totalCFH}
                    current={results.gas.totalCFH}
                    unit=" CFH"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Report Preview */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Report Paper */}
        <div className="bg-white text-gray-900 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-surface-900 to-surface-800 px-8 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                {logoPreview ? (
                  <img src={logoPreview} alt="Company Logo" className="h-10 w-auto mb-2" />
                ) : (
                  <p className="text-sm text-surface-400 mb-1">COLLECTIF Engineering PLLC</p>
                )}
                <h1 className="text-2xl font-bold">{currentProject.name}</h1>
                <p className="text-sm text-surface-300 mt-1">MEP Concept Report</p>
              </div>
              <div className="text-right text-sm text-surface-400">
                <p>{new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-surface-400">
              <span>{totalSF.toLocaleString()} SF</span>
              <span>•</span>
              <span>{climateLabels[currentProject.climate]}</span>
              <span>•</span>
              <span>{zones.length} Zones</span>
            </div>
          </div>

          {/* Summary Cards */}
          <section className="px-8 py-4 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">HVAC</div>
                <div className="text-lg font-bold text-blue-900">{results.hvac.totalTons} Tons</div>
                <div className="text-xs text-blue-700">{results.hvac.totalMBH.toLocaleString()} MBH</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Electrical</div>
                <div className="text-lg font-bold text-amber-900">{results.electrical.totalKW.toLocaleString()} kW</div>
                <div className="text-xs text-amber-700">{results.electrical.recommendedService}</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Plumbing</div>
                <div className="text-lg font-bold text-emerald-900">{results.plumbing.peakGPM} GPM</div>
                <div className="text-xs text-emerald-700">{results.plumbing.totalWSFU} WSFU</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-xs text-red-600 font-medium uppercase tracking-wide">Gas</div>
                <div className="text-lg font-bold text-red-900">{results.gas.totalCFH.toLocaleString()} CFH</div>
                <div className="text-xs text-red-700">{results.gas.totalMBH.toLocaleString()} MBH</div>
              </div>
            </div>
          </section>

          {/* Executive Summary */}
          <section className="px-8 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-900">Executive Summary</h2>
              <button 
                onClick={() => setEditingSections(prev => {
                  const next = new Set(prev)
                  if (next.has('executiveSummary')) next.delete('executiveSummary')
                  else next.add('executiveSummary')
                  return next
                })}
                className={`text-xs px-2 py-1 rounded ${editingSections.has('executiveSummary') ? 'bg-primary-600 text-white' : 'text-primary-600 hover:bg-primary-50'}`}
              >
                {editingSections.has('executiveSummary') ? '✓ Done' : '✎ Edit'}
              </button>
            </div>
            {editingSections.has('executiveSummary') ? (
              <textarea
                value={currentProject.resultAdjustments?.executiveSummary || ''}
                onChange={(e) => updateProject({
                  resultAdjustments: { ...currentProject.resultAdjustments, executiveSummary: e.target.value }
                })}
                placeholder={`This report summarizes the MEP requirements for the ~${Math.round(totalSF / 1000)}k SF facility. The analysis identifies utility service requirements, equipment sizing, and system recommendations for mechanical, electrical, plumbing, and fire protection systems.`}
                className="w-full text-sm text-gray-600 leading-relaxed p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
              />
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                {currentProject.resultAdjustments?.executiveSummary || `This report summarizes the MEP requirements for the ~${Math.round(totalSF / 1000)}k SF facility. The analysis identifies utility service requirements, equipment sizing, and system recommendations for mechanical, electrical, plumbing, and fire protection systems.`}
              </p>
            )}
          </section>

          {/* HVAC Section */}
          <section className="px-8 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-900">1. Mechanical (HVAC)</h2>
              <button 
                onClick={() => setEditingSections(prev => {
                  const next = new Set(prev)
                  if (next.has('hvac')) next.delete('hvac')
                  else next.add('hvac')
                  return next
                })}
                className={`text-xs px-2 py-1 rounded ${editingSections.has('hvac') ? 'bg-primary-600 text-white' : 'text-primary-600 hover:bg-primary-50'}`}
              >
                {editingSections.has('hvac') ? '✓ Done' : '✎ Edit'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-1">Cooling / Heating</h3>
                <ul className="space-y-0.5 text-xs">
                  <li>Space Cooling: <span className="font-mono font-medium">{results.hvac.totalTons} Tons</span></li>
                  {results.hvac.poolChillerTons > 0 && (
                    <li className="pl-2">└ Pool Chiller: <span className="font-mono">{results.hvac.poolChillerTons} Tons</span></li>
                  )}
                  {results.hvac.dehumidLbHr > 0 && (
                    <>
                      <li>Dehumidification: <span className="font-mono">{results.hvac.dehumidLbHr} lb/hr</span></li>
                      <li className="pl-2">└ Est. Cooling: <span className="font-mono">{results.hvac.dehumidTons} Tons</span></li>
                    </>
                  )}
                  {results.hvac.totalPlantTons !== results.hvac.totalTons && (
                    <li className="font-medium">Total Plant: <span className="font-mono">{results.hvac.totalPlantTons} Tons</span></li>
                  )}
                  <li>SF/Ton (Total): <span className="font-mono font-medium">{results.hvac.totalPlantTons > 0 ? Math.round(totalSF / results.hvac.totalPlantTons) : '—'} SF/Ton</span></li>
                  <li>Heating: <span className="font-mono font-medium">{results.hvac.totalMBH.toLocaleString()} MBH</span></li>
                  <li>RTU/AHU Count: ~{results.hvac.rtuCount} units</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-1">Ventilation / Exhaust</h3>
                <ul className="space-y-0.5 text-xs">
                  <li>Fresh Air (OA): <span className="font-mono font-medium">{results.hvac.totalVentCFM.toLocaleString()} CFM</span></li>
                  <li>Exhaust: <span className="font-mono font-medium">{results.hvac.totalExhaustCFM.toLocaleString()} CFM</span></li>
                </ul>
              </div>
            </div>
            {/* MEP Narrative from Central Plant */}
            {currentProject.mepNarratives?.hvac && (
              <div className="mt-3 text-xs text-gray-600 bg-blue-50 p-3 rounded border-l-2 border-blue-400 whitespace-pre-line">
                {currentProject.mepNarratives.hvac}
              </div>
            )}
            {/* HVAC Notes - Editable */}
            {editingSections.has('hvac') ? (
              <textarea
                value={currentProject.resultAdjustments?.hvacNotes || ''}
                onChange={(e) => updateProject({
                  resultAdjustments: { ...currentProject.resultAdjustments, hvacNotes: e.target.value }
                })}
                placeholder="Add notes about HVAC systems, special requirements, equipment recommendations..."
                className="w-full mt-3 text-xs text-gray-600 leading-relaxed p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
              />
            ) : currentProject.resultAdjustments?.hvacNotes ? (
              <div className="mt-3 text-xs text-gray-600 bg-gray-100 p-2 rounded border-l-2 border-gray-400">
                <span className="font-semibold text-gray-700">Additional Notes: </span>
                {currentProject.resultAdjustments.hvacNotes}
              </div>
            ) : null}
          </section>

          {/* Electrical Section */}
          <section className="px-8 py-4 border-b border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-2">2. Electrical / Fire Alarm</h2>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-1">Service Sizing</h3>
                <ul className="space-y-0.5 text-xs">
                  <li>Connected Load: <span className="font-mono font-medium">{results.electrical.totalKW.toLocaleString()} kW / {results.electrical.totalKVA.toLocaleString()} kVA</span></li>
                  <li>@ 208V/3PH: <span className="font-mono font-medium">{results.electrical.amps_208v.toLocaleString()}A</span></li>
                  <li>@ 480V/3PH: <span className="font-mono font-medium">{results.electrical.amps_480v.toLocaleString()}A</span></li>
                  <li>Recommended: <span className="font-mono font-bold text-primary-600">{results.electrical.recommendedService}</span></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-1">Distribution</h3>
                <ul className="space-y-0.5 text-xs">
                  <li>Panelboards: ~{results.electrical.panelCount} required</li>
                  <li>Emergency: Generator for egress/life safety</li>
                  <li>Fire Alarm: Manual pull stations, horn/strobes</li>
                </ul>
              </div>
            </div>
            {/* MEP Narrative from Central Plant */}
            {currentProject.mepNarratives?.electrical && (
              <div className="mt-3 text-xs text-gray-600 bg-amber-50 p-3 rounded border-l-2 border-amber-400 whitespace-pre-line">
                {currentProject.mepNarratives.electrical}
              </div>
            )}
          </section>

          {/* Plumbing Section */}
          <section className="px-8 py-4 border-b border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-2">3. Plumbing</h2>
            <div className="grid grid-cols-3 gap-4 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-1">Domestic Water</h3>
                <ul className="space-y-0.5 text-xs">
                  <li>CW Main: <span className="font-mono font-medium">{results.plumbing.coldWaterMainSize}</span></li>
                  <li>HW Main: <span className="font-mono font-medium">{results.plumbing.hotWaterMainSize}</span></li>
                  <li>Peak: <span className="font-mono font-medium">{results.plumbing.peakGPM} GPM</span></li>
                  <li>WSFU: <span className="font-mono">{results.plumbing.totalWSFU}</span></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-1">Hot Water Plant</h3>
                <ul className="space-y-0.5 text-xs">
                  <li>{results.dhw.tanklessUnits} Water Heaters</li>
                  <li><span className="font-mono font-medium">{(results.dhw.grossBTU / 1000).toLocaleString()} MBH</span> total</li>
                  <li>Storage: <span className="font-mono">{results.dhw.storageGallons.toLocaleString()} gal</span></li>
                  <li>Peak GPH: <span className="font-mono">{results.dhw.peakGPH}</span></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wide mb-1">Sanitary / Gas</h3>
                <ul className="space-y-0.5 text-xs">
                  <li>Drain: <span className="font-mono font-medium">{results.plumbing.recommendedDrainSize}</span> ({results.plumbing.totalDFU} DFU)</li>
                  <li>Gas: <span className="font-mono font-medium">{results.gas.totalCFH.toLocaleString()} CFH</span></li>
                  <li>Gas Pipe: <span className="font-mono">{results.gas.recommendedPipeSize}</span></li>
                  <li>Min Pressure: {results.gas.recommendedPressure}</li>
                </ul>
              </div>
            </div>
            {/* MEP Narrative from Central Plant */}
            {currentProject.mepNarratives?.plumbing && (
              <div className="mt-3 text-xs text-gray-600 bg-emerald-50 p-3 rounded border-l-2 border-emerald-400 whitespace-pre-line">
                {currentProject.mepNarratives.plumbing}
              </div>
            )}
          </section>

          {/* Fire Protection Section */}
          <section className="px-8 py-4 border-b border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-2">4. Fire Protection</h2>
            <ul className="text-xs text-gray-700 space-y-0.5">
              <li>• Occupancy: Group A-3 (Assembly), NFPA-13 compliant wet pipe system</li>
              <li>• Est. Sprinkler Count: ~{Math.ceil(totalSF / 130)} heads ({Math.round(130)} SF/head average)</li>
              <li>• High-temp heads required for sauna/steam areas (200°F+)</li>
            </ul>
            {/* MEP Narrative from Central Plant */}
            {currentProject.mepNarratives?.fireProtection && (
              <div className="mt-3 text-xs text-gray-600 bg-red-50 p-3 rounded border-l-2 border-red-400 whitespace-pre-line">
                {currentProject.mepNarratives.fireProtection}
              </div>
            )}
          </section>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 text-center text-xs text-gray-500">
            <p>Generated by COLLECTIF Engineering MEP Calculator</p>
            <p className="mt-1">Contingency: {(currentProject.contingency * 100).toFixed(0)}% applied to all calculations</p>
            <p className="mt-1 text-green-600">✓ Live calculations • Last updated: {lastUpdated.toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Detailed Zone & System Report */}
        {showDetailedReport && (
          <div className="bg-white text-gray-900 rounded-lg shadow-2xl overflow-hidden mt-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-700 to-primary-600 px-8 py-4 text-white">
              <h2 className="text-xl font-bold">Detailed Zone & System Report</h2>
              <p className="text-sm text-primary-200 mt-1">Attachment to MEP Due Diligence Report</p>
            </div>

            {/* Zone Schedule */}
            <section className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Zone Schedule</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Zone Name</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Type</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">SF</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">kW</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Tons</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Vent CFM</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Exh CFM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((zone, idx) => {
                      const defaults = getZoneDefaults(zone.type)
                      
                      // RATE-BASED: Lighting + Receptacle (per SF)
                      const lightingKW = zone.sf * zone.rates.lighting_w_sf / 1000
                      const receptacleKW = zone.sf * zone.rates.receptacle_va_sf / 1000
                      
                      // EQUIPMENT: Line items ONLY - NO FALLBACKS
                      const lineItemsKW = (zone.lineItems || []).reduce((sum, li) => {
                        const unit = li.unit?.toLowerCase() || ''
                        if (unit === 'kw') return sum + li.quantity * li.value
                        if (unit === 'w') return sum + (li.quantity * li.value) / 1000
                        if (unit === 'hp') return sum + li.quantity * li.value * 0.746
                        return sum
                      }, 0)
                      
                      const totalKW = lightingKW + receptacleKW + lineItemsKW
                      const tons = zone.rates.cooling_sf_ton > 0 ? zone.sf / zone.rates.cooling_sf_ton : 0
                      
                      // VENTILATION: Stored value + line items
                      const baseVentCFM = zone.ventilationCfm ?? 0
                      const lineItemVentCFM = (zone.lineItems || []).reduce((sum, li) => {
                        if (li.category === 'ventilation' && li.unit?.toLowerCase() === 'cfm') {
                          return sum + li.quantity * li.value
                        }
                        return sum
                      }, 0)
                      const ventCFM = baseVentCFM + lineItemVentCFM
                      
                      // EXHAUST: Stored value + line items
                      const baseExhaustCFM = zone.exhaustCfm ?? 0
                      const lineItemExhaustCFM = (zone.lineItems || []).reduce((sum, li) => {
                        if (li.category === 'exhaust' && li.unit?.toLowerCase() === 'cfm') {
                          return sum + li.quantity * li.value
                        }
                        return sum
                      }, 0)
                      const exhaustCFM = baseExhaustCFM + lineItemExhaustCFM
                      
                      return (
                        <tr key={zone.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-2 px-3 font-medium text-gray-900">{zone.name}</td>
                          <td className="py-2 px-3 text-gray-600">{defaults.displayName}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{zone.sf.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{totalKW.toFixed(1)}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{tons.toFixed(1)}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{Math.round(ventCFM).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{Math.round(exhaustCFM).toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-200 font-semibold">
                      <td className="py-2 px-3" colSpan={2}>TOTAL</td>
                      <td className="py-2 px-3 text-right font-mono">{totalSF.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono">{results.electrical.totalKW.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono">{results.hvac.totalTons.toFixed(1)}</td>
                      <td className="py-2 px-3 text-right font-mono">{results.hvac.totalVentCFM.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono">{results.hvac.totalExhaustCFM.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Fixture Schedule */}
            <section className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Plumbing Fixture Schedule</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Zone Name</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">WCs</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">LAVs</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Showers</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Floor Drains</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Service Sinks</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Washers</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Dryers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((zone, idx) => {
                      // Convert dynamic fixtures to legacy format for display
                      const legacyFixtures = getLegacyFixtureCounts(zone.fixtures)
                      const hasAnyFixtures = legacyFixtures.wcs > 0 || legacyFixtures.lavs > 0 || 
                        legacyFixtures.showers > 0 || legacyFixtures.floorDrains > 0 || 
                        legacyFixtures.serviceSinks > 0 || legacyFixtures.washingMachines > 0 || 
                        legacyFixtures.dryers > 0
                      
                      if (!hasAnyFixtures) return null
                      
                      return (
                        <tr key={zone.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-2 px-3 font-medium text-gray-900">{zone.name}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{legacyFixtures.wcs || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{legacyFixtures.lavs || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{legacyFixtures.showers || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{legacyFixtures.floorDrains || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{legacyFixtures.serviceSinks || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{legacyFixtures.washingMachines || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{legacyFixtures.dryers || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-200 font-semibold">
                      <td className="py-2 px-3">TOTAL</td>
                      <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).wcs}</td>
                      <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).lavs}</td>
                      <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).showers}</td>
                      <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).floorDrains}</td>
                      <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).serviceSinks}</td>
                      <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).washingMachines}</td>
                      <td className="py-2 px-3 text-right font-mono">{getLegacyFixtureCounts(aggregatedFixtures).dryers}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Gas Equipment Schedule */}
            {results.gas.equipmentBreakdown.length > 0 && (
              <section className="px-8 py-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Gas Equipment Schedule</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Equipment</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">MBH</th>
                        <th className="text-right py-2 px-3 font-semibold text-gray-700">CFH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.gas.equipmentBreakdown.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-2 px-3 text-gray-900">{item.name}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{item.mbh.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{item.cfh.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-200 font-semibold">
                        <td className="py-2 px-3">TOTAL (w/ {(currentProject.contingency * 100).toFixed(0)}% contingency)</td>
                        <td className="py-2 px-3 text-right font-mono">{results.gas.totalMBH.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono">{results.gas.totalCFH.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {/* Electrical Load Summary */}
            <section className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Electrical Load Summary</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Connected Load</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Total kW:</dt>
                      <dd className="font-mono font-medium">{results.electrical.totalKW.toLocaleString()} kW</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Total kVA:</dt>
                      <dd className="font-mono font-medium">{results.electrical.totalKVA.toLocaleString()} kVA</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Service Sizing</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">@ 208V/3PH:</dt>
                      <dd className="font-mono font-medium">{results.electrical.amps_208v.toLocaleString()}A</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">@ 480V/3PH:</dt>
                      <dd className="font-mono font-medium">{results.electrical.amps_480v.toLocaleString()}A</dd>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                      <dt className="text-gray-900 font-semibold">Recommended:</dt>
                      <dd className="font-mono font-bold text-primary-600">{results.electrical.recommendedService}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            {/* HVAC Summary */}
            <section className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">HVAC Summary</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Cooling Plant</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Space Cooling:</dt>
                      <dd className="font-mono font-medium">{results.hvac.totalTons} Tons</dd>
                    </div>
                    {results.hvac.poolChillerTons > 0 && (
                      <div className="flex justify-between pl-2">
                        <dt className="text-gray-500">└ Pool Chiller:</dt>
                        <dd className="font-mono">{results.hvac.poolChillerTons} Tons</dd>
                      </div>
                    )}
                    {results.hvac.dehumidLbHr > 0 && (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Dehumidification:</dt>
                          <dd className="font-mono font-medium">{results.hvac.dehumidLbHr} lb/hr</dd>
                        </div>
                        <div className="flex justify-between pl-2">
                          <dt className="text-gray-500">└ Est. Cooling:</dt>
                          <dd className="font-mono">{results.hvac.dehumidTons} Tons</dd>
                        </div>
                      </>
                    )}
                    {results.hvac.totalPlantTons !== results.hvac.totalTons && (
                      <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                        <dt className="text-gray-900 font-semibold">Total Plant:</dt>
                        <dd className="font-mono font-bold">{results.hvac.totalPlantTons} Tons</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-gray-600">SF/Ton (Overall):</dt>
                      <dd className="font-mono font-medium">{results.hvac.totalPlantTons > 0 ? Math.round(totalSF / results.hvac.totalPlantTons) : '—'} SF/Ton</dd>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                      <dt className="text-gray-600">Total Heating:</dt>
                      <dd className="font-mono font-medium">{results.hvac.totalMBH.toLocaleString()} MBH</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Ventilation / Exhaust</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Fresh Air:</dt>
                      <dd className="font-mono font-medium">{results.hvac.totalVentCFM.toLocaleString()} CFM</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Exhaust:</dt>
                      <dd className="font-mono font-medium">{results.hvac.totalExhaustCFM.toLocaleString()} CFM</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Est. RTU Count:</dt>
                      <dd className="font-mono font-medium">{results.hvac.rtuCount} units</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            {/* Plumbing Summary */}
            <section className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Plumbing Summary</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Cold Water</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">WSFU:</dt>
                      <dd className="font-mono font-medium">{results.plumbing.totalWSFU}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Peak GPM:</dt>
                      <dd className="font-mono font-medium">{results.plumbing.peakGPM}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Main Size:</dt>
                      <dd className="font-mono font-medium">{results.plumbing.coldWaterMainSize}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Hot Water</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Peak GPH:</dt>
                      <dd className="font-mono font-medium">{results.dhw.peakGPH}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Total BTU:</dt>
                      <dd className="font-mono font-medium">{(results.dhw.grossBTU / 1000).toLocaleString()} MBH</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Tankless Units:</dt>
                      <dd className="font-mono font-medium">{results.dhw.tanklessUnits}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Storage:</dt>
                      <dd className="font-mono font-medium">{results.dhw.storageGallons} gal</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Sanitary</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Total DFU:</dt>
                      <dd className="font-mono font-medium">{results.plumbing.totalDFU}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Drain Size:</dt>
                      <dd className="font-mono font-medium">{results.plumbing.recommendedDrainSize}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Meter Size:</dt>
                      <dd className="font-mono font-medium">{results.plumbing.recommendedMeterSize}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            {/* Special Equipment Notes */}
            <section className="px-8 py-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Special Equipment & Notes</h3>
              <div className="space-y-3 text-sm">
                {zones.filter(z => {
                  const d = getZoneDefaults(z.type)
                  return d.gas_mbh || d.dehumidification_lb_hr || d.requires_type1_hood || d.requires_standby_power || d.laundry_equipment
                }).map(zone => {
                  const d = getZoneDefaults(zone.type)
                  return (
                    <div key={zone.id} className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-gray-900">{zone.name} ({d.displayName})</h4>
                      <ul className="list-disc list-inside mt-1 text-gray-600 text-xs space-y-0.5">
                        {d.gas_mbh && <li>Gas furnace: {d.gas_mbh.toLocaleString()} MBH</li>}
                        {d.flue_size_in && <li>Flue: {d.flue_size_in}" I.D. SS Double Wall</li>}
                        {d.dehumidification_lb_hr && <li>Dehumidification: {d.dehumidification_lb_hr} lb/hr</li>}
                        {d.pool_heater_gas_mbh && <li>Pool heater: {d.pool_heater_gas_mbh} MBH</li>}
                        {d.requires_type1_hood && <li>Type I hood required</li>}
                        {d.requires_mau && d.mau_cfm && <li>Make-up air unit: {d.mau_cfm.toLocaleString()} CFM</li>}
                        {d.requires_standby_power && <li>Standby power required</li>}
                        {d.grease_interceptor_gal && <li>Grease interceptor: {d.grease_interceptor_gal} gal</li>}
                        {d.laundry_equipment && zone.fixtures.washingMachines > 0 && (
                          <li>Commercial washers ({zone.fixtures.washingMachines}x): {(zone.fixtures.washingMachines * d.laundry_equipment.washer_kw).toFixed(1)} kW, {zone.fixtures.washingMachines * d.laundry_equipment.washer_water_gpm} GPM water</li>
                        )}
                        {d.laundry_equipment && zone.fixtures.dryers > 0 && zone.subType === 'gas' && (
                          <li>Gas dryers ({zone.fixtures.dryers}x stacked): {(zone.fixtures.dryers * 2 * d.laundry_equipment.dryer_gas_mbh).toLocaleString()} MBH, {(zone.fixtures.dryers * d.laundry_equipment.dryer_exhaust_cfm).toLocaleString()} CFM exhaust</li>
                        )}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Footer */}
            <div className="px-8 py-4 bg-gray-100 text-center text-xs text-gray-500">
              <p>Detailed Zone & System Report • {currentProject.name}</p>
              <p className="mt-1">Generated {new Date().toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* SD Package Report Modal */}
      {showSDPackage && (
        <SDPackageReport
          calculations={calculations}
          onClose={() => setShowSDPackage(false)}
        />
      )}
    </div>
  )
}

// Helper component for comparing saved vs current values
function ComparisonItem({ 
  label, 
  saved, 
  current, 
  unit 
}: { 
  label: string
  saved: number
  current: number
  unit: string
}) {
  const diff = current - saved
  const pctChange = saved !== 0 ? ((diff / saved) * 100) : 0
  const isIncrease = diff > 0
  const isDecrease = diff < 0
  const hasChange = Math.abs(pctChange) > 0.5
  
  return (
    <div className="bg-surface-800 p-2 rounded">
      <div className="text-surface-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-white">
          {typeof current === 'number' && current % 1 !== 0 
            ? current.toFixed(1) 
            : current.toLocaleString()}{unit}
        </span>
        {hasChange && (
          <span className={`text-xs font-medium ${
            isIncrease ? 'text-orange-400' : isDecrease ? 'text-green-400' : 'text-surface-500'
          }`}>
            {isIncrease ? '↑' : '↓'} {Math.abs(pctChange).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-surface-500 text-xs mt-0.5">
        was {typeof saved === 'number' && saved % 1 !== 0 
          ? saved.toFixed(1) 
          : saved.toLocaleString()}{unit}
      </div>
    </div>
  )
}
