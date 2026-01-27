interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { frame: 'text-[8px]', script: 'text-sm', gap: 'gap-2' },
    md: { frame: 'text-[10px]', script: 'text-lg', gap: 'gap-3' },
    lg: { frame: 'text-sm', script: 'text-2xl', gap: 'gap-4' },
  }
  
  const s = sizes[size]
  
  return (
    <div className={`flex items-center ${s.gap}`}>
      {/* Logo Mark */}
      <div className="flex flex-col items-center leading-none">
        <div className={`border-2 border-[#4ecdc4] px-2 py-1 ${s.frame} font-light tracking-[0.3em] text-white`}>
          <div>COL</div>
          <div>LEC</div>
          <div>TIF</div>
        </div>
        <div 
          className={`text-[#ec4899] ${s.script} -mt-1`} 
          style={{ fontFamily: "'Pacifico', cursive" }}
        >
          goat
        </div>
      </div>
      
      {/* Text */}
      {showText && (
        <div>
          <h1 className={`font-bold text-white ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-lg'}`}>
            Collectif GOAT
          </h1>
          <p className={`text-surface-400 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
            Greatest Of All Tools 🐐
          </p>
        </div>
      )}
    </div>
  )
}

export function GoatIcon({ className = '' }: { className?: string }) {
  return <span className={className}>🐐</span>
}

// Fun loading messages
export const goatLoadingMessages = [
  "🐐 Calculating... baaaa-sically done!",
  "🐐 Crunching numbers like hay...",
  "🐐 GOAT-ing through the data...",
  "🐐 Almost there, don't have a cow!",
  "🐐 Loading with GOAT-tier speed...",
]

export function getRandomGoatMessage() {
  return goatLoadingMessages[Math.floor(Math.random() * goatLoadingMessages.length)]
}

// Fun empty state messages
export const goatEmptyMessages = {
  noProjects: "No projects yet? Don't be a scaredy goat! 🐐",
  noZones: "This pasture is empty. Add some zones! 🐐",
  noResults: "Nothing to see here... yet! 🐐",
  noScans: "No scans yet. Feed me some plans! 🐐📄",
}

// Success messages
export const goatSuccessMessages = [
  "GOAT status achieved! 🏆🐐",
  "Nailed it like a true GOAT! 🐐✨",
  "That's what we call GOAT-tier work! 🐐",
  "Success! You're the GOAT! 🐐🎉",
]

export function getRandomSuccessMessage() {
  return goatSuccessMessages[Math.floor(Math.random() * goatSuccessMessages.length)]
}
