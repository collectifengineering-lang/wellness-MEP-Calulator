-- =========================================== 
-- ADD MISSING VENTILATION COLUMNS TO ZONES TABLE
-- Run this in Supabase SQL Editor
-- =========================================== 

-- Add the missing ventilation tracking columns
ALTER TABLE zones ADD COLUMN IF NOT EXISTS ventilation_cfm NUMERIC;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS exhaust_cfm NUMERIC;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS ventilation_space_type TEXT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS ventilation_standard TEXT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS occupants INTEGER;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS ceiling_height_ft NUMERIC;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS ventilation_unit TEXT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS exhaust_unit TEXT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS ventilation_override BOOLEAN;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS exhaust_override BOOLEAN;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'zones' 
AND column_name IN ('ventilation_cfm', 'exhaust_cfm', 'ventilation_space_type', 'ventilation_override')
ORDER BY column_name;
