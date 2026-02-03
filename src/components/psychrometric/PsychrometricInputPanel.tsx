/**
 * Psychrometric Input Panel
 * Tabbed input panel with three calculation modes
 */

import { useState, useEffect } from 'react'
import { usePsychrometricStore } from '../../store/usePsychrometricStore'
import { INPUT_MODE_NAMES } from '../../data/psychrometricConstants'
import type {
  CalculationMode,
  PsychInputMode,
  PsychrometricPoint,
  StatePointResult,
} from '../../types/psychrometric'

interface PsychrometricInputPanelProps {
  systemId: string
  mode: CalculationMode
  points: PsychrometricPoint[]
  calculatedPoints: Record<string, StatePointResult>
  barometricPressure: number // eslint-disable-line @typescript-eslint/no-unused-vars
}

export default function PsychrometricInputPanel({
  systemId,
  mode,
  points,
  calculatedPoints,
}: PsychrometricInputPanelProps) {
  const { addPoint } = usePsychrometricStore()
  
  // Ensure we have the right points for each mode
  useEffect(() => {
    if (mode === 'single' && points.length === 0) {
      addPoint(systemId, 'A', 'state')
    } else if (mode === 'mixing') {
      const hasA = points.some(p => p.pointLabel === 'A')
      const hasB = points.some(p => p.pointLabel === 'B')
      if (!hasA) addPoint(systemId, 'A', 'state')
      if (!hasB) addPoint(systemId, 'B', 'state')
    } else if (mode === 'process') {
      const hasEntering = points.some(p => p.pointLabel === 'Entering')
      const hasLeaving = points.some(p => p.pointLabel === 'Leaving')
      if (!hasEntering) addPoint(systemId, 'Entering', 'entering')
      if (!hasLeaving) addPoint(systemId, 'Leaving', 'leaving')
    }
  }, [mode, points.length, systemId])
  
  // Render based on mode
  if (mode === 'single') {
    return <SinglePointMode points={points} calculatedPoints={calculatedPoints} />
  } else if (mode === 'mixing') {
    return <MixingMode points={points} calculatedPoints={calculatedPoints} systemId={systemId} />
  } else {
    return <ProcessMode points={points} calculatedPoints={calculatedPoints} />
  }
}

