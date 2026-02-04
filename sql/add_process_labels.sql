-- =========================================== 
-- ADD LABEL AND DESCRIPTION TO PSYCHROMETRIC PROCESSES
-- Run this to add new columns for export labels
-- =========================================== 

-- Add label column for short identifiers (e.g., "Preheat Coil")
ALTER TABLE psychrometric_processes 
ADD COLUMN IF NOT EXISTS label TEXT;

-- Add description column for longer notes (e.g., "Steam preheat for outside air")
ALTER TABLE psychrometric_processes 
ADD COLUMN IF NOT EXISTS description TEXT;

SELECT 'Columns added successfully!' as result;
