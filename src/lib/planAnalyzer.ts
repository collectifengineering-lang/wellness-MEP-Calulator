/**
 * Plan Analyzer - AI-powered drawing analysis for Plan Scanner
 * Uses the SAME extraction logic as Concept MEP for consistency
 * Claude (primary) with Grok fallback
 * 
 * v2.0 - Added grid tiling for high-res images and improved prompting
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
// TILING CONFIGURATION - For high-resolution floor plan analysis
// =============================================================================
const TILE_CONFIG = {
  maxDimension: 2000,      // Split if either dimension exceeds this
  overlapPercent: 0.15,    // 15% overlap to catch text on seams
  rows: 2,
  cols: 2,
  jpegQuality: 0.85,       // Balance quality vs size
}

// =============================================================================
// IMAGE TILING - Split large images for better text recognition
// =============================================================================
interface ImageTile {
  id: string
  base64: string
  row: number
  col: number
}

/**
 * Split a canvas into overlapping tiles for parallel AI analysis
 */
function tileCanvas(canvas: HTMLCanvasElement): ImageTile[] {
  const { rows, cols, overlapPercent, jpegQuality } = TILE_CONFIG
  const tiles: ImageTile[] = []
  
  const tileW = canvas.width / cols
  const tileH = canvas.height / rows
  const overlapX = tileW * overlapPercent
  const overlapY = tileH * overlapPercent
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Calculate crop coordinates with overlap
      const x = Math.max(0, (c * tileW) - overlapX)
      const y = Math.max(0, (r * tileH) - overlapY)
      
      // Calculate dimensions (clamping to canvas edge)
      const w = Math.min(canvas.width - x, tileW + (overlapX * 2))
      const h = Math.min(canvas.height - y, tileH + (overlapY * 2))
      
      // Create tile canvas
      const tileCanvas = document.createElement('canvas')
      tileCanvas.width = w
      tileCanvas.height = h
      
      const ctx = tileCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h)
        const dataUrl = tileCanvas.toDataURL('image/jpeg', jpegQuality)
        tiles.push({
          id: `tile_${r}_${c}`,
          base64: dataUrl.split(',')[1],
          row: r,
          col: c,
        })
      }
    }
  }
  
  console.log(`🔲 Split image into ${tiles.length} tiles (${rows}x${cols}) with ${overlapPercent * 100}% overlap`)
  return tiles
}

/**
 * Check if image needs tiling based on dimensions
 */
function needsTiling(width: number, height: number): boolean {
  return width > TILE_CONFIG.maxDimension || height > TILE_CONFIG.maxDimension
}

/**
 * Create a canvas from base64 image data
 */
async function base64ToCanvas(base64: string, mimeType: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        resolve(canvas)
      } else {
        reject(new Error('Could not get canvas context'))
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = `data:${mimeType};base64,${base64}`
  })
}

// =============================================================================
// DEDUPLICATION - Merge results from overlapping tiles
// =============================================================================
interface RawZone {
  name: string
  type: string
  sf: number
  fixtures?: Record<string, number>
  confidence?: 'high' | 'low'
  notes?: string
  boundingBox?: {
    xPercent: number
    yPercent: number
    widthPercent: number
    heightPercent: number
  }
}

/**
 * Merge zones from multiple tiles and remove duplicates
 * Duplicates = same name AND SF within 5% tolerance
 */
