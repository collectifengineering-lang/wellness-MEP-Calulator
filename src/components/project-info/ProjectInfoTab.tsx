import { useState, useEffect } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { getLocationById, formatLocationDisplay, ALL_LOCATIONS } from '../../data/ashraeClimate'
import type { ProjectClientInfo } from '../../types'
import FixtureOverrides from './FixtureOverrides'
import NarrativeBackgroundSection from './NarrativeBackgroundSection'

const PROJECT_PHASES = [
  { value: 'concept', label: 'Concept Design' },
  { value: 'schematic', label: 'Schematic Design (SD)' },
  { value: 'dd', label: 'Design Development (DD)' },
  { value: 'cd', label: 'Construction Documents (CD)' },
  { value: 'construction', label: 'Construction Administration' },
  { value: 'as_built', label: 'As-Built' },
] as const

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

export default function ProjectInfoTab() {
  const { currentProject, updateProject } = useProjectStore()
  
  // Local state for form fields
  const [clientInfo, setClientInfo] = useState<ProjectClientInfo>(currentProject?.clientInfo || {})
  const [locationSearch, setLocationSearch] = useState('')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  
  // Sync local state with project when project changes
  useEffect(() => {
    if (currentProject?.clientInfo) {
      setClientInfo(currentProject.clientInfo)
    }
  }, [currentProject?.clientInfo])
  
  // Debounced save
  useEffect(() => {
    if (!currentProject) return
    const timer = setTimeout(() => {
      updateProject({ clientInfo })
    }, 500)
    return () => clearTimeout(timer)
  }, [clientInfo])
  
  const updateField = <K extends keyof ProjectClientInfo>(field: K, value: ProjectClientInfo[K]) => {
    setClientInfo(prev => ({ ...prev, [field]: value }))
  }
  
  const handleLocationSelect = (locationId: string) => {
    console.log('🌍 Setting project location to:', locationId)
    updateProject({ ashraeLocationId: locationId })
    console.log('🌍 After update - currentProject.ashraeLocationId:', currentProject?.ashraeLocationId)
    setShowLocationDropdown(false)
    setLocationSearch('')
  }
  
  // Filter locations based on search
  const filteredLocations = locationSearch
    ? ALL_LOCATIONS.filter(loc => 
        formatLocationDisplay(loc).toLowerCase().includes(locationSearch.toLowerCase())
      ).slice(0, 20)
    : ALL_LOCATIONS.slice(0, 20)
  
  const selectedLocation = currentProject?.ashraeLocationId 
    ? getLocationById(currentProject.ashraeLocationId) 
    : null
  
  if (!currentProject) return null
  
  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Project Information</h2>
            <p className="text-surface-400 mt-1">
              Client details, location, and project metadata
            </p>
          </div>
          <div className="text-sm text-surface-500">
            Auto-saves as you type
          </div>
        </div>
        
        {/* Project Overview Card */}
        <div className="bg-gradient-to-br from-primary-900/30 to-surface-800 rounded-xl border border-primary-500/30 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">{currentProject.name}</h3>
              <p className="text-surface-400 mt-1">
                {currentProject.targetSF.toLocaleString()} SF • {currentProject.climate.replace('_', ' ')} climate
              </p>
            </div>
            <div className="text-right">
              {clientInfo.projectNumber && (
                <div className="text-sm text-surface-400">Project #{clientInfo.projectNumber}</div>
              )}
              {clientInfo.projectPhase && (
                <div className="mt-1 px-3 py-1 bg-primary-600/20 text-primary-400 rounded-full text-xs font-medium inline-block">
                  {PROJECT_PHASES.find(p => p.value === clientInfo.projectPhase)?.label}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Design Location (ASHRAE) */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📍</span> Design Location
          </h3>
          <p className="text-sm text-surface-400 mb-4">
            Select the ASHRAE climate location for design calculations. This affects ventilation moisture loads, 
            outdoor design temperatures, and humidity ratios throughout the project.
          </p>
          
          {selectedLocation ? (
            <div className="flex items-center justify-between p-4 bg-surface-900/50 rounded-lg border border-surface-700">
              <div>
                <div className="text-white font-medium">{formatLocationDisplay(selectedLocation)}</div>
                <div className="text-sm text-surface-400 mt-1 grid grid-cols-2 gap-x-6 gap-y-1">
                  <span>Summer DB: {selectedLocation.cooling_04_db}°F</span>
                  <span>Summer MCWB: {selectedLocation.cooling_04_mcwb}°F</span>
                  <span>Winter DB: {selectedLocation.heating_99_db}°F</span>
                  <span>Humidity: {selectedLocation.summer_hr} gr/lb</span>
                </div>
              </div>
              <button
                onClick={() => setShowLocationDropdown(true)}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded-lg text-sm transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Search for a city..."
                value={locationSearch}
                onChange={(e) => {
                  setLocationSearch(e.target.value)
                  setShowLocationDropdown(true)
                }}
                onFocus={() => setShowLocationDropdown(true)}
                className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
              />
              {showLocationDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-surface-800 border border-surface-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {filteredLocations.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => handleLocationSelect(loc.id)}
                      className="w-full px-4 py-3 text-left hover:bg-surface-700 transition-colors border-b border-surface-700/50 last:border-0"
                    >
                      <div className="text-white">{formatLocationDisplay(loc)}</div>
                      <div className="text-xs text-surface-400">
                        Summer: {loc.cooling_04_db}°F DB, {loc.summer_hr} gr/lb
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {showLocationDropdown && selectedLocation && (
            <div className="mt-4 relative">
              <input
                type="text"
                placeholder="Search for a different city..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                className="w-full px-4 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
                autoFocus
              />
              <div className="absolute z-10 w-full mt-1 bg-surface-800 border border-surface-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {filteredLocations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => handleLocationSelect(loc.id)}
                    className="w-full px-4 py-3 text-left hover:bg-surface-700 transition-colors border-b border-surface-700/50 last:border-0"
                  >
                    <div className="text-white">{formatLocationDisplay(loc)}</div>
                    <div className="text-xs text-surface-400">
                      Summer: {loc.cooling_04_db}°F DB, {loc.summer_hr} gr/lb
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Project Details */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📋</span> Project Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Project Number</label>
              <input
                type="text"
                value={clientInfo.projectNumber || ''}
                onChange={(e) => updateField('projectNumber', e.target.value)}
                placeholder="e.g., 2024-001"
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Project Phase</label>
              <select
                value={clientInfo.projectPhase || ''}
                onChange={(e) => updateField('projectPhase', e.target.value as ProjectClientInfo['projectPhase'])}
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white"
              >
                <option value="">Select phase...</option>
                {PROJECT_PHASES.map(phase => (
                  <option key={phase.value} value={phase.value}>{phase.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Designed By</label>
              <input
                type="text"
                value={clientInfo.designedBy || ''}
                onChange={(e) => updateField('designedBy', e.target.value)}
                placeholder="Engineer name"
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Checked By</label>
              <input
                type="text"
                value={clientInfo.checkedBy || ''}
                onChange={(e) => updateField('checkedBy', e.target.value)}
                placeholder="Reviewer name"
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-surface-300 mb-1">Project Description</label>
            <textarea
              value={clientInfo.projectDescription || ''}
              onChange={(e) => updateField('projectDescription', e.target.value)}
              placeholder="Brief description of the project scope, building type, special requirements..."
              rows={3}
              className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500 resize-none"
            />
          </div>
        </div>
        
        {/* Client Information */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>👤</span> Client Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Client Name</label>
              <input
                type="text"
                value={clientInfo.clientName || ''}
                onChange={(e) => updateField('clientName', e.target.value)}
                placeholder="Contact name"
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Company</label>
              <input
                type="text"
                value={clientInfo.clientCompany || ''}
                onChange={(e) => updateField('clientCompany', e.target.value)}
                placeholder="Company name"
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Email</label>
              <input
                type="email"
                value={clientInfo.clientEmail || ''}
                onChange={(e) => updateField('clientEmail', e.target.value)}
                placeholder="client@example.com"
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Phone</label>
              <input
                type="tel"
                value={clientInfo.clientPhone || ''}
                onChange={(e) => updateField('clientPhone', e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
              />
            </div>
          </div>
        </div>
        
        {/* Project Address */}
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🏢</span> Project Address
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Street Address</label>
              <input
                type="text"
                value={clientInfo.projectAddress || ''}
                onChange={(e) => updateField('projectAddress', e.target.value)}
                placeholder="123 Main Street"
                className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
              />
            </div>
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-surface-300 mb-1">City</label>
                <input
                  type="text"
                  value={clientInfo.projectCity || ''}
                  onChange={(e) => updateField('projectCity', e.target.value)}
                  placeholder="City"
                  className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-surface-300 mb-1">State</label>
                <select
                  value={clientInfo.projectState || ''}
                  onChange={(e) => updateField('projectState', e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white"
                >
                  <option value="">--</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-surface-300 mb-1">ZIP</label>
                <input
                  type="text"
                  value={clientInfo.projectZip || ''}
                  onChange={(e) => updateField('projectZip', e.target.value)}
                  placeholder="12345"
                  maxLength={10}
                  className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder-surface-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Fixture Parameter Overrides */}
        <FixtureOverrides />
        
        {/* MEP Narrative Background */}
        <NarrativeBackgroundSection />
        
        {/* Quick Summary */}
        <div className="bg-surface-800/50 rounded-xl border border-surface-700 p-6">
          <h4 className="text-sm font-medium text-surface-300 mb-3">📊 Project Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-surface-500">Target SF</div>
              <div className="text-white font-medium">{currentProject.targetSF.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-surface-500">Climate</div>
              <div className="text-white font-medium capitalize">{currentProject.climate.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="text-surface-500">Primary Energy</div>
              <div className="text-white font-medium">{currentProject.electricPrimary ? 'Electric' : 'Gas'}</div>
            </div>
            <div>
              <div className="text-surface-500">Contingency</div>
              <div className="text-white font-medium">{(currentProject.contingency * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
