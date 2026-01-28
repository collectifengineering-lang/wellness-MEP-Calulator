/**
 * ASHRAE 62.1-2022 Ventilation Reference Data
 * 
 * This file contains ventilation rates from ASHRAE Standard 62.1
 * Table 6-1: Minimum Ventilation Rates in Breathing Zone
 * Table 6-4: Minimum Exhaust Rates
 */

// ============================================
// Space Type Ventilation Rates (Table 6-1)
// ============================================

export interface ASHRAE62SpaceType {
  id: string
  category: string
  name: string
  displayName: string
  // People outdoor air rate (CFM per person)
  Rp: number
  // Area outdoor air rate (CFM per sq ft)
  Ra: number
  // Default occupant density (people per 1000 sq ft)
  defaultOccupancy: number
  // Air class (1 = low contaminants, 2 = moderate, 3 = high)
  airClass: 1 | 2 | 3
  // Notes
  notes?: string
}

// Comprehensive ASHRAE 62.1 Table 6-1 space types
export const ASHRAE62_SPACE_TYPES: ASHRAE62SpaceType[] = [
  // ============================================
  // CORRECTIONAL FACILITIES
  // ============================================
  { id: 'booking_waiting', category: 'Correctional', name: 'Booking/waiting', displayName: 'Booking/Waiting', Rp: 7.5, Ra: 0.06, defaultOccupancy: 50, airClass: 1 },
  { id: 'cell', category: 'Correctional', name: 'Cell', displayName: 'Cell', Rp: 5, Ra: 0.12, defaultOccupancy: 25, airClass: 1 },
  { id: 'dayroom', category: 'Correctional', name: 'Dayroom', displayName: 'Dayroom', Rp: 5, Ra: 0.06, defaultOccupancy: 30, airClass: 1 },
  { id: 'guard_station', category: 'Correctional', name: 'Guard stations', displayName: 'Guard Station', Rp: 5, Ra: 0.06, defaultOccupancy: 15, airClass: 1 },

  // ============================================
  // EDUCATIONAL FACILITIES
  // ============================================
  { id: 'daycare_under2', category: 'Educational', name: 'Daycare (through age 4)', displayName: 'Daycare (Under 2)', Rp: 10, Ra: 0.18, defaultOccupancy: 25, airClass: 1 },
  { id: 'daycare_2_4', category: 'Educational', name: 'Daycare (through age 4)', displayName: 'Daycare (Ages 2-4)', Rp: 10, Ra: 0.18, defaultOccupancy: 25, airClass: 1 },
  { id: 'daycare_5plus', category: 'Educational', name: 'Daycare sickroom', displayName: 'Daycare (5+)', Rp: 10, Ra: 0.18, defaultOccupancy: 25, airClass: 2 },
  { id: 'classroom_k12', category: 'Educational', name: 'Classrooms (ages 5-8)', displayName: 'Classroom K-12', Rp: 10, Ra: 0.12, defaultOccupancy: 25, airClass: 1 },
  { id: 'classroom_9plus', category: 'Educational', name: 'Classrooms (age 9 plus)', displayName: 'Classroom (9+)', Rp: 10, Ra: 0.12, defaultOccupancy: 35, airClass: 1 },
  { id: 'lecture_classroom', category: 'Educational', name: 'Lecture classroom', displayName: 'Lecture Classroom', Rp: 7.5, Ra: 0.06, defaultOccupancy: 65, airClass: 1 },
  { id: 'lecture_hall', category: 'Educational', name: 'Lecture hall (fixed seats)', displayName: 'Lecture Hall', Rp: 7.5, Ra: 0.06, defaultOccupancy: 150, airClass: 1 },
  { id: 'art_classroom', category: 'Educational', name: 'Art classroom', displayName: 'Art Classroom', Rp: 10, Ra: 0.18, defaultOccupancy: 20, airClass: 2 },
  { id: 'media_center', category: 'Educational', name: 'Media center', displayName: 'Media Center', Rp: 10, Ra: 0.12, defaultOccupancy: 25, airClass: 1 },
  { id: 'music_theater', category: 'Educational', name: 'Music/theater/dance', displayName: 'Music/Theater/Dance', Rp: 10, Ra: 0.06, defaultOccupancy: 35, airClass: 1 },
  { id: 'science_lab', category: 'Educational', name: 'Science laboratories', displayName: 'Science Lab', Rp: 10, Ra: 0.18, defaultOccupancy: 25, airClass: 2 },
  { id: 'university_lab', category: 'Educational', name: 'University/college laboratories', displayName: 'University Lab', Rp: 10, Ra: 0.18, defaultOccupancy: 25, airClass: 2 },
  { id: 'wood_metal_shop', category: 'Educational', name: 'Wood/metal shop', displayName: 'Wood/Metal Shop', Rp: 10, Ra: 0.18, defaultOccupancy: 20, airClass: 2 },

  // ============================================
  // FOOD AND BEVERAGE SERVICE
  // ============================================
  { id: 'bar_cocktail', category: 'Food & Beverage', name: 'Bars, cocktail lounges', displayName: 'Bar/Cocktail Lounge', Rp: 7.5, Ra: 0.18, defaultOccupancy: 100, airClass: 2 },
  { id: 'cafe_fast_food', category: 'Food & Beverage', name: 'Cafeteria/fast-food dining', displayName: 'Cafeteria/Fast Food', Rp: 7.5, Ra: 0.18, defaultOccupancy: 100, airClass: 2 },
  { id: 'dining_room', category: 'Food & Beverage', name: 'Restaurant dining rooms', displayName: 'Restaurant Dining', Rp: 7.5, Ra: 0.18, defaultOccupancy: 70, airClass: 2 },
  { id: 'kitchen_cooking', category: 'Food & Beverage', name: 'Kitchen (cooking)', displayName: 'Commercial Kitchen', Rp: 7.5, Ra: 0.12, defaultOccupancy: 20, airClass: 2, notes: 'Exhaust required per IMC' },

  // ============================================
  // GENERAL (Common Spaces)
  // ============================================
  { id: 'break_room', category: 'General', name: 'Break rooms', displayName: 'Break Room', Rp: 5, Ra: 0.06, defaultOccupancy: 25, airClass: 1 },
  { id: 'coffee_station', category: 'General', name: 'Coffee stations', displayName: 'Coffee Station', Rp: 5, Ra: 0.06, defaultOccupancy: 20, airClass: 1 },
  { id: 'conference_meeting', category: 'General', name: 'Conference/meeting', displayName: 'Conference Room', Rp: 5, Ra: 0.06, defaultOccupancy: 50, airClass: 1 },
  { id: 'corridor', category: 'General', name: 'Corridors', displayName: 'Corridor', Rp: 0, Ra: 0.06, defaultOccupancy: 0, airClass: 1 },
  { id: 'occupiable_storage', category: 'General', name: 'Occupiable storage rooms', displayName: 'Occupiable Storage', Rp: 0, Ra: 0.12, defaultOccupancy: 2, airClass: 1 },

  // ============================================
  // HOTELS/MOTELS/RESORTS/DORMS
  // ============================================
  { id: 'bedroom_dorm', category: 'Lodging', name: 'Bedroom/living room', displayName: 'Bedroom/Living (Lodging)', Rp: 5, Ra: 0.06, defaultOccupancy: 10, airClass: 1 },
  { id: 'hotel_barracks', category: 'Lodging', name: 'Barracks sleeping areas', displayName: 'Barracks', Rp: 5, Ra: 0.06, defaultOccupancy: 20, airClass: 1 },
  { id: 'hotel_common', category: 'Lodging', name: 'Common corridors', displayName: 'Hotel Corridor', Rp: 0, Ra: 0.06, defaultOccupancy: 0, airClass: 1 },
  { id: 'hotel_laundry', category: 'Lodging', name: 'Laundry rooms, central', displayName: 'Laundry (Central)', Rp: 5, Ra: 0.12, defaultOccupancy: 10, airClass: 2 },
  { id: 'hotel_lobby', category: 'Lodging', name: 'Lobbies/prefunction', displayName: 'Hotel Lobby', Rp: 7.5, Ra: 0.06, defaultOccupancy: 30, airClass: 1 },
  { id: 'hotel_multipurpose', category: 'Lodging', name: 'Multipurpose assembly', displayName: 'Multipurpose Assembly', Rp: 5, Ra: 0.06, defaultOccupancy: 120, airClass: 1 },

  // ============================================
  // OFFICE BUILDINGS
  // ============================================
  { id: 'office', category: 'Office', name: 'Office space', displayName: 'Office', Rp: 5, Ra: 0.06, defaultOccupancy: 5, airClass: 1 },
  { id: 'reception', category: 'Office', name: 'Reception areas', displayName: 'Reception', Rp: 5, Ra: 0.06, defaultOccupancy: 30, airClass: 1 },
  { id: 'telephone_data', category: 'Office', name: 'Telephone/data entry', displayName: 'Telephone/Data Entry', Rp: 5, Ra: 0.06, defaultOccupancy: 60, airClass: 1 },
  { id: 'main_entry_lobby', category: 'Office', name: 'Main entry lobbies', displayName: 'Main Entry Lobby', Rp: 5, Ra: 0.06, defaultOccupancy: 10, airClass: 1 },

  // ============================================
  // PUBLIC ASSEMBLY
  // ============================================
  { id: 'auditorium', category: 'Public Assembly', name: 'Auditorium seating area', displayName: 'Auditorium', Rp: 5, Ra: 0.06, defaultOccupancy: 150, airClass: 1 },
  { id: 'place_of_worship', category: 'Public Assembly', name: 'Places of religious worship', displayName: 'Place of Worship', Rp: 5, Ra: 0.06, defaultOccupancy: 120, airClass: 1 },
  { id: 'courtroom', category: 'Public Assembly', name: 'Courtrooms', displayName: 'Courtroom', Rp: 5, Ra: 0.06, defaultOccupancy: 70, airClass: 1 },
  { id: 'legislative', category: 'Public Assembly', name: 'Legislative chambers', displayName: 'Legislative Chamber', Rp: 5, Ra: 0.06, defaultOccupancy: 50, airClass: 1 },
  { id: 'library', category: 'Public Assembly', name: 'Libraries', displayName: 'Library', Rp: 5, Ra: 0.12, defaultOccupancy: 10, airClass: 1 },
  { id: 'lobby_public', category: 'Public Assembly', name: 'Lobbies', displayName: 'Public Lobby', Rp: 5, Ra: 0.06, defaultOccupancy: 150, airClass: 1 },
  { id: 'museum_gallery', category: 'Public Assembly', name: 'Museums/galleries', displayName: 'Museum/Gallery', Rp: 7.5, Ra: 0.06, defaultOccupancy: 40, airClass: 1 },

  // ============================================
  // RETAIL
  // ============================================
  { id: 'retail_sales', category: 'Retail', name: 'Sales area (except below)', displayName: 'Retail Sales', Rp: 7.5, Ra: 0.12, defaultOccupancy: 15, airClass: 1 },
  { id: 'mall_common', category: 'Retail', name: 'Mall common areas', displayName: 'Mall Common Area', Rp: 7.5, Ra: 0.06, defaultOccupancy: 40, airClass: 1 },
  { id: 'barbershop', category: 'Retail', name: 'Barbershop', displayName: 'Barbershop', Rp: 7.5, Ra: 0.06, defaultOccupancy: 25, airClass: 2 },
  { id: 'beauty_nail_salon', category: 'Retail', name: 'Beauty and nail salons', displayName: 'Beauty/Nail Salon', Rp: 20, Ra: 0.12, defaultOccupancy: 25, airClass: 2 },
  { id: 'pet_shop', category: 'Retail', name: 'Pet shops', displayName: 'Pet Shop', Rp: 7.5, Ra: 0.18, defaultOccupancy: 10, airClass: 2 },
  { id: 'supermarket', category: 'Retail', name: 'Supermarket', displayName: 'Supermarket', Rp: 7.5, Ra: 0.06, defaultOccupancy: 8, airClass: 1 },

  // ============================================
  // SPORTS AND ENTERTAINMENT
  // ============================================
  { id: 'disco_dance', category: 'Sports & Entertainment', name: 'Disco/dance floors', displayName: 'Disco/Dance Floor', Rp: 20, Ra: 0.06, defaultOccupancy: 100, airClass: 2 },
  { id: 'health_club_aerobics', category: 'Sports & Entertainment', name: 'Health club/aerobics room', displayName: 'Aerobics Room', Rp: 20, Ra: 0.06, defaultOccupancy: 40, airClass: 2 },
  { id: 'health_club_weights', category: 'Sports & Entertainment', name: 'Health club/weight room', displayName: 'Weight Room', Rp: 20, Ra: 0.06, defaultOccupancy: 10, airClass: 2 },
  { id: 'bowling_alley', category: 'Sports & Entertainment', name: 'Bowling alley (seating)', displayName: 'Bowling (Seating)', Rp: 10, Ra: 0.12, defaultOccupancy: 40, airClass: 1 },
  { id: 'casino_gaming', category: 'Sports & Entertainment', name: 'Casino gaming areas', displayName: 'Casino Gaming', Rp: 7.5, Ra: 0.18, defaultOccupancy: 120, airClass: 2 },
  { id: 'game_arcade', category: 'Sports & Entertainment', name: 'Game arcades', displayName: 'Game Arcade', Rp: 7.5, Ra: 0.18, defaultOccupancy: 20, airClass: 1 },
  { id: 'gym_arena_play', category: 'Sports & Entertainment', name: 'Gym, stadium, arena (play area)', displayName: 'Gym/Arena (Play)', Rp: 0, Ra: 0.30, defaultOccupancy: 0, airClass: 1 },
  { id: 'gym_arena_spectator', category: 'Sports & Entertainment', name: 'Gym, stadium, arena (spectator)', displayName: 'Gym/Arena (Spectator)', Rp: 7.5, Ra: 0.06, defaultOccupancy: 150, airClass: 1 },
  { id: 'spectator_seating', category: 'Sports & Entertainment', name: 'Spectator areas', displayName: 'Spectator Seating', Rp: 7.5, Ra: 0.06, defaultOccupancy: 150, airClass: 1 },
  { id: 'swimming_pool', category: 'Sports & Entertainment', name: 'Swimming (pool and deck)', displayName: 'Swimming Pool Area', Rp: 0, Ra: 0.48, defaultOccupancy: 0, airClass: 2, notes: 'Higher Ra for humidity control' },
  { id: 'natatorium', category: 'Sports & Entertainment', name: 'Natatorium', displayName: 'Natatorium', Rp: 0, Ra: 0.48, defaultOccupancy: 0, airClass: 2 },

  // ============================================
  // TRANSPORTATION
  // ============================================
  { id: 'airport_baggage', category: 'Transportation', name: 'Baggage/claim', displayName: 'Baggage Claim', Rp: 7.5, Ra: 0.06, defaultOccupancy: 100, airClass: 1 },
  { id: 'airport_terminal', category: 'Transportation', name: 'Airport terminal/concourse', displayName: 'Airport Terminal', Rp: 7.5, Ra: 0.06, defaultOccupancy: 100, airClass: 1 },
  { id: 'bus_station', category: 'Transportation', name: 'Transportation waiting', displayName: 'Bus/Train Station', Rp: 7.5, Ra: 0.06, defaultOccupancy: 100, airClass: 1 },
  { id: 'ticket_booth', category: 'Transportation', name: 'Ticket booths', displayName: 'Ticket Booth', Rp: 5, Ra: 0.06, defaultOccupancy: 60, airClass: 1 },

  // ============================================
  // WAREHOUSES
  // ============================================
  { id: 'shipping_receiving', category: 'Warehouse', name: 'Shipping/receiving', displayName: 'Shipping/Receiving', Rp: 0, Ra: 0.12, defaultOccupancy: 0, airClass: 2 },
  { id: 'storage_conditioned', category: 'Warehouse', name: 'Storage rooms', displayName: 'Storage (Conditioned)', Rp: 0, Ra: 0.12, defaultOccupancy: 0, airClass: 1 },

  // ============================================
  // WELLNESS / SPA (Custom for this app)
  // ============================================
  { id: 'spa_locker_room', category: 'Wellness', name: 'Locker/dressing rooms', displayName: 'Locker Room', Rp: 5, Ra: 0.06, defaultOccupancy: 25, airClass: 2, notes: 'Exhaust required' },
  { id: 'spa_treatment', category: 'Wellness', name: 'Treatment rooms', displayName: 'Spa Treatment Room', Rp: 5, Ra: 0.06, defaultOccupancy: 13, airClass: 1 },
  { id: 'spa_massage', category: 'Wellness', name: 'Massage rooms', displayName: 'Massage Room', Rp: 5, Ra: 0.06, defaultOccupancy: 17, airClass: 1 },
  { id: 'spa_relaxation', category: 'Wellness', name: 'Relaxation rooms', displayName: 'Relaxation Room', Rp: 5, Ra: 0.06, defaultOccupancy: 10, airClass: 1 },
  { id: 'yoga_studio', category: 'Wellness', name: 'Yoga studio', displayName: 'Yoga Studio', Rp: 20, Ra: 0.06, defaultOccupancy: 15, airClass: 1 },
  { id: 'pilates_studio', category: 'Wellness', name: 'Pilates studio', displayName: 'Pilates Studio', Rp: 15, Ra: 0.06, defaultOccupancy: 10, airClass: 1 },
  { id: 'sauna', category: 'Wellness', name: 'Sauna', displayName: 'Sauna', Rp: 10, Ra: 0.06, defaultOccupancy: 15, airClass: 2, notes: 'Exhaust ventilation per ACH' },
  { id: 'steam_room', category: 'Wellness', name: 'Steam room', displayName: 'Steam Room', Rp: 10, Ra: 0.06, defaultOccupancy: 15, airClass: 2, notes: 'Exhaust ventilation per ACH' },
  { id: 'hot_tub_area', category: 'Wellness', name: 'Hot tub area', displayName: 'Hot Tub Area', Rp: 0, Ra: 0.48, defaultOccupancy: 0, airClass: 2 },

  // ============================================
  // HEALTHCARE (Basic - not ASHRAE 170)
  // ============================================
  { id: 'exam_room', category: 'Healthcare', name: 'Exam/treatment room', displayName: 'Exam Room', Rp: 5, Ra: 0.06, defaultOccupancy: 20, airClass: 1 },
  { id: 'patient_room', category: 'Healthcare', name: 'Patient rooms', displayName: 'Patient Room', Rp: 5, Ra: 0.06, defaultOccupancy: 10, airClass: 1 },
  { id: 'physical_therapy', category: 'Healthcare', name: 'Physical therapy', displayName: 'Physical Therapy', Rp: 6, Ra: 0.18, defaultOccupancy: 7, airClass: 1 },
  { id: 'waiting_outpatient', category: 'Healthcare', name: 'Waiting rooms', displayName: 'Waiting Room', Rp: 7.5, Ra: 0.06, defaultOccupancy: 30, airClass: 1 },

  // ============================================
  // RESIDENTIAL
  // ============================================
  { id: 'residential_common', category: 'Residential', name: 'Common corridors', displayName: 'Residential Corridor', Rp: 0, Ra: 0.06, defaultOccupancy: 0, airClass: 1 },
  { id: 'residential_dwelling', category: 'Residential', name: 'Dwelling unit', displayName: 'Dwelling Unit', Rp: 5, Ra: 0.06, defaultOccupancy: 0, airClass: 1, notes: 'Per dwelling unit requirements apply' },
]

