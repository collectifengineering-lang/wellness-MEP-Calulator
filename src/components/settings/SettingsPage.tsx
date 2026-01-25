import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserMenu from '../auth/UserMenu'
import ZoneDefaultsEditor from './ZoneDefaultsEditor'
import NewZoneTypeModal from './NewZoneTypeModal'
import GlobalSettingsPanel from './GlobalSettingsPanel'
import { useSettingsStore } from '../../store/useSettingsStore'
import { zoneDefaults as builtInDefaults, getZoneCategories } from '../../data/zoneDefaults'

// Helper to get all modified settings for export
function getModifiedSettings(store: ReturnType<typeof useSettingsStore.getState>) {
  const { customZoneDefaults, customZoneTypes, electrical, gas, dhw, plumbing, climate } = store
  
  // Find which zone defaults have been modified from built-in
  const modifiedZoneDefaults: Record<string, any> = {}
  for (const [type, customDefaults] of Object.entries(customZoneDefaults)) {
    const builtIn = builtInDefaults[type as keyof typeof builtInDefaults]
    if (builtIn) {
      // Compare and only include changed values
      const changes: Record<string, any> = {}
      for (const [key, value] of Object.entries(customDefaults)) {
        const builtInValue = builtIn[key as keyof typeof builtIn]
        if (JSON.stringify(value) !== JSON.stringify(builtInValue)) {
          changes[key] = value
        }
      }
      if (Object.keys(changes).length > 0) {
        modifiedZoneDefaults[type] = changes
      }
    }
  }
  
  return {
    exportDate: new Date().toISOString(),
    globalSettings: {
      electrical,
      gas,
      dhw,
      plumbing,
      climate,
    },
    modifiedZoneDefaults,
    customZoneTypes,
    // Also include full custom defaults for new zone types
    newZoneTypes: customZoneTypes.reduce((acc, type) => {
      if (customZoneDefaults[type]) {
        acc[type] = customZoneDefaults[type]
      }
      return acc
    }, {} as Record<string, any>),
  }
}

type SettingsTab = 'zones' | 'global'

