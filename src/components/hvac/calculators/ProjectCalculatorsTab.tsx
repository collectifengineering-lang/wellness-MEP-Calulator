/**
 * Project Calculators Tab
 * 
 * Unified calculators tab for HVAC projects
 * Contains sub-tabs for Pool Dehum, Hydronic, and Ductulator
 * All data is automatically scoped to the current project
 */

import { useState } from 'react'
import Ductulator from './Ductulator'
import PoolDehumidification from './PoolDehumidification'
import { HydronicCalculatorCore } from '../../hydronic/HydronicCalculatorCore'
import { DuctCalculatorCore } from '../../duct/DuctCalculatorCore'
import { PsychrometricCalculatorCore } from '../../psychrometric'

type SubTab = 'pool' | 'hydronic' | 'duct' | 'psychrometric' | 'ductulator'

interface ProjectCalculatorsTabProps {
  projectId: string
  locationId?: string | null
}

export default function ProjectCalculatorsTab({ projectId, locationId }: ProjectCalculatorsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('pool')
  
  const subTabs = [
    { id: 'pool' as SubTab, label: '🏊 Pool Dehumidification', description: 'Natatorium loads' },
    { id: 'hydronic' as SubTab, label: '💧 Hydronic Pump', description: 'Pipe sizing & pump head' },
    { id: 'duct' as SubTab, label: '🌀 Duct Pressure', description: 'Duct pressure drop & fan sizing' },
    { id: 'psychrometric' as SubTab, label: '🌡️ Psychrometric', description: 'Air properties & processes' },
    { id: 'ductulator' as SubTab, label: '📐 Ductulator', description: 'Quick duct sizing' },
  ]
  
  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab Navigation */}
      <div className="border-b border-surface-700 bg-surface-800/50">
        <div className="px-6 py-3">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold text-white">🧮 Calculators</h2>
            <div className="flex gap-2">
              {subTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeSubTab === tab.id
                      ? 'bg-cyan-600 text-white'
                      : 'bg-surface-700 text-surface-300 hover:bg-surface-600 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-surface-400 mt-1">
            All calculations are automatically saved to this project
          </p>
        </div>
      </div>
      
      {/* Calculator Content */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === 'pool' && (
          <div className="h-full overflow-auto">
            <PoolDehumidification />
          </div>
        )}
        
        {activeSubTab === 'hydronic' && (
          <div className="h-full">
            <HydronicCalculatorCore
              projectId={projectId}
              standalone={false}
            />
          </div>
        )}
        
        {activeSubTab === 'duct' && (
          <div className="h-full">
            <DuctCalculatorCore
              projectId={projectId}
            />
          </div>
        )}
        
        {activeSubTab === 'psychrometric' && (
          <div className="h-full">
            <PsychrometricCalculatorCore
              projectId={projectId}
              projectLocationId={locationId}
              standalone={false}
            />
          </div>
        )}
        
        {activeSubTab === 'ductulator' && (
          <div className="p-6">
            <Ductulator />
          </div>
        )}
      </div>
    </div>
  )
}