// ============================================
// Zone Air Distribution Effectiveness (Ez)
// ASHRAE 62.1 Table 6-2
// ============================================

export interface EzConfiguration {
  id: string
  description: string
  ez: number
  notes?: string
}

export const ZONE_EZ_VALUES: EzConfiguration[] = [
  { id: 'ceiling_supply_ceiling_return', description: 'Ceiling supply, ceiling return', ez: 1.0 },
  { id: 'ceiling_supply_wall_return', description: 'Ceiling supply, wall return', ez: 1.0 },
  { id: 'ceiling_supply_floor_return', description: 'Ceiling supply, floor return', ez: 1.0 },
  { id: 'floor_supply_ceiling_return_cool', description: 'Floor supply, ceiling return (cooling)', ez: 1.0 },
  { id: 'floor_supply_ceiling_return_heat', description: 'Floor supply, ceiling return (heating)', ez: 1.0 },
  { id: 'floor_supply_floor_return_cool', description: 'Floor supply, floor return (cooling)', ez: 1.0 },
  { id: 'floor_supply_floor_return_heat', description: 'Floor supply, floor return (heating)', ez: 0.8 },
  { id: 'displacement_cool', description: 'Displacement ventilation (cooling only)', ez: 1.2 },
  { id: 'displacement_heat', description: 'Displacement ventilation (heating)', ez: 0.8 },
  { id: 'ufad', description: 'Underfloor air distribution', ez: 1.2, notes: 'Stratified mode' },
  { id: 'personal_ventilation', description: 'Personal ventilation system', ez: 1.0, notes: 'Per ASHRAE guidelines' },
]

