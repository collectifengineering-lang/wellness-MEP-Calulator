/**
 * Psychrometric Results
 * Display calculated results and export options
 */

import type { CalculationMode, StatePointResult, PsychrometricPoint } from '../../types/psychrometric'

interface PointWithResult {
  point: PsychrometricPoint
  result: StatePointResult | null
}

interface PsychrometricResultsProps {
  mode: CalculationMode // eslint-disable-line @typescript-eslint/no-unused-vars
  points: PointWithResult[]
  barometricPressure: number
}

export default function PsychrometricResults({
  points,
  barometricPressure,
}: PsychrometricResultsProps) {
  const validPoints = points.filter(p => p.result !== null)
  
  if (validPoints.length === 0) {
    return (
      <div className="text-surface-400 text-sm">
        Enter values to see results...
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-white">State Points Summary</h4>
      
      {/* Points Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-surface-400 border-b border-gray-700">
              <th className="text-left py-1">Point</th>
              <th className="text-right py-1">DB °F</th>
              <th className="text-right py-1">WB °F</th>
              <th className="text-right py-1">DP °F</th>
              <th className="text-right py-1">RH %</th>
              <th className="text-right py-1">W gr/lb</th>
              <th className="text-right py-1">h Btu/lb</th>
            </tr>
          </thead>
          <tbody>
            {validPoints.map(({ point, result }) => (
              <tr key={point.id} className="border-b border-gray-700/50">
                <td className="py-1.5 font-medium" style={{ color: getPointColor(point.pointLabel) }}>
                  {point.pointLabel}
                </td>
                <td className="text-right text-white">{result!.dryBulbF.toFixed(1)}</td>
                <td className="text-right text-white">{result!.wetBulbF.toFixed(1)}</td>
                <td className="text-right text-white">{result!.dewPointF.toFixed(1)}</td>
                <td className="text-right text-white">{result!.relativeHumidity.toFixed(1)}</td>
                <td className="text-right text-white">{result!.humidityRatioGrains.toFixed(1)}</td>
                <td className="text-right text-white">{result!.enthalpyBtuLb.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Air Properties */}
      <div className="text-xs text-surface-400 pt-2 border-t border-gray-700">
        <div className="flex justify-between">
          <span>Barometric Pressure:</span>
          <span className="text-surface-300">{barometricPressure.toFixed(3)} psia</span>
        </div>
        {validPoints[0]?.result && (
          <div className="flex justify-between">
            <span>Specific Volume:</span>
            <span className="text-surface-300">{validPoints[0].result.specificVolumeFt3Lb.toFixed(3)} ft³/lb</span>
          </div>
        )}
      </div>
      
      {/* Quick Reference */}
      <div className="text-xs text-surface-500 pt-2 border-t border-gray-700">
        <div>💡 Standard air density: 0.075 lb/ft³ at sea level, 70°F</div>
        <div>💡 7000 grains = 1 lb of water</div>
      </div>
    </div>
  )
}

// Point colors
function getPointColor(label: string): string {
  const colors: Record<string, string> = {
    A: '#22c55e',
    B: '#3b82f6',
    Mixed: '#f59e0b',
    Entering: '#06b6d4',
    Leaving: '#ef4444',
  }
  return colors[label] || '#a855f7'
}
