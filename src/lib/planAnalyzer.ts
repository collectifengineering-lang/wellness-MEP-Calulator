/**
 * Plan Analyzer - AI-powered drawing analysis for Plan Scanner
 * Uses the SAME extraction logic as Concept MEP for consistency
 * Claude (primary) with Grok fallback
 */

import { ExtractedSpace, SymbolLegend } from '../store/useScannerStore'
import { v4 as uuidv4 } from 'uuid'

// Get API keys from environment
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY || ''
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'

// Check if providers are configured
const isClaudeReady = () => !!ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.length > 10
const isGrokReady = () => !!XAI_API_KEY && XAI_API_KEY.length > 10

// =============================================================================
// ZONE TYPE MAPPING - Same as Concept MEP
// =============================================================================
const ZONE_TYPE_MAPPING: Record<string, string> = {
  // Reception & Common
  'reception': 'reception', 'recep': 'reception', 'front desk': 'reception',
  'lobby': 'reception', 'entry': 'reception', 'entrance': 'reception',
  'waiting': 'reception', 'common': 'reception', 'welcome': 'reception',
  
  // Break Room / Lounge
  'break room': 'break_room', 'breakroom': 'break_room', 'break': 'break_room',
  'lounge': 'break_room', 'employee lounge': 'break_room', 'staff lounge': 'break_room',
  'lunch room': 'break_room', 'lunchroom': 'break_room', 'kitchenette': 'break_room',
  'pantry': 'break_room',
  
  // Restrooms
  'restroom': 'restroom', 'rest room': 'restroom', 'rr': 'restroom',
  'bathroom': 'restroom', 'toilet': 'restroom', 'wc': 'restroom',
  'lavatory': 'restroom', 'lav': 'restroom', 'mens': 'restroom',
  "men's": 'restroom', 'womens': 'restroom', "women's": 'restroom',
  'unisex': 'restroom', 'ada': 'restroom', 'accessible': 'restroom',
  
  // Locker rooms
  'locker': 'locker_room', 'locker room': 'locker_room', 'lockers': 'locker_room',
  'changing': 'locker_room', 'changing room': 'locker_room', 'dressing': 'locker_room',
  
  // Wet areas / Thermal
  'pool': 'pool_indoor', 'swimming': 'pool_indoor', 'lap pool': 'pool_indoor',
  'natatorium': 'pool_indoor', 'pool deck': 'pool_indoor',
  'hot tub': 'hot_tub', 'hottub': 'hot_tub', 'spa': 'hot_tub',
  'jacuzzi': 'hot_tub', 'whirlpool': 'hot_tub', 'hydrotherapy': 'hot_tub',
  'cold plunge': 'cold_plunge', 'plunge': 'cold_plunge', 'cold pool': 'cold_plunge',
  'steam': 'steam_room', 'steam room': 'steam_room', 'steamroom': 'steam_room', 'hammam': 'steam_room',
  'sauna': 'sauna_electric', 'dry sauna': 'sauna_electric', 'finnish': 'sauna_electric',
  'banya': 'banya_gas', 'russian': 'banya_gas',
  'snow': 'snow_room', 'snow room': 'snow_room',
  
  // Treatment rooms
  'treatment': 'massage_room', 'treatment room': 'massage_room',
  'massage': 'massage_room', 'massage room': 'massage_room',
  'therapy': 'massage_room', 'therapy room': 'massage_room',
  'facial': 'massage_room', 'body': 'massage_room',
  'private suite': 'private_suite', 'suite': 'private_suite',
  'couples': 'couples_treatment', 'couple': 'couples_treatment', 'vip': 'private_suite',
  
  // Fitness
  'gym': 'open_gym', 'gymnasium': 'open_gym', 'fitness': 'open_gym',
  'fitness floor': 'open_gym', 'fitness center': 'open_gym',
  'weight': 'open_gym', 'weight room': 'open_gym', 'weights': 'open_gym',
  'cardio': 'open_gym', 'strength': 'open_gym', 'training': 'open_gym',
  'yoga': 'yoga_studio', 'yoga studio': 'yoga_studio',
  'pilates': 'pilates_studio', 'pilates studio': 'pilates_studio', 'reformer': 'pilates_studio',
  'studio': 'group_fitness', 'group': 'group_fitness', 'group fitness': 'group_fitness',
  'spin': 'group_fitness', 'spinning': 'group_fitness', 'cycling': 'group_fitness',
  'boxing': 'mma_studio', 'mma': 'mma_studio', 'martial': 'mma_studio',
  'stretch': 'stretching_area', 'stretching': 'stretching_area',
  'recovery': 'recovery_longevity', 'longevity': 'recovery_longevity', 'cryo': 'recovery_longevity',
  
  // Food & Beverage
  'kitchen': 'kitchen_commercial', 'commercial kitchen': 'kitchen_commercial',
  'prep': 'kitchen_commercial', 'boh': 'kitchen_commercial',
  'cafe': 'cafe_light_fb', 'café': 'cafe_light_fb', 'coffee': 'cafe_light_fb',
  'juice': 'cafe_light_fb', 'juice bar': 'cafe_light_fb', 'smoothie': 'cafe_light_fb',
  'snack': 'cafe_light_fb', 'restaurant': 'kitchen_commercial',
  'bar': 'cafe_light_fb', 'dining': 'cafe_light_fb', 'food': 'cafe_light_fb',
  
  // Co-work / Office
  'cowork': 'cowork', 'co-work': 'cowork', 'coworking': 'cowork',
  'workspace': 'cowork', 'hotdesk': 'cowork',
  'conference': 'conference_room', 'conf': 'conference_room',
  'meeting': 'conference_room', 'meeting room': 'conference_room', 'boardroom': 'conference_room',
  
  // Support spaces
  'mechanical': 'mechanical_room', 'mech': 'mechanical_room', 'mechanical room': 'mechanical_room',
  'mep': 'mechanical_room', 'electrical': 'mechanical_room', 'elec': 'mechanical_room',
  'boiler': 'mechanical_room', 'ahu': 'mechanical_room', 'pump': 'mechanical_room',
  'it': 'mechanical_room', 'idf': 'mechanical_room', 'mdf': 'mechanical_room',
  'storage': 'storage', 'stor': 'storage', 'store': 'storage', 'storeroom': 'storage',
  'closet': 'storage', 'janitor': 'storage', 'jc': 'storage', 'custodial': 'storage',
  'laundry': 'laundry_commercial', 'linen': 'laundry_commercial', 'towel': 'laundry_commercial',
  'office': 'office', 'admin': 'office', 'administration': 'office', 'manager': 'office',
  
  // Circulation - SKIP THESE
  'corridor': '_skip_', 'hall': '_skip_', 'hallway': '_skip_',
  'circulation': '_skip_', 'stair': '_skip_', 'stairwell': '_skip_',
  'elevator': '_skip_', 'vest': '_skip_', 'vestibule': '_skip_',
  'egress': '_skip_', 'exit': '_skip_',
  
  // Outdoor
  'terrace': 'terrace', 'outdoor': 'terrace', 'patio': 'terrace',
  'deck': 'terrace', 'roof': 'terrace', 'rooftop': 'terrace', 'balcony': 'terrace',
  
  // Event / Multi-purpose
  'event': 'event_space', 'events': 'event_space', 'multipurpose': 'event_space',
  'flex': 'event_space', 'ballroom': 'event_space',
  'theater': 'screening_room', 'theatre': 'screening_room', 'screening': 'screening_room',
  
  // Kids / Child care
  'child': 'child_care', 'children': 'child_care', 'kids': 'child_care',
  'childcare': 'child_care', 'child care': 'child_care', 'daycare': 'child_care',
  'nursery': 'child_care', 'play': 'child_care', 'playroom': 'child_care',
  
  // Retail
  'retail': 'retail', 'shop': 'retail', 'merchandise': 'retail',
  'pro shop': 'retail', 'boutique': 'retail',
  
  // Sports courts
  'basketball': 'basketball_court', 'court': 'basketball_court',
  'padel': 'padel_court', 'tennis': 'padel_court', 'squash': 'padel_court',
}

