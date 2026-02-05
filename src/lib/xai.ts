// AI Vision API client for PDF zone extraction
// Supports Claude (primary) and Grok (fallback)

const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY || ''
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// Check which AI providers are available
export const isClaudeConfigured = () => !!ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.length > 10
export const isGrokConfigured = () => !!XAI_API_KEY && XAI_API_KEY.length > 10

// Our available zone types for AI matching
const AVAILABLE_ZONE_TYPES = [
  { id: 'reception', name: 'Reception / Lounge', keywords: 'lobby, waiting, entry, front desk' },
  { id: 'mechanical_room', name: 'Mechanical Room', keywords: 'mech, electrical, boiler, AHU' },
  { id: 'retail', name: 'Retail', keywords: 'shop, store, merchandise' },
  { id: 'office', name: 'Office / Admin', keywords: 'admin, back office, staff office' },
  { id: 'storage', name: 'Storage', keywords: 'janitor, closet, supply' },
  { id: 'break_room', name: 'Break Room / Lounge', keywords: 'break room, breakroom, lounge, employee lounge, staff lounge, break area, lunch room, kitchenette' },
  { id: 'open_gym', name: 'Open Gym / Fitness Floor', keywords: 'weight room, fitness center, gym floor' },
  { id: 'group_fitness', name: 'Group Fitness Studio', keywords: 'aerobics, spin, cycling, class' },
  { id: 'mma_studio', name: 'MMA / Boxing Studio', keywords: 'boxing, martial arts, fight' },
  { id: 'yoga_studio', name: 'Yoga Studio', keywords: 'yoga, meditation, mindfulness' },
  { id: 'pilates_studio', name: 'Pilates Studio', keywords: 'pilates, reformer' },
  { id: 'stretching_area', name: 'Stretching / Recovery Area', keywords: 'stretch, recovery, cool down' },
  { id: 'locker_room', name: 'Locker Room', keywords: 'locker, changing room, dressing' },
  { id: 'restroom', name: 'Restroom', keywords: 'bathroom, toilet, WC, lavatory' },
  { id: 'banya_gas', name: 'Banya (Gas)', keywords: 'banya, russian bath, parilka' },
  { id: 'sauna_gas', name: 'Sauna (Gas)', keywords: 'dry sauna gas heated' },
  { id: 'sauna_electric', name: 'Sauna (Electric)', keywords: 'dry sauna, finnish sauna' },
  { id: 'steam_room', name: 'Steam Room', keywords: 'steam, hammam, wet sauna' },
  { id: 'cold_plunge', name: 'Cold Plunge', keywords: 'cold pool, ice bath, cold tub' },
  { id: 'snow_room', name: 'Snow Room', keywords: 'snow, ice room, cold room' },
  { id: 'contrast_suite', name: 'Contrast Suite', keywords: 'hot cold, contrast therapy, thermal suite' },
  { id: 'pool_indoor', name: 'Pool (Indoor)', keywords: 'lap pool, swimming pool, natatorium, warm pool' },
  { id: 'pool_outdoor', name: 'Pool (Outdoor)', keywords: 'outdoor pool, deck pool' },
  { id: 'hot_tub', name: 'Hot Tub / Spa', keywords: 'jacuzzi, whirlpool, spa tub, hydrotherapy' },
  { id: 'treatment_room', name: 'Treatment Room', keywords: 'treatment, facial, body treatment' },
  { id: 'massage_room', name: 'Massage Room', keywords: 'massage, bodywork, therapy room' },
  { id: 'couples_treatment', name: 'Couples Treatment Room', keywords: 'couples massage, duo room' },
  { id: 'private_suite', name: 'Private Suite', keywords: 'VIP suite, private spa, suite' },
  { id: 'laundry_commercial', name: 'Laundry (Commercial)', keywords: 'laundry, washer dryer, linen' },
  { id: 'kitchen_commercial', name: 'Kitchen (Commercial)', keywords: 'commercial kitchen, prep kitchen, BOH' },
  { id: 'kitchen_light_fb', name: 'Kitchen (Light F&B)', keywords: 'pantry, kitchenette, prep' },
  { id: 'cafe_light_fb', name: 'Café / Light F&B', keywords: 'cafe, juice bar, smoothie, snack bar' },
  { id: 'cowork', name: 'Co-Work Space', keywords: 'coworking, workspace, desk area' },
  { id: 'conference_room', name: 'Conference Room', keywords: 'meeting room, boardroom, conference' },
  { id: 'event_space', name: 'Event Space / Studio', keywords: 'event, multipurpose, ballroom, studio' },
  { id: 'screening_room', name: 'Screening Room', keywords: 'theater, cinema, screening, AV room' },
  { id: 'child_care', name: 'Child Care', keywords: 'daycare, kids club, nursery, childcare' },
  { id: 'recovery_longevity', name: 'Recovery & Longevity', keywords: 'cryo, compression, IV, biohacking, recovery' },
  { id: 'basketball_court', name: 'Basketball Court', keywords: 'basketball, court, hoops' },
  { id: 'padel_court', name: 'Padel Court', keywords: 'padel, tennis, racquet' },
  { id: 'terrace', name: 'Terrace / Outdoor', keywords: 'terrace, patio, rooftop, outdoor, deck' },
  { id: 'custom', name: 'Custom Zone', keywords: 'other, misc, general' },
]