// ============================================
// Exhaust Rates (Table 6-4)
// ============================================

export interface ExhaustRequirement {
  id: string
  spaceType: string
  exhaustRate: number
  unit: 'cfm_sf' | 'cfm_unit' | 'ach'
  perUnitType?: string  // e.g., 'toilet', 'urinal', 'shower'
  notes?: string
}

export const EXHAUST_REQUIREMENTS: ExhaustRequirement[] = [
  // Per area
  { id: 'art_classroom', spaceType: 'Art classroom', exhaustRate: 0.70, unit: 'cfm_sf' },
  { id: 'auto_repair', spaceType: 'Auto repair rooms', exhaustRate: 1.50, unit: 'cfm_sf' },
  { id: 'barber', spaceType: 'Barber shop', exhaustRate: 0.50, unit: 'cfm_sf' },
  { id: 'beauty_salon', spaceType: 'Beauty salon', exhaustRate: 0.60, unit: 'cfm_sf' },
  { id: 'copy_print', spaceType: 'Copy, printing rooms', exhaustRate: 0.50, unit: 'cfm_sf' },
  { id: 'darkroom', spaceType: 'Darkrooms', exhaustRate: 1.00, unit: 'cfm_sf' },
  { id: 'kitchen_commercial', spaceType: 'Commercial kitchen', exhaustRate: 0.70, unit: 'cfm_sf' },
  { id: 'kitchen_residential', spaceType: 'Residential kitchen', exhaustRate: 0.30, unit: 'cfm_sf' },
  { id: 'janitor_closet', spaceType: 'Janitor closet', exhaustRate: 1.00, unit: 'cfm_sf' },
  { id: 'locker_room', spaceType: 'Locker/dressing rooms', exhaustRate: 0.50, unit: 'cfm_sf' },
  { id: 'nail_salon', spaceType: 'Nail salon', exhaustRate: 1.40, unit: 'cfm_sf' },
  { id: 'paint_shop', spaceType: 'Paint spray booth', exhaustRate: 3.00, unit: 'cfm_sf' },
  { id: 'parking_garage', spaceType: 'Parking garage', exhaustRate: 0.75, unit: 'cfm_sf' },
  { id: 'pet_shop', spaceType: 'Pet shops (animal areas)', exhaustRate: 0.90, unit: 'cfm_sf' },
  { id: 'photo_studio', spaceType: 'Photo studios', exhaustRate: 0.50, unit: 'cfm_sf' },
  { id: 'refrigerator_machinery', spaceType: 'Refrigeration machinery rooms', exhaustRate: 1.00, unit: 'cfm_sf' },
  { id: 'science_lab', spaceType: 'Science laboratories', exhaustRate: 1.00, unit: 'cfm_sf' },
  { id: 'soiled_laundry', spaceType: 'Soiled laundry', exhaustRate: 1.00, unit: 'cfm_sf' },
  { id: 'storage_hazardous', spaceType: 'Hazardous storage', exhaustRate: 1.50, unit: 'cfm_sf' },
  { id: 'wood_metal_shop', spaceType: 'Wood/metal shop', exhaustRate: 0.50, unit: 'cfm_sf' },
  
  // Per unit/fixture
  { id: 'toilet_public', spaceType: 'Toilet room (public)', exhaustRate: 70, unit: 'cfm_unit', perUnitType: 'toilet/urinal', notes: '70 CFM per toilet or urinal' },
  { id: 'toilet_private', spaceType: 'Toilet room (private)', exhaustRate: 25, unit: 'cfm_unit', perUnitType: 'toilet', notes: '25 CFM per toilet (min 50 per room)' },
  { id: 'bathroom_private', spaceType: 'Bathroom (private)', exhaustRate: 50, unit: 'cfm_unit', perUnitType: 'room', notes: '50 CFM per room' },
  { id: 'shower_public', spaceType: 'Shower room', exhaustRate: 20, unit: 'cfm_unit', perUnitType: 'shower head' },
  { id: 'shower_public_alt', spaceType: 'Shower room (alternate)', exhaustRate: 0.50, unit: 'cfm_sf', notes: 'Or 0.50 CFM/sf' },
  
  // Per ACH
  { id: 'boiler_room', spaceType: 'Boiler room', exhaustRate: 0.50, unit: 'cfm_sf', notes: 'Or mechanical code requirements' },
  { id: 'electrical_room', spaceType: 'Electrical room', exhaustRate: 0.50, unit: 'cfm_sf', notes: 'Or heat load based' },
  { id: 'elevator_machine', spaceType: 'Elevator machine room', exhaustRate: 0.50, unit: 'cfm_sf' },
]

