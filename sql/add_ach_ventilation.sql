-- =====================================================
-- ADD ACH-BASED VENTILATION TO ASHRAE SPACE TYPES
-- For wellness spaces like saunas, steam rooms, etc.
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add new columns for ACH-based ventilation
ALTER TABLE ashrae_space_types 
ADD COLUMN IF NOT EXISTS ventilation_ach NUMERIC;  -- Total ventilation in ACH

ALTER TABLE ashrae_space_types 
ADD COLUMN IF NOT EXISTS exhaust_ach NUMERIC;  -- Exhaust in ACH

ALTER TABLE ashrae_space_types 
ADD COLUMN IF NOT EXISTS ventilation_mode TEXT DEFAULT 'cfm_rates';  
-- 'cfm_rates' = use rp/ra (default ASHRAE 62.1)
-- 'ach' = use ventilation_ach/exhaust_ach
-- 'ach_healthcare' = use min_total_ach/min_oa_ach (ASHRAE 170)

-- =====================================================
-- UPDATE WELLNESS SPACES WITH ACH VALUES
-- =====================================================

-- Sauna: 6 ACH ventilation, 6 ACH exhaust (industry standard)
UPDATE ashrae_space_types
SET 
  ventilation_mode = 'ach',
  ventilation_ach = 6,
  exhaust_ach = 6,
  exhaust_notes = '6 ACH ventilation + 6 ACH exhaust (100% exhaust)'
WHERE id = 'sauna';

-- Steam Room: 6 ACH ventilation, 6 ACH exhaust
UPDATE ashrae_space_types
SET 
  ventilation_mode = 'ach',
  ventilation_ach = 6,
  exhaust_ach = 6,
  exhaust_notes = '6 ACH ventilation + 6 ACH exhaust (100% exhaust, humidity control)'
WHERE id = 'steam_room';

-- Add Banya if it doesn't exist
INSERT INTO ashrae_space_types (
  id, category, name, display_name, standard,
  ventilation_mode, ventilation_ach, exhaust_ach,
  air_class, exhaust_notes
)
VALUES (
  'banya', 'Wellness', 'Banya', 'Banya (Russian Steam)', 'custom',
  'ach', 6, 6,
  2, '6 ACH ventilation + 6 ACH exhaust (wet thermal space)'
)
ON CONFLICT (id) DO UPDATE SET
  ventilation_mode = 'ach',
  ventilation_ach = 6,
  exhaust_ach = 6,
  exhaust_notes = '6 ACH ventilation + 6 ACH exhaust (wet thermal space)';

-- Add Hammam if it doesn't exist
INSERT INTO ashrae_space_types (
  id, category, name, display_name, standard,
  ventilation_mode, ventilation_ach, exhaust_ach,
  air_class, exhaust_notes
)
VALUES (
  'hammam', 'Wellness', 'Hammam', 'Hammam (Turkish Bath)', 'custom',
  'ach', 8, 8,
  2, '8 ACH ventilation + 8 ACH exhaust (high humidity space)'
)
ON CONFLICT (id) DO UPDATE SET
  ventilation_mode = 'ach',
  ventilation_ach = 8,
  exhaust_ach = 8,
  exhaust_notes = '8 ACH ventilation + 8 ACH exhaust (high humidity space)';

-- Salt Room / Halotherapy
INSERT INTO ashrae_space_types (
  id, category, name, display_name, standard,
  ventilation_mode, ventilation_ach, exhaust_ach,
  air_class, exhaust_notes
)
VALUES (
  'salt_room', 'Wellness', 'Salt Room', 'Salt Room / Halotherapy', 'custom',
  'ach', 4, 4,
  2, '4 ACH ventilation + 4 ACH exhaust (salt particle control)'
)
ON CONFLICT (id) DO UPDATE SET
  ventilation_mode = 'ach',
  ventilation_ach = 4,
  exhaust_ach = 4,
  exhaust_notes = '4 ACH ventilation + 4 ACH exhaust (salt particle control)';

-- Infrared Sauna (lower ACH needed)
INSERT INTO ashrae_space_types (
  id, category, name, display_name, standard,
  ventilation_mode, ventilation_ach, exhaust_ach,
  air_class, exhaust_notes
)
VALUES (
  'infrared_sauna', 'Wellness', 'Infrared Sauna', 'Infrared Sauna', 'custom',
  'ach', 4, 4,
  1, '4 ACH ventilation + 4 ACH exhaust (dry heat, lower requirement)'
)
ON CONFLICT (id) DO UPDATE SET
  ventilation_mode = 'ach',
  ventilation_ach = 4,
  exhaust_ach = 4,
  exhaust_notes = '4 ACH ventilation + 4 ACH exhaust (dry heat, lower requirement)';

-- Update healthcare spaces to use ach_healthcare mode
UPDATE ashrae_space_types
SET ventilation_mode = 'ach_healthcare'
WHERE standard = 'ashrae170' AND min_total_ach IS NOT NULL;

-- =====================================================
-- VERIFY RESULTS
-- =====================================================
SELECT 
  id, 
  display_name, 
  ventilation_mode,
  ventilation_ach,
  exhaust_ach,
  rp,
  ra,
  min_total_ach,
  min_oa_ach
FROM ashrae_space_types
WHERE ventilation_mode = 'ach' OR category = 'Wellness'
ORDER BY category, display_name;

SELECT '✅ ACH ventilation columns added successfully!' as result;