export const isXAIConfigured = () => {
  return !!XAI_API_KEY && XAI_API_KEY.length > 10
}

export interface ExtractedZone {
  name: string
  type: string
  suggestedZoneType: string
  sf: number
  floor: string // Floor/Level identifier (e.g., "L1", "Level 2", "Ground", "Roof")
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

export interface ExtractionResult {
  zones: ExtractedZone[]
  totalSF: number
  pageCount: number
  detectedFloor?: string // The floor detected from this page
  rawResponse?: string
}

// Zone type mapping for AI suggestions - includes abbreviations and common variations
const ZONE_TYPE_MAPPING: Record<string, string> = {
  // Reception & Common
  'reception': 'reception',
  'recep': 'reception',
  'front desk': 'reception',
  'lobby': 'reception',
  'entry': 'reception',
  'entrance': 'reception',
  'waiting': 'reception',
  'common': 'reception',
  
  // Break Room / Lounge (employee areas with kitchen equipment)
  'break room': 'break_room',
  'breakroom': 'break_room',
  'break': 'break_room',
  'break area': 'break_room',
  'lounge': 'break_room',
  'employee lounge': 'break_room',
  'staff lounge': 'break_room',
  'lunch room': 'break_room',
  'lunchroom': 'break_room',
  'kitchenette': 'break_room',
  'pantry': 'break_room',
  'employee break': 'break_room',
  'staff break': 'break_room',
  'welcome': 'reception',
  
  // Restrooms - LOTS of variations
  'restroom': 'restroom',
  'rest room': 'restroom',
  'rr': 'restroom',
  'r.r.': 'restroom',
  'bathroom': 'restroom',
  'toilet': 'restroom',
  'wc': 'restroom',
  'w.c.': 'restroom',
  'water closet': 'restroom',
  'lavatory': 'restroom',
  'lav': 'restroom',
  'mens': 'restroom',
  "men's": 'restroom',
  'womens': 'restroom',
  "women's": 'restroom',
  'unisex': 'restroom',
  'ada': 'restroom',
  'accessible': 'restroom',
  'public rr': 'restroom',
  
  // Locker rooms
  'locker': 'locker_room',
  'locker room': 'locker_room',
  'lockers': 'locker_room',
  'changing': 'locker_room',
  'changing room': 'locker_room',
  'dressing': 'locker_room',
  'dressing room': 'locker_room',
  'mens locker': 'locker_room',
  'womens locker': 'locker_room',
  "men's locker": 'locker_room',
  "women's locker": 'locker_room',
  
  // Wet areas / Thermal
  'pool': 'pool_indoor',
  'swimming': 'pool_indoor',
  'lap pool': 'pool_indoor',
  'natatorium': 'pool_indoor',
  'pool deck': 'pool_indoor',
  'hot tub': 'hot_tub',
  'hottub': 'hot_tub',
  'spa': 'hot_tub',
  'jacuzzi': 'hot_tub',
  'whirlpool': 'hot_tub',
  'hydrotherapy': 'hot_tub',
  'cold plunge': 'cold_plunge',
  'plunge': 'cold_plunge',
  'cold pool': 'cold_plunge',
  'ice bath': 'cold_plunge',
  'steam': 'steam_room',
  'steam room': 'steam_room',
  'steamroom': 'steam_room',
  'hammam': 'steam_room',
  'sauna': 'sauna_electric',
  'dry sauna': 'sauna_electric',
  'finnish': 'sauna_electric',
  'banya': 'banya_gas',
  'russian': 'banya_gas',
  'snow': 'snow_room',
  'snow room': 'snow_room',
  
  // Treatment rooms
  'treatment': 'massage_room',
  'treatment room': 'massage_room',
  'massage': 'massage_room',
  'massage room': 'massage_room',
  'therapy': 'massage_room',
  'therapy room': 'massage_room',
  'facial': 'massage_room',
  'body': 'massage_room',
  'private suite': 'private_suite',
  'suite': 'private_suite',
  'couples': 'couples_treatment',
  'couple': 'couples_treatment',
  'vip': 'private_suite',
  
  // Fitness
  'gym': 'open_gym',
  'gymnasium': 'open_gym',
  'fitness': 'open_gym',
  'fitness floor': 'open_gym',
  'fitness center': 'open_gym',
  'weight': 'open_gym',
  'weight room': 'open_gym',
  'weights': 'open_gym',
  'free weights': 'open_gym',
  'cardio': 'open_gym',
  'strength': 'open_gym',
  'training': 'open_gym',
  'yoga': 'yoga_studio',
  'yoga studio': 'yoga_studio',
  'pilates': 'pilates_studio',
  'pilates studio': 'pilates_studio',
  'reformer': 'pilates_studio',
  'studio': 'group_fitness',
  'group': 'group_fitness',
  'group fitness': 'group_fitness',
  'group exercise': 'group_fitness',
  'class': 'group_fitness',
  'classroom': 'group_fitness',
  'spin': 'group_fitness',
  'spinning': 'group_fitness',
  'cycling': 'group_fitness',
  'cycle': 'group_fitness',
  'aerobics': 'group_fitness',
  'boxing': 'mma_studio',
  'mma': 'mma_studio',
  'martial': 'mma_studio',
  'fight': 'mma_studio',
  'ring': 'mma_studio',
  'stretch': 'stretching_area',
  'stretching': 'stretching_area',
  'recovery': 'recovery_longevity',
  'longevity': 'recovery_longevity',
  'cryo': 'recovery_longevity',
  
  // Food & Beverage
  'kitchen': 'kitchen_commercial',
  'commercial kitchen': 'kitchen_commercial',
  'prep': 'kitchen_commercial',
  'boh': 'kitchen_commercial',
  'back of house': 'kitchen_commercial',
  'cafe': 'cafe_light_fb',
  'café': 'cafe_light_fb',
  'coffee': 'cafe_light_fb',
  'juice': 'cafe_light_fb',
  'juice bar': 'cafe_light_fb',
  'smoothie': 'cafe_light_fb',
  'snack': 'cafe_light_fb',
  'restaurant': 'kitchen_commercial',
  'bar': 'cafe_light_fb',
  'dining': 'cafe_light_fb',
  'food': 'cafe_light_fb',
  'f&b': 'cafe_light_fb',
  'fb': 'cafe_light_fb',
  
  // Co-work / Office
  'cowork': 'cowork',
  'co-work': 'cowork',
  'coworking': 'cowork',
  'co-working': 'cowork',
  'workspace': 'cowork',
  'work space': 'cowork',
  'hotdesk': 'cowork',
  'hot desk': 'cowork',
  'conference': 'conference_room',
  'conf': 'conference_room',
  'meeting': 'conference_room',
  'meeting room': 'conference_room',
  'boardroom': 'conference_room',
  
  // Support spaces
  'mechanical': 'mechanical_room',
  'mech': 'mechanical_room',
  'mech.': 'mechanical_room',
  'mechanical room': 'mechanical_room',
  'mep': 'mechanical_room',
  'electrical': 'mechanical_room',
  'elec': 'mechanical_room',
  'elec.': 'mechanical_room',
  'electrical room': 'mechanical_room',
  'boiler': 'mechanical_room',
  'ahu': 'mechanical_room',
  'pump': 'mechanical_room',
  'it': 'mechanical_room',
  'idf': 'mechanical_room',
  'mdf': 'mechanical_room',
  'tel': 'mechanical_room',
  'telecom': 'mechanical_room',
  'storage': 'storage',
  'stor': 'storage',
  'stor.': 'storage',
  'store': 'storage',
  'storeroom': 'storage',
  'closet': 'storage',
  'janitor': 'storage',
  'jc': 'storage',
  'j.c.': 'storage',
  'janitor closet': 'storage',
  "janitor's": 'storage',
  'custodial': 'storage',
  'laundry': 'laundry_commercial',
  'linen': 'laundry_commercial',
  'towel': 'laundry_commercial',
  'office': 'office',
  'admin': 'office',
  'administration': 'office',
  'manager': 'office',
  "manager's office": 'office',
  'back office': 'office',
  'staff office': 'office',
  
  // Circulation - these should be SKIPPED (mapped to special value)
  'corridor': '_skip_',
  'hall': '_skip_',
  'hallway': '_skip_',
  'circulation': '_skip_',
  'circ': '_skip_',
  'stair': '_skip_',
  'stairwell': '_skip_',
  'elevator': '_skip_',
  'elev': '_skip_',
  'vest': '_skip_',
  'vestibule': '_skip_',
  'airlock': '_skip_',
  'egress': '_skip_',
  'exit': '_skip_',
  
  // Outdoor
  'terrace': 'terrace',
  'outdoor': 'terrace',
  'patio': 'terrace',
  'deck': 'terrace',
  'roof': 'terrace',
  'rooftop': 'terrace',
  'balcony': 'terrace',
  'exterior': 'terrace',
  
  // Event / Multi-purpose
  'event': 'event_space',
  'events': 'event_space',
  'event space': 'event_space',
  'multipurpose': 'event_space',
  'multi-purpose': 'event_space',
  'multi purpose': 'event_space',
  'flex': 'event_space',
  'flexible': 'event_space',
  'ballroom': 'event_space',
  'theater': 'screening_room',
  'theatre': 'screening_room',
  'screening': 'screening_room',
  'cinema': 'screening_room',
  'av': 'screening_room',
  
  // Kids / Child care
  'child': 'child_care',
  'children': 'child_care',
  'kids': 'child_care',
  "kid's": 'child_care',
  'childcare': 'child_care',
  'child care': 'child_care',
  'daycare': 'child_care',
  'nursery': 'child_care',
  'play': 'child_care',
  'playroom': 'child_care',
  
  // Retail
  'retail': 'retail',
  'shop': 'retail',
  'merchandise': 'retail',
  'pro shop': 'retail',
  'boutique': 'retail',
  'gift shop': 'retail',
  
  // Sports courts
  'basketball': 'basketball_court',
  'court': 'basketball_court',
  'padel': 'padel_court',
  'tennis': 'padel_court',
  'racquet': 'padel_court',
  'squash': 'padel_court',
}

function suggestZoneType(roomName: string): string {
  const lower = roomName.toLowerCase()
  
  // Check for exact or partial matches
  for (const [keyword, zoneType] of Object.entries(ZONE_TYPE_MAPPING)) {
    if (lower.includes(keyword)) {
      return zoneType
    }
  }
  
  return 'custom'
}

// Check if a zone should be skipped (circulation, stairs, etc.)
function shouldSkipZone(roomName: string): boolean {
  const lower = roomName.toLowerCase()
  const skipKeywords = ['stair', 'elevator', 'corridor', 'hallway', 'vestibule', 'egress', 'exit', 'circulation']
  return skipKeywords.some(keyword => lower.includes(keyword))
}

// AI-powered zone type matching using Grok
async function matchZoneTypesWithAI(
  zones: { name: string; type: string; sf: number }[]
): Promise<Record<string, string>> {
  // Need at least one AI configured
  if ((!isClaudeConfigured() && !isGrokConfigured()) || zones.length === 0) {
    return {}
  }

  const zoneTypeList = AVAILABLE_ZONE_TYPES
    .map(z => `- ${z.id}: "${z.name}" (${z.keywords})`)
    .join('\n')

  const roomList = zones
    .map((z, i) => `${i + 1}. "${z.name}" (${z.type}, ${z.sf} SF)`)
    .join('\n')

  const prompt = `You are matching room names from a floor plan to predefined zone types for an MEP calculator for wellness facilities (spas, gyms, bathhouses).

AVAILABLE ZONE TYPES:
${zoneTypeList}

ROOMS TO MATCH:
${roomList}

MATCHING RULES:
- "Terrace", "Outdoor Terrace", "Rooftop" → terrace
- "Gym", "Fitness", "Weight Room", "Exercise" → open_gym
- "Pool", "Natatorium", "Pool Area" → pool_indoor
- "Locker", "Lockers", "Men's Locker", "Women's Locker" → locker_room
- "Restroom", "RR", "Bathroom", "Toilet" → restroom
- "Café", "Cafe", "F&B", "Juice Bar" → cafe_light_fb
- "Co-Work", "Cowork", "Coworking" → cowork
- "Conference", "Meeting Room" → conference_room
- "Break Room", "Breakroom", "Lounge", "Employee Lounge", "Lunch Room" → break_room
- "Sauna" → sauna_electric (unless gas specified)
- "Steam", "Steam Room" → steam_room
- "Recovery", "Longevity" → recovery_longevity
- "Child Care", "Kids", "Daycare" → child_care
- "Laundry" → laundry_commercial
- "Mechanical", "Mech Room", "MEP" → mechanical_room
- "Storage", "BOH" → storage
- "MMA", "Boxing" → mma_studio
- "Yoga" → yoga_studio
- "Stretching" → stretching_area
- "Reception", "Lobby", "Entry" → reception
- "Office", "Admin", "Manager's Office" → office
- "Contrast" → contrast_suite

For each room, respond with the BEST zone type ID. Be generous with matching - if it's close, match it!

Respond with ONLY a JSON object:
{
  "Room Name 1": "zone_type_id",
  "Room Name 2": "zone_type_id"
}

If truly no match, use "custom". Only respond with valid JSON, no explanation.`

  // Try Claude first for matching
  if (isClaudeConfigured()) {
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
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.content?.[0]?.text || ''
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          console.log('Zone matching done with Claude')
          return JSON.parse(jsonMatch[0])
        }
      }
    } catch (e) {
      console.warn('Claude matching failed, trying Grok:', e)
    }
  }

  // Fall back to Grok
  if (isGrokConfigured()) {
    try {
      const response = await fetch(XAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'grok-2-1212',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
          temperature: 0.1,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || ''
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          console.log('Zone matching done with Grok')
          return JSON.parse(jsonMatch[0])
        }
      }
    } catch (e) {
      console.warn('Grok matching failed:', e)
    }
  }

  console.warn('All AI matching failed, using keyword fallback')
  return {}
}

