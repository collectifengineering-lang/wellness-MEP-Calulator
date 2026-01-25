// xAI Grok Vision API client for PDF zone extraction

const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY || ''
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'

// Our available zone types for AI matching
const AVAILABLE_ZONE_TYPES = [
  { id: 'reception', name: 'Reception / Lounge', keywords: 'lobby, waiting, entry, front desk' },
  { id: 'mechanical_room', name: 'Mechanical Room', keywords: 'mech, electrical, boiler, AHU' },
  { id: 'retail', name: 'Retail', keywords: 'shop, store, merchandise' },
  { id: 'office', name: 'Office / Admin', keywords: 'admin, back office, staff office' },
  { id: 'storage', name: 'Storage', keywords: 'janitor, closet, supply' },
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
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

export interface ExtractionResult {
  zones: ExtractedZone[]
  totalSF: number
  pageCount: number
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
  'lounge': 'reception',
  'common': 'reception',
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
  'back office': 'office',
  'break': 'office',
  'break room': 'office',
  'breakroom': 'office',
  'staff': 'office',
  'employee': 'office',
  
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
  if (!isXAIConfigured() || zones.length === 0) {
    return {}
  }

  const zoneTypeList = AVAILABLE_ZONE_TYPES
    .map(z => `- ${z.id}: "${z.name}" (${z.keywords})`)
    .join('\n')

  const roomList = zones
    .map((z, i) => `${i + 1}. "${z.name}" (${z.type}, ${z.sf} SF)`)
    .join('\n')

  const prompt = `You are matching room names from a floor plan to predefined zone types for an MEP (mechanical/electrical/plumbing) calculator for wellness facilities (spas, gyms, bathhouses).

AVAILABLE ZONE TYPES:
${zoneTypeList}

ROOMS TO MATCH:
${roomList}

For each room, pick the BEST matching zone type ID from the list above. Consider:
- The room name and what it's used for
- Similar keywords and concepts
- Wellness/spa facility context

Respond with ONLY a JSON object mapping room names to zone type IDs:
{
  "Room Name 1": "zone_type_id",
  "Room Name 2": "zone_type_id",
  ...
}

If no good match exists, use "custom". Only respond with valid JSON.`

  try {
    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      console.error('AI matching failed:', response.status)
      return {}
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return {}
  } catch (error) {
    console.error('AI zone matching error:', error)
    return {}
  }
}

export async function extractZonesFromImage(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<ExtractionResult> {
  if (!isXAIConfigured()) {
    throw new Error('xAI API key not configured')
  }

  const prompt = `You are analyzing an architectural floor plan or area schedule for a wellness facility.

YOUR TASK: Extract rooms/spaces that have a SQUARE FOOTAGE NUMBER visible.

CRITICAL RULES:
1. ONLY extract spaces that have a visible SF/sqft number (e.g., "1,250 SF", "500", "2500 sqft")
2. The SF number is usually displayed BELOW or NEXT TO the room name
3. SKIP spaces without SF numbers - we only want rooms with areas specified
4. IGNORE: stairs, elevators, corridors, hallways, vestibules, circulation areas
5. Look for area schedules or room lists that show name + SF in columns

WHAT A VALID ENTRY LOOKS LIKE:
- "RECEPTION" with "1,500 SF" nearby → Extract it
- "MEN'S LOCKER" with "2,500" below it → Extract it  
- "STAIR 1" with no SF number → SKIP IT
- "CORRIDOR" → SKIP IT

COMMON WELLNESS SPACES TO FIND:
Reception, Locker Rooms, Restrooms, Pool, Hot Tub, Sauna, Steam Room, Banya,
Yoga Studio, Fitness Floor, Group Fitness, Treatment Rooms, Massage,
Laundry, Mechanical, Storage, Office, Café, Retail, Co-Work

Respond with ONLY valid JSON:
{
  "zones": [
    {"name": "Reception", "type": "reception", "sf": 1500},
    {"name": "Men's Locker Room", "type": "locker room", "sf": 2500},
    {"name": "Pool Area", "type": "pool", "sf": 4000}
  ],
  "totalSF": 8000,
  "notes": "Extracted 3 spaces with visible SF numbers"
}

ONLY include spaces with SF numbers. Quality over quantity.`

  try {
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
                text: prompt,
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
    let parsed: any
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      throw new Error('Failed to parse AI response as JSON')
    }

    // Initial extraction - filter out circulation/stairs and zones without SF
    const rawZones = (parsed.zones || [])
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

    // Map the response to our format with AI-enhanced zone type suggestions
    const zones: ExtractedZone[] = rawZones.map((z: any) => {
      // Priority: AI match > keyword match > custom
      const aiMatch = aiMatches[z.name]
      const keywordMatch = suggestZoneType(z.name || z.type || '')
      // Don't use _skip_ as a zone type
      const suggestedType = aiMatch || (keywordMatch !== 'custom' && keywordMatch !== '_skip_' ? keywordMatch : null) || 'custom'
      
      return {
        name: z.name,
        type: z.type,
        suggestedZoneType: suggestedType,
        sf: z.sf,
        confidence: aiMatch ? 'high' : (keywordMatch !== 'custom' && keywordMatch !== '_skip_' ? 'medium' : 'low'),
        notes: aiMatch ? 'AI-matched' : undefined,
      }
    })

    return {
      zones,
      totalSF: parsed.totalSF || zones.reduce((sum, z) => sum + z.sf, 0),
      pageCount: 1,
      rawResponse: content,
    }
  } catch (error) {
    console.error('Zone extraction error:', error)
    throw error
  }
}

// Convert a PDF page to base64 image using an already-loaded PDF document
async function renderPageToImage(
  pdf: any,
  pageNumber: number
): Promise<{ base64: string; mimeType: string }> {
  const page = await pdf.getPage(pageNumber)
  
  // Render at 2x scale for better quality
  const scale = 2.0
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
  // Check if xAI is configured first
  if (!isXAIConfigured()) {
    throw new Error('xAI API key not configured. Please add VITE_XAI_API_KEY to your environment variables.')
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
  
  for (let i = 1; i <= numPages; i++) {
    onProgress?.(i, numPages)
    
    try {
      console.log(`Processing page ${i}/${numPages}...`)
      const { base64, mimeType } = await renderPageToImage(pdf, i)
      console.log(`Page ${i} converted to image, sending to xAI...`)
      const result = await extractZonesFromImage(base64, mimeType)
      console.log(`Page ${i} extracted ${result.zones.length} zones`)
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
  
  // Deduplicate zones by name
  const uniqueZones = allZones.reduce((acc, zone) => {
    const existing = acc.find(z => z.name.toLowerCase() === zone.name.toLowerCase())
    if (!existing) {
      acc.push(zone)
    } else if (zone.sf > existing.sf) {
      // Keep the one with larger SF
      const idx = acc.indexOf(existing)
      acc[idx] = zone
    }
    return acc
  }, [] as ExtractedZone[])
  
  return {
    zones: uniqueZones,
    totalSF: uniqueZones.reduce((sum, z) => sum + z.sf, 0),
    pageCount: numPages,
  }
}
