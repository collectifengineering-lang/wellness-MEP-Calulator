/**
 * HVAC Calculators Page
 * 
 * Combines multiple calculators:
 * - Ductulator (duct sizing)
 * - Pool Dehumidification (standalone, no space selection required)
 * - Hydronic Pump Calculator (pipe sizing and pump head)
 */

import { useState } from 'react'
import Ductulator from './Ductulator'
import PoolDehumidificationStandalone from './PoolDehumidificationStandalone'
import { HydronicCalculatorStandalone } from './HydronicCalculatorStandalone'
import { DuctCalculatorStandalone } from '../../duct/DuctCalculatorStandalone'

type CalculatorType = 'ductulator' | 'pool' | 'hydronic' | 'duct'

export default function CalculatorsPage() {
  const [activeCalc, setActiveCalc] = useState<CalculatorType>('ductulator')
  
  return (
    <div className="h-full flex flex-col">
      {/* Calculator Selection */}
      <div className="flex items-center gap-4 p-6 pb-0">
        <h2 className="text-2xl font-bold text-white">🧮 HVAC Calculators</h2>
        <div className="flex-1" />
        <div className="flex gap-2">
          <button
            onClick={() => setActiveCalc('ductulator')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCalc === 'ductulator'
                ? 'bg-cyan-600 text-white'
                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
            }`}
          >
            📐 Ductulator
          </button>
          <button
            onClick={() => setActiveCalc('pool')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCalc === 'pool'
                ? 'bg-cyan-600 text-white'
                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
            }`}
          >
            🏊 Pool Dehumidification
          </button>
          <button
            onClick={() => setActiveCalc('hydronic')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCalc === 'hydronic'
                ? 'bg-cyan-600 text-white'
                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
            }`}
          >
            💧 Hydronic Pump
          </button>
          <button
            onClick={() => setActiveCalc('duct')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCalc === 'duct'
                ? 'bg-cyan-600 text-white'
                : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
            }`}
          >
            🌀 Duct Pressure
          </button>
        </div>
      </div>
      
      {/* Calculator Content */}
      <div className="flex-1 overflow-hidden">
        {activeCalc === 'ductulator' && (
          <div className="p-6">
            <Ductulator />
          </div>
        )}
        {activeCalc === 'pool' && (
          <div className="p-6">
            <PoolDehumidificationStandalone />
          </div>
        )}
        {activeCalc === 'hydronic' && (
          <HydronicCalculatorStandalone />
        )}
        {activeCalc === 'duct' && (
          <DuctCalculatorStandalone />
        )}
      </div>
    </div>
  )
}
