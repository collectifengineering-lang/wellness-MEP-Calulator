# Wellness Facility MEP Calculator

A professional web application for estimating utility loads in wellness facilities (bathhouses, spas, hybrid gym/spa concepts). Built for COLLECTIF Engineering PLLC.

## Features

- **Visual Zone Builder**: Create facility zones with proportionally-sized blocks
- **Real-time Calculations**: Instant updates for all MEP loads
- **Multiple Calculation Engines**:
  - Electrical: kVA, amps (480V/208V), service sizing
  - HVAC: Cooling (tons), heating (MBH), ventilation/exhaust (CFM)
  - Gas: CFH totals with equipment breakdown
  - DHW: ASHRAE method with configurable gas heater efficiency
  - Plumbing: WSFU/DFU with Hunter's curve conversion
- **Climate Adjustments**: Hot/humid, temperate, cold/dry factors
- **Export Options**: PDF narrative reports and Excel spreadsheets
- **Cloud Sync**: Supabase backend with Microsoft 365 authentication

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL)
- **Auth**: Microsoft 365 (Azure AD) via Supabase Auth
- **PDF Export**: pdfmake
- **Excel Export**: SheetJS (xlsx)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for production)
- Azure AD app registration (for Microsoft 365 auth)

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Development Mode

The app runs in "development mode" without Supabase configuration:
- Auth is bypassed
- Projects are stored in localStorage
- All features work locally

### Production Setup

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Run the SQL schema (see below)

2. **Configure Microsoft 365 Auth**:
   - Register app in Azure Portal (Entra ID)
   - Set redirect URI: `https://<project>.supabase.co/auth/v1/callback`
   - Add client ID/secret to Supabase Auth settings
   - Restrict to `collectif.nyc` tenant

3. **Deploy to Vercel**:
   ```bash
   npm i -g vercel
   vercel
   ```
   - Set environment variables in Vercel dashboard

### Database Schema

```sql
-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  target_sf NUMERIC,
  climate TEXT,
  electric_primary BOOLEAN DEFAULT true,
  dhw_settings JSONB,
  contingency NUMERIC DEFAULT 0.25,
  result_adjustments JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Zones table
CREATE TABLE zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT,
  zone_type TEXT,
  sub_type TEXT,
  sf NUMERIC,
  color TEXT,
  fixtures JSONB,
  rates JSONB,
  line_items JSONB,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD zones in own projects" ON zones
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
```

## Zone Types

The calculator includes predefined zone types across 6 categories:

1. **Support**: Reception, Mechanical Room, Retail, Office, Storage
2. **Fitness**: Open Gym, Group Fitness Studio
3. **Locker/Hygiene**: Locker Room, Restroom
4. **Thermal**: Banya, Sauna (gas/electric), Steam Room, Cold Plunge, Snow Room
5. **Pool/Spa**: Indoor Pool, Outdoor Pool, Hot Tub, Treatment Room
6. **Kitchen/Laundry**: Commercial Kitchen, Commercial Laundry

Each zone type has configurable defaults based on COLLECTIF's engineering standards.

## Calculation Methods

### DHW (Domestic Hot Water)
- ASHRAE Table 10 fixture unit method
- Hot water mixing equation: `Qs = Qf × (Tf - Tc) / (Ts - Tc)`
- Recovery rate: `BTU/hr = GPH × 8.33 × ΔT / Efficiency`
- Configurable gas heater efficiency (80-98%)

### Plumbing
- IPC-based fixture unit values (WSFU/DFU)
- Hunter's curve approximation for WSFU to GPM conversion
- Automatic pipe sizing based on DFU

### Electrical
- Rate-based loads (W/SF, VA/SF) plus fixed equipment
- Power factor adjustment (0.85)
- Service sizing with 20% spare capacity
- Panel count estimation

### HVAC
- SF/ton method with climate multipliers
- ACH-based exhaust for wet zones
- Latent load adders for steam/pool areas
- RTU count estimation

## License

Proprietary - COLLECTIF Engineering PLLC

## Support

For questions or issues, contact [engineering@collectif.nyc](mailto:engineering@collectif.nyc)