function mergeAndDeduplicate(allZones: RawZone[]): RawZone[] {
  const uniqueZones: RawZone[] = []
  
  for (const zone of allZones) {
    // Check if this zone already exists
    const existingIndex = uniqueZones.findIndex(existing => {
      const nameMatch = existing.name.toLowerCase().trim() === zone.name.toLowerCase().trim()
      if (!nameMatch) return false
      
      // SF tolerance: within 5%
      const sfDiff = Math.abs(existing.sf - zone.sf)
      const sfTolerance = Math.max(existing.sf, zone.sf) * 0.05
      return sfDiff <= sfTolerance
    })
    
    if (existingIndex === -1) {
      // New unique zone
      uniqueZones.push(zone)
    } else {
      // Duplicate found - keep the one with more info
      const existing = uniqueZones[existingIndex]
      
      // Prefer high confidence over low
      if (zone.confidence === 'high' && existing.confidence !== 'high') {
        uniqueZones[existingIndex] = zone
      }
      // Merge notes if new one has more detail
      else if (zone.notes && (!existing.notes || zone.notes.length > existing.notes.length)) {
        existing.notes = zone.notes
      }
      // Merge fixtures if new one has more
      else if (zone.fixtures && Object.keys(zone.fixtures).length > Object.keys(existing.fixtures || {}).length) {
        existing.fixtures = { ...existing.fixtures, ...zone.fixtures }
      }
    }
  }
  
  console.log(`🔄 Deduplicated ${allZones.length} → ${uniqueZones.length} zones`)
  return uniqueZones
}

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
// EXTRACTION PROMPT - Optimized for architectural floor plans
// Handles: Leader lines, inline tags, color-coded areas, furniture clutter
// =============================================================================
const EXTRACTION_PROMPT = `You are an expert Senior MEP Estimator analyzing architectural floor plans for engineering load calculations.

**OBJECTIVE:** Extract ALL distinct spaces/zones with their Name, Type, Square Footage (SF), and approximate bounding box location.

## CRITICAL: READ THE EXACT SF NUMBER FROM TEXT

**DO NOT ESTIMATE OR CALCULATE SF** - Read it directly from the plan!
- Look for numbers followed by "SF", "SQFT", "SQ FT", "sq ft", or "S.F."
- Examples: "298 SF", "107 SQFT", "163 S.F.", "529 sq ft"
- The SF number is almost always written near or inside the room
- If you see "Kitchen" and nearby see "298 SF", that room is 298 SF - use EXACTLY that number

## ROOM LABEL FORMATS (Read SF from these!)

### Format A: INLINE ROOM TAGS (Most Common for Residential)
Room name and SF are inside or near the room, stacked vertically:
  ┌─────────────┐
  │   Kitchen   │  ← Room name
  │   298 SF    │  ← EXACT square footage - USE THIS NUMBER!
  └─────────────┘

### Format B: LEADER LINES (Commercial/Zoning Plans)
Text box connected to room by a line or arrow:
  ┌─────────────┐
  │  ROOM NAME  │
  │  361 SQFT   │ ← Read this exact number
  └─────────────┘
        │
        └──────▶ [room area]

### Format C: ROOM + NUMBER BESIDE
  Kitchen  298 SF     ← Name and SF on same line
  Living/Dining  529  ← Sometimes just the number, means SF

## FLOOR/LEVEL IDENTIFICATION (Check ALL of these!)

Look for floor identifiers in these locations:
1. **Plan Title/Header** (large text above or below plan):
   - "1ST FLOOR PROPOSED FLOOR PLAN"
   - "2ND FLOOR PROPOSED PLAN"
   - "CELLAR PROPOSED PLAN"
   - "BASEMENT FLOOR PLAN"
   - "GROUND FLOOR PLAN"
   - "ROOF FLOOR PLAN"

2. **Title Block** (usually bottom right corner):
   - "Level 1", "Level 2", "Floor 1", "Floor 2"
   - Sheet titles like "A-100.00" often indicate floor

3. **Common Floor Formats**:
   - Residential: "1ST FLOOR", "2ND FLOOR", "3RD FLOOR", "CELLAR", "BASEMENT"
   - Commercial: "Level 1", "L1", "Floor 1", "1F", "Ground", "G"
   - Below grade: "Cellar", "Basement", "B1", "Lower Level"
   - Above: "Roof", "Penthouse", "PH", "Mezzanine"

## IGNORE FURNITURE CLUTTER
- IGNORE: gym equipment, desks, tables, chairs, sofas, appliances, fixtures symbols
- Focus ONLY on: walls, room labels, area text (SF numbers)

## COLOR-CODED AREAS
- Rooms may be filled with colors (pink, blue, yellow, etc.)
- The room tag may be outside the colored region pointing in

## BOUNDING BOX
For each room, estimate its position on the image as percentages (0-100):
- xPercent: left edge position
- yPercent: top edge position  
- widthPercent: width of room
- heightPercent: height of room

## SPACE TYPES (Residential)
- KITCHEN, KIT (50-400 SF)
- LIVING ROOM, LIVING, LR (150-500 SF)
- DINING ROOM, DINING, DR (100-300 SF)
- BEDROOM, BR, BDRM (80-250 SF)
- BATHROOM, BATH, BA (30-150 SF)
- CLOSET, WIC (walk-in closet), CLOSET (10-100 SF)
- FOYER, ENTRY, HALL (30-150 SF)
- UTILITY, LAUNDRY (30-100 SF)
- STORAGE, BASEMENT, CELLAR (varies)

## SPACE TYPES (Commercial/Wellness)
- GYM, FITNESS (3,000-15,000 SF)
- LOCKER ROOM (1,000-3,000 SF)
- POOL (500-5,000 SF)
- SAUNA, STEAM (200-1,000 SF)
- OFFICE (100-500 SF)
- CONFERENCE (200-800 SF)
- MECHANICAL, MEP (100-1,000 SF)

## COUNT FIXTURES if visible
toilets, sinks, showers, tubs

## CONFIDENCE SCORING
- "high" = SF was READ from text exactly (e.g., you saw "298 SF")
- "low" = SF was ESTIMATED (no number found - AVOID THIS, look harder!)

## DO NOT EXTRACT
- Stairs, Elevators, Corridors (unless labeled with SF)
- Random annotations (e.g., "FDNY ACCESS", "EXIT", construction notes)

## OUTPUT FORMAT (JSON only, no markdown)
{
  "floor": "1st Floor",
  "zones": [
    {"name": "Kitchen", "type": "kitchen", "sf": 298, "confidence": "high", "boundingBox": {"xPercent": 10, "yPercent": 20, "widthPercent": 25, "heightPercent": 30}},
    {"name": "Bath", "type": "bathroom", "sf": 107, "confidence": "high", "boundingBox": {"xPercent": 40, "yPercent": 50, "widthPercent": 15, "heightPercent": 20}},
    {"name": "Living/Dining", "type": "living_room", "sf": 529, "confidence": "high", "boundingBox": {"xPercent": 50, "yPercent": 10, "widthPercent": 40, "heightPercent": 35}}
  ],
  "totalSF": 934,
  "notes": "Found 3 rooms. All SF values read directly from plan text."
}

**CRITICAL REMINDERS:**
1. READ the SF number from text - DO NOT calculate or estimate!
2. If text says "298 SF", use 298 - not 300, not 295, EXACTLY 298
3. confidence should be "high" if you READ the number, "low" only if truly not visible
4. Include boundingBox for each zone to enable thumbnail cropping`

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
// MAIN ANALYSIS FUNCTION - With tiling support for high-res images
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
  
  let rawResult: { zones: RawZone[]; totalSF: number; floor: string; rawResponse: string } | null = null
  
  // Check if we need to tile the image for better text recognition
  let useTiling = false
  let tiles: ImageTile[] = []
  
  try {
    const canvas = await base64ToCanvas(imageBase64, mimeType)
    console.log(`   Image dimensions: ${canvas.width}x${canvas.height}px`)
    
    if (needsTiling(canvas.width, canvas.height)) {
      useTiling = true
      tiles = tileCanvas(canvas)
      console.log(`🔲 Large image detected - using ${tiles.length}-tile strategy`)
    }
  } catch (err) {
    console.warn('Could not check image dimensions for tiling:', err)
    // Continue without tiling
  }
  
  if (useTiling && tiles.length > 0) {
    // TILED ANALYSIS: Process each tile in parallel
    console.log('🔵 Starting parallel tile analysis...')
    
    const tileResults = await Promise.allSettled(
      tiles.map(async (tile) => {
        console.log(`   Processing ${tile.id}...`)
        if (isClaudeReady()) {
          return await extractWithClaude(tile.base64, 'image/jpeg', legend)
        } else if (isGrokReady()) {
          return await extractWithGrok(tile.base64, 'image/jpeg', legend)
        }
        throw new Error('No AI provider configured')
      })
    )
    
    // Collect all zones from successful tile analyses
    const allZones: RawZone[] = []
    let detectedFloor = 'Unknown'
    
    tileResults.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        console.log(`   ✅ ${tiles[idx].id}: ${result.value.zones.length} zones`)
        allZones.push(...result.value.zones)
        // Use first non-Unknown floor detected
        if (detectedFloor === 'Unknown' && result.value.floor && result.value.floor !== 'Unknown') {
          detectedFloor = result.value.floor
        }
      } else if (result.status === 'rejected') {
        console.error(`   ❌ ${tiles[idx].id}: ${result.reason}`)
        errors.push(`Tile ${tiles[idx].id}: ${result.reason}`)
      }
    })
    
    if (allZones.length === 0) {
      throw new Error(`Tiled analysis failed - no zones found in any tile:\n${errors.join('\n')}`)
    }
    
    // Merge and deduplicate zones from overlapping tiles
    const uniqueZones = mergeAndDeduplicate(allZones)
    
    rawResult = {
      zones: uniqueZones,
      totalSF: uniqueZones.reduce((sum, z) => sum + (z.sf || 0), 0),
      floor: detectedFloor,
      rawResponse: `Tiled analysis: ${tiles.length} tiles, ${allZones.length} raw zones, ${uniqueZones.length} after dedup`
    }
    
    console.log(`✅ Tiled extraction complete: ${uniqueZones.length} unique zones`)
    
  } else {
    // SINGLE IMAGE ANALYSIS: Original approach
    
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
  }

  // Process the raw zones using the same logic as Concept MEP
  const detectedFloor = rawResult.floor || 'Unknown'
  console.log(`📍 Detected floor: ${detectedFloor}`)

  // Filter and process zones
  const processedZones = rawResult.zones
    .map((z: RawZone) => ({
      name: z.name || 'Unknown',
      type: z.type || 'unknown',
      sf: Math.round(z.sf || 0),
      fixtures: z.fixtures || {},
      confidence: z.confidence || 'low',  // Preserve AI's confidence assessment
      notes: z.notes,
      boundingBox: z.boundingBox,  // Preserve bounding box for thumbnail cropping
    }))
    .filter((z) => {
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
  
  // Log confidence breakdown
  const highConfCount = processedZones.filter(z => z.confidence === 'high').length
  const lowConfCount = processedZones.filter(z => z.confidence === 'low').length
  console.log(`   📊 Confidence: ${highConfCount} high, ${lowConfCount} low (estimated)`)

  // Track name occurrences to handle duplicates
  const nameCount: Record<string, number> = {}
  
  // Format floor prefix
  const floorPrefix = formatFloorPrefix(detectedFloor)

  // Map to ExtractedSpace format with floor prefix and duplicate handling
  const spaces: ExtractedSpace[] = processedZones.map((z) => {
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
    
    // Convert AI confidence to numeric score (0-100)
    // High confidence (explicit SF) = 85-95, Low confidence (estimated) = 40-60
    const baseConfidence = z.confidence === 'high' ? 90 : 50
    // Boost slightly if we recognized the zone type
    const typeBonus = keywordMatch !== 'custom' && keywordMatch !== '_skip_' ? 5 : 0
    const confidence = Math.min(100, baseConfidence + typeBonus)
    
    return {
      id: uuidv4(),
      name: finalName,
      floor: detectedFloor,
      sf: z.sf,
      zoneType: suggestedType,
      fixtures: z.fixtures || {},
      equipment: [],
      confidence,
      // Store the source of confidence for UI display
      confidenceSource: z.confidence === 'high' ? 'explicit' : 'estimated',
      // Bounding box for thumbnail cropping (percentages 0-100)
      boundingBox: z.boundingBox,
    } as ExtractedSpace
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

// =============================================================================
// AI BOUNDARY DETECTION - Draws initial pass of space boundaries
// =============================================================================

const BOUNDARY_DETECTION_PROMPT = `You are detecting ROOM BOUNDARIES in an architectural floor plan image.

TASK: Identify distinct rooms/spaces and estimate their BOUNDING BOX positions as percentages of the image.

HOW TO DETECT ROOMS:

1. **COLOR-CODED AREAS** (Very Common):
   - Rooms are often FILLED with distinct colors (pink, blue, yellow, green, magenta, etc.)
   - Each colored region typically represents ONE room/zone
   - Draw the bounding box around the entire colored fill area

2. **ROOM TAGS WITH LEADERS**:
   - Look for CALLOUT BOXES pointing to spaces with arrows/leaders
   - Standard format: Room Name, Room Number, Area (SQFT)
   - The tag points TO the room - trace the leader to find the space boundary
   - Example: A tag reading "REC RM / C.02 / 361 SQFT" points to a colored region

3. **WALLS AND PARTITIONS**:
   - Look for thick lines that enclose spaces
   - Walls form the actual boundaries between rooms

4. **INLINE LABELS**:
   - Text directly inside rooms (less common in colored plans)

5. Identify spaces like: Gym, Pool, Locker Room, Office, Conference Room, Lobby, Rec Room, Hall, etc.
6. Skip circulation areas (corridors, stairs, elevators) unless they're labeled with SF

FOR EACH ROOM, ESTIMATE:
- xPercent: Left edge position as % of image width (0-100)
- yPercent: Top edge position as % of image height (0-100)  
- widthPercent: Width as % of image width
- heightPercent: Height as % of image height

IMPORTANT:
- Be GENEROUS with bounding boxes - slightly larger is better than too small
- For COLOR-CODED rooms, the bounding box should cover the entire colored fill
- Room tags may be OUTSIDE the room - follow the leader arrow to the actual space
- Don't try to be pixel-perfect, rough estimates are fine
- Focus on MAJOR spaces first, then smaller rooms

Respond with ONLY valid JSON:
{
  "regions": [
    {
      "name": "Gym",
      "xPercent": 5,
      "yPercent": 10,
      "widthPercent": 40,
      "heightPercent": 35,
      "confidence": 85
    },
    {
      "name": "Pool",
      "xPercent": 50,
      "yPercent": 15,
      "widthPercent": 35,
      "heightPercent": 40,
      "confidence": 90
    }
  ],
  "floor": "Level 3",
  "notes": "Found X major spaces"
}`

export interface DetectedRegion {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  confidence: number
  analyzed: boolean
}

export interface BoundaryDetectionResult {
  regions: DetectedRegion[]
  floor: string
  notes: string
  provider: 'claude' | 'grok'
}

export async function detectSpaceBoundaries(
  imageBase64: string,
  mimeType: string = 'image/png',
  imageWidth: number,
  imageHeight: number
): Promise<BoundaryDetectionResult> {
  const errors: string[] = []
  
  console.log('🔲 AI Boundary Detection Starting...')
  console.log(`   Image dimensions: ${imageWidth} x ${imageHeight}`)
  
  // Try Claude first
  if (isClaudeReady()) {
    try {
      console.log('🔵 Attempting boundary detection with Claude...')
      const result = await detectBoundariesWithClaude(imageBase64, mimeType, imageWidth, imageHeight)
      console.log(`✅ Claude found ${result.regions.length} regions`)
      return { ...result, provider: 'claude' }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('❌ Claude boundary detection failed:', msg)
      errors.push(`Claude: ${msg}`)
    }
  }
  
  // Fallback to Grok
  if (isGrokReady()) {
    try {
      console.log('🟠 Falling back to Grok for boundary detection...')
      const result = await detectBoundariesWithGrok(imageBase64, mimeType, imageWidth, imageHeight)
      console.log(`✅ Grok found ${result.regions.length} regions`)
      return { ...result, provider: 'grok' }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('❌ Grok boundary detection failed:', msg)
      errors.push(`Grok: ${msg}`)
    }
  }
  
  throw new Error(`Boundary detection failed:\n${errors.join('\n')}`)
}

async function detectBoundariesWithClaude(
  imageBase64: string,
  mimeType: string,
  imageWidth: number,
  imageHeight: number
): Promise<Omit<BoundaryDetectionResult, 'provider'>> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
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
            text: BOUNDARY_DETECTION_PROMPT,
          },
        ],
      }],
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`)
  }
  
  const data = await response.json()
  const text = data.content?.[0]?.text || ''
  
  return parseBoundaryResponse(text, imageWidth, imageHeight)
}

async function detectBoundariesWithGrok(
  imageBase64: string,
  mimeType: string,
  imageWidth: number,
  imageHeight: number
): Promise<Omit<BoundaryDetectionResult, 'provider'>> {
  const response = await fetch(XAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-2-vision-latest',
      messages: [{
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
            text: BOUNDARY_DETECTION_PROMPT,
          },
        ],
      }],
      max_tokens: 4096,
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`)
  }
  
  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''
  
  return parseBoundaryResponse(text, imageWidth, imageHeight)
}

