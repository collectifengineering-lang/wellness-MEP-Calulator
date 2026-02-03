/**
 * HelpOverlay Component
 * Educational help system for junior engineers
 */

import { useState } from 'react'

interface HelpOverlayProps {
  isOpen: boolean
  onClose: () => void
}

// Help topics with explanations
const HELP_TOPICS = [
  {
    category: 'Chart Basics',
    items: [
      {
        title: 'Dry Bulb Temperature (x-axis)',
        icon: '🌡️',
        content: `The "true" air temperature as measured by a standard thermometer. This is the temperature we typically refer to in everyday use. On the chart, dry bulb increases from left to right.`,
      },
      {
        title: 'Humidity Ratio (y-axis)',
        icon: '💧',
        content: `The mass of water vapor per mass of dry air, measured in grains per pound (gr/lb). 7000 grains = 1 pound. Also called "specific humidity" or "moisture content". Higher = more moisture in the air.`,
      },
      {
        title: 'Saturation Curve (100% RH)',
        icon: '〰️',
        content: `The curved line at the top-left of the chart where air is fully saturated (100% RH). Air cannot hold more moisture at this state - any cooling causes condensation. This is the "dew point" boundary.`,
      },
      {
        title: 'Relative Humidity (RH) Curves',
        icon: '📈',
        content: `Curved lines showing constant relative humidity percentages. RH = (actual vapor pressure) / (saturation pressure) × 100%. At 50% RH, air holds half the moisture it could at that temperature.`,
      },
      {
        title: 'Wet Bulb Lines',
        icon: '🌫️',
        content: `Diagonal lines sloping down from left to right. Wet bulb temperature is measured with a thermometer wrapped in a wet wick - evaporation cools it. These lines also approximate constant enthalpy (adiabatic saturation).`,
      },
    ],
  },
  {
    category: 'HVAC Processes',
    items: [
      {
        title: 'Sensible Heating',
        icon: '🔥',
        content: `Pure temperature increase with NO moisture change. The process follows a horizontal line to the right on the chart. Examples: hot water coil, electric heater, gas furnace. Only affects dry bulb temperature.`,
      },
      {
        title: 'Sensible Cooling',
        icon: '❄️',
        content: `Temperature decrease WITHOUT reaching the dew point (no condensation). Horizontal line to the left. Only possible if the cooling surface temperature stays above the dew point of the air.`,
      },
      {
        title: 'Evaporative Cooling (Adiabatic)',
        icon: '💧',
        content: `Cooling by evaporating water into the airstream. Temperature drops while humidity rises - follows a constant wet bulb line toward saturation. Used in swamp coolers and cooling towers. Very energy-efficient but limited in humid climates.`,
      },
      {
        title: 'DX Cooling & Dehumidification',
        icon: '🧊',
        content: `Cooling below the dew point causes moisture to condense out. The process first cools sensibly (horizontal), then follows the saturation curve down as moisture condenses. This is how most air conditioners work.`,
      },
      {
        title: 'Steam Humidification',
        icon: '♨️',
        content: `Adding steam (isothermal humidification). Nearly vertical line upward - humidity increases with minimal temperature change because steam carries its own heat. Used in hospitals, data centers, museums.`,
      },
      {
        title: 'Desiccant Dehumidification',
        icon: '🌀',
        content: `Removing moisture using desiccant materials (silica gel, molecular sieve). The process follows a constant enthalpy line - latent heat is converted to sensible heat, so humidity drops but temperature rises. Often paired with sensible cooling.`,
      },
      {
        title: 'Air Mixing',
        icon: '🔄',
        content: `Combining two airstreams creates a weighted average. The mixed air state lies on a straight line between the two source states, positioned by the mass flow ratio. Used in economizer cycles mixing outdoor and return air.`,
      },
    ],
  },
  {
    category: 'Load Calculations',
    items: [
      {
        title: 'Sensible Heat (Qs)',
        icon: '📊',
        content: `Heat that changes temperature without phase change. Qs = 1.08 × CFM × ΔT (for standard air). Measured in BTU/hr. Positive = heating load, Negative = cooling load.`,
      },
      {
        title: 'Latent Heat (QL)',
        icon: '💨',
        content: `Heat associated with moisture change (evaporation/condensation). QL = 0.68 × CFM × ΔW (grains). Takes about 1076 BTU to evaporate 1 lb of water. Humidification adds latent load; dehumidification removes it.`,
      },
      {
        title: 'Total Heat (Qt)',
        icon: '⚡',
        content: `Sum of sensible and latent heat: Qt = Qs + QL. Also calculated as Qt = 4.5 × CFM × Δh (enthalpy). Expressed in BTU/hr or Tons (1 Ton = 12,000 BTU/hr).`,
      },
      {
        title: 'Sensible Heat Ratio (SHR)',
        icon: '📐',
        content: `SHR = Qs / Qt. Indicates what fraction of the total load is sensible. A high SHR (0.8+) means mostly temperature change; low SHR means significant moisture change. Typical comfort cooling: SHR ≈ 0.7-0.8.`,
      },
    ],
  },
  {
    category: 'Quick Reference',
    items: [
      {
        title: 'Standard Air Constants',
        icon: '📋',
        content: `At sea level, 70°F: Air density = 0.075 lb/ft³. Common shortcuts: Sensible: Qs = 1.08 × CFM × ΔT. Latent: QL = 0.68 × CFM × ΔW. Total: Qt = 4.5 × CFM × Δh.`,
      },
      {
        title: 'Altitude Effects',
        icon: '⛰️',
        content: `Higher altitude = lower air pressure = lower air density. At 5000 ft, multiply CFM factors by ~0.83. Always account for altitude in load calculations for accuracy.`,
      },
      {
        title: 'Comfort Zone',
        icon: '😊',
        content: `ASHRAE Standard 55 comfort: Summer: 73-79°F, 40-60% RH. Winter: 68-75°F, 30-50% RH. This is the target zone for occupied spaces.`,
      },
    ],
  },
]