function suggestZoneType(roomName: string): string {
  const lower = roomName.toLowerCase()
  for (const [keyword, zoneType] of Object.entries(ZONE_TYPE_MAPPING)) {
    if (lower.includes(keyword)) {
      return zoneType
    }
  }
  return 'custom'
}

function shouldSkipZone(roomName: string): boolean {
  const lower = roomName.toLowerCase()
  const skipKeywords = ['stair', 'elevator', 'corridor', 'hallway', 'vestibule', 'egress', 'exit', 'circulation']
  return skipKeywords.some(keyword => lower.includes(keyword))
}

// Format floor to a consistent short prefix
function formatFloorPrefix(floor: string): string {
  if (!floor || floor === 'Unknown') return 'L?'
  
  const lower = floor.toLowerCase().trim()
  
  // Already short format
  if (/^l\d+$/i.test(floor)) return floor.toUpperCase()
  if (/^[bgmr]$/i.test(floor)) return floor.toUpperCase()
  if (/^b\d+$/i.test(floor)) return floor.toUpperCase()
  
  // Convert common formats
  if (lower.includes('ground') || lower === 'g') return 'G'
  if (lower.includes('basement') || lower.includes('cellar')) {
    const num = lower.match(/\d+/)
    return num ? `B${num[0]}` : 'B1'
  }
  if (lower.includes('roof') || lower === 'r') return 'RF'
  if (lower.includes('mezz')) return 'M'
  if (lower.includes('penthouse') || lower === 'ph') return 'PH'
  
  // Extract number from various formats
  const numMatch = lower.match(/(\d+)/)
  if (numMatch) return `L${numMatch[1]}`
  
  // Word numbers
  const wordNums: Record<string, string> = {
    'first': '1', 'second': '2', 'third': '3', 'fourth': '4', 'fifth': '5',
    'sixth': '6', 'seventh': '7', 'eighth': '8', 'ninth': '9', 'tenth': '10'
  }
  for (const [word, num] of Object.entries(wordNums)) {
    if (lower.includes(word)) return `L${num}`
  }
  
  // Fallback
  return floor.substring(0, 3).toUpperCase()
}

