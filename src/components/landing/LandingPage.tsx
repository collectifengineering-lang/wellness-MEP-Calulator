import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { isAdmin } from '../../lib/auth'
import UserMenu from '../auth/UserMenu'

interface ModuleCardProps {
  title: string
  subtitle: string
  icon: string
  description: string
  path: string
  color: string
  size?: 'large' | 'small'
  comingSoon?: boolean
}

function ModuleCard({ title, subtitle, icon, description, path, color, size = 'small', comingSoon }: ModuleCardProps) {
  const navigate = useNavigate()
  
  return (
    <button
      onClick={() => !comingSoon && navigate(path)}
      disabled={comingSoon}
      className={`
        relative overflow-hidden rounded-2xl border-2 transition-all duration-300
        ${size === 'large' ? 'col-span-1 row-span-1' : ''}
        ${comingSoon 
          ? 'border-surface-700 bg-surface-800/50 cursor-not-allowed opacity-60' 
          : `border-surface-700 bg-surface-800 hover:border-[${color}] hover:shadow-lg hover:shadow-[${color}]/20 hover:scale-[1.02] cursor-pointer`
        }
        group text-left p-6
      `}
      style={{ 
        '--hover-color': color,
      } as React.CSSProperties}
    >
      {/* Background gradient on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${color}40, transparent)` }}
      />
      
      {/* Coming Soon Badge */}
      {comingSoon && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-surface-700 rounded-full text-xs text-surface-400">
          Coming Soon 🐐
        </div>
      )}
      
      {/* Icon */}
      <div className={`text-4xl ${size === 'large' ? 'text-5xl' : 'text-4xl'} mb-4`}>
        {icon}
      </div>
      
      {/* Title */}
      <h3 className={`font-bold text-white mb-1 ${size === 'large' ? 'text-2xl' : 'text-xl'}`}>
        {title}
      </h3>
      
      {/* Subtitle */}
      <p className="text-sm text-surface-400 mb-3" style={{ color: comingSoon ? undefined : color }}>
        {subtitle}
      </p>
      
      {/* Description */}
      <p className="text-sm text-surface-500 leading-relaxed">
        {description}
      </p>
      
      {/* Arrow indicator */}
      {!comingSoon && (
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <span className="text-2xl" style={{ color }}>→</span>
        </div>
      )}
    </button>
  )
}

export default function LandingPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  
  const modules: ModuleCardProps[] = [
    {
      title: 'Concept MEP Design',
      subtitle: 'Schematic Design Tool',
      icon: '🏗️',
      description: 'Quick MEP load calculations for early-stage design. Build zones, calculate loads, size systems.',
      path: '/concept-mep',
      color: '#10b981', // emerald
      size: 'large',
    },
    {
      title: 'Plan Scanner',
      subtitle: 'AI-Powered Extraction',
      icon: '📐',
      description: 'Upload architectural plans and let AI extract rooms, fixtures, and equipment. Export to any module.',
      path: '/plan-scanner',
      color: '#8b5cf6', // violet
      size: 'large',
    },
    {
      title: 'HVAC Calcs',
      subtitle: 'Ventilation & Loads',
      icon: '🌡️',
      description: 'ASHRAE 62.1 ventilation calculations, space-zone-system hierarchy, ERV analysis, and ductulator.',
      path: '/hvac',
      color: '#f59e0b', // amber
    },
    {
      title: 'Electrical',
      subtitle: 'Power & Lighting',
      icon: '⚡',
      description: 'Electrical load calculations, panel schedules, lighting design, and service sizing.',
      path: '/electrical',
      color: '#3b82f6', // blue
      comingSoon: true,
    },
    {
      title: 'Plumbing / FP',
      subtitle: 'Water & Fire Protection',
      icon: '🚿',
      description: 'Fixture units, pipe sizing, DHW calculations, gas piping, and fire protection.',
      path: '/plumbing',
      color: '#ec4899', // pink
    },
  ]

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Header */}
      <header className="border-b border-surface-700 bg-surface-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex flex-col items-center leading-none">
              <div className="border-2 border-[#4ecdc4] px-2 py-1 text-xs font-light tracking-[0.3em] text-white">
                <div>COL</div>
                <div>LEC</div>
                <div>TIF</div>
              </div>
              <div className="text-[#ec4899] text-lg -mt-1" style={{ fontFamily: "'Pacifico', cursive" }}>
                goat
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Collectif GOAT</h1>
              <p className="text-xs text-surface-400">Greatest Of All Tools 🐐</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user && isAdmin(user.email) && (
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
              >
                ⚙️ Settings
              </button>
            )}
            {user && <UserMenu />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome to the GOAT 🐐
          </h2>
          <p className="text-lg text-surface-400 max-w-2xl mx-auto">
            The Greatest Of All Tools for MEP engineering. 
            Because your designs deserve nothing less than GOAT-tier calculations.
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Large cards - first two */}
          {modules.slice(0, 2).map((module) => (
            <ModuleCard key={module.path} {...module} />
          ))}
        </div>
        
        {/* Smaller cards - bottom three */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modules.slice(2).map((module) => (
            <ModuleCard key={module.path} {...module} />
          ))}
        </div>

        {/* Fun Footer */}
        <div className="mt-16 text-center">
          <p className="text-surface-600 text-sm">
            🐐 No goats were harmed in the making of these calculations 🐐
          </p>
          <p className="text-surface-700 text-xs mt-2">
            Built with baaaa-d puns and good engineering
          </p>
        </div>
      </main>
    </div>
  )
}