// ============================================
// ASHRAE 170 Healthcare Space Requirements
// (ACH-based ventilation)
// ============================================

export interface ASHRAE170Space {
  id: string
  spaceType: string
  minTotalACH: number
  minOAach: number
  pressureRelationship: 'positive' | 'negative' | 'equal'
  allAirExhaust: boolean
  recirculated: boolean
  notes?: string
}

export const ASHRAE170_SPACES: ASHRAE170Space[] = [
  { id: 'or_class_b', spaceType: 'Operating Room (Class B)', minTotalACH: 20, minOAach: 4, pressureRelationship: 'positive', allAirExhaust: false, recirculated: true },
  { id: 'or_class_c', spaceType: 'Operating Room (Class C)', minTotalACH: 20, minOAach: 4, pressureRelationship: 'positive', allAirExhaust: false, recirculated: true },
  { id: 'procedure_room', spaceType: 'Procedure Room', minTotalACH: 15, minOAach: 3, pressureRelationship: 'positive', allAirExhaust: false, recirculated: true },
  { id: 'recovery_room', spaceType: 'Recovery Room', minTotalACH: 6, minOAach: 2, pressureRelationship: 'equal', allAirExhaust: false, recirculated: true },
  { id: 'isolation_aii', spaceType: 'AII (Airborne Infection Isolation)', minTotalACH: 12, minOAach: 2, pressureRelationship: 'negative', allAirExhaust: true, recirculated: false },
  { id: 'isolation_pe', spaceType: 'PE (Protective Environment)', minTotalACH: 12, minOAach: 2, pressureRelationship: 'positive', allAirExhaust: false, recirculated: true },
  { id: 'patient_room', spaceType: 'Patient Room', minTotalACH: 6, minOAach: 2, pressureRelationship: 'equal', allAirExhaust: false, recirculated: true },
  { id: 'icu', spaceType: 'ICU', minTotalACH: 6, minOAach: 2, pressureRelationship: 'equal', allAirExhaust: false, recirculated: true },
  { id: 'newborn_nursery', spaceType: 'Newborn Nursery', minTotalACH: 6, minOAach: 2, pressureRelationship: 'equal', allAirExhaust: false, recirculated: true },
  { id: 'emergency_waiting', spaceType: 'Emergency Waiting', minTotalACH: 12, minOAach: 2, pressureRelationship: 'negative', allAirExhaust: false, recirculated: true },
  { id: 'radiology', spaceType: 'Radiology', minTotalACH: 6, minOAach: 2, pressureRelationship: 'equal', allAirExhaust: false, recirculated: true },
  { id: 'pharmacy', spaceType: 'Pharmacy', minTotalACH: 4, minOAach: 2, pressureRelationship: 'positive', allAirExhaust: false, recirculated: true },
  { id: 'soiled_workroom', spaceType: 'Soiled Workroom', minTotalACH: 10, minOAach: 2, pressureRelationship: 'negative', allAirExhaust: true, recirculated: false },
  { id: 'clean_workroom', spaceType: 'Clean Workroom', minTotalACH: 4, minOAach: 2, pressureRelationship: 'positive', allAirExhaust: false, recirculated: true },
  { id: 'autopsy', spaceType: 'Autopsy', minTotalACH: 12, minOAach: 2, pressureRelationship: 'negative', allAirExhaust: true, recirculated: false },
]