// Shared extraction prompt for both Claude and Grok
const EXTRACTION_PROMPT = `You are extracting room data from an architectural floor plan.

TASK: Extract ALL rooms/spaces with their Name, Type, and Square Footage.

## STEP 1: IDENTIFY THE FLOOR/LEVEL
Look in title block or plan header for:
- "CELLAR PROPOSED PLAN" → floor: "Cellar"
- "1ST FLOOR PROPOSED FLOOR PLAN" → floor: "1st Floor"
- "2ND FLOOR PROPOSED PLAN" → floor: "2nd Floor"
- "PROPOSED ROOF FLOOR PLAN" → floor: "Roof"
- "Level 3", "Floor 2", "L1", "Basement", "Ground"

## STEP 2: FIND ROOMS - Use ALL methods

**Method A - Read Labels (BEST):**
- Room tags: "BEDROOM 101 150 SF"
- Inline text: "KITCHEN", "LIVING ROOM"
- Area schedule tables

**Method B - Identify by Fixtures (when no labels):**
- KITCHEN: Counter, sink, stove/range symbols
- BATHROOM: Toilet, tub/shower, sink symbols  
- BEDROOM: Enclosed room with closet
- LIVING ROOM: Large open space near entry
- LAUNDRY: Washer/dryer symbols
- GARAGE: Vehicle space, garage door

**Method C - Identify by Size:**
- Small (~50-100 SF) = Bathroom, Closet
- Medium (~100-200 SF) = Bedroom, Office
- Large (~200-500 SF) = Living Room, Kitchen

## ROOM TYPES

**Residential:**
Living Room, Kitchen, Dining Room, Bedroom, Master Bedroom, Bathroom, Half Bath, Laundry, Garage, Closet, Storage, Basement, Cellar

**Commercial:**
Office, Conference, Reception, Gym, Locker Room, Pool, Spa, Sauna, Retail, Cafe, Mechanical Room

## DO NOT EXTRACT
- Stairs, Elevator, Corridor, Hallway
- Title blocks, Key Notes, Construction notes

Respond with ONLY valid JSON:
{
  "floor": "1st Floor",
  "zones": [
    {"name": "Kitchen", "type": "residential", "sf": 200},
    {"name": "Living Room", "type": "residential", "sf": 350},
    {"name": "Bedroom", "type": "residential", "sf": 150},
    {"name": "Bathroom", "type": "residential", "sf": 50}
  ],
  "totalSF": 750,
  "notes": "Residential plan - extracted X rooms."
}

Be THOROUGH - extract every room whether labeled or identified by layout!`

