-- ============================================
-- FULL SEED DATA FOR ASHRAE SPACE TYPES AND ZONE TYPE DEFAULTS
-- Run this in Supabase SQL Editor after creating the tables
-- ============================================

-- First, clear existing data (optional - comment out if you want to preserve existing)
-- DELETE FROM zone_type_defaults;
-- DELETE FROM ashrae_space_types;

-- ============================================
-- ASHRAE 62.1 SPACE TYPES (Ventilation + Exhaust)
-- ============================================

INSERT INTO ashrae_space_types (id, category, name, display_name, standard, rp, ra, default_occupancy, air_class, exhaust_cfm_sf, exhaust_cfm_unit, exhaust_unit_type, exhaust_cfm_min, exhaust_cfm_max, exhaust_min_per_room, exhaust_notes, notes)
VALUES
  -- CORRECTIONAL FACILITIES
  ('booking_waiting', 'Correctional', 'Booking/waiting', 'Booking/Waiting', 'ashrae62', 7.5, 0.06, 50, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('cell', 'Correctional', 'Cell', 'Cell', 'ashrae62', 5, 0.12, 25, 1, 1.00, NULL, NULL, NULL, NULL, NULL, 'Cells with toilet', NULL),
  ('dayroom', 'Correctional', 'Dayroom', 'Dayroom', 'ashrae62', 5, 0.06, 30, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('guard_station', 'Correctional', 'Guard stations', 'Guard Station', 'ashrae62', 5, 0.06, 15, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  -- EDUCATIONAL FACILITIES
  ('daycare_under2', 'Educational', 'Daycare (through age 4)', 'Daycare (Under 2)', 'ashrae62', 10, 0.18, 25, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('daycare_2_4', 'Educational', 'Daycare (through age 4)', 'Daycare (Ages 2-4)', 'ashrae62', 10, 0.18, 25, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('daycare_5plus', 'Educational', 'Daycare sickroom', 'Daycare (5+)', 'ashrae62', 10, 0.18, 25, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('classroom_k12', 'Educational', 'Classrooms (ages 5-8)', 'Classroom K-12', 'ashrae62', 10, 0.12, 25, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('classroom_9plus', 'Educational', 'Classrooms (age 9 plus)', 'Classroom (9+)', 'ashrae62', 10, 0.12, 35, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('lecture_classroom', 'Educational', 'Lecture classroom', 'Lecture Classroom', 'ashrae62', 7.5, 0.06, 65, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('lecture_hall', 'Educational', 'Lecture hall (fixed seats)', 'Lecture Hall', 'ashrae62', 7.5, 0.06, 150, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('art_classroom', 'Educational', 'Art classroom', 'Art Classroom', 'ashrae62', 10, 0.18, 20, 2, 0.70, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),
  ('media_center', 'Educational', 'Media center', 'Media Center', 'ashrae62', 10, 0.12, 25, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('music_theater', 'Educational', 'Music/theater/dance', 'Music/Theater/Dance', 'ashrae62', 10, 0.06, 35, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('science_lab', 'Educational', 'Science laboratories', 'Science Lab', 'ashrae62', 10, 0.18, 25, 2, 1.00, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),
  ('university_lab', 'Educational', 'University/college laboratories', 'University Lab', 'ashrae62', 10, 0.18, 25, 2, 1.00, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),
  ('wood_metal_shop', 'Educational', 'Wood/metal shop', 'Wood/Metal Shop', 'ashrae62', 10, 0.18, 20, 2, 0.50, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),

  -- FOOD AND BEVERAGE SERVICE
  ('bar_cocktail', 'Food & Beverage', 'Bars, cocktail lounges', 'Bar/Cocktail Lounge', 'ashrae62', 7.5, 0.18, 100, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('cafe_fast_food', 'Food & Beverage', 'Cafeteria/fast-food dining', 'Cafeteria/Fast Food', 'ashrae62', 7.5, 0.18, 100, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('dining_room', 'Food & Beverage', 'Restaurant dining rooms', 'Restaurant Dining', 'ashrae62', 7.5, 0.18, 70, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('kitchen_cooking', 'Food & Beverage', 'Kitchen (cooking)', 'Commercial Kitchen', 'ashrae62', 7.5, 0.12, 20, 2, 0.70, NULL, NULL, NULL, NULL, NULL, 'Table 6-2; Type I/II hood per IMC', NULL),
  ('kitchenette', 'Food & Beverage', 'Kitchenette', 'Kitchenette', 'ashrae62', 5, 0.06, 20, 1, 0.30, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),

  -- GENERAL (Common Spaces)
  ('break_room', 'General', 'Break rooms', 'Break Room', 'ashrae62', 5, 0.06, 25, 1, 0.10, NULL, NULL, NULL, NULL, NULL, 'Light exhaust for odor control', NULL),
  ('coffee_station', 'General', 'Coffee stations', 'Coffee Station', 'ashrae62', 5, 0.06, 20, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('conference_meeting', 'General', 'Conference/meeting', 'Conference Room', 'ashrae62', 5, 0.06, 50, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('corridor', 'General', 'Corridors', 'Corridor', 'ashrae62', 0, 0.06, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('occupiable_storage', 'General', 'Occupiable storage rooms', 'Occupiable Storage', 'ashrae62', 0, 0.12, 2, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('janitor_closet', 'General', 'Janitor closet/trash/recycling', 'Janitor Closet', 'ashrae62', 0, 0.06, 0, 2, 1.00, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),
  ('copy_print', 'General', 'Copy/printing rooms', 'Copy/Print Room', 'ashrae62', 5, 0.06, 4, 2, 0.50, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),
  ('darkroom', 'General', 'Darkrooms', 'Darkroom', 'ashrae62', 5, 0.06, 2, 2, 1.00, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),

  -- RESTROOMS & HYGIENE (Table 6-2 Exhaust)
  ('toilet_public', 'Restrooms', 'Toilets—public', 'Toilet Room (Public)', 'ashrae62', 0, 0.06, 0, 2, NULL, 50, 'toilet', 50, 70, NULL, '50-70 CFM per WC/urinal (Note D,H)', NULL),
  ('toilet_private', 'Restrooms', 'Toilets—private', 'Toilet Room (Private)', 'ashrae62', 0, 0.06, 0, 2, NULL, 25, 'toilet', 25, 50, 50, '25-50 CFM per WC/urinal, min 50 CFM/room (Note D,E,H)', NULL),
  ('shower_room', 'Restrooms', 'Shower rooms', 'Shower Room', 'ashrae62', 0, 0.06, 0, 2, NULL, 20, 'shower', 20, 50, NULL, '20-50 CFM per showerhead (Note G,I)', NULL),
  ('locker_dressing', 'Restrooms', 'Locker/dressing rooms', 'Locker Room', 'ashrae62', 5, 0.06, 25, 2, 0.25, NULL, NULL, NULL, NULL, NULL, 'Table 6-2: 0.25 CFM/SF + shower exhaust', NULL),

  -- HOTELS/MOTELS/RESORTS/DORMS
  ('bedroom_dorm', 'Lodging', 'Bedroom/living room', 'Bedroom/Living (Lodging)', 'ashrae62', 5, 0.06, 10, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('hotel_barracks', 'Lodging', 'Barracks sleeping areas', 'Barracks', 'ashrae62', 5, 0.06, 20, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('hotel_common', 'Lodging', 'Common corridors', 'Hotel Corridor', 'ashrae62', 0, 0.06, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('hotel_laundry', 'Lodging', 'Laundry rooms, central', 'Laundry (Central)', 'ashrae62', 5, 0.12, 10, 2, 1.00, NULL, NULL, NULL, NULL, NULL, 'Soiled laundry storage, Table 6-2', NULL),
  ('hotel_lobby', 'Lodging', 'Lobbies/prefunction', 'Hotel Lobby', 'ashrae62', 7.5, 0.06, 30, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('hotel_multipurpose', 'Lodging', 'Multipurpose assembly', 'Multipurpose Assembly', 'ashrae62', 5, 0.06, 120, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  -- OFFICE BUILDINGS
  ('office', 'Office', 'Office space', 'Office', 'ashrae62', 5, 0.06, 5, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('reception', 'Office', 'Reception areas', 'Reception', 'ashrae62', 5, 0.06, 30, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('telephone_data', 'Office', 'Telephone/data entry', 'Telephone/Data Entry', 'ashrae62', 5, 0.06, 60, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('main_entry_lobby', 'Office', 'Main entry lobbies', 'Main Entry Lobby', 'ashrae62', 5, 0.06, 10, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  -- PUBLIC ASSEMBLY
  ('auditorium', 'Public Assembly', 'Auditorium seating area', 'Auditorium', 'ashrae62', 5, 0.06, 150, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('place_of_worship', 'Public Assembly', 'Places of religious worship', 'Place of Worship', 'ashrae62', 5, 0.06, 120, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('courtroom', 'Public Assembly', 'Courtrooms', 'Courtroom', 'ashrae62', 5, 0.06, 70, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('legislative', 'Public Assembly', 'Legislative chambers', 'Legislative Chamber', 'ashrae62', 5, 0.06, 50, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('library', 'Public Assembly', 'Libraries', 'Library', 'ashrae62', 5, 0.12, 10, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('lobby_public', 'Public Assembly', 'Lobbies', 'Public Lobby', 'ashrae62', 5, 0.06, 150, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('museum_gallery', 'Public Assembly', 'Museums/galleries', 'Museum/Gallery', 'ashrae62', 7.5, 0.06, 40, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  -- RETAIL
  ('retail_sales', 'Retail', 'Sales area (except below)', 'Retail Sales', 'ashrae62', 7.5, 0.12, 15, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('mall_common', 'Retail', 'Mall common areas', 'Mall Common Area', 'ashrae62', 7.5, 0.06, 40, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('barbershop', 'Retail', 'Barbershop', 'Barbershop', 'ashrae62', 7.5, 0.06, 25, 2, 0.50, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),
  ('beauty_nail_salon', 'Retail', 'Beauty and nail salons', 'Beauty/Nail Salon', 'ashrae62', 20, 0.12, 25, 2, 0.60, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),
  ('nail_salon', 'Retail', 'Nail salon (high exhaust)', 'Nail Salon (High Vent)', 'ashrae62', 20, 0.12, 25, 2, 1.40, NULL, NULL, NULL, NULL, NULL, 'Higher rate for chemical exposure', NULL),
  ('pet_shop', 'Retail', 'Pet shops', 'Pet Shop', 'ashrae62', 7.5, 0.18, 10, 2, 0.90, NULL, NULL, NULL, NULL, NULL, 'Table 6-2 animal areas', NULL),
  ('supermarket', 'Retail', 'Supermarket', 'Supermarket', 'ashrae62', 7.5, 0.06, 8, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  -- SPORTS AND ENTERTAINMENT
  ('disco_dance', 'Sports & Entertainment', 'Disco/dance floors', 'Disco/Dance Floor', 'ashrae62', 20, 0.06, 100, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('health_club_aerobics', 'Sports & Entertainment', 'Health club/aerobics room', 'Aerobics Room', 'ashrae62', 20, 0.06, 40, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('health_club_weights', 'Sports & Entertainment', 'Health club/weight room', 'Weight Room', 'ashrae62', 20, 0.06, 10, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('bowling_alley', 'Sports & Entertainment', 'Bowling alley (seating)', 'Bowling (Seating)', 'ashrae62', 10, 0.12, 40, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('casino_gaming', 'Sports & Entertainment', 'Casino gaming areas', 'Casino Gaming', 'ashrae62', 7.5, 0.18, 120, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('game_arcade', 'Sports & Entertainment', 'Game arcades', 'Game Arcade', 'ashrae62', 7.5, 0.18, 20, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('gym_arena_play', 'Sports & Entertainment', 'Gym, stadium, arena (play area)', 'Gym/Arena (Play)', 'ashrae62', 0, 0.30, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('gym_arena_spectator', 'Sports & Entertainment', 'Gym, stadium, arena (spectator)', 'Gym/Arena (Spectator)', 'ashrae62', 7.5, 0.06, 150, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('spectator_seating', 'Sports & Entertainment', 'Spectator areas', 'Spectator Seating', 'ashrae62', 7.5, 0.06, 150, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('swimming_pool', 'Sports & Entertainment', 'Swimming (pool and deck)', 'Swimming Pool Area', 'ashrae62', 0, 0.48, 0, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Higher Ra for humidity control', NULL),
  ('natatorium', 'Sports & Entertainment', 'Natatorium', 'Natatorium', 'ashrae62', 0, 0.48, 0, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  -- TRANSPORTATION
  ('airport_baggage', 'Transportation', 'Baggage/claim', 'Baggage Claim', 'ashrae62', 7.5, 0.06, 100, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('airport_terminal', 'Transportation', 'Airport terminal/concourse', 'Airport Terminal', 'ashrae62', 7.5, 0.06, 100, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('bus_station', 'Transportation', 'Transportation waiting', 'Bus/Train Station', 'ashrae62', 7.5, 0.06, 100, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('ticket_booth', 'Transportation', 'Ticket booths', 'Ticket Booth', 'ashrae62', 5, 0.06, 60, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  -- WAREHOUSES & STORAGE
  ('shipping_receiving', 'Warehouse', 'Shipping/receiving', 'Shipping/Receiving', 'ashrae62', 0, 0.12, 0, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('storage_conditioned', 'Warehouse', 'Storage rooms', 'Storage (Conditioned)', 'ashrae62', 0, 0.12, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('storage_chemical', 'Warehouse', 'Storage rooms, chemical', 'Chemical Storage', 'ashrae62', 0, 0.12, 0, 3, 1.50, NULL, NULL, NULL, NULL, NULL, 'Table 6-2, Air Class 4', NULL),

  -- AUTOMOTIVE & INDUSTRIAL
  ('auto_repair', 'Industrial', 'Auto repair rooms', 'Auto Repair', 'ashrae62', 7.5, 0.12, 7, 2, 1.50, NULL, NULL, NULL, NULL, NULL, 'Table 6-2', NULL),
  ('parking_garage', 'Industrial', 'Parking garages', 'Parking Garage', 'ashrae62', 0, 0.06, 0, 2, 0.75, NULL, NULL, NULL, NULL, NULL, 'Table 6-2 (Note C)', NULL),
  ('paint_spray', 'Industrial', 'Paint spray booths', 'Paint Spray Booth', 'ashrae62', 10, 0.18, 2, 3, 3.00, NULL, NULL, NULL, NULL, NULL, 'Table 6-2 (Note F)', NULL),
  ('refrigeration_machine', 'Industrial', 'Refrigerating machinery rooms', 'Refrigeration Machine Room', 'ashrae62', 0, 0.12, 0, 2, 1.00, NULL, NULL, NULL, NULL, NULL, 'Table 6-2 (Note F)', NULL),
  ('boiler_room', 'Industrial', 'Boiler room', 'Boiler Room', 'ashrae62', 0, 0.12, 0, 2, 0.50, NULL, NULL, NULL, NULL, NULL, 'Or per mechanical code', NULL),
  ('electrical_room', 'Industrial', 'Electrical equipment rooms', 'Electrical Room', 'ashrae62', 0, 0.12, 0, 1, 0.50, NULL, NULL, NULL, NULL, NULL, 'Or heat load based', NULL),

  -- WELLNESS / SPA
  ('spa_locker_room', 'Wellness', 'Locker/dressing rooms', 'Spa Locker Room', 'ashrae62', 5, 0.06, 25, 2, 0.25, 20, 'shower', NULL, NULL, NULL, '0.25 CFM/SF + 20 CFM/shower', NULL),
  ('spa_treatment', 'Wellness', 'Treatment rooms', 'Spa Treatment Room', 'ashrae62', 5, 0.06, 13, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('spa_massage', 'Wellness', 'Massage rooms', 'Massage Room', 'ashrae62', 5, 0.06, 17, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('spa_relaxation', 'Wellness', 'Relaxation rooms', 'Relaxation Room', 'ashrae62', 5, 0.06, 10, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('yoga_studio', 'Wellness', 'Yoga studio', 'Yoga Studio', 'ashrae62', 20, 0.06, 15, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('pilates_studio', 'Wellness', 'Pilates studio', 'Pilates Studio', 'ashrae62', 15, 0.06, 10, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('sauna', 'Wellness', 'Sauna', 'Sauna', 'ashrae62', 10, 0.06, 15, 2, 1.00, NULL, NULL, NULL, NULL, NULL, '6+ ACH recommended, ~1 CFM/SF', NULL),
  ('steam_room', 'Wellness', 'Steam room', 'Steam Room', 'ashrae62', 10, 0.06, 15, 2, 1.00, NULL, NULL, NULL, NULL, NULL, '6+ ACH recommended, ~1 CFM/SF', NULL),
  ('hot_tub_area', 'Wellness', 'Hot tub area', 'Hot Tub Area', 'ashrae62', 0, 0.48, 0, 2, 0.50, NULL, NULL, NULL, NULL, NULL, 'Humidity control', NULL),

  -- HEALTHCARE (Basic - not ASHRAE 170)
  ('exam_room', 'Healthcare', 'Exam/treatment room', 'Exam Room', 'ashrae62', 5, 0.06, 20, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('patient_room', 'Healthcare', 'Patient rooms', 'Patient Room', 'ashrae62', 5, 0.06, 10, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('physical_therapy', 'Healthcare', 'Physical therapy', 'Physical Therapy', 'ashrae62', 6, 0.18, 7, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('waiting_outpatient', 'Healthcare', 'Waiting rooms', 'Waiting Room', 'ashrae62', 7.5, 0.06, 30, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  -- RESIDENTIAL (ASHRAE 62.2)
  ('residential_common', 'Residential', 'Common corridors', 'Residential Corridor', 'ashrae62', 0, 0.06, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('residential_dwelling', 'Residential', 'Dwelling unit', 'Dwelling Unit', 'ashrae62', 5, 0.06, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Per dwelling unit requirements apply', NULL),
  ('residential_kitchen', 'Residential', 'Kitchen', 'Residential Kitchen', 'ashrae62', 5, 0.06, 10, 2, NULL, 50, 'kitchen', 50, 100, NULL, 'ASHRAE 62.2: 50-100 CFM (continuous/intermittent)', NULL),
  ('residential_bathroom', 'Residential', 'Bathroom', 'Residential Bathroom', 'ashrae62', 5, 0.06, 0, 2, NULL, 20, 'room', 20, 50, NULL, 'ASHRAE 62.2: 20-50 CFM per bathroom', NULL),
  ('residential_bedroom', 'Residential', 'Bedroom', 'Residential Bedroom', 'ashrae62', 5, 0.06, 7, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('residential_living', 'Residential', 'Living room', 'Residential Living Room', 'ashrae62', 5, 0.06, 5, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('residential_dining', 'Residential', 'Dining room', 'Residential Dining Room', 'ashrae62', 5, 0.06, 15, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('residential_family', 'Residential', 'Family room', 'Residential Family Room', 'ashrae62', 5, 0.06, 8, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('residential_office', 'Residential', 'Home office', 'Home Office', 'ashrae62', 5, 0.06, 7, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('residential_study', 'Residential', 'Study/library', 'Study/Library', 'ashrae62', 5, 0.06, 5, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('residential_media', 'Residential', 'Media room', 'Media Room', 'ashrae62', 5, 0.06, 20, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('residential_wine_cellar', 'Residential', 'Wine cellar', 'Wine Cellar', 'ashrae62', 0, 0.06, 0, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('residential_laundry', 'Residential', 'Laundry room', 'Residential Laundry', 'ashrae62', 5, 0.12, 2, 2, NULL, 25, 'room', 25, 100, NULL, 'ASHRAE 62.2: 25-100 CFM', NULL)

ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  standard = EXCLUDED.standard,
  rp = EXCLUDED.rp,
  ra = EXCLUDED.ra,
  default_occupancy = EXCLUDED.default_occupancy,
  air_class = EXCLUDED.air_class,
  exhaust_cfm_sf = EXCLUDED.exhaust_cfm_sf,
  exhaust_cfm_unit = EXCLUDED.exhaust_cfm_unit,
  exhaust_unit_type = EXCLUDED.exhaust_unit_type,
  exhaust_cfm_min = EXCLUDED.exhaust_cfm_min,
  exhaust_cfm_max = EXCLUDED.exhaust_cfm_max,
  exhaust_min_per_room = EXCLUDED.exhaust_min_per_room,
  exhaust_notes = EXCLUDED.exhaust_notes,
  notes = EXCLUDED.notes;

-- ============================================
-- ASHRAE 170 HEALTHCARE SPACE TYPES (ACH-based)
-- ============================================

INSERT INTO ashrae_space_types (id, category, name, display_name, standard, min_total_ach, min_oa_ach, pressure_relationship, all_air_exhaust, recirculated, notes)
VALUES
  ('or_class_b', 'Healthcare (170)', 'Operating Room (Class B)', 'Operating Room (Class B)', 'ashrae170', 20, 4, 'positive', false, true, NULL),
  ('or_class_c', 'Healthcare (170)', 'Operating Room (Class C)', 'Operating Room (Class C)', 'ashrae170', 20, 4, 'positive', false, true, NULL),
  ('procedure_room', 'Healthcare (170)', 'Procedure Room', 'Procedure Room', 'ashrae170', 15, 3, 'positive', false, true, NULL),
  ('recovery_room', 'Healthcare (170)', 'Recovery Room', 'Recovery Room', 'ashrae170', 6, 2, 'equal', false, true, NULL),
  ('isolation_aii', 'Healthcare (170)', 'AII (Airborne Infection Isolation)', 'AII Room', 'ashrae170', 12, 2, 'negative', true, false, NULL),
  ('isolation_pe', 'Healthcare (170)', 'PE (Protective Environment)', 'PE Room', 'ashrae170', 12, 2, 'positive', false, true, NULL),
  ('hc_patient_room', 'Healthcare (170)', 'Patient Room', 'Patient Room (HC)', 'ashrae170', 6, 2, 'equal', false, true, NULL),
  ('icu', 'Healthcare (170)', 'ICU', 'ICU', 'ashrae170', 6, 2, 'equal', false, true, NULL),
  ('newborn_nursery', 'Healthcare (170)', 'Newborn Nursery', 'Newborn Nursery', 'ashrae170', 6, 2, 'equal', false, true, NULL),
  ('emergency_waiting', 'Healthcare (170)', 'Emergency Waiting', 'Emergency Waiting', 'ashrae170', 12, 2, 'negative', false, true, NULL),
  ('radiology', 'Healthcare (170)', 'Radiology', 'Radiology', 'ashrae170', 6, 2, 'equal', false, true, NULL),
  ('pharmacy', 'Healthcare (170)', 'Pharmacy', 'Pharmacy', 'ashrae170', 4, 2, 'positive', false, true, NULL),
  ('soiled_workroom', 'Healthcare (170)', 'Soiled Workroom', 'Soiled Workroom', 'ashrae170', 10, 2, 'negative', true, false, NULL),
  ('clean_workroom', 'Healthcare (170)', 'Clean Workroom', 'Clean Workroom', 'ashrae170', 4, 2, 'positive', false, true, NULL),
  ('autopsy', 'Healthcare (170)', 'Autopsy', 'Autopsy', 'ashrae170', 12, 2, 'negative', true, false, NULL)

ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  standard = EXCLUDED.standard,
  min_total_ach = EXCLUDED.min_total_ach,
  min_oa_ach = EXCLUDED.min_oa_ach,
  pressure_relationship = EXCLUDED.pressure_relationship,
  all_air_exhaust = EXCLUDED.all_air_exhaust,
  recirculated = EXCLUDED.recirculated,
  notes = EXCLUDED.notes;


-- ============================================
-- ZONE TYPE DEFAULTS
-- ============================================

INSERT INTO zone_type_defaults (
  id, display_name, category, default_sf, default_sub_type, switchable,
  ashrae_space_type_id, 
  lighting_w_sf, receptacle_va_sf, cooling_sf_ton, heating_btuh_sf,
  fixed_kw, gas_mbh, pool_heater_gas_mbh,
  source_notes
)
VALUES
  -- Support
  ('reception', 'Reception / Lounge', 'Support', 1500, NULL, false, 'reception', 0.90, 2, 400, 25, NULL, NULL, NULL, 'NYC Mech Code/ASHRAE 62.1 public spaces; NYCECC lobby 0.90'),
  ('mechanical_room', 'Mechanical Room', 'Support', 500, NULL, false, 'electrical_room', 0.50, 3, 400, 15, NULL, NULL, NULL, 'Minimal ventilation; NYCECC mechanical 0.50'),
  ('retail', 'Retail', 'Support', 800, NULL, false, 'retail_sales', 1.10, 2, 400, 25, NULL, NULL, NULL, 'NYCECC retail 1.10-1.20; ASHRAE retail rates'),
  ('office', 'Office / Admin', 'Support', 400, NULL, false, 'office', 0.78, 4, 300, 25, NULL, NULL, NULL, 'NYCECC open office 0.78; ASHRAE office'),
  ('storage', 'Storage', 'Support', 300, NULL, false, 'storage_conditioned', 0.40, 0.5, 400, 15, NULL, NULL, NULL, 'NYCECC storage 0.40-0.60'),
  ('break_room', 'Break Room / Lounge', 'Support', 500, NULL, false, 'break_room', 0.90, 5, 350, 25, NULL, NULL, NULL, 'ASHRAE 62.1 break room; Receptacle for small appliances only'),

  -- Fitness
  ('open_gym', 'Open Gym / Fitness Floor', 'Fitness', 5000, NULL, false, 'health_club_weights', 0.72, 2, 250, 25, NULL, NULL, NULL, 'NYCECC exercise center 0.72; ASHRAE health club 20p/1000SF'),
  ('group_fitness', 'Group Fitness Studio', 'Fitness', 2000, NULL, false, 'health_club_aerobics', 0.72, 2, 200, 25, NULL, NULL, NULL, 'ASHRAE aerobics high Rp=40; high activity'),
  ('mma_studio', 'MMA / Boxing Studio', 'Fitness', 2400, NULL, false, 'health_club_aerobics', 0.72, 2, 300, 25, NULL, NULL, NULL, 'High activity; similar to gymnasium'),
  ('yoga_studio', 'Yoga Studio', 'Fitness', 800, NULL, false, 'yoga_studio', 0.65, 1.5, 200, 30, NULL, NULL, NULL, 'Lower intensity than aerobics'),
  ('pilates_studio', 'Pilates Studio', 'Fitness', 600, NULL, false, 'pilates_studio', 0.65, 2, 200, 25, NULL, NULL, NULL, 'Moderate intensity'),
  ('stretching_area', 'Stretching / Recovery Area', 'Fitness', 500, NULL, false, 'spa_relaxation', 0.65, 1.5, 400, 25, NULL, NULL, NULL, 'Lower activity'),

  -- Locker/Hygiene
  ('locker_room', 'Locker Room', 'Locker/Hygiene', 2500, NULL, false, 'spa_locker_room', 0.60, 1.5, 350, 30, NULL, NULL, NULL, 'NY Mech Code locker 0.5 cfm/SF exh; NYC Plumbing Code fixture ratios'),
  ('restroom', 'Restroom', 'Locker/Hygiene', 200, NULL, false, 'toilet_public', 0.80, 1, 400, 25, NULL, NULL, NULL, 'Public restroom rates; NYC Plumbing Code'),

  -- Thermal
  ('banya_gas', 'Banya (Gas)', 'Thermal', 500, 'gas', false, 'sauna', 0.50, 1, 0, 0, 5, 1260, NULL, 'Power Flame J30A-12; Wet thermal'),
  ('sauna_gas', 'Sauna (Gas)', 'Thermal', 200, 'gas', true, 'sauna', 0.50, 1, 0, 0, 2, 91, NULL, '6 ACH vent + 6 ACH exhaust @ 10ft ceiling'),
  ('sauna_electric', 'Sauna (Electric)', 'Thermal', 200, 'electric', true, 'sauna', 0.50, 1, 0, 0, 57, NULL, NULL, '1 kW/m³ heater sizing'),
  ('steam_room', 'Steam Room', 'Thermal', 200, 'electric', false, 'steam_room', 0.50, 1, 0, 0, 57, NULL, NULL, '1 kW/m³ steam gen; 0.5 latent adder'),
  ('cold_plunge', 'Cold Plunge', 'Thermal', 150, 'electric', false, 'swimming_pool', 0.60, 1.5, 0, 0, 25, NULL, NULL, 'Cold plunge chiller equipment'),
  ('snow_room', 'Snow Room', 'Thermal', 100, 'electric', false, 'spa_treatment', 0.60, 1, 0, 0, 20, NULL, NULL, 'Snow machine equipment'),
  ('contrast_suite', 'Contrast Suite (Hot/Cold)', 'Thermal', 1500, 'electric', false, 'swimming_pool', 0.60, 3, 0, 0, 50, NULL, NULL, 'Combined sauna + cold plunge; Natatorium-like'),

  -- Pool/Spa
  ('pool_indoor', 'Pool (Indoor)', 'Pool/Spa', 3000, 'gas', true, 'swimming_pool', 0.90, 2, 200, 0, NULL, NULL, 600, 'Natatorium; Configure pools in zone editor'),
  ('pool_outdoor', 'Pool (Outdoor)', 'Pool/Spa', 2000, 'gas', true, 'swimming_pool', 0.50, 0, 0, 0, NULL, NULL, 600, 'Unconditioned outdoor'),
  ('hot_tub', 'Hot Tub / Spa', 'Pool/Spa', 200, 'gas', true, 'hot_tub_area', 0.80, 2, 250, 0, 5, NULL, 200, 'High exhaust for humidity'),
  ('treatment_room', 'Treatment Room', 'Pool/Spa', 150, NULL, false, 'spa_treatment', 0.80, 2, 350, 25, NULL, NULL, NULL, 'General treatment room'),
  ('massage_room', 'Massage Room', 'Pool/Spa', 120, NULL, false, 'spa_massage', 0.60, 1.5, 350, 30, NULL, NULL, NULL, 'Massage therapy room; warmer temps typical'),
  ('couples_treatment', 'Couples Treatment Room', 'Pool/Spa', 250, NULL, false, 'spa_treatment', 0.60, 2, 400, 30, NULL, NULL, NULL, 'Couples massage/treatment room'),
  ('private_suite', 'Private Suite', 'Pool/Spa', 400, NULL, false, 'spa_treatment', 0.80, 2, 350, 28, NULL, NULL, NULL, 'Private spa suite with full bath'),

  -- Kitchen/Laundry
  ('laundry_commercial', 'Laundry (Commercial)', 'Kitchen/Laundry', 600, 'gas', false, 'hotel_laundry', 0.60, 2, 200, 24, NULL, NULL, NULL, 'Commercial laundry; Equipment loads via line items'),
  ('laundry_residential', 'Laundry (Residential)', 'Kitchen/Laundry', 150, 'electric', false, 'residential_laundry', 0.60, 2, 400, 25, 8, NULL, NULL, 'Residential-scale laundry'),
  ('kitchen_commercial', 'Kitchen (Commercial)', 'Kitchen/Laundry', 700, 'gas', false, 'kitchen_cooking', 1.00, 6, 300, 0, NULL, 490, NULL, 'Type 1 hood; MAU 4000 CFM; Grease interceptor 500 gal'),
  ('kitchen_light_fb', 'Kitchen (Light F&B)', 'Kitchen/Laundry', 300, 'electric', false, 'break_room', 0.90, 5, 350, 25, 15, NULL, NULL, 'Light food service; no Type 1 hood'),

  -- Event/CoWork
  ('cowork', 'Co-Work Space', 'Event/CoWork', 4000, NULL, false, 'office', 0.78, 4, 350, 25, NULL, NULL, NULL, 'Office-like; workstations'),
  ('conference_room', 'Conference Room', 'Event/CoWork', 500, NULL, false, 'conference_meeting', 1.00, 3, 225, 25, NULL, NULL, NULL, 'Higher vent for occupant density'),
  ('event_space', 'Event Space / Studio', 'Event/CoWork', 6000, NULL, false, 'hotel_multipurpose', 1.20, 3, 250, 25, NULL, NULL, NULL, 'Assembly rates; High occupant density'),
  ('screening_room', 'Screening Room / Theater', 'Event/CoWork', 1000, NULL, false, 'auditorium', 0.80, 3, 300, 25, 5, NULL, NULL, 'Theater high density; AV equipment'),

  -- Specialty
  ('child_care', 'Child Care', 'Specialty', 1200, NULL, false, 'daycare_5plus', 1.00, 3, 300, 30, NULL, NULL, NULL, 'Daycare rates; Higher fixture count for children'),
  ('recovery_longevity', 'Recovery & Longevity', 'Specialty', 1600, NULL, false, 'spa_treatment', 0.72, 3, 350, 25, 20, NULL, NULL, 'Cryo; compression; etc. Similar to health club'),

  -- Sports
  ('basketball_court', 'Basketball Court (Half)', 'Sports', 2400, NULL, false, 'gym_arena_play', 1.00, 1.5, 350, 25, NULL, NULL, NULL, 'Gymnasium play area rates; Sports lighting'),
  ('padel_court', 'Padel Court', 'Sports', 2200, NULL, false, 'gym_arena_play', 1.00, 1.5, 350, 25, NULL, NULL, NULL, 'Sports arena; Sports lighting'),

  -- F&B
  ('cafe_light_fb', 'Café / Light F&B', 'F&B', 1200, 'electric', false, 'cafe_fast_food', 1.00, 5, 350, 25, 10, NULL, NULL, 'Dining/retail blend; Espresso, refrigeration'),

  -- Outdoor
  ('terrace', 'Terrace / Outdoor', 'Outdoor', 2500, NULL, false, 'corridor', 0.50, 1, 0, 0, NULL, NULL, NULL, 'Unconditioned outdoor'),

  -- Vertical Transportation
  ('elevator', 'Elevator', 'Vertical Transportation', 100, NULL, false, 'corridor', 0.50, 1, 0, 10, NULL, NULL, NULL, 'Hydraulic elevator: 20-30 HP (15-25 kW typical)'),

  -- Residential
  ('res_kitchen_gas', 'Kitchen (Residential Gas)', 'Residential', 200, 'gas', true, 'residential_kitchen', 1.00, 5, 400, 30, NULL, NULL, NULL, 'ASHRAE 62.2 residential kitchen; Gas cooking equipment'),
  ('res_kitchen_electric', 'Kitchen (Residential Electric)', 'Residential', 200, 'electric', true, 'residential_kitchen', 1.00, 5, 400, 30, NULL, NULL, NULL, 'ASHRAE 62.2 residential kitchen; Electric/induction equipment'),
  ('res_bathroom_master', 'Bathroom (Master)', 'Residential', 120, NULL, false, 'residential_bathroom', 1.00, 2, 400, 35, NULL, NULL, NULL, 'ASHRAE 62.2 private bathroom; Master suite with dual vanity'),
  ('res_bathroom_standard', 'Bathroom (Standard)', 'Residential', 60, NULL, false, 'residential_bathroom', 1.00, 2, 400, 35, NULL, NULL, NULL, 'ASHRAE 62.2 private bathroom; Standard tub/shower combo'),
  ('res_powder_room', 'Powder Room', 'Residential', 30, NULL, false, 'residential_bathroom', 1.20, 1, 400, 30, NULL, NULL, NULL, 'ASHRAE 62.2 private bathroom; Half bath / powder room'),
  ('res_bedroom_master', 'Bedroom (Master)', 'Residential', 300, NULL, false, 'residential_living', 0.50, 1.5, 500, 25, NULL, NULL, NULL, 'ASHRAE 62.2 dwelling unit; Master bedroom'),
  ('res_bedroom_standard', 'Bedroom (Standard)', 'Residential', 150, NULL, false, 'residential_living', 0.50, 1.5, 500, 25, NULL, NULL, NULL, 'ASHRAE 62.2 dwelling unit; Standard bedroom'),
  ('res_bedroom_guest', 'Bedroom (Guest)', 'Residential', 180, NULL, false, 'residential_living', 0.50, 1.5, 500, 25, NULL, NULL, NULL, 'ASHRAE 62.2 dwelling unit; Guest bedroom'),
  ('res_living_room', 'Living Room', 'Residential', 400, 'gas', false, 'residential_living', 0.80, 2, 450, 25, NULL, NULL, NULL, 'ASHRAE 62.2 dwelling unit; Optional gas fireplace'),
  ('res_dining_room', 'Dining Room', 'Residential', 200, NULL, false, 'residential_living', 0.90, 1.5, 450, 25, NULL, NULL, NULL, 'ASHRAE 62.2 dwelling unit; Formal dining'),
  ('res_family_room', 'Family Room', 'Residential', 350, 'gas', false, 'residential_living', 0.70, 2.5, 400, 25, NULL, NULL, NULL, 'ASHRAE 62.2 dwelling unit; Casual living space'),
  ('res_office', 'Home Office', 'Residential', 150, NULL, false, 'residential_living', 0.80, 4, 350, 25, NULL, NULL, NULL, 'ASHRAE 62.2 dwelling unit; Work from home office'),
  ('res_study', 'Study / Library', 'Residential', 200, NULL, false, 'residential_living', 0.80, 3, 400, 25, NULL, NULL, NULL, 'ASHRAE 62.2 dwelling unit; Reading/study room'),
  ('res_media_room', 'Media Room / Theater', 'Residential', 300, NULL, false, 'residential_living', 0.60, 3, 300, 20, 2, NULL, NULL, 'ASHRAE 62.2 dwelling unit; Home theater/media room'),
  ('res_wine_cellar', 'Wine Cellar', 'Residential', 100, NULL, false, 'storage_conditioned', 0.60, 1, 200, 0, NULL, NULL, NULL, 'Wine storage at 55°F, 60-70% RH; Specialized cooling required'),
  ('res_pantry', 'Pantry', 'Residential', 60, NULL, false, 'storage_conditioned', 0.60, 1, 400, 20, NULL, NULL, NULL, 'Food storage/butler pantry'),
  ('res_mudroom', 'Mudroom / Entry', 'Residential', 80, NULL, false, 'corridor', 0.70, 1, 400, 30, NULL, NULL, NULL, 'Entry/transition space; Floor drain for wet items'),
  ('res_corridor', 'Corridor / Hallway', 'Residential', 100, NULL, false, 'corridor', 0.50, 0.5, 500, 20, NULL, NULL, NULL, 'ASHRAE 62.2 corridor; Transfer air only'),
  ('res_closet_walkin', 'Walk-in Closet', 'Residential', 80, NULL, false, 'storage_conditioned', 0.80, 0.5, 500, 20, NULL, NULL, NULL, 'Walk-in closet/dressing area'),

  -- Custom
  ('custom', 'Custom Zone', 'Custom', 1000, NULL, false, 'office', 0.90, 2, 400, 25, NULL, NULL, NULL, 'User override')

ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  default_sf = EXCLUDED.default_sf,
  default_sub_type = EXCLUDED.default_sub_type,
  switchable = EXCLUDED.switchable,
  ashrae_space_type_id = EXCLUDED.ashrae_space_type_id,
  lighting_w_sf = EXCLUDED.lighting_w_sf,
  receptacle_va_sf = EXCLUDED.receptacle_va_sf,
  cooling_sf_ton = EXCLUDED.cooling_sf_ton,
  heating_btuh_sf = EXCLUDED.heating_btuh_sf,
  fixed_kw = EXCLUDED.fixed_kw,
  gas_mbh = EXCLUDED.gas_mbh,
  pool_heater_gas_mbh = EXCLUDED.pool_heater_gas_mbh,
  source_notes = EXCLUDED.source_notes;


-- ============================================
-- VERIFICATION
-- ============================================

-- Check counts
SELECT 'ASHRAE Space Types' as table_name, COUNT(*) as count FROM ashrae_space_types
UNION ALL
SELECT 'Zone Type Defaults', COUNT(*) FROM zone_type_defaults;

-- Check ASHRAE 170 healthcare types
SELECT id, display_name, min_total_ach, min_oa_ach, pressure_relationship 
FROM ashrae_space_types 
WHERE standard = 'ashrae170'
ORDER BY id;

-- Check zone type defaults with their linked ASHRAE space types
SELECT z.id, z.display_name, z.category, a.display_name as ashrae_space
FROM zone_type_defaults z
LEFT JOIN ashrae_space_types a ON z.ashrae_space_type_id = a.id
ORDER BY z.category, z.display_name;