// =============================================================================
// EXTRACTION PROMPT - Same thorough prompt as Concept MEP
// =============================================================================
const EXTRACTION_PROMPT = `You are extracting room data from an architectural floor plan or area schedule.

TASK: Find EVERY room/space with a SQUARE FOOTAGE number. Be thorough - don't miss any!

HOW TO READ THE DOCUMENT:
1. Look for TABLES with room names and SF in cells
2. Look for LABELS on floor plans: "ROOM NAME" with "X,XXX sqft" below or beside
3. Numbers like "10,274 sqft", "482 sqft", "191 sqft" are square footage
4. SCAN THE ENTIRE IMAGE - rooms can be in corners, small cells, anywhere
5. Even SMALL TEXT contains valid rooms - read everything carefully

IDENTIFY THE FLOOR/LEVEL:
- Look in TITLE BLOCK (usually corners) for: "Level 3", "Level 4", "Floor 2", "L1"
- Look for headers: "Level 3 - GYM & Co-Work", "Level 4 - Wellness"
- Common formats: "L1", "Level 1", "1F", "Ground", "Roof", "B1" (basement)

EXTRACT ALL OF THESE (including small rooms):
- GYM, FITNESS (often 3,000-15,000 SF)
- CO-WORK, COWORKING (often 2,000-8,000 SF)
- CONFERENCE ROOM, CONF ROOM (often 200-800 SF) - may have multiple!
- LOUNGE, BREAK AREA (often 500-2,000 SF)
- RECEPTION, LOBBY (often 200-1,000 SF)
- OFFICE, MANAGER'S OFFICE (often 100-500 SF)
- CALL BOOTH, PHONE BOOTH (often 50-150 SF)
- LOCKER ROOM, MEN'S/WOMEN'S LOCKERS (often 1,000-3,000 SF)
- POOL, POOL WELLNESS, POOL BAR (often 500-5,000 SF)
- CAFÉ, F&B (often 500-2,000 SF)
- CHILD CARE, KIDS CLUB (often 500-2,000 SF)
- RECOVERY, LONGEVITY, STRETCHING (often 500-3,000 SF)
- CONTRAST SUITE, SAUNA, STEAM (often 200-2,000 SF)
- MMA, BOXING, YOGA STUDIO (often 1,000-3,000 SF)
- MECHANICAL, MECH ROOM, BOH (often 300-1,000 SF)
- TERRACE, OUTDOOR (often 1,000-5,000 SF)
- RESTROOM, RR (often 100-500 SF)
- STORAGE (often 100-500 SF)

COUNT PLUMBING FIXTURES if visible:
- toilets/water closets
- urinals
- sinks/lavatories
- showers
- floor drains
- drinking fountains

IMPORTANT:
- Extract EVERY room with SF, even if small (50+ SF)
- If same room type appears multiple times (e.g., 3 Conf Rooms), list each separately
- DO NOT skip small offices, call booths, break areas
- DO NOT EXTRACT: Stairs, Elevators, Corridors (unless they have SF numbers)

Respond with ONLY valid JSON:
{
  "floor": "Level 3",
  "zones": [
    {"name": "Gym", "type": "gym", "sf": 10274, "fixtures": {"toilets": 0, "showers": 0}},
    {"name": "Co-Work", "type": "office", "sf": 5252, "fixtures": {}},
    {"name": "Conf Room", "type": "conference", "sf": 482, "fixtures": {}},
    {"name": "Conf Room", "type": "conference", "sf": 482, "fixtures": {}},
    {"name": "Men's Locker", "type": "locker", "sf": 2000, "fixtures": {"toilets": 6, "urinals": 4, "lavatories": 8, "showers": 12}},
    {"name": "Women's Locker", "type": "locker", "sf": 2200, "fixtures": {"toilets": 10, "lavatories": 8, "showers": 12}}
  ],
  "totalSF": 13520,
  "notes": "Found X rooms including small offices and booths"
}

Be THOROUGH. Missing rooms is worse than including extras!`