// Track which provider was used for extraction
export type AIProvider = 'claude' | 'grok' | 'none'
let lastUsedProvider: AIProvider = 'none'
export const getLastUsedProvider = () => lastUsedProvider

// Extract zones using Claude (primary provider)
async function extractWithClaude(
  imageBase64: string,
  mimeType: string
): Promise<{ zones: any[]; totalSF: number; floor: string; rawResponse: string }> {
  console.log('Attempting extraction with Claude...')
  
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
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text || ''
  
  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response')
  }
  
  const parsed = JSON.parse(jsonMatch[0])
  lastUsedProvider = 'claude'
  
  return {
    zones: parsed.zones || [],
    totalSF: parsed.totalSF || 0,
    floor: parsed.floor || 'Unknown',
    rawResponse: content,
  }
}

// Extract zones using Grok (fallback provider)
async function extractWithGrok(
  imageBase64: string,
  mimeType: string
): Promise<{ zones: any[]; totalSF: number; floor: string; rawResponse: string }> {
  console.log('Attempting extraction with Grok...')
  
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
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
      max_tokens: 8192,
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`xAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  
  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in Grok response')
  }
  
  const parsed = JSON.parse(jsonMatch[0])
  lastUsedProvider = 'grok'
  
  return {
    zones: parsed.zones || [],
    totalSF: parsed.totalSF || 0,
    floor: parsed.floor || 'Unknown',
    rawResponse: content,
  }
}

export async function extractZonesFromImage(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<ExtractionResult> {
  // Check if any AI is configured
  if (!isClaudeConfigured() && !isGrokConfigured()) {
    throw new Error('No AI API key configured. Please add VITE_ANTHROPIC_API_KEY or VITE_XAI_API_KEY.')
  }

  let rawResult: { zones: any[]; totalSF: number; floor: string; rawResponse: string } | null = null
  let errors: string[] = []

  // Try Claude first (better at document parsing)
  if (isClaudeConfigured()) {
    try {
      rawResult = await extractWithClaude(imageBase64, mimeType)
      console.log('Claude extraction successful:', rawResult.zones.length, 'zones')
    } catch (claudeError: any) {
      console.warn('Claude extraction failed:', claudeError.message)
      errors.push(`Claude: ${claudeError.message}`)
    }
  }

  // Fall back to Grok if Claude failed or not configured
  if (!rawResult && isGrokConfigured()) {
    try {
      rawResult = await extractWithGrok(imageBase64, mimeType)
      console.log('Grok extraction successful:', rawResult.zones.length, 'zones')
    } catch (grokError: any) {
      console.warn('Grok extraction failed:', grokError.message)
      errors.push(`Grok: ${grokError.message}`)
    }
  }

  if (!rawResult) {
    throw new Error(`All AI providers failed:\n${errors.join('\n')}`)
  }

  // Get detected floor from AI response
  const detectedFloor = rawResult.floor || 'Unknown'
  console.log(`Detected floor: ${detectedFloor}`)

  // Process the raw zones - filter and map
  const rawZones = rawResult.zones
    .map((z: any) => ({
      name: z.name || 'Unknown',
      type: z.type || 'unknown',
      sf: Math.round(z.sf || z.area || 0),
    }))
    .filter((z: any) => {
      // Skip zones without SF
      if (!z.sf || z.sf <= 0) {
        console.log(`Skipping "${z.name}" - no SF`)
        return false
      }
      // Skip circulation zones
      if (shouldSkipZone(z.name)) {
        console.log(`Skipping "${z.name}" - circulation/stairs`)
        return false
      }
      return true
    })
  
  console.log(`Extracted ${rawZones.length} valid zones (after filtering)`)

  // Use AI to match zone types (in parallel with better accuracy)
  let aiMatches: Record<string, string> = {}
  try {
    aiMatches = await matchZoneTypesWithAI(rawZones)
    console.log('AI zone matches:', aiMatches)
  } catch (aiError) {
    console.warn('AI matching failed, falling back to keyword matching:', aiError)
  }

  // Track name occurrences to handle duplicates
  const nameCount: Record<string, number> = {}

  // Map the response to our format with AI-enhanced zone type suggestions
  // Include floor prefix in name and handle duplicates
  const zones: ExtractedZone[] = rawZones.map((z: any) => {
    // Priority: AI match > keyword match > custom
    const aiMatch = aiMatches[z.name]
    const keywordMatch = suggestZoneType(z.name || z.type || '')
    // Don't use _skip_ as a zone type
    const suggestedType = aiMatch || (keywordMatch !== 'custom' && keywordMatch !== '_skip_' ? keywordMatch : null) || 'custom'
    
    // Track duplicate names and add suffix if needed
    const baseName = z.name
    nameCount[baseName] = (nameCount[baseName] || 0) + 1
    const occurrence = nameCount[baseName]
    
    // Format floor prefix (normalize to short format)
    const floorPrefix = formatFloorPrefix(detectedFloor)
    
    // Build final name: "L1 - Gym" or "L1 - Conference Room (2)" for duplicates
    let finalName = `${floorPrefix} - ${baseName}`
    if (occurrence > 1) {
      finalName = `${floorPrefix} - ${baseName} (${occurrence})`
    }
    
    return {
      name: finalName,
      type: z.type,
      suggestedZoneType: suggestedType,
      sf: z.sf,
      floor: detectedFloor,
      confidence: aiMatch ? 'high' : (keywordMatch !== 'custom' && keywordMatch !== '_skip_' ? 'medium' : 'low'),
      notes: aiMatch ? 'AI-matched' : undefined,
    }
  })

  // Go back and fix the first occurrence names if there were duplicates
  // e.g., if we have "Conference Room" appearing 3 times, rename first to "Conference Room (1)"
  const finalNameCount: Record<string, number> = {}
  zones.forEach(z => {
    const baseName = z.name.replace(/ \(\d+\)$/, '') // Remove any existing suffix
    finalNameCount[baseName] = (finalNameCount[baseName] || 0) + 1
  })
  
  // If a name appears multiple times, ensure first one also has (1)
  zones.forEach(z => {
    const nameWithoutSuffix = z.name.replace(/ \(\d+\)$/, '')
    
    if (finalNameCount[nameWithoutSuffix] > 1 && !z.name.match(/ \(\d+\)$/)) {
      // This is a first occurrence that needs numbering
      z.name = `${nameWithoutSuffix} (1)`
    }
  })

  return {
    zones,
    totalSF: rawResult.totalSF || zones.reduce((sum, z) => sum + z.sf, 0),
    pageCount: 1,
    detectedFloor,
    rawResponse: rawResult.rawResponse,
  }
}

// Format floor to a consistent short prefix
function formatFloorPrefix(floor: string): string {
  if (!floor || floor === 'Unknown') return 'L?'
  
  const lower = floor.toLowerCase().trim()
  
  // Already short format
  if (/^l\d+$/i.test(floor)) return floor.toUpperCase()
  if (/^[bgmr]$/i.test(floor)) return floor.toUpperCase()
  if (/^b\d+$/i.test(floor)) return floor.toUpperCase() // Basement levels
  
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
  // "Level 1", "Floor 2", "1st Floor", "2nd Floor", "First Floor", etc.
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
  
  // Fallback - use first few chars
  return floor.substring(0, 3).toUpperCase()
}

// Convert a PDF page to base64 image using an already-loaded PDF document
async function renderPageToImage(
  pdf: any,
  pageNumber: number
): Promise<{ base64: string; mimeType: string }> {
  const page = await pdf.getPage(pageNumber)
  
  // Render at 3x scale for better quality (helps read smaller text in tables)
  const scale = 3.0
  const viewport = page.getViewport({ scale })
  
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = viewport.width
  canvas.height = viewport.height
  
  await page.render({
    canvasContext: context,
    viewport,
  } as any).promise
  
  // Convert to base64
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  
  return { base64, mimeType: 'image/png' }
}

// Extract zones from all pages of a PDF
export async function extractZonesFromPDF(
  pdfData: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<ExtractionResult> {
  // Check if any AI is configured
  if (!isClaudeConfigured() && !isGrokConfigured()) {
    throw new Error('No AI API key configured. Please add VITE_ANTHROPIC_API_KEY or VITE_XAI_API_KEY to your environment variables.')
  }
  
  const pdfjsLib = await import('pdfjs-dist')
  // Use jsDelivr which is reliable and fast
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
  
  console.log('PDF.js version:', pdfjsLib.version)
  console.log('Worker URL:', pdfjsLib.GlobalWorkerOptions.workerSrc)
  
  // Copy the ArrayBuffer to prevent detachment issues
  const pdfDataCopy = pdfData.slice(0)
  
  const pdf = await pdfjsLib.getDocument({ data: pdfDataCopy }).promise
  const numPages = pdf.numPages
  console.log('PDF loaded, pages:', numPages)
  
  const allZones: ExtractedZone[] = []
  const errors: string[] = []
  const detectedFloors: string[] = []
  
  for (let i = 1; i <= numPages; i++) {
    onProgress?.(i, numPages)
    
    try {
      console.log(`Processing page ${i}/${numPages}...`)
      const { base64, mimeType } = await renderPageToImage(pdf, i)
      console.log(`Page ${i} converted to image, sending to AI...`)
      const result = await extractZonesFromImage(base64, mimeType)
      console.log(`Page ${i} extracted ${result.zones.length} zones (Floor: ${result.detectedFloor})`)
      
      if (result.detectedFloor && result.detectedFloor !== 'Unknown') {
        detectedFloors.push(result.detectedFloor)
      }
      
      allZones.push(...result.zones)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`Error processing page ${i}:`, errorMsg)
      errors.push(`Page ${i}: ${errorMsg}`)
    }
  }
  
  // If no zones found and there were errors, throw
  if (allZones.length === 0 && errors.length > 0) {
    throw new Error(`Failed to extract zones: ${errors.join('; ')}`)
  }
  
  // DON'T deduplicate - keep all zones, even with same names
  // The floor prefix + duplicate numbering already handles uniqueness
  // Just sort by floor then name for better organization
  const sortedZones = allZones.sort((a, b) => {
    // Sort by floor first
    const floorA = a.floor || 'ZZZ'
    const floorB = b.floor || 'ZZZ'
    if (floorA !== floorB) return floorA.localeCompare(floorB)
    // Then by name
    return a.name.localeCompare(b.name)
  })
  
  return {
    zones: sortedZones,
    totalSF: sortedZones.reduce((sum, z) => sum + z.sf, 0),
    pageCount: numPages,
    detectedFloor: detectedFloors.length > 0 ? detectedFloors.join(', ') : undefined,
  }
}
