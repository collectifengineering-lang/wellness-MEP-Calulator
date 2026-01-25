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

// Zone type mapping for AI suggestions
const ZONE_TYPE_MAPPING: Record<string, string> = {
  // Reception & Common
  'reception': 'reception',
  'lobby': 'reception',
  'entry': 'reception',
  'waiting': 'reception',
  'lounge': 'lounge_common',
  'common': 'lounge_common',
  
  // Wet areas
  'pool': 'pool_indoor',
  'natatorium': 'pool_indoor',
  'hot tub': 'hot_tub',
  'spa': 'hot_tub',
  'jacuzzi': 'hot_tub',
  'cold plunge': 'cold_plunge',
  'plunge': 'cold_plunge',
  'steam': 'steam_room',
  'steam room': 'steam_room',
  'sauna': 'sauna_electric',
  'banya': 'banya_gas',
  
  // Locker & Restroom
  'locker': 'locker_room',
  'locker room': 'locker_room',
  'changing': 'locker_room',
  'restroom': 'restroom',
  'bathroom': 'restroom',
  'toilet': 'restroom',
  'wc': 'restroom',
  
  // Treatment
  'treatment': 'treatment_room',
  'massage': 'treatment_room',
  'therapy': 'treatment_room',
  'facial': 'treatment_room',
  
  // Fitness
  'gym': 'fitness_floor',
  'fitness': 'fitness_floor',
  'weight': 'fitness_floor',
  'cardio': 'fitness_floor',
  'yoga': 'yoga_studio',
  'pilates': 'pilates_studio',
  'studio': 'event_space_studio',
  'boxing': 'mma_boxing_studio',
  'mma': 'mma_boxing_studio',
  
  // Food & Beverage
  'kitchen': 'commercial_kitchen',
  'cafe': 'cafe_light_fb',
  'restaurant': 'commercial_kitchen',
  'bar': 'cafe_light_fb',
  'dining': 'cafe_light_fb',
  
  // Support
  'mechanical': 'mechanical_room',
  'mech': 'mechanical_room',
  'electrical': 'mechanical_room',
  'elec': 'mechanical_room',
  'storage': 'storage',
  'janitor': 'storage',
  'laundry': 'laundry_commercial',
  'office': 'office_admin',
  'admin': 'office_admin',
  'break room': 'office_admin',
  'staff': 'office_admin',
  
  // Other
  'corridor': 'circulation',
  'hallway': 'circulation',
  'circulation': 'circulation',
  'stair': 'circulation',
  'elevator': 'circulation',
  'terrace': 'terrace',
  'outdoor': 'terrace',
  'patio': 'terrace',
  'roof': 'terrace',
  'conference': 'conference_room',
  'meeting': 'conference_room',
  'child': 'child_care',
  'kids': 'child_care',
  'childcare': 'child_care',
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

  const prompt = `Analyze this floor plan or area schedule image. Extract ALL rooms/spaces with their areas.

For each room/space found, provide:
1. Room name (as labeled)
2. Area in square feet (SF) - calculate from dimensions if shown, or estimate based on scale
3. Room type (e.g., office, restroom, locker room, pool, gym, etc.)

IMPORTANT:
- Include ALL labeled spaces
- If dimensions are shown (like 20'-0" x 15'-0"), calculate the area
- If only total SF is shown, use that
- Look for area schedules, room labels, dimension strings
- Estimate if exact numbers aren't clear

Respond in this exact JSON format:
{
  "zones": [
    {"name": "Reception", "type": "reception", "sf": 500},
    {"name": "Men's Locker Room", "type": "locker room", "sf": 1200},
    ...
  ],
  "totalSF": 15000,
  "notes": "Any relevant observations about the floor plan"
}

Only respond with valid JSON, no other text.`

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
        max_tokens: 4096,
        temperature: 0.1,
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

    // Initial extraction with keyword-based matching
    const rawZones = (parsed.zones || []).map((z: any) => ({
      name: z.name || 'Unknown',
      type: z.type || 'unknown',
      sf: Math.round(z.sf || z.area || 0),
    }))

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
      const suggestedType = aiMatch || (keywordMatch !== 'custom' ? keywordMatch : null) || 'custom'
      
      return {
        name: z.name,
        type: z.type,
        suggestedZoneType: suggestedType,
        sf: z.sf,
        confidence: aiMatch ? 'high' : (keywordMatch !== 'custom' ? 'medium' : 'low'),
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
