import type { Zone } from '../../types'

interface ZoneBlockProps {
  zone: Zone
  totalSF: number
  height: number
  isSelected: boolean
  onClick: () => void
}

export default function ZoneBlock({ zone, totalSF, height, isSelected, onClick }: ZoneBlockProps) {
  const percentage = totalSF > 0 ? ((zone.sf / totalSF) * 100).toFixed(1) : '0'
  
  return (
    <div
      onClick={onClick}
      style={{ 
        minHeight: height,
        backgroundColor: `${zone.color}15`,
        borderColor: isSelected ? zone.color : `${zone.color}40`,
      }}
      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-offset-2 ring-offset-surface-900' : ''
      }`}
    >
      {/* Color indicator bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg"
        style={{ backgroundColor: zone.color }}
      />
      
      {/* Zone name */}
      <h3 className="text-white font-semibold mt-2 truncate" title={zone.name}>
        {zone.name}
      </h3>
      
      {/* Zone type badge */}
      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-surface-700/50 text-surface-300">
        {zone.subType === 'gas' ? '🔥' : '⚡'} {zone.type.replace(/_/g, ' ')}
      </span>
      
      {/* Square footage */}
      <div className="mt-3">
        <div className="text-2xl font-bold text-white font-mono">
          {zone.sf.toLocaleString()}
          <span className="text-sm font-normal text-surface-400 ml-1">SF</span>
        </div>
        <div className="text-sm text-surface-400">
          {percentage}% of total
        </div>
      </div>
      
      {/* Quick stats */}
      <div className="mt-3 pt-3 border-t border-surface-700/50">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {zone.fixtures.showers > 0 && (
            <div className="text-surface-400">
              <span className="text-surface-300">{zone.fixtures.showers}</span> showers
            </div>
          )}
          {zone.fixtures.wcs > 0 && (
            <div className="text-surface-400">
              <span className="text-surface-300">{zone.fixtures.wcs}</span> WCs
            </div>
          )}
          {zone.lineItems.length > 0 && (
            <div className="text-surface-400 col-span-2">
              <span className="text-surface-300">{zone.lineItems.length}</span> line items
            </div>
          )}
        </div>
      </div>
      
      {/* Edit indicator */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </div>
    </div>
  )
}