// Symbol legend context prompt
const LEGEND_CONTEXT_PROMPT = (legend: SymbolLegend) => `
SYMBOL LEGEND CONTEXT:
The following symbols are used in this project's drawings:
${legend.symbols.map(s => `- ${s.name}: ${s.description || s.category}${s.fixtureType ? ` (maps to: ${s.fixtureType})` : ''}`).join('\n')}

Use these symbol definitions when identifying fixtures and equipment.
`

// =============================================================================
// ANALYSIS RESULT TYPES
// =============================================================================
export interface AnalysisResult {
  drawingInfo: {
    title: string | null
    scale: string | null
    floor: string | null
    drawingNumber: string | null
  }
  spaces: ExtractedSpace[]
  pools: Array<{
    name: string
    sf: number
    estimatedGallons: number
    type: string
  }>
  notes: string
  provider: 'claude' | 'grok'
}

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================
export async function analyzeDrawing(
  imageBase64: string,
  mimeType: string = 'image/png',
  legend?: SymbolLegend
): Promise<AnalysisResult> {
  const errors: string[] = []
  
  console.log('🔍 Plan Scanner AI Analysis Starting...')
  console.log(`   Claude configured: ${isClaudeReady()}`)
  console.log(`   Grok configured: ${isGrokReady()}`)
  console.log(`   Image type: ${mimeType}`)
  console.log(`   Image size: ${Math.round(imageBase64.length / 1024)}KB base64`)
  
  let rawResult: { zones: any[]; totalSF: number; floor: string; rawResponse: string } | null = null
  
  // Try Claude first (preferred for document analysis)
  if (isClaudeReady()) {
    try {
      console.log('🔵 Attempting extraction with Claude...')
      rawResult = await extractWithClaude(imageBase64, mimeType, legend)
      console.log(`✅ Claude extraction successful: ${rawResult.zones.length} zones found`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('❌ Claude extraction failed:', msg)
      errors.push(`Claude: ${msg}`)
    }
  } else {
    console.log('⚠️ Claude not configured - check VITE_ANTHROPIC_API_KEY')
    errors.push('Claude: API key not configured')
  }
  
  // Fallback to Grok only if Claude fails
  if (!rawResult && isGrokReady()) {
    try {
      console.log('🟠 Falling back to Grok...')
      rawResult = await extractWithGrok(imageBase64, mimeType, legend)
      console.log(`✅ Grok extraction successful: ${rawResult.zones.length} zones found`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('❌ Grok extraction failed:', msg)
      errors.push(`Grok: ${msg}`)
    }
  } else if (!rawResult) {
    console.log('⚠️ Grok not configured - check VITE_XAI_API_KEY')
  }
  
  if (!rawResult) {
    throw new Error(`AI analysis failed:\n${errors.join('\n')}`)
  }

  // Process the raw zones using the same logic as Concept MEP
  const detectedFloor = rawResult.floor || 'Unknown'
  console.log(`📍 Detected floor: ${detectedFloor}`)

  // Filter and process zones
  const processedZones = rawResult.zones
    .map((z: any) => ({
      name: z.name || 'Unknown',
      type: z.type || 'unknown',
      sf: Math.round(z.sf || z.area || 0),
      fixtures: z.fixtures || {},
    }))
    .filter((z: any) => {
      if (!z.sf || z.sf <= 0) {
        console.log(`   Skipping "${z.name}" - no SF`)
        return false
      }
      if (shouldSkipZone(z.name)) {
        console.log(`   Skipping "${z.name}" - circulation/stairs`)
        return false
      }
      return true
    })

  console.log(`📊 ${processedZones.length} valid zones after filtering`)

  // Track name occurrences to handle duplicates
  const nameCount: Record<string, number> = {}
  
  // Format floor prefix
  const floorPrefix = formatFloorPrefix(detectedFloor)

  // Map to ExtractedSpace format with floor prefix and duplicate handling
  const spaces: ExtractedSpace[] = processedZones.map((z: any) => {
    // Get zone type suggestion
    const keywordMatch = suggestZoneType(z.name || z.type || '')
    const suggestedType = keywordMatch !== 'custom' && keywordMatch !== '_skip_' ? keywordMatch : 'custom'
    
    // Track duplicate names
    const baseName = z.name
    nameCount[baseName] = (nameCount[baseName] || 0) + 1
    const occurrence = nameCount[baseName]
    
    // Build final name with floor prefix: "L1 - Gym" or "L1 - Conference Room (2)"
    let finalName = `${floorPrefix} - ${baseName}`
    if (occurrence > 1) {
      finalName = `${floorPrefix} - ${baseName} (${occurrence})`
    }
    
    // Determine confidence based on zone type match
    const confidence = keywordMatch !== 'custom' && keywordMatch !== '_skip_' ? 75 : 50
    
    return {
      id: uuidv4(),
      name: finalName,
      floor: detectedFloor,
      sf: z.sf,
      zoneType: suggestedType,
      fixtures: z.fixtures || {},
      equipment: [],
      confidence,
    }
  })

  // Fix first occurrence names if there were duplicates
  const finalNameCount: Record<string, number> = {}
  spaces.forEach(s => {
    const baseName = s.name.replace(/ \(\d+\)$/, '')
    finalNameCount[baseName] = (finalNameCount[baseName] || 0) + 1
  })
  
  spaces.forEach(s => {
    const nameWithoutSuffix = s.name.replace(/ \(\d+\)$/, '')
    if (finalNameCount[nameWithoutSuffix] > 1 && !s.name.match(/ \(\d+\)$/)) {
      s.name = `${nameWithoutSuffix} (1)`
    }
  })

  const provider = isClaudeReady() ? 'claude' : 'grok'
  
  return {
    drawingInfo: {
      title: null,
      scale: null,
      floor: detectedFloor,
      drawingNumber: null,
    },
    spaces,
    pools: [],
    notes: rawResult.rawResponse?.slice(0, 200) || '',
    provider,
  }
}

// =============================================================================
// CLAUDE EXTRACTION
// =============================================================================
async function extractWithClaude(
  imageBase64: string,
  mimeType: string,
  legend?: SymbolLegend
): Promise<{ zones: any[]; totalSF: number; floor: string; rawResponse: string }> {
  const userPrompt = legend
    ? EXTRACTION_PROMPT + '\n\n' + LEGEND_CONTEXT_PROMPT(legend)
    : EXTRACTION_PROMPT

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Claude API error body:', errorBody)
    throw new Error(`Claude API error: ${response.status} - ${errorBody.slice(0, 200)}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text || ''
  
  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response')
  }
  
  const parsed = JSON.parse(jsonMatch[0])
  
  return {
    zones: parsed.zones || [],
    totalSF: parsed.totalSF || 0,
    floor: parsed.floor || 'Unknown',
    rawResponse: content,
  }
}

// =============================================================================
// GROK EXTRACTION (fallback)
// =============================================================================
async function extractWithGrok(
  imageBase64: string,
  mimeType: string,
  legend?: SymbolLegend
): Promise<{ zones: any[]; totalSF: number; floor: string; rawResponse: string }> {
  const systemPrompt = legend
    ? EXTRACTION_PROMPT + '\n\n' + LEGEND_CONTEXT_PROMPT(legend)
    : EXTRACTION_PROMPT

  const response = await fetch(XAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-2-vision-1212',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: 'text',
              text: systemPrompt,
            },
          ],
        },
      ],
      max_tokens: 8192,
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Grok API error body:', errorBody)
    throw new Error(`Grok API error: ${response.status} - ${errorBody.slice(0, 200)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  
  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in Grok response')
  }
  
  const parsed = JSON.parse(jsonMatch[0])
  
  return {
    zones: parsed.zones || [],
    totalSF: parsed.totalSF || 0,
    floor: parsed.floor || 'Unknown',
    rawResponse: content,
  }
}

// =============================================================================
// SCALE UTILITIES
// =============================================================================
export function parseScale(scaleString: string): number | null {
  // Common scale formats:
  // "1/4" = 1'-0"" -> 48 pixels per foot at 1 inch = 48 pixels
  // "1/8" = 1'-0"" -> 96 pixels per foot
  
  const fractionMatch = scaleString.match(/(\d+)\/(\d+)"?\s*=\s*1'-?0?"?/)
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1])
    const denominator = parseInt(fractionMatch[2])
    return (denominator / numerator) * 96
  }
  
  const ratioMatch = scaleString.match(/1:(\d+)/)
  if (ratioMatch) {
    const ratio = parseInt(ratioMatch[1])
    return (38 * ratio) / 100
  }
  
  return null
}

// Calculate distance between two points in pixels
export function calculatePixelDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

// Calculate scale from calibration
export function calculateScale(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  realDistanceFeet: number
): number {
  const pixelDistance = calculatePixelDistance(p1, p2)
  return pixelDistance / realDistanceFeet
}
