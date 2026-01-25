import type { Project } from '../../types'

interface ProjectCardProps {
  project: Project
  onClick: () => void
  onDelete: () => void
}

const climateLabels: Record<string, string> = {
  hot_humid: 'Hot & Humid',
  temperate: 'Temperate',
  cold_dry: 'Cold & Dry',
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function ProjectCard({ project, onClick, onDelete }: ProjectCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div
      onClick={onClick}
      className="group relative bg-surface-800 hover:bg-surface-750 border border-surface-700 hover:border-surface-600 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-surface-600 rounded-lg transition-all"
        title="Delete project"
      >
        <svg className="w-4 h-4 text-surface-400 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 border border-primary-500/30 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-1 truncate pr-8">
        {project.name}
      </h3>

      {/* Details */}
      <div className="flex items-center gap-3 text-sm text-surface-400">
        <span className="font-mono">{project.targetSF.toLocaleString()} SF</span>
        <span>•</span>
        <span>{climateLabels[project.climate]}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-700">
        <span className="text-xs text-surface-500">
          Updated {formatRelativeDate(new Date(project.updatedAt))}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          project.electricPrimary 
            ? 'bg-amber-500/10 text-amber-400' 
            : 'bg-orange-500/10 text-orange-400'
        }`}>
          {project.electricPrimary ? '⚡ Electric' : '🔥 Gas'}
        </span>
      </div>
    </div>
  )
}