function parseBoundaryResponse(
  text: string,
  imageWidth: number,
  imageHeight: number
): Omit<BoundaryDetectionResult, 'provider'> {
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response')
  }
  
  let parsed
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (e) {
    throw new Error('Failed to parse AI JSON response')
  }
  
  const rawRegions = parsed.regions || []
  
  // Convert percentage-based regions to pixel coordinates
  const regions: DetectedRegion[] = rawRegions.map((r: any) => ({
    id: uuidv4(),
    name: r.name || 'Unknown Space',
    x: Math.round((r.xPercent / 100) * imageWidth),
    y: Math.round((r.yPercent / 100) * imageHeight),
    width: Math.round((r.widthPercent / 100) * imageWidth),
    height: Math.round((r.heightPercent / 100) * imageHeight),
    confidence: r.confidence || 50,
    analyzed: false,
  }))
  
  return {
    regions,
    floor: parsed.floor || 'Unknown',
    notes: parsed.notes || '',
  }
}

// =============================================================================
// FLOOR/LEVEL DETECTION - Detect floor level from drawing
// =============================================================================

const FLOOR_DETECTION_PROMPT = `You are detecting the FLOOR or LEVEL number from an architectural floor plan.

TASK: Find the floor/level indicator in the drawing's title block, header, or labels.

WHERE TO LOOK:
1. TITLE BLOCK (usually bottom right or bottom of drawing)
2. SHEET HEADER (top of drawing)
3. PLAN LABELS like "Level 3 - Wellness", "First Floor Plan", "B1 - Basement"
4. Drawing number prefixes like "A-301" (3 might indicate floor 3)

COMMON FORMATS:
- "Level 1", "Level 2", "L1", "L2"
- "First Floor", "Second Floor", "Third Floor"
- "Ground Floor", "Ground", "G"
- "Basement", "B1", "B2", "Lower Level"
- "Mezzanine", "Mezz", "M"
- "Penthouse", "PH", "Roof"
- "1F", "2F", "3F" (floor indicators)

Respond with ONLY valid JSON:
{
  "floor": "Level 3",
  "confidence": 85,
  "source": "title block"
}`