// ============================================
// Helper Functions
// ============================================

/**
 * Get space type by ID
 */
export function getSpaceType(id: string): ASHRAE62SpaceType | undefined {
  return ASHRAE62_SPACE_TYPES.find(st => st.id === id)
}

/**
 * Get space types by category
 */
export function getSpaceTypesByCategory(category: string): ASHRAE62SpaceType[] {
  return ASHRAE62_SPACE_TYPES.filter(st => st.category === category)
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  const categories = new Set(ASHRAE62_SPACE_TYPES.map(st => st.category))
  return Array.from(categories).sort()
}

/**
 * Get Ez value by configuration ID
 */
export function getEzValue(configId: string): number {
  const config = ZONE_EZ_VALUES.find(ez => ez.id === configId)
  return config?.ez ?? 1.0
}

/**
 * Get exhaust requirement for a space type
 */
export function getExhaustRequirement(spaceTypeId: string): ExhaustRequirement | undefined {
  return EXHAUST_REQUIREMENTS.find(er => er.id === spaceTypeId)
}

/**
 * Calculate default occupancy for a space
 */
export function calculateDefaultOccupancy(spaceTypeId: string, areaSf: number): number {
  const spaceType = getSpaceType(spaceTypeId)
  if (!spaceType) return 0
  return Math.ceil((areaSf / 1000) * spaceType.defaultOccupancy)
}