export default function HelpOverlay({ isOpen, onClose }: HelpOverlayProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Chart Basics')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-900/50 border-b border-indigo-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📚 Psychrometric Chart Help
            </h2>
            <p className="text-sm text-indigo-300 mt-1">
              Learn about psychrometrics and HVAC processes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-indigo-800 rounded-lg transition-colors"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {HELP_TOPICS.map(category => (
              <div key={category.category} className="bg-gray-800/50 rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(
                    expandedCategory === category.category ? null : category.category
                  )}
                  className="w-full px-4 py-3 bg-gray-800 flex items-center justify-between hover:bg-gray-700 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-white">{category.category}</h3>
                  <span className={`transform transition-transform ${
                    expandedCategory === category.category ? 'rotate-180' : ''
                  }`}>
                    ▼
                  </span>
                </button>
                
                {/* Category Items */}
                {expandedCategory === category.category && (
                  <div className="p-4 space-y-2">
                    {category.items.map(item => (
                      <div key={item.title} className="bg-gray-900/50 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedItem(
                            expandedItem === item.title ? null : item.title
                          )}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors"
                        >
                          <span className="text-xl">{item.icon}</span>
                          <span className="font-medium text-white flex-1 text-left">{item.title}</span>
                          <span className={`text-gray-500 transform transition-transform ${
                            expandedItem === item.title ? 'rotate-90' : ''
                          }`}>
                            ▶
                          </span>
                        </button>
                        
                        {expandedItem === item.title && (
                          <div className="px-4 pb-4 pt-0">
                            <div className="pl-10 pr-4 py-3 bg-gray-800/30 rounded-lg">
                              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {item.content}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              💡 Tip: Enable "Help Mode" in the calculator to see tooltips when hovering over chart elements
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
