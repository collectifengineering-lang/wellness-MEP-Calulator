import type { PlumbingSpace } from '../../../store/usePlumbingStore'
import { getLegacyFixtureCounts } from '../../../data/fixtureUtils'

interface SpaceBlockProps {
  space: PlumbingSpace
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}

export default function SpaceBlock({ space, isSelected, onClick, onDelete }: SpaceBlockProps) {
  const fixtures = getLegacyFixtureCounts(space.fixtures)
  
  // Count total fixtures
  const totalFixtures = Object.values(fixtures).reduce((sum, count) => sum + count, 0)
  
  // Get fixture summary
  const fixtureIcons = []
  if (fixtures.wcs > 0) fixtureIcons.push(`🚽 ${fixtures.wcs}`)
  if (fixtures.lavs > 0) fixtureIcons.push(`🚰 ${fixtures.lavs}`)
  if (fixtures.showers > 0) fixtureIcons.push(`🚿 ${fixtures.showers}`)
  if (fixtures.floorDrains > 0) fixtureIcons.push(`🕳️ ${fixtures.floorDrains}`)

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border-2 cursor-pointer transition-all
        ${isSelected 
          ? 'border-pink-500 bg-pink-500/10' 
          : 'border-surface-700 bg-surface-800 hover:border-surface-600'
        }
      `}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/20 text-surface-500 hover:text-red-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Space name */}
      <h3 className="font-semibold text-white mb-1 pr-6">{space.name}</h3>
      
      {/* SF */}
      <p className="text-sm text-surface-400 mb-3">{space.sf.toLocaleString()} SF</p>
      
      {/* Fixture summary */}
      {totalFixtures > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {fixtureIcons.slice(0, 3).map((icon, i) => (
            <span key={i} className="px-2 py-1 bg-surface-700 rounded text-surface-300">
              {icon}
            </span>
          ))}
          {fixtureIcons.length > 3 && (
            <span className="px-2 py-1 bg-surface-700 rounded text-surface-400">
              +{fixtureIcons.length - 3}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-surface-500 italic">No fixtures yet</p>
      )}
    </div>
  )
}