/**
 * Search space types by name
 */
export function searchSpaceTypes(query: string): ASHRAE62SpaceType[] {
  const lowerQuery = query.toLowerCase()
  return ASHRAE62_SPACE_TYPES.filter(st => 
    st.name.toLowerCase().includes(lowerQuery) ||
    st.displayName.toLowerCase().includes(lowerQuery) ||
    st.category.toLowerCase().includes(lowerQuery)
  )
}

// ============================================
// ASHRAE Space Type Name Matching
// Maps common space names to ASHRAE 62.1 space type IDs
// Similar to ZONE_TYPE_MAPPING in xai.ts but for ASHRAE ventilation
// ============================================

const ASHRAE_NAME_MAPPING: Record<string, string> = {
  // Reception & Lobby
  'reception': 'reception',
  'lobby': 'lobby_public',
  'entry': 'main_entry_lobby',
  'entrance': 'main_entry_lobby',
  'waiting': 'lobby_public',
  'front desk': 'reception',
  'concierge': 'reception',
  
  // Office
  'office': 'office',
  'workspace': 'office',
  'workstation': 'office',
  'cubicle': 'office',
  'open office': 'office',
  'private office': 'office',
  'executive': 'office',
  
  // Conference
  'conference': 'conference_meeting',
  'conference room': 'conference_meeting',
  'meeting': 'conference_meeting',
  'meeting room': 'conference_meeting',
  'boardroom': 'conference_meeting',
  'huddle': 'conference_meeting',
  'training': 'classroom_9plus',
  'training room': 'classroom_9plus',
  
  // Break Room / Lounge
  'break room': 'break_room',
  'breakroom': 'break_room',
  'break': 'break_room',
  'lounge': 'break_room',
  'employee lounge': 'break_room',
  'staff lounge': 'break_room',
  'lunch room': 'break_room',
  'lunchroom': 'break_room',
  'pantry': 'break_room',
  'kitchenette': 'break_room',
  
  // Restroom / Toilet
  'restroom': 'toilet_public',
  'bathroom': 'toilet_public',
  'toilet': 'toilet_public',
  'wc': 'toilet_public',
  'lavatory': 'toilet_public',
  'mens': 'toilet_public',
  "men's": 'toilet_public',
  'womens': 'toilet_public',
  "women's": 'toilet_public',
  'unisex': 'toilet_public',
  'ada': 'toilet_public',
  
  // Locker Room
  'locker': 'spa_locker_room',
  'locker room': 'spa_locker_room',
  'changing': 'spa_locker_room',
  'changing room': 'spa_locker_room',
  'dressing': 'spa_locker_room',
  'dressing room': 'spa_locker_room',
  
  // Fitness
  'gym': 'health_club_weights',
  'gymnasium': 'gym_arena_play',
  'fitness': 'health_club_weights',
  'fitness center': 'health_club_weights',
  'weight room': 'health_club_weights',
  'weights': 'health_club_weights',
  'cardio': 'health_club_aerobics',
  'aerobics': 'health_club_aerobics',
  'aerobic': 'health_club_aerobics',
  'spin': 'health_club_aerobics',
  'spinning': 'health_club_aerobics',
  'cycling': 'health_club_aerobics',
  'group fitness': 'health_club_aerobics',
  'group exercise': 'health_club_aerobics',
  'class': 'health_club_aerobics',
  'studio': 'health_club_aerobics',
  
  // Yoga / Pilates
  'yoga': 'yoga_studio',
  'yoga studio': 'yoga_studio',
  'hot yoga': 'yoga_studio',
  'pilates': 'pilates_studio',
  'pilates studio': 'pilates_studio',
  'reformer': 'pilates_studio',
  'barre': 'health_club_aerobics',
  'stretch': 'spa_relaxation',
  'stretching': 'spa_relaxation',
  
  // Boxing / MMA
  'boxing': 'health_club_aerobics',
  'mma': 'health_club_aerobics',
  'martial arts': 'health_club_aerobics',
  'fight': 'health_club_aerobics',
  
  // Pool / Natatorium
  'pool': 'swimming_pool',
  'pool room': 'swimming_pool',
  'pool area': 'swimming_pool',
  'swimming': 'swimming_pool',
  'swimming pool': 'swimming_pool',
  'natatorium': 'natatorium',
  'lap pool': 'swimming_pool',
  'hot tub': 'swimming_pool',
  'jacuzzi': 'swimming_pool',
  'whirlpool': 'swimming_pool',
  'spa pool': 'swimming_pool',
  'cold plunge': 'swimming_pool',
  'plunge': 'swimming_pool',
  
  // Spa / Treatment
  'spa': 'spa_treatment',
  'treatment': 'spa_treatment',
  'treatment room': 'spa_treatment',
  'massage': 'spa_massage',
  'massage room': 'spa_massage',
  'facial': 'spa_treatment',
  'body treatment': 'spa_treatment',
  'relaxation': 'spa_relaxation',
  'quiet room': 'spa_relaxation',
  'meditation': 'spa_relaxation',
  
  // Sauna / Steam
  'sauna': 'sauna',
  'dry sauna': 'sauna',
  'finnish': 'sauna',
  'banya': 'sauna',
  'russian': 'sauna',
  'steam': 'steam_room',
  'steam room': 'steam_room',
  'hammam': 'steam_room',
  'turkish': 'steam_room',
  
  // Kitchen / Food
  'kitchen': 'kitchen_cooking',
  'commercial kitchen': 'kitchen_cooking',
  'prep kitchen': 'kitchen_cooking',
  'restaurant': 'dining_room',
  'dining': 'dining_room',
  'dining room': 'dining_room',
  'cafe': 'cafe_fast_food',
  'cafeteria': 'cafe_fast_food',
  'food court': 'cafe_fast_food',
  'juice bar': 'cafe_fast_food',
  'snack bar': 'cafe_fast_food',
  'bar': 'bar_cocktail',
  'cocktail': 'bar_cocktail',
  
  // Storage / Back of House
  'storage': 'storage_conditioned',
  'storage room': 'storage_conditioned',
  'janitor': 'storage_conditioned',
  'janitorial': 'storage_conditioned',
  'mechanical': 'electrical_room',
  'mech': 'electrical_room',
  'electrical': 'electrical_room',
  'elec': 'electrical_room',
  'utility': 'electrical_room',
  'boiler': 'electrical_room',
  'pump room': 'electrical_room',
  
  // Corridor
  'corridor': 'corridor',
  'hallway': 'corridor',
  'hall': 'corridor',
  'passage': 'corridor',
  'walkway': 'corridor',
  
  // Laundry
  'laundry': 'hotel_laundry',
  'laundry room': 'hotel_laundry',
  
  // Hotel / Lodging
  'hotel room': 'bedroom_dorm',
  'guest room': 'bedroom_dorm',
  'bedroom': 'bedroom_dorm',
  'suite': 'bedroom_dorm',
  'dormitory': 'bedroom_dorm',
  'dorm': 'bedroom_dorm',
  
  // Retail
  'retail': 'retail_sales',
  'shop': 'retail_sales',
  'store': 'retail_sales',
  'salon': 'beauty_nail_salon',
  'beauty': 'beauty_nail_salon',
  'nail': 'beauty_nail_salon',
  'barber': 'barbershop',
  
  // Education
  'classroom': 'classroom_9plus',
  'class room': 'classroom_9plus',
  'lecture': 'lecture_classroom',
  'lecture hall': 'lecture_hall',
  'library': 'library',
  'lab': 'science_lab',
  'laboratory': 'science_lab',
  
  // Assembly
  'auditorium': 'auditorium',
  'theater': 'auditorium',
  'theatre': 'auditorium',
  'church': 'place_of_worship',
  'chapel': 'place_of_worship',
  'worship': 'place_of_worship',
  'event space': 'hotel_multipurpose',
  'multipurpose': 'hotel_multipurpose',
  'ballroom': 'hotel_multipurpose',
  
  // Sports
  'basketball': 'gym_arena_play',
  'tennis': 'gym_arena_play',
  'court': 'gym_arena_play',
  'racquetball': 'gym_arena_play',
  'squash': 'gym_arena_play',
  'bowling': 'bowling_alley',
  
  // Recovery
  'recovery': 'spa_relaxation',
  'cryo': 'spa_treatment',
  'cryotherapy': 'spa_treatment',
  'iv': 'spa_treatment',
  'longevity': 'spa_treatment',
  
  // Childcare
  'daycare': 'daycare_5plus',
  'childcare': 'daycare_5plus',
  'kids': 'daycare_5plus',
  'children': 'daycare_5plus',
  'nursery': 'daycare_under2',
}