// =========================================== 
// SINGLE POINT MODE
// =========================================== 
function SinglePointMode({
  points,
  calculatedPoints,
}: {
  points: PsychrometricPoint[]
  calculatedPoints: Record<string, StatePointResult>
}) {
  const { updatePoint } = usePsychrometricStore()
  const point = points.find(p => p.pointLabel === 'A') || points[0]
  
  if (!point) {
    return <div className="text-surface-400">Loading...</div>
  }
  
  const result = calculatedPoints[point.id]
  
  const handleInputModeChange = (inputMode: PsychInputMode) => {
    updatePoint(point.id, { inputMode })
  }
  
  const handleValueChange = (field: string, value: number) => {
    updatePoint(point.id, { [field]: value })
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Single Point Calculator</h3>
      
      {/* Input Mode Selector */}
      <div>
        <label className="block text-sm text-surface-400 mb-2">Input Mode</label>
        <select
          value={point.inputMode}
          onChange={(e) => handleInputModeChange(e.target.value as PsychInputMode)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
        >
          {Object.entries(INPUT_MODE_NAMES).map(([key, name]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
      </div>
      
      {/* Input Fields */}
      <div className="space-y-3">
        <InputField
          label="Dry Bulb Temperature"
          value={point.dryBulbF || 70}
          onChange={(v) => handleValueChange('dryBulbF', v)}
          unit="°F"
        />
        
        {point.inputMode === 'db_wb' && (
          <InputField
            label="Wet Bulb Temperature"
            value={point.wetBulbF || 58}
            onChange={(v) => handleValueChange('wetBulbF', v)}
            unit="°F"
          />
        )}
        
        {point.inputMode === 'db_rh' && (
          <InputField
            label="Relative Humidity"
            value={point.relativeHumidity || 50}
            onChange={(v) => handleValueChange('relativeHumidity', v)}
            unit="%"
            min={0}
            max={100}
          />
        )}
        
        {point.inputMode === 'db_dp' && (
          <InputField
            label="Dew Point Temperature"
            value={point.dewPointF || 50}
            onChange={(v) => handleValueChange('dewPointF', v)}
            unit="°F"
          />
        )}
        
        {point.inputMode === 'db_w' && (
          <InputField
            label="Humidity Ratio"
            value={point.humidityRatioGrains || 77}
            onChange={(v) => handleValueChange('humidityRatioGrains', v)}
            unit="gr/lb"
          />
        )}
      </div>
      
      {/* Calculated Output */}
      {result && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-cyan-400 mb-2">Calculated Properties</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <OutputValue label="Dry Bulb" value={`${result.dryBulbF.toFixed(2)}°F`} />
            <OutputValue label="Wet Bulb" value={`${result.wetBulbF.toFixed(2)}°F`} />
            <OutputValue label="Dew Point" value={`${result.dewPointF.toFixed(2)}°F`} />
            <OutputValue label="RH" value={`${result.relativeHumidity.toFixed(1)}%`} />
            <OutputValue label="Humidity Ratio" value={`${result.humidityRatioGrains.toFixed(2)} gr/lb`} />
            <OutputValue label="Enthalpy" value={`${result.enthalpyBtuLb.toFixed(2)} Btu/lb`} />
            <OutputValue label="Sp. Volume" value={`${result.specificVolumeFt3Lb.toFixed(3)} ft³/lb`} />
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================== 
// MIXING MODE
// =========================================== 
function MixingMode({
  points,
  calculatedPoints,
  systemId,
}: {
  points: PsychrometricPoint[]
  calculatedPoints: Record<string, StatePointResult>
  systemId: string
}) {
  const { updatePoint, addPoint } = usePsychrometricStore()
  
  const pointA = points.find(p => p.pointLabel === 'A')
  const pointB = points.find(p => p.pointLabel === 'B')
  const mixedPoint = points.find(p => p.pointLabel === 'Mixed')
  
  // Calculate mixed result
  const resultA = pointA ? calculatedPoints[pointA.id] : null
  const resultB = pointB ? calculatedPoints[pointB.id] : null
  
  const mixedResult = resultA && resultB && pointA && pointB ? calculateMixedAir(
    { state: resultA, cfm: pointA.cfm || 100 },
    { state: resultB, cfm: pointB.cfm || 100 }
  ) : null
  
  // Create or update Mixed point when result changes
  // The Mixed point MUST lie on the line between A and B (using DB and W coordinates)
  useEffect(() => {
    if (mixedResult) {
      if (!mixedPoint) {
        // Create Mixed point
        addPoint(systemId, 'Mixed', 'mixed').then(newPoint => {
          updatePoint(newPoint.id, {
            dryBulbF: mixedResult.dryBulbF,
            humidityRatioGrains: mixedResult.humidityRatioGrains,
            inputMode: 'db_w', // Use DB + W to lock position on line
            cfm: mixedResult.totalCfm,
          })
        })
      } else {
        // Update existing Mixed point - always use DB + W to maintain line position
        updatePoint(mixedPoint.id, {
          dryBulbF: mixedResult.dryBulbF,
          humidityRatioGrains: mixedResult.humidityRatioGrains,
          inputMode: 'db_w',
          cfm: mixedResult.totalCfm,
        })
      }
    }
  }, [mixedResult?.dryBulbF, mixedResult?.humidityRatioGrains, mixedResult?.totalCfm, mixedPoint?.id, systemId])
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Air Mixing Calculator</h3>
      
      {/* Airstream A */}
      <div className="p-3 bg-green-900/30 rounded-lg border border-green-700">
        <h4 className="text-sm font-medium text-green-400 mb-2">Airstream A</h4>
        {pointA && (
          <AirstreamInputs
            point={pointA}
            result={resultA}
            onUpdate={(updates) => updatePoint(pointA.id, updates)}
          />
        )}
      </div>
      
      {/* Airstream B */}
      <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700">
        <h4 className="text-sm font-medium text-blue-400 mb-2">Airstream B</h4>
        {pointB && (
          <AirstreamInputs
            point={pointB}
            result={resultB}
            onUpdate={(updates) => updatePoint(pointB.id, updates)}
          />
        )}
      </div>
      
      {/* Mixed Air Result */}
      {mixedResult && (
        <div className="p-3 bg-amber-900/30 rounded-lg border border-amber-700">
          <h4 className="text-sm font-medium text-amber-400 mb-2">Mixed Air</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <OutputValue label="Total CFM" value={`${mixedResult.totalCfm.toFixed(0)}`} />
            <OutputValue label="Mix Ratio" value={`${(mixedResult.mixRatioA * 100).toFixed(0)}% / ${(mixedResult.mixRatioB * 100).toFixed(0)}%`} />
            <OutputValue label="Dry Bulb" value={`${mixedResult.dryBulbF.toFixed(1)}°F`} />
            <OutputValue label="Wet Bulb" value={`${mixedResult.wetBulbF.toFixed(1)}°F`} />
            <OutputValue label="RH" value={`${mixedResult.relativeHumidity.toFixed(1)}%`} />
            <OutputValue label="Enthalpy" value={`${mixedResult.enthalpyBtuLb.toFixed(2)} Btu/lb`} />
          </div>
        </div>
      )}
    </div>
  )
}

// Airstream input component
function AirstreamInputs({
  point,
  result,
  onUpdate,
}: {
  point: PsychrometricPoint
  result: StatePointResult | null
  onUpdate: (updates: Partial<PsychrometricPoint>) => void
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <InputField
          label="DB (°F)"
          value={point.dryBulbF || 70}
          onChange={(v) => onUpdate({ dryBulbF: v })}
          compact
        />
        <InputField
          label="WB (°F)"
          value={point.wetBulbF || 58}
          onChange={(v) => onUpdate({ wetBulbF: v })}
          compact
        />
      </div>
      <InputField
        label="SCFM"
        value={point.cfm || 100}
        onChange={(v) => onUpdate({ cfm: v })}
        compact
      />
      {result && (
        <div className="text-xs text-surface-400 mt-1">
          RH: {result.relativeHumidity.toFixed(1)}% | h: {result.enthalpyBtuLb.toFixed(2)} Btu/lb
        </div>
      )}
    </div>
  )
}

// Calculate mixed air state - result MUST be on the line between A and B
// This is a fundamental psychrometric principle: adiabatic mixing always results
// in a state on the straight line connecting the two inlet states
function calculateMixedAir(
  streamA: { state: StatePointResult; cfm: number },
  streamB: { state: StatePointResult; cfm: number }
) {
  const totalCfm = streamA.cfm + streamB.cfm
  
  // Calculate mass flow rates (lb/min)
  const massFlowA = streamA.cfm / streamA.state.specificVolumeFt3Lb
  const massFlowB = streamB.cfm / streamB.state.specificVolumeFt3Lb
  const totalMassFlow = massFlowA + massFlowB
  
  // Mass ratios - determine position on line between A and B
  const mixRatioA = massFlowA / totalMassFlow
  const mixRatioB = massFlowB / totalMassFlow
  
  // Mixed state properties - mass-weighted averages
  // These MUST be linear interpolations to ensure point lies on the line
  const dryBulbF = mixRatioA * streamA.state.dryBulbF + mixRatioB * streamB.state.dryBulbF
  const humidityRatioGrains = mixRatioA * streamA.state.humidityRatioGrains + mixRatioB * streamB.state.humidityRatioGrains
  const humidityRatioLb = humidityRatioGrains / 7000
  
  // Enthalpy is also conserved (mass-weighted average)
  const enthalpyBtuLb = mixRatioA * streamA.state.enthalpyBtuLb + mixRatioB * streamB.state.enthalpyBtuLb
  
  // These are derived from the mixed state (not direct averages)
  // For display purposes, we use approximations - the actual calculation
  // should use psychrometric equations with the mixed DB and W
  const wetBulbF = mixRatioA * streamA.state.wetBulbF + mixRatioB * streamB.state.wetBulbF
  const relativeHumidity = mixRatioA * streamA.state.relativeHumidity + mixRatioB * streamB.state.relativeHumidity
  
  return {
    totalCfm,
    mixRatioA,
    mixRatioB,
    dryBulbF,
    wetBulbF,
    humidityRatioGrains,
    humidityRatioLb,
    relativeHumidity,
    enthalpyBtuLb,
  }
}

// =========================================== 
// PROCESS MODE
// =========================================== 
function ProcessMode({
  points,
  calculatedPoints,
}: {
  points: PsychrometricPoint[]
  calculatedPoints: Record<string, StatePointResult>
}) {
  const { updatePoint } = usePsychrometricStore()
  const [cfm, setCfm] = useState(1000)
  
  const enteringPoint = points.find(p => p.pointLabel === 'Entering')
  const leavingPoint = points.find(p => p.pointLabel === 'Leaving')
  
  const enteringResult = enteringPoint ? calculatedPoints[enteringPoint.id] : null
  const leavingResult = leavingPoint ? calculatedPoints[leavingPoint.id] : null
  
  // Calculate loads
  const loads = enteringResult && leavingResult ? calculateLoads(enteringResult, leavingResult, cfm) : null
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">HVAC Process Calculator</h3>
      
      {/* Entering Conditions */}
      <div className="p-3 bg-cyan-900/30 rounded-lg border border-cyan-700">
        <h4 className="text-sm font-medium text-cyan-400 mb-2">Entering Conditions</h4>
        {enteringPoint && (
          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="DB (°F)"
              value={enteringPoint.dryBulbF || 70}
              onChange={(v) => updatePoint(enteringPoint.id, { dryBulbF: v })}
              compact
            />
            <InputField
              label="WB (°F)"
              value={enteringPoint.wetBulbF || 58}
              onChange={(v) => updatePoint(enteringPoint.id, { wetBulbF: v })}
              compact
            />
          </div>
        )}
        {enteringResult && (
          <div className="text-xs text-surface-400 mt-2">
            DP: {enteringResult.dewPointF.toFixed(1)}°F | RH: {enteringResult.relativeHumidity.toFixed(1)}% | h: {enteringResult.enthalpyBtuLb.toFixed(2)} Btu/lb
          </div>
        )}
      </div>
      
      {/* Leaving Conditions */}
      <div className="p-3 bg-red-900/30 rounded-lg border border-red-700">
        <h4 className="text-sm font-medium text-red-400 mb-2">Leaving Conditions</h4>
        {leavingPoint && (
          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="DB (°F)"
              value={leavingPoint.dryBulbF || 55}
              onChange={(v) => updatePoint(leavingPoint.id, { dryBulbF: v })}
              compact
            />
            <InputField
              label="WB (°F)"
              value={leavingPoint.wetBulbF || 54}
              onChange={(v) => updatePoint(leavingPoint.id, { wetBulbF: v })}
              compact
            />
          </div>
        )}
        {leavingResult && (
          <div className="text-xs text-surface-400 mt-2">
            DP: {leavingResult.dewPointF.toFixed(1)}°F | RH: {leavingResult.relativeHumidity.toFixed(1)}% | h: {leavingResult.enthalpyBtuLb.toFixed(2)} Btu/lb
          </div>
        )}
      </div>
      
      {/* CFM Input */}
      <InputField
        label="System CFM"
        value={cfm}
        onChange={setCfm}
        unit="CFM"
      />
      
      {/* Results */}
      {loads && (
        <div className="p-3 bg-purple-900/30 rounded-lg border border-purple-700">
          <h4 className="text-sm font-medium text-purple-400 mb-2">Process Results</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-surface-400">Total Load:</span>
              <span className="text-white font-medium">
                {Math.abs(loads.totalBtuh).toLocaleString()} Btuh
                <span className="text-surface-500 ml-1">({Math.abs(loads.totalTons).toFixed(2)} tons)</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Sensible:</span>
              <span className="text-white">{Math.abs(loads.sensibleBtuh).toLocaleString()} Btuh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Latent:</span>
              <span className="text-white">{Math.abs(loads.latentBtuh).toLocaleString()} Btuh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">Moisture:</span>
              <span className={`font-medium ${
                loads.moistureLbHr < 0 
                  ? 'text-cyan-400' // Removing moisture (dehumidification)
                  : loads.moistureLbHr > 0 
                    ? 'text-violet-400' // Adding moisture (humidification)
                    : 'text-white'
              }`}>
                {loads.moistureLbHr < 0 ? '−' : loads.moistureLbHr > 0 ? '+' : ''}
                {Math.abs(loads.moistureLbHr).toFixed(2)} lb/hr
                {loads.moistureLbHr < 0 && ' removed'}
                {loads.moistureLbHr > 0 && ' added'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-400">SHR:</span>
              <span className="text-white">{loads.shr.toFixed(3)}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-purple-700">
              <span className={`text-sm font-medium ${loads.totalBtuh < 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                {loads.totalBtuh < 0 ? '❄️ Cooling' : '🔥 Heating'}
                {loads.moistureLbHr < -0.01 && ' + Dehumidification'}
                {loads.moistureLbHr > 0.01 && ' + Humidification'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Calculate process loads
function calculateLoads(entering: StatePointResult, leaving: StatePointResult, cfm: number) {
  const avgV = (entering.specificVolumeFt3Lb + leaving.specificVolumeFt3Lb) / 2
  const massFlow = (cfm * 60) / avgV // lb/hr
  
  const deltaH = leaving.enthalpyBtuLb - entering.enthalpyBtuLb
  const deltaT = leaving.dryBulbF - entering.dryBulbF
  const deltaW = leaving.humidityRatioLb - entering.humidityRatioLb
  
  const totalBtuh = massFlow * deltaH
  const avgW = (entering.humidityRatioLb + leaving.humidityRatioLb) / 2
  const cpMoist = 0.240 + 0.444 * avgW
  const sensibleBtuh = massFlow * cpMoist * deltaT
  const latentBtuh = totalBtuh - sensibleBtuh
  
  const totalTons = totalBtuh / 12000
  const moistureLbHr = massFlow * deltaW
  const shr = totalBtuh !== 0 ? Math.abs(sensibleBtuh / totalBtuh) : 1
  
  return { totalBtuh, sensibleBtuh, latentBtuh, totalTons, moistureLbHr, shr }
}

// =========================================== 
// SHARED COMPONENTS
// =========================================== 

function InputField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  compact,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  unit?: string
  min?: number
  max?: number
  compact?: boolean
}) {
  return (
    <div className={compact ? '' : 'flex items-center gap-3'}>
      <label className={`text-surface-400 ${compact ? 'text-xs mb-1 block' : 'text-sm w-32'}`}>
        {label}
      </label>
      <div className="flex items-center gap-1 flex-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step="0.1"
          className={`bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm ${compact ? 'w-full' : 'w-24'}`}
        />
        {unit && <span className="text-surface-500 text-sm">{unit}</span>}
      </div>
    </div>
  )
}

function OutputValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-surface-400">{label}:</span>
      <span className="text-white">{value}</span>
    </div>
  )
}
