-- ============================================
-- ASHRAE Space Types Table
-- Stores ASHRAE 62.1, ASHRAE 170, and custom space types
-- ============================================

CREATE TABLE IF NOT EXISTS ashrae_space_types (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  standard TEXT NOT NULL DEFAULT 'ashrae62', -- 'ashrae62', 'ashrae170', 'custom'
  
  -- Ventilation (ASHRAE 62.1)
  rp NUMERIC,                    -- CFM per person
  ra NUMERIC,                    -- CFM per SF
  default_occupancy INTEGER,     -- People per 1000 SF
  air_class INTEGER,             -- 1, 2, or 3
  
  -- Healthcare (ASHRAE 170)
  min_total_ach NUMERIC,
  min_oa_ach NUMERIC,
  pressure_relationship TEXT,    -- 'positive', 'negative', 'equal'
  all_air_exhaust BOOLEAN DEFAULT FALSE,
  recirculated BOOLEAN DEFAULT TRUE,
  
  -- Exhaust Requirements (ASHRAE 62.1 Table 6-4)
  exhaust_cfm_sf NUMERIC,        -- CFM per SF
  exhaust_cfm_unit NUMERIC,      -- CFM per unit (fixture)
  exhaust_unit_type TEXT,        -- 'toilet', 'urinal', 'shower', 'kitchen', 'room'
  exhaust_cfm_min NUMERIC,       -- Min CFM per unit (for ranges)
  exhaust_cfm_max NUMERIC,       -- Max CFM per unit (for ranges)
  exhaust_min_per_room NUMERIC,  -- Min CFM per room if applicable
  exhaust_notes TEXT,
  
  -- Fixture estimation for exhaust calc
  exhaust_fixtures_per_sf JSONB, -- {"wcs": 200, "showers": 150}
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Zone Type Defaults Table
-- Stores zone type configurations (locker room, restroom, pool, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS zone_type_defaults (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_sf INTEGER DEFAULT 1000,
  switchable BOOLEAN DEFAULT FALSE,
  
  -- Link to ASHRAE space type (single source of truth for ventilation/exhaust)
  ashrae_space_type_id TEXT REFERENCES ashrae_space_types(id),
  
  -- Rate-based defaults (NON-ventilation only)
  lighting_w_sf NUMERIC DEFAULT 1.0,
  receptacle_va_sf NUMERIC DEFAULT 1.5,
  cooling_sf_ton NUMERIC DEFAULT 400,
  heating_btuh_sf NUMERIC DEFAULT 25,
  
  -- Fixed loads (not per SF)
  fixed_kw NUMERIC,
  gas_mbh NUMERIC,
  ventilation_cfm NUMERIC,       -- Fixed CFM (e.g., natatoriums)
  exhaust_cfm NUMERIC,           -- Fixed CFM (e.g., mechanical rooms)
  pool_heater_gas_mbh NUMERIC,
  
  -- Additional zone-specific settings
  latent_adder NUMERIC,          -- For humid spaces like pools
  occupants_per_1000sf INTEGER,
  
  -- Fixture defaults (JSONB)
  default_fixtures JSONB DEFAULT '{}',
  visible_fixtures JSONB DEFAULT '[]',
  
  -- Equipment defaults (JSONB)
  default_equipment JSONB DEFAULT '[]',
  
  -- Special flags
  requires_standby_power BOOLEAN DEFAULT FALSE,
  requires_type1_hood BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  source_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ashrae_space_types_category ON ashrae_space_types(category);
CREATE INDEX IF NOT EXISTS idx_ashrae_space_types_standard ON ashrae_space_types(standard);
CREATE INDEX IF NOT EXISTS idx_zone_type_defaults_category ON zone_type_defaults(category);

-- ============================================
-- RLS Policies (public read, authenticated write)
-- ============================================

ALTER TABLE ashrae_space_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_type_defaults ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Public read access for ashrae_space_types"
  ON ashrae_space_types FOR SELECT
  USING (true);

CREATE POLICY "Public read access for zone_type_defaults"
  ON zone_type_defaults FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Authenticated write access for ashrae_space_types"
  ON ashrae_space_types FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for zone_type_defaults"
  ON zone_type_defaults FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ashrae_space_types_updated_at ON ashrae_space_types;
CREATE TRIGGER ashrae_space_types_updated_at
  BEFORE UPDATE ON ashrae_space_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS zone_type_defaults_updated_at ON zone_type_defaults;
CREATE TRIGGER zone_type_defaults_updated_at
  BEFORE UPDATE ON zone_type_defaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