/**
 * Match a space name to the best ASHRAE 62.1 space type
 * Uses keyword matching similar to Concept MEP zone type matching
 * 
 * @param spaceName - The name of the space to match
 * @returns The ASHRAE space type ID, or 'office' as default
 */
export function matchSpaceNameToASHRAE(spaceName: string): string {
  const lowerName = spaceName.toLowerCase().trim()
  
  // Direct match
  if (ASHRAE_NAME_MAPPING[lowerName]) {
    return ASHRAE_NAME_MAPPING[lowerName]
  }
  
  // Partial match - check if any mapping key is contained in the name
  for (const [keyword, spaceTypeId] of Object.entries(ASHRAE_NAME_MAPPING)) {
    if (lowerName.includes(keyword)) {
      return spaceTypeId
    }
  }
  
  // Check against ASHRAE space type names and displayNames
  for (const spaceType of ASHRAE62_SPACE_TYPES) {
    if (
      lowerName.includes(spaceType.name.toLowerCase()) ||
      lowerName.includes(spaceType.displayName.toLowerCase())
    ) {
      return spaceType.id
    }
  }
  
  // Default to office
  return 'office'
}

/**
 * Match a Concept MEP zone type to an ASHRAE 62.1 space type
 * 
 * @param zoneType - The Concept MEP zone type (e.g., 'locker_room', 'pool_indoor')
 * @returns The ASHRAE space type ID
 */
