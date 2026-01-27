/**
 * Plan Analyzer - AI-powered drawing analysis for Plan Scanner
 * Independent from Concept MEP to allow separate training
 * Uses Claude (primary) with Grok fallback
 */

import { ExtractedSpace, SymbolLegend } from '../store/useScannerStore'
import { v4 as uuidv4 } from 'uuid'

// Get API keys from environment (same keys, independent checks)
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY || ''

// Check if providers are configured
const isClaudeReady = () => !!ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.length > 10
const isGrokReady = () => !!XAI_API_KEY && XAI_API_KEY.length > 10

// Analysis prompt for floor plans
const PLAN_ANALYSIS_PROMPT = `You are an expert MEP (Mechanical, Electrical, Plumbing) engineer analyzing architectural floor plans.

Analyze this floor plan image and extract ALL spaces/rooms you can identify.

For EACH space, provide:
1. **name**: The room name as labeled (or infer if obvious like "BATHROOM", "KITCHEN")
2. **floor**: Floor level if visible (e.g., "Level 1", "2nd Floor", "Basement")
3. **sf**: Estimated square footage (use scale if visible, otherwise estimate based on typical room sizes)
4. **zoneType**: Best matching zone type from this list:
   - lobby, reception, waiting_area
   - locker_room_male, locker_room_female, locker_room_unisex
   - restroom_public, restroom_private
   - shower_room, sauna_dry, sauna_wet, steam_room
   - pool_lap, pool_therapy, pool_plunge_hot, pool_plunge_cold
   - spa_treatment, massage_room, meditation_room
   - fitness_cardio, fitness_weights, fitness_studio
   - office_private, office_open, conference_room
   - kitchen_commercial, kitchen_break, break_room
   - laundry_commercial, mechanical_room, electrical_room
   - storage, corridor, stairwell
   - retail, restaurant, bar_lounge
   - hotel_room, hotel_suite
   - other

5. **fixtures**: Count of plumbing fixtures visible:
   - toilets (water closets)
   - urinals
   - lavatories (sinks)
   - showers
   - bathtubs
   - floor_drains
   - drinking_fountains
   - service_sinks
   - kitchen_sinks
   - dishwashers
   - washing_machines
   - hose_bibbs

6. **equipment**: Any mechanical/electrical equipment visible:
   - Pool pumps, heaters, filters
   - HVAC units, fans, diffusers
   - Water heaters
   - Electrical panels
   - Saunas, steam generators

7. **confidence**: Your confidence level 0-100 in this extraction

IMPORTANT RULES:
- Include ALL visible spaces, even small ones
- If a space has no label, infer from context (fixtures present, adjacent rooms)
- Count EVERY fixture you can see, even partially
- Note any pools and estimate their size in SF
- If scale is shown, use it; otherwise estimate based on typical fixture sizes (toilet ~2.5'x1.5')
- Look for room labels in title blocks, room stamps, or text callouts

Respond in this exact JSON format:
{
  "drawingInfo": {
    "title": "string or null",
    "scale": "string like '1/4\" = 1'-0\"' or null",
    "floor": "string or null",
    "drawingNumber": "string or null"
  },
  "spaces": [
    {
      "name": "Room Name",
      "floor": "Level 1",
      "sf": 150,
      "zoneType": "restroom_public",
      "fixtures": {
        "toilets": 2,
        "urinals": 1,
        "lavatories": 2
      },
      "equipment": [
        { "type": "exhaust", "name": "Exhaust Fan", "quantity": 1 }
      ],
      "confidence": 85
    }
  ],
  "pools": [
    {
      "name": "Lap Pool",
      "sf": 2000,
      "estimatedGallons": 60000,
      "type": "lap"
    }
  ],
  "notes": "Any observations about the drawing quality, missing info, etc."
}`

