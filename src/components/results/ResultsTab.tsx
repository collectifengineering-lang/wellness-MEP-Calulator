import { useState, useEffect, useCallback } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { exportToPDF, exportToExcelFile } from '../../export'
import { getZoneDefaults, calculateLaundryLoads } from '../../data/zoneDefaults'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import type { CalculationResults, ZoneFixtures, SavedReport } from '../../types'

interface ResultsTabProps {
  calculations: {
    results: CalculationResults | null
    aggregatedFixtures: ZoneFixtures
    totalSF: number
    mechanicalKVA?: { total: number; breakdown: { name: string; kva: number }[] }
  }
  onNavigateToTab?: (tab: 'builder' | 'pool' | 'central') => void
}

export default function ResultsTab({ calculations, onNavigateToTab }: ResultsTabProps) {
  const { currentProject, zones } = useProjectStore()
  const { results, aggregatedFixtures, totalSF, mechanicalKVA } = calculations
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
      
      setSavedReports((data || []).map(r => ({
        id: r.id,
        projectId: r.project_id,
        name: r.name,
        version: r.version,
        createdAt: new Date(r.created_at),
        notes: r.notes,
        snapshot: r.snapshot as SavedReport['snapshot']
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
        const { data, error } = await supabase
          .from('saved_reports')
          .insert({
            project_id: currentProject.id,
            name: name || `Report v${nextVersion}`,
            version: nextVersion,
            snapshot
          })
          .select()
          .single()
        
        if (error) throw error
        
        // Add to local state
        const newReport: SavedReport = {
          id: data.id,
          projectId: currentProject.id,
          name: data.name,
          version: data.version,
          createdAt: new Date(data.created_at),
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
      await exportToPDF(currentProject, zones, results, aggregatedFixtures, totalSF, includeDetailed)
    } catch (error) {
      console.error('PDF export error:', error)
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
          <label className="flex items-center gap-2 text-sm text-surface-300">
            <input
              type="checkbox"
              checked={includeDetailed}
              onChange={(e) => setIncludeDetailed(e.target.checked)}
              className="rounded bg-surface-700 border-surface-600 text-primary-500 focus:ring-primary-500"
            />
            Include detailed calculations in export
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
            {showDetailedReport ? 'Hide' : 'Show'} Detailed Report
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
          
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
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
            <p className="text-sm text-surface-400 mb-1">COLLECTIF Engineering PLLC</p>
            <h1 className="text-2xl font-bold">{currentProject.name}</h1>
            <p className="text-sm text-surface-300 mt-1">MEP Due Diligence Report</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-surface-400">
              <span>{totalSF.toLocaleString()} SF</span>
              <span>•</span>
              <span>{climateLabels[currentProject.climate]}</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Executive Summary */}
          <section className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Executive Summary</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              COLLECTIF ENGINEERING has been engaged to determine the MEP requirements of a ~{Math.round(totalSF / 1000)}k SF wellness facility. 
              This report identifies high-level requirements for utility services, MEP systems, and provides recommendations for landlord negotiation items.
            </p>
          </section>

          {/* HVAC Section */}
          <section className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">1. HVAC (Mechanical)</h2>
              {onNavigateToTab && (
                <button 
                  onClick={() => onNavigateToTab('central')}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Edit in Central Plant →
                </button>
              )}
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900">Air Conditioning / Heating</h3>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Estimated Cooling Capacity: <span className="font-mono">{results.hvac.totalTons} Tons</span></li>
                  <li>Estimated Heating Capacity: <span className="font-mono">{results.hvac.totalMBH.toLocaleString()} MBH</span></li>
                  <li>Recommended zoning: ~{results.hvac.rtuCount} RTUs/units for {zones.length} program areas</li>
                  {results.hvac.dehumidLbHr > 0 && (
                    <li>Pool dehumidification: <span className="font-mono">{results.hvac.dehumidLbHr} lb/hr</span></li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Ventilation / Exhaust</h3>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Fresh Air: <span className="font-mono">{results.hvac.totalVentCFM.toLocaleString()} CFM</span></li>
                  <li>Exhaust: <span className="font-mono">{results.hvac.totalExhaustCFM.toLocaleString()} CFM</span></li>
                </ul>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg mt-3">
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-2">Lease Negotiation Recommendations - Mechanical</h3>
                <ol className="list-decimal list-inside text-xs space-y-1 text-gray-600">
                  <li>Landlord to allow roof penetrations for specialty exhaust systems.</li>
                  <li>Landlord to allow equipment on roof with new dunnage.</li>
                  <li>Landlord to allow exhaust flues along exterior facade.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Electrical Section */}
          <section className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">2. Electrical / Fire Alarm</h2>
              {onNavigateToTab && (
                <button 
                  onClick={() => onNavigateToTab('central')}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Edit in Central Plant →
                </button>
              )}
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Estimated service size: <span className="font-mono font-semibold">{results.electrical.amps_208v.toLocaleString()}A at 208V/3PH, 4W</span> 
                  {' '}(or {results.electrical.amps_480v.toLocaleString()}A at 480V/3PH, 4W)
                </li>
                <li>Service based on: mechanical/plumbing loads, pool equipment, elevator, and general lighting/receptacle at 3 VA/SF.</li>
                <li>Approximately {results.electrical.panelCount} panelboards required for distribution.</li>
                <li>A ~60kW generator shall be provided for emergency and standby loads.</li>
                <li>Fire alarm: Manual system with horn/strobe notification devices.</li>
              </ol>
              <div className="bg-gray-50 p-3 rounded-lg mt-3">
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-2">Lease Negotiation Recommendations - Electrical</h3>
                <ol className="list-decimal list-inside text-xs space-y-1 text-gray-600">
                  <li>Landlord to provide incoming utility and coordination with utility company.</li>
                  <li>Landlord to provide main switchboard rated {results.electrical.recommendedService}.</li>
                  <li>Landlord to provide panelboards described above.</li>
                  <li>Landlord to provide emergency power source for egress lighting and exhaust fans.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Plumbing Section */}
          <section className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">3. Plumbing</h2>
              {onNavigateToTab && (
                <button 
                  onClick={() => onNavigateToTab('central')}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Edit in Central Plant →
                </button>
              )}
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900">Domestic Cold Water</h3>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Base Building: <span className="font-mono">{results.plumbing.coldWaterMainSize}</span> Cold Water Connection</li>
                  <li>Peak Demand: <span className="font-mono">{results.plumbing.peakGPM} GPM</span> ({results.plumbing.totalWSFU} WSFU)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Domestic Hot Water</h3>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Hot Water Plant: {results.dhw.tanklessUnits} Tankless Water Heaters @ 199,900 BTU each</li>
                  <li>Total: <span className="font-mono">{(results.dhw.grossBTU / 1000).toLocaleString()} MBH</span></li>
                  <li>Storage: <span className="font-mono">{results.dhw.storageGallons.toLocaleString()} gallons</span></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Sanitary / Vent</h3>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Building Drain: <span className="font-mono">{results.plumbing.recommendedDrainSize}</span> ({results.plumbing.totalDFU} DFU)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Gas</h3>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Total Gas Load: <span className="font-mono">{results.gas.totalCFH.toLocaleString()} CFH</span> at minimum {results.gas.recommendedPressure}</li>
                  <li>Service Pipe: <span className="font-mono">{results.gas.recommendedPipeSize}</span></li>
                </ul>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg mt-3">
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-2">Lease Negotiation Recommendations - Plumbing</h3>
                <ol className="list-decimal list-inside text-xs space-y-1 text-gray-600">
                  <li>Landlord shall provide domestic water service to building.</li>
                  <li>Landlord shall provide high pressure gas service with meter rig.</li>
                  <li>Minimum building drain size: {results.plumbing.recommendedDrainSize}.</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Fire Protection Section */}
          <section className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">4. Fire Protection (Sprinklers)</h2>
              {onNavigateToTab && (
                <button 
                  onClick={() => onNavigateToTab('builder')}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Edit Zones →
                </button>
              )}
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <ol className="list-decimal list-inside space-y-2">
                <li>Occupancy: Group A-3, Fire Protection required per applicable building code and NFPA-13.</li>
                <li>Sprinkler main: 4" base building, 3" per floor loop.</li>
                <li>Estimated sprinkler count: ~{Math.ceil(totalSF / 130)} heads total.</li>
                <li>High-temp sprinkler heads required for sauna/banya areas.</li>
              </ol>
              <div className="bg-gray-50 p-3 rounded-lg mt-3">
                <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-2">Lease Negotiation Recommendations - Fire Protection</h3>
                <ol className="list-decimal list-inside text-xs space-y-1 text-gray-600">
                  <li>Landlord shall provide Fire Protection system per applicable building code and NFPA.</li>
                  <li>System shall include water service, risers, and base building layout.</li>
                </ol>
              </div>
            </div>
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
                      const lightingKW = zone.sf * zone.rates.lighting_w_sf / 1000
                      const receptacleKW = zone.sf * zone.rates.receptacle_va_sf / 1000
                      let fixedKW = defaults.fixed_kw || 0
                      
                      // Add laundry equipment loads - use zone's custom specs
                      if (zone.type === 'laundry_commercial' && defaults.laundry_equipment) {
                        const laundryLoads = calculateLaundryLoads(
                          zone.fixtures.washingMachines || 0,
                          zone.fixtures.dryers || 0,
                          zone.subType === 'gas' ? 'gas' : 'electric',
                          zone.laundryEquipment
                        )
                        fixedKW += laundryLoads.total_kw
                      }
                      
                      const totalKW = lightingKW + receptacleKW + fixedKW
                      const tons = zone.rates.cooling_sf_ton > 0 ? zone.sf / zone.rates.cooling_sf_ton : 0
                      const ventCFM = zone.sf * zone.rates.ventilation_cfm_sf + (defaults.ventilation_cfm || 0)
                      let exhaustCFM = zone.sf * zone.rates.exhaust_cfm_sf + (defaults.exhaust_cfm || 0)
                      if (defaults.exhaust_cfm_toilet) exhaustCFM += zone.fixtures.wcs * defaults.exhaust_cfm_toilet
                      if (defaults.exhaust_cfm_shower) exhaustCFM += zone.fixtures.showers * defaults.exhaust_cfm_shower
                      
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
                    {zones.filter(z => 
                      z.fixtures.wcs > 0 || z.fixtures.lavs > 0 || z.fixtures.showers > 0 || 
                      z.fixtures.floorDrains > 0 || z.fixtures.serviceSinks > 0 ||
                      z.fixtures.washingMachines > 0 || z.fixtures.dryers > 0
                    ).map((zone, idx) => (
                      <tr key={zone.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-2 px-3 font-medium text-gray-900">{zone.name}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{zone.fixtures.wcs || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{zone.fixtures.lavs || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{zone.fixtures.showers || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{zone.fixtures.floorDrains || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{zone.fixtures.serviceSinks || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{zone.fixtures.washingMachines || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono text-gray-700">{zone.fixtures.dryers || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-200 font-semibold">
                      <td className="py-2 px-3">TOTAL</td>
                      <td className="py-2 px-3 text-right font-mono">{aggregatedFixtures.wcs}</td>
                      <td className="py-2 px-3 text-right font-mono">{aggregatedFixtures.lavs}</td>
                      <td className="py-2 px-3 text-right font-mono">{aggregatedFixtures.showers}</td>
                      <td className="py-2 px-3 text-right font-mono">{aggregatedFixtures.floorDrains}</td>
                      <td className="py-2 px-3 text-right font-mono">{aggregatedFixtures.serviceSinks}</td>
                      <td className="py-2 px-3 text-right font-mono">{aggregatedFixtures.washingMachines}</td>
                      <td className="py-2 px-3 text-right font-mono">{aggregatedFixtures.dryers}</td>
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
                  <h4 className="font-semibold text-gray-700 mb-2">Air Conditioning</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Total Cooling:</dt>
                      <dd className="font-mono font-medium">{results.hvac.totalTons} Tons</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Avg SF/Ton:</dt>
                      <dd className="font-mono font-medium">{Math.round(totalSF / results.hvac.totalTons)} SF/Ton</dd>
                    </div>
                    <div className="flex justify-between">
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
                    {results.hvac.dehumidLbHr > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Dehumid:</dt>
                        <dd className="font-mono font-medium">{results.hvac.dehumidLbHr} lb/hr</dd>
                      </div>
                    )}
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
