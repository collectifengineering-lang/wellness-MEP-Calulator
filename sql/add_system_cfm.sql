-- Add system_cfm column to psychrometric_systems table
-- This tracks the total airflow for the HVAC system

ALTER TABLE psychrometric_systems 
ADD COLUMN IF NOT EXISTS system_cfm INTEGER DEFAULT 10000;

-- Add OA/RA mixing columns to psychrometric_processes table
ALTER TABLE psychrometric_processes 
ADD COLUMN IF NOT EXISTS oa_point_id UUID REFERENCES psychrometric_points(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ra_point_id UUID REFERENCES psychrometric_points(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS oa_cfm INTEGER,
ADD COLUMN IF NOT EXISTS ra_cfm INTEGER;

-- Update existing systems to have default CFM
UPDATE psychrometric_systems 
SET system_cfm = 10000 
WHERE system_cfm IS NULL;