export async function detectFloorLevel(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<{ floor: string; confidence: number }> {
  console.log('🏢 Detecting floor level...')
  
  // Try Claude first
  if (isClaudeReady()) {
    try {
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
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
              { type: 'text', text: FLOOR_DETECTION_PROMPT },
            ],
          }],
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const text = data.content?.[0]?.text || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          console.log(`✅ Floor detected: ${parsed.floor} (${parsed.confidence}% confidence)`)
          return { floor: parsed.floor || 'Unknown', confidence: parsed.confidence || 50 }
        }
      }
    } catch (error) {
      console.error('Floor detection failed:', error)
    }
  }
  
  return { floor: 'Unknown', confidence: 0 }
}

// =============================================================================
// SEAT/CHAIR DETECTION - Count occupants for ventilation calculation
// =============================================================================

const SEAT_DETECTION_PROMPT = `You are counting SEATS, CHAIRS, and OCCUPANT INDICATORS in a section of an architectural floor plan.

TASK: Count all items that indicate where people would sit or occupy space.

WHAT TO COUNT:
1. CHAIRS - individual seats, desk chairs, lounge chairs
2. TABLES with chair positions shown
3. BENCH SEATING - count linear feet / 2 for approximate seats
4. WORKSTATIONS - individual desk positions
5. GYM EQUIPMENT positions (each machine = 1 occupant)
6. TOILET FIXTURES count (indicates restroom capacity)
7. SHOWER STALLS count (indicates locker room capacity)
8. LOCKERS (every 5-10 lockers suggests 1 occupant)
9. Theater/auditorium seating rows

COMMON SYMBOLS:
- Small circles or squares = chairs
- L-shaped symbols = desk with chair
- Rows of rectangles = stadium/theater seating
- Exercise machine symbols = gym stations

BE THOROUGH - count everything that suggests occupancy!

Respond with ONLY valid JSON:
{
  "seatCount": 24,
  "breakdown": {
    "chairs": 20,
    "benches": 0,
    "workstations": 4,
    "fixtures": 0
  },
  "confidence": 75,
  "notes": "Found 20 desk chairs and 4 workstation positions"
}`