export function matchZoneTypeToASHRAE(zoneType: string): string {
  const mapping: Record<string, string> = {
    'office': 'office',
    'conference_room': 'conference_meeting',
    'reception': 'reception',
    'lobby': 'lobby_public',
    'break_room': 'break_room',
    'restroom': 'toilet_public',
    'locker_room': 'spa_locker_room',
    'open_gym': 'health_club_weights',
    'group_fitness': 'health_club_aerobics',
    'yoga_studio': 'yoga_studio',
    'pilates_studio': 'pilates_studio',
    'mma_studio': 'health_club_aerobics',
    'stretching_area': 'spa_relaxation',
    'pool_indoor': 'swimming_pool',
    'pool_outdoor': 'swimming_pool',
    'hot_tub': 'swimming_pool',
    'cold_plunge': 'swimming_pool',
    'sauna_electric': 'sauna',
    'sauna_gas': 'sauna',
    'banya_gas': 'sauna',
    'steam_room': 'steam_room',
    'snow_room': 'spa_treatment',
    'contrast_suite': 'spa_treatment',
    'massage_room': 'spa_massage',
    'treatment_room': 'spa_treatment',
    'couples_treatment': 'spa_treatment',
    'private_suite': 'spa_treatment',
    'recovery_longevity': 'spa_treatment',
    'kitchen_commercial': 'kitchen_cooking',
    'kitchen_light_fb': 'break_room',
    'cafe_light_fb': 'cafe_fast_food',
    'laundry_commercial': 'hotel_laundry',
    'cowork': 'office',
    'event_space': 'hotel_multipurpose',
    'screening_room': 'auditorium',
    'child_care': 'daycare_5plus',
    'basketball_court': 'gym_arena_play',
    'padel_court': 'gym_arena_play',
    'terrace': 'corridor',
    'corridor': 'corridor',
    'storage': 'storage_conditioned',
    'mechanical': 'electrical_room',
    'elevator': 'corridor',
    'custom': 'office',
  }
  
  return mapping[zoneType] || 'office'
}