// Symbol legend context prompt
const LEGEND_CONTEXT_PROMPT = (legend: SymbolLegend) => `
SYMBOL LEGEND CONTEXT:
The following symbols are used in this project's drawings:
${legend.symbols.map(s => `- ${s.name}: ${s.description || s.category}${s.fixtureType ? ` (maps to: ${s.fixtureType})` : ''}`).join('\n')}

Use these symbol definitions when identifying fixtures and equipment.
`

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
  
  // Try Claude first (preferred for document analysis)
  if (isClaudeReady()) {
    try {
      console.log('🔵 Attempting analysis with Claude...')
      const result = await analyzeWithClaude(ANTHROPIC_API_KEY, imageBase64, mimeType, legend)
      console.log('✅ Claude analysis successful!')
      return { ...result, provider: 'claude' }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('❌ Claude analysis failed:', msg)
      errors.push(`Claude: ${msg}`)
    }
  } else {
    console.log('⚠️ Claude not configured - check VITE_ANTHROPIC_API_KEY')
    errors.push('Claude: API key not configured')
  }
  
  // Fallback to Grok only if Claude fails
  if (isGrokReady()) {
    try {
      console.log('🟠 Falling back to Grok...')
      const result = await analyzeWithGrok(XAI_API_KEY, imageBase64, mimeType, legend)
      console.log('✅ Grok analysis successful!')
      return { ...result, provider: 'grok' }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('❌ Grok analysis failed:', msg)
      errors.push(`Grok: ${msg}`)
    }
  } else {
    console.log('⚠️ Grok not configured - check VITE_XAI_API_KEY')
  }
  
  // Both failed
  throw new Error(`AI analysis failed:\n${errors.join('\n')}`)
}

async function analyzeWithClaude(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  legend?: SymbolLegend
): Promise<Omit<AnalysisResult, 'provider'>> {
  const userPrompt = legend
    ? PLAN_ANALYSIS_PROMPT + '\n\n' + LEGEND_CONTEXT_PROMPT(legend)
    : PLAN_ANALYSIS_PROMPT
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
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
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  const textContent = data.content?.find((c: { type: string }) => c.type === 'text')
  
  if (!textContent?.text) {
    throw new Error('No text response from Claude')
  }
  
  // Extract JSON from response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from Claude response')
  }
  
  const parsed = JSON.parse(jsonMatch[0])
  
  // Transform to our ExtractedSpace format
  const spaces: ExtractedSpace[] = (parsed.spaces || []).map((space: Record<string, unknown>) => ({
    id: uuidv4(),
    name: space.name as string || 'Unknown Space',
    floor: space.floor as string,
    sf: space.sf as number || 0,
    zoneType: space.zoneType as string,
    fixtures: space.fixtures as Record<string, number> || {},
    equipment: space.equipment as Array<{ type: string; name: string; quantity: number }> || [],
    confidence: space.confidence as number || 50,
  }))
  
  return {
    drawingInfo: parsed.drawingInfo || {},
    spaces,
    pools: parsed.pools || [],
    notes: parsed.notes || '',
  }
}

async function analyzeWithGrok(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  legend?: SymbolLegend
): Promise<Omit<AnalysisResult, 'provider'>> {
  const systemPrompt = legend
    ? PLAN_ANALYSIS_PROMPT + '\n\n' + LEGEND_CONTEXT_PROMPT(legend)
    : PLAN_ANALYSIS_PROMPT
  
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
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
      max_tokens: 4096,
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`)
  }
  
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  
  if (!content) {
    throw new Error('No content in Grok response')
  }
  
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from Grok response')
  }
  
  const parsed = JSON.parse(jsonMatch[0])
  
  // Transform to our ExtractedSpace format
  const spaces: ExtractedSpace[] = (parsed.spaces || []).map((space: Record<string, unknown>) => ({
    id: uuidv4(),
    name: space.name as string || 'Unknown Space',
    floor: space.floor as string,
    sf: space.sf as number || 0,
    zoneType: space.zoneType as string,
    fixtures: space.fixtures as Record<string, number> || {},
    equipment: space.equipment as Array<{ type: string; name: string; quantity: number }> || [],
    confidence: space.confidence as number || 50,
  }))
  
  return {
    drawingInfo: parsed.drawingInfo || {},
    spaces,
    pools: parsed.pools || [],
    notes: parsed.notes || '',
  }
}

// Scale detection helper
export function parseScale(scaleString: string): number | null {
  // Common scale formats:
  // "1/4" = 1'-0"" -> 48 pixels per foot at 1 inch = 48 pixels
  // "1/8" = 1'-0"" -> 96 pixels per foot
  // "1:50" -> metric
  
  const fractionMatch = scaleString.match(/(\d+)\/(\d+)"?\s*=\s*1'-?0?"?/)
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1])
    const denominator = parseInt(fractionMatch[2])
    // At 96 DPI, 1 inch = 96 pixels
    // If 1/4" = 1', then 1' = 4 * 96 = 384 pixels
    return (denominator / numerator) * 96
  }
  
  const ratioMatch = scaleString.match(/1:(\d+)/)
  if (ratioMatch) {
    const ratio = parseInt(ratioMatch[1])
    // Assuming metric, 1:50 means 1cm = 50cm real
    // At 96 DPI, ~38 pixels per cm
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