export interface SeatDetectionResult {
  seatCount: number
  breakdown: {
    chairs: number
    benches: number
    workstations: number
    fixtures: number
  }
  confidence: number
  notes: string
}

export async function detectSeatsInRegion(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<SeatDetectionResult> {
  console.log('🪑 Detecting seats/occupants in region...')
  
  const defaultResult: SeatDetectionResult = {
    seatCount: 0,
    breakdown: { chairs: 0, benches: 0, workstations: 0, fixtures: 0 },
    confidence: 0,
    notes: 'Detection failed',
  }
  
  // Try Claude
  if (isClaudeReady()) {
    try {
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
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
              { type: 'text', text: SEAT_DETECTION_PROMPT },
            ],
          }],
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const text = data.content?.[0]?.text || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          console.log(`✅ Detected ${parsed.seatCount} seats (${parsed.confidence}% confidence)`)
          return {
            seatCount: parsed.seatCount || 0,
            breakdown: parsed.breakdown || defaultResult.breakdown,
            confidence: parsed.confidence || 50,
            notes: parsed.notes || '',
          }
        }
      }
    } catch (error) {
      console.error('Seat detection failed:', error)
    }
  }
  
  // Fallback to Grok
  if (isGrokReady()) {
    try {
      const response = await fetch(XAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'grok-2-vision-1212',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              { type: 'text', text: SEAT_DETECTION_PROMPT },
            ],
          }],
          max_tokens: 1024,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const text = data.choices?.[0]?.message?.content || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return {
            seatCount: parsed.seatCount || 0,
            breakdown: parsed.breakdown || defaultResult.breakdown,
            confidence: parsed.confidence || 50,
            notes: parsed.notes || '',
          }
        }
      }
    } catch (error) {
      console.error('Grok seat detection failed:', error)
    }
  }
  
  return defaultResult
}

// Export the floor prefix formatter for use elsewhere
export { formatFloorPrefix }