export default function SettingsPage() {
  const navigate = useNavigate()
  const settingsStore = useSettingsStore()
  const { customZoneDefaults, customZoneTypes, resetAllDefaults, lastSyncedAt, syncError, isLoading } = settingsStore
  const [selectedZoneType, setSelectedZoneType] = useState<string | null>(null)
  const [showNewTypeModal, setShowNewTypeModal] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<SettingsTab>('zones')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  const handleCopySettings = async () => {
    const settings = getModifiedSettings(useSettingsStore.getState())
    const json = JSON.stringify(settings, null, 2)
    
    try {
      await navigator.clipboard.writeText(json)
      setCopyFeedback('Copied to clipboard!')
      setTimeout(() => setCopyFeedback(null), 3000)
    } catch (err) {
      // Fallback: show in a modal or alert
      console.error('Failed to copy:', err)
      setCopyFeedback('Failed to copy - check console')
      setTimeout(() => setCopyFeedback(null), 3000)
    }
  }

  const categories = ['all', ...getZoneCategories(), 'Custom']
  
  // Get all zone types with their categories
  const allZoneTypes = [
    ...Object.entries(builtInDefaults).map(([id, defaults]) => ({
      id,
      ...defaults,
      isCustom: false,
      isModified: !!customZoneDefaults[id],
    })),
    ...customZoneTypes.map(id => ({
      id,
      ...customZoneDefaults[id],
      isCustom: true,
      isModified: false,
    })),
  ]

  const filteredZoneTypes = activeCategory === 'all' 
    ? allZoneTypes 
    : activeCategory === 'Custom'
      ? allZoneTypes.filter(z => z.isCustom)
      : allZoneTypes.filter(z => z.category === activeCategory)

  const handleResetAll = () => {
    if (confirm('Reset all zone defaults to their original values? This cannot be undone.')) {
      resetAllDefaults()
    }
  }

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface-900/80 backdrop-blur-lg border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-white">Settings</h1>
                <p className="text-xs text-surface-400">
                  Zone Defaults & Custom Types
                  {lastSyncedAt && !syncError && (
                    <span className="ml-2 text-green-400">• Synced</span>
                  )}
                  {isLoading && (
                    <span className="ml-2 text-amber-400">• Syncing...</span>
                  )}
                  {syncError && (
                    <span className="ml-2 text-red-400" title={syncError}>• Sync error</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Copy Settings Button */}
              <button
                onClick={handleCopySettings}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  copyFeedback 
                    ? 'bg-green-600/20 text-green-400 border border-green-500/50' 
                    : 'bg-surface-700 hover:bg-surface-600 text-surface-200'
                }`}
                title="Copy all settings changes to clipboard"
              >
                {copyFeedback ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
                {copyFeedback || 'Copy Settings'}
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b border-surface-700 pb-4">
          <button
            onClick={() => setActiveTab('zones')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'zones'
                ? 'bg-primary-600 text-white'
                : 'text-surface-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            🏗️ Zone Type Defaults
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'global'
                ? 'bg-primary-600 text-white'
                : 'text-surface-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            ⚙️ Global Calculation Settings
          </button>
        </div>

        {activeTab === 'global' ? (
          <GlobalSettingsPanel />
        ) : (
          <>
            {/* Actions Bar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Zone Type Defaults</h2>
                <p className="text-surface-400 mt-1">
                  Edit default values for zone types or create custom zone types
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetAll}
                  className="px-4 py-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg text-sm transition-colors"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setShowNewTypeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Zone Type
                </button>
              </div>
            </div>

            {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === category
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700'
              }`}
            >
              {category === 'all' ? 'All Types' : category}
              {category === 'Custom' && customZoneTypes.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-primary-500/20 rounded text-xs">
                  {customZoneTypes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Zone Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredZoneTypes.map(zoneType => (
            <ZoneTypeCard
              key={zoneType.id}
              zoneType={zoneType}
              onClick={() => setSelectedZoneType(zoneType.id)}
            />
          ))}
        </div>

            {filteredZoneTypes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-surface-400">No zone types in this category</p>
                {activeCategory === 'Custom' && (
                  <button
                    onClick={() => setShowNewTypeModal(true)}
                    className="mt-4 text-primary-400 hover:text-primary-300"
                  >
                    Create your first custom zone type
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Zone Defaults Editor Modal */}
      {selectedZoneType && (
        <ZoneDefaultsEditor
          zoneTypeId={selectedZoneType}
          onClose={() => setSelectedZoneType(null)}
        />
      )}

      {/* New Zone Type Modal */}
      {showNewTypeModal && (
        <NewZoneTypeModal onClose={() => setShowNewTypeModal(false)} />
      )}
    </div>
  )
}

interface ZoneTypeCardProps {
  zoneType: {
    id: string
    displayName: string
    category: string
    defaultSF: number
    isCustom: boolean
    isModified: boolean
  }
  onClick: () => void
}

function ZoneTypeCard({ zoneType, onClick }: ZoneTypeCardProps) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 bg-surface-800 hover:bg-surface-750 border border-surface-700 hover:border-surface-600 rounded-xl transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-white">{zoneType.displayName}</h3>
          <p className="text-sm text-surface-400 mt-0.5">{zoneType.category}</p>
        </div>
        <div className="flex items-center gap-2">
          {zoneType.isModified && (
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs rounded-full">
              Modified
            </span>
          )}
          {zoneType.isCustom && (
            <span className="px-2 py-0.5 bg-primary-500/10 text-primary-400 text-xs rounded-full">
              Custom
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 text-sm text-surface-400">
        Default: {zoneType.defaultSF.toLocaleString()} SF
      </div>
      <div className="mt-2 flex items-center text-xs text-primary-400">
        <span>Click to edit defaults</span>
        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
