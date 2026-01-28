/**
 * ASHRAE Climatic Design Conditions
 * 
 * Data from ASHRAE Fundamentals Handbook - Climatic Design Information
 * Contains design temperatures for major US cities and international locations
 * 
 * All temperatures in °F, elevations in ft
 */

export interface ASHRAELocation {
  id: string
  name: string
  state?: string
  country: string
  lat: number
  lon: number
  elevation_ft: number
  // Cooling Design (Summer) - Dry Bulb / Mean Coincident Wet Bulb
  cooling_04_db: number      // 0.4% annual cooling design DB
  cooling_04_mcwb: number    // 0.4% Mean Coincident Wet Bulb
  cooling_1_db: number       // 1% annual cooling design DB
  cooling_1_mcwb: number     // 1% MCWB
  // Heating Design (Winter) - Dry Bulb
  heating_99_db: number      // 99% annual heating design DB
  heating_996_db: number     // 99.6% annual heating design DB
  // Humidity (Summer)
  summer_dp_04: number       // 0.4% Dew Point
  // Humidity Ratio (grains/lb)
  summer_hr: number
  winter_hr: number
}

// ============================================
// UNITED STATES - Major Cities by State
// ============================================

export const US_LOCATIONS: ASHRAELocation[] = [
  // ALABAMA
  { id: 'US-AL-BHM', name: 'Birmingham', state: 'AL', country: 'USA', lat: 33.57, lon: -86.75, elevation_ft: 630, cooling_04_db: 96, cooling_04_mcwb: 76, cooling_1_db: 94, cooling_1_mcwb: 76, heating_99_db: 21, heating_996_db: 17, summer_dp_04: 75, summer_hr: 115, winter_hr: 25 },
  { id: 'US-AL-MOB', name: 'Mobile', state: 'AL', country: 'USA', lat: 30.69, lon: -88.04, elevation_ft: 219, cooling_04_db: 95, cooling_04_mcwb: 78, cooling_1_db: 93, cooling_1_mcwb: 77, heating_99_db: 29, heating_996_db: 25, summer_dp_04: 78, summer_hr: 130, winter_hr: 35 },
  
  // ALASKA
  { id: 'US-AK-ANC', name: 'Anchorage', state: 'AK', country: 'USA', lat: 61.17, lon: -150.02, elevation_ft: 144, cooling_04_db: 71, cooling_04_mcwb: 60, cooling_1_db: 68, cooling_1_mcwb: 58, heating_99_db: -7, heating_996_db: -13, summer_dp_04: 58, summer_hr: 62, winter_hr: 8 },
  { id: 'US-AK-FAI', name: 'Fairbanks', state: 'AK', country: 'USA', lat: 64.82, lon: -147.87, elevation_ft: 436, cooling_04_db: 80, cooling_04_mcwb: 62, cooling_1_db: 77, cooling_1_mcwb: 60, heating_99_db: -43, heating_996_db: -47, summer_dp_04: 59, summer_hr: 65, winter_hr: 2 },
  
  // ARIZONA
  { id: 'US-AZ-PHX', name: 'Phoenix', state: 'AZ', country: 'USA', lat: 33.43, lon: -112.02, elevation_ft: 1117, cooling_04_db: 111, cooling_04_mcwb: 71, cooling_1_db: 109, cooling_1_mcwb: 71, heating_99_db: 38, heating_996_db: 34, summer_dp_04: 71, summer_hr: 95, winter_hr: 22 },
  { id: 'US-AZ-TUS', name: 'Tucson', state: 'AZ', country: 'USA', lat: 32.12, lon: -110.93, elevation_ft: 2556, cooling_04_db: 106, cooling_04_mcwb: 66, cooling_1_db: 104, cooling_1_mcwb: 66, heating_99_db: 32, heating_996_db: 28, summer_dp_04: 66, summer_hr: 80, winter_hr: 20 },
  
  // ARKANSAS
  { id: 'US-AR-LIT', name: 'Little Rock', state: 'AR', country: 'USA', lat: 34.73, lon: -92.23, elevation_ft: 312, cooling_04_db: 98, cooling_04_mcwb: 77, cooling_1_db: 96, cooling_1_mcwb: 77, heating_99_db: 19, heating_996_db: 14, summer_dp_04: 77, summer_hr: 120, winter_hr: 25 },
  
  // CALIFORNIA
  { id: 'US-CA-LAX', name: 'Los Angeles', state: 'CA', country: 'USA', lat: 33.94, lon: -118.41, elevation_ft: 325, cooling_04_db: 89, cooling_04_mcwb: 67, cooling_1_db: 84, cooling_1_mcwb: 66, heating_99_db: 43, heating_996_db: 41, summer_dp_04: 66, summer_hr: 85, winter_hr: 40 },
  { id: 'US-CA-SFO', name: 'San Francisco', state: 'CA', country: 'USA', lat: 37.62, lon: -122.38, elevation_ft: 16, cooling_04_db: 83, cooling_04_mcwb: 63, cooling_1_db: 77, cooling_1_mcwb: 62, heating_99_db: 38, heating_996_db: 35, summer_dp_04: 60, summer_hr: 70, winter_hr: 45 },
  { id: 'US-CA-SAN', name: 'San Diego', state: 'CA', country: 'USA', lat: 32.73, lon: -117.18, elevation_ft: 62, cooling_04_db: 86, cooling_04_mcwb: 69, cooling_1_db: 82, cooling_1_mcwb: 68, heating_99_db: 44, heating_996_db: 42, summer_dp_04: 67, summer_hr: 88, winter_hr: 45 },
  { id: 'US-CA-SAC', name: 'Sacramento', state: 'CA', country: 'USA', lat: 38.51, lon: -121.50, elevation_ft: 26, cooling_04_db: 103, cooling_04_mcwb: 70, cooling_1_db: 100, cooling_1_mcwb: 69, heating_99_db: 32, heating_996_db: 29, summer_dp_04: 64, summer_hr: 75, winter_hr: 35 },
  { id: 'US-CA-FRE', name: 'Fresno', state: 'CA', country: 'USA', lat: 36.78, lon: -119.72, elevation_ft: 336, cooling_04_db: 106, cooling_04_mcwb: 71, cooling_1_db: 103, cooling_1_mcwb: 70, heating_99_db: 30, heating_996_db: 27, summer_dp_04: 66, summer_hr: 80, winter_hr: 30 },
  
  // COLORADO
  { id: 'US-CO-DEN', name: 'Denver', state: 'CO', country: 'USA', lat: 39.75, lon: -104.87, elevation_ft: 5331, cooling_04_db: 95, cooling_04_mcwb: 60, cooling_1_db: 93, cooling_1_mcwb: 59, heating_99_db: 1, heating_996_db: -5, summer_dp_04: 58, summer_hr: 72, winter_hr: 15 },
  { id: 'US-CO-COS', name: 'Colorado Springs', state: 'CO', country: 'USA', lat: 38.82, lon: -104.72, elevation_ft: 6173, cooling_04_db: 92, cooling_04_mcwb: 58, cooling_1_db: 89, cooling_1_mcwb: 58, heating_99_db: 2, heating_996_db: -4, summer_dp_04: 56, summer_hr: 65, winter_hr: 15 },
  
  // CONNECTICUT
  { id: 'US-CT-BDL', name: 'Hartford', state: 'CT', country: 'USA', lat: 41.94, lon: -72.68, elevation_ft: 173, cooling_04_db: 91, cooling_04_mcwb: 74, cooling_1_db: 88, cooling_1_mcwb: 73, heating_99_db: 7, heating_996_db: 1, summer_dp_04: 73, summer_hr: 105, winter_hr: 12 },
  { id: 'US-CT-HVN', name: 'New Haven', state: 'CT', country: 'USA', lat: 41.26, lon: -72.89, elevation_ft: 7, cooling_04_db: 89, cooling_04_mcwb: 73, cooling_1_db: 86, cooling_1_mcwb: 72, heating_99_db: 10, heating_996_db: 5, summer_dp_04: 73, summer_hr: 105, winter_hr: 15 },
  
  // DELAWARE
  { id: 'US-DE-ILG', name: 'Wilmington', state: 'DE', country: 'USA', lat: 39.68, lon: -75.60, elevation_ft: 79, cooling_04_db: 93, cooling_04_mcwb: 76, cooling_1_db: 91, cooling_1_mcwb: 75, heating_99_db: 14, heating_996_db: 10, summer_dp_04: 75, summer_hr: 115, winter_hr: 18 },
  
  // FLORIDA
  { id: 'US-FL-MIA', name: 'Miami', state: 'FL', country: 'USA', lat: 25.79, lon: -80.32, elevation_ft: 33, cooling_04_db: 93, cooling_04_mcwb: 79, cooling_1_db: 92, cooling_1_mcwb: 78, heating_99_db: 47, heating_996_db: 44, summer_dp_04: 79, summer_hr: 140, winter_hr: 55 },
  { id: 'US-FL-TPA', name: 'Tampa', state: 'FL', country: 'USA', lat: 27.96, lon: -82.54, elevation_ft: 26, cooling_04_db: 93, cooling_04_mcwb: 78, cooling_1_db: 92, cooling_1_mcwb: 77, heating_99_db: 40, heating_996_db: 36, summer_dp_04: 78, summer_hr: 130, winter_hr: 45 },
  { id: 'US-FL-JAX', name: 'Jacksonville', state: 'FL', country: 'USA', lat: 30.49, lon: -81.69, elevation_ft: 30, cooling_04_db: 96, cooling_04_mcwb: 78, cooling_1_db: 94, cooling_1_mcwb: 77, heating_99_db: 32, heating_996_db: 28, summer_dp_04: 78, summer_hr: 130, winter_hr: 40 },
  { id: 'US-FL-MCO', name: 'Orlando', state: 'FL', country: 'USA', lat: 28.43, lon: -81.31, elevation_ft: 96, cooling_04_db: 95, cooling_04_mcwb: 77, cooling_1_db: 93, cooling_1_mcwb: 77, heating_99_db: 38, heating_996_db: 33, summer_dp_04: 77, summer_hr: 125, winter_hr: 42 },
  
  // GEORGIA
  { id: 'US-GA-ATL', name: 'Atlanta', state: 'GA', country: 'USA', lat: 33.63, lon: -84.44, elevation_ft: 1026, cooling_04_db: 95, cooling_04_mcwb: 75, cooling_1_db: 93, cooling_1_mcwb: 75, heating_99_db: 21, heating_996_db: 17, summer_dp_04: 74, summer_hr: 110, winter_hr: 25 },
  { id: 'US-GA-SAV', name: 'Savannah', state: 'GA', country: 'USA', lat: 32.13, lon: -81.20, elevation_ft: 52, cooling_04_db: 96, cooling_04_mcwb: 78, cooling_1_db: 94, cooling_1_mcwb: 77, heating_99_db: 27, heating_996_db: 23, summer_dp_04: 78, summer_hr: 130, winter_hr: 35 },
  
  // HAWAII
  { id: 'US-HI-HNL', name: 'Honolulu', state: 'HI', country: 'USA', lat: 21.33, lon: -157.92, elevation_ft: 13, cooling_04_db: 90, cooling_04_mcwb: 75, cooling_1_db: 89, cooling_1_mcwb: 74, heating_99_db: 62, heating_996_db: 60, summer_dp_04: 74, summer_hr: 110, winter_hr: 65 },
  
  // IDAHO
  { id: 'US-ID-BOI', name: 'Boise', state: 'ID', country: 'USA', lat: 43.57, lon: -116.22, elevation_ft: 2871, cooling_04_db: 100, cooling_04_mcwb: 64, cooling_1_db: 97, cooling_1_mcwb: 63, heating_99_db: 10, heating_996_db: 4, summer_dp_04: 56, summer_hr: 60, winter_hr: 20 },
  
  // ILLINOIS
  { id: 'US-IL-ORD', name: 'Chicago', state: 'IL', country: 'USA', lat: 41.98, lon: -87.90, elevation_ft: 673, cooling_04_db: 93, cooling_04_mcwb: 75, cooling_1_db: 91, cooling_1_mcwb: 74, heating_99_db: -3, heating_996_db: -8, summer_dp_04: 74, summer_hr: 110, winter_hr: 10 },
  { id: 'US-IL-SPI', name: 'Springfield', state: 'IL', country: 'USA', lat: 39.84, lon: -89.68, elevation_ft: 614, cooling_04_db: 94, cooling_04_mcwb: 76, cooling_1_db: 92, cooling_1_mcwb: 75, heating_99_db: 1, heating_996_db: -5, summer_dp_04: 75, summer_hr: 115, winter_hr: 15 },
  
  // INDIANA
  { id: 'US-IN-IND', name: 'Indianapolis', state: 'IN', country: 'USA', lat: 39.73, lon: -86.27, elevation_ft: 807, cooling_04_db: 93, cooling_04_mcwb: 75, cooling_1_db: 91, cooling_1_mcwb: 75, heating_99_db: 2, heating_996_db: -4, summer_dp_04: 75, summer_hr: 115, winter_hr: 15 },
  
  // IOWA
  { id: 'US-IA-DSM', name: 'Des Moines', state: 'IA', country: 'USA', lat: 41.53, lon: -93.65, elevation_ft: 965, cooling_04_db: 93, cooling_04_mcwb: 76, cooling_1_db: 91, cooling_1_mcwb: 75, heating_99_db: -7, heating_996_db: -12, summer_dp_04: 75, summer_hr: 115, winter_hr: 10 },
  
  // KANSAS
  { id: 'US-KS-ICT', name: 'Wichita', state: 'KS', country: 'USA', lat: 37.65, lon: -97.43, elevation_ft: 1339, cooling_04_db: 101, cooling_04_mcwb: 74, cooling_1_db: 99, cooling_1_mcwb: 74, heating_99_db: 7, heating_996_db: 2, summer_dp_04: 73, summer_hr: 105, winter_hr: 18 },
  
  // KENTUCKY
  { id: 'US-KY-SDF', name: 'Louisville', state: 'KY', country: 'USA', lat: 38.17, lon: -85.73, elevation_ft: 489, cooling_04_db: 94, cooling_04_mcwb: 76, cooling_1_db: 92, cooling_1_mcwb: 76, heating_99_db: 10, heating_996_db: 5, summer_dp_04: 76, summer_hr: 118, winter_hr: 20 },
  
  // LOUISIANA
  { id: 'US-LA-MSY', name: 'New Orleans', state: 'LA', country: 'USA', lat: 29.99, lon: -90.25, elevation_ft: 30, cooling_04_db: 95, cooling_04_mcwb: 79, cooling_1_db: 93, cooling_1_mcwb: 78, heating_99_db: 32, heating_996_db: 28, summer_dp_04: 79, summer_hr: 135, winter_hr: 40 },
  { id: 'US-LA-BTR', name: 'Baton Rouge', state: 'LA', country: 'USA', lat: 30.53, lon: -91.15, elevation_ft: 70, cooling_04_db: 96, cooling_04_mcwb: 78, cooling_1_db: 94, cooling_1_mcwb: 78, heating_99_db: 29, heating_996_db: 25, summer_dp_04: 78, summer_hr: 130, winter_hr: 38 },
  
  // MAINE
  { id: 'US-ME-PWM', name: 'Portland', state: 'ME', country: 'USA', lat: 43.65, lon: -70.31, elevation_ft: 74, cooling_04_db: 87, cooling_04_mcwb: 71, cooling_1_db: 84, cooling_1_mcwb: 70, heating_99_db: -1, heating_996_db: -7, summer_dp_04: 70, summer_hr: 95, winter_hr: 10 },
  
  // MARYLAND
  { id: 'US-MD-BWI', name: 'Baltimore', state: 'MD', country: 'USA', lat: 39.17, lon: -76.68, elevation_ft: 154, cooling_04_db: 95, cooling_04_mcwb: 76, cooling_1_db: 92, cooling_1_mcwb: 76, heating_99_db: 14, heating_996_db: 10, summer_dp_04: 76, summer_hr: 118, winter_hr: 20 },
  
  // MASSACHUSETTS
  { id: 'US-MA-BOS', name: 'Boston', state: 'MA', country: 'USA', lat: 42.36, lon: -71.01, elevation_ft: 30, cooling_04_db: 91, cooling_04_mcwb: 73, cooling_1_db: 88, cooling_1_mcwb: 72, heating_99_db: 9, heating_996_db: 4, summer_dp_04: 72, summer_hr: 100, winter_hr: 12 },
  
  // MICHIGAN
  { id: 'US-MI-DTW', name: 'Detroit', state: 'MI', country: 'USA', lat: 42.21, lon: -83.35, elevation_ft: 656, cooling_04_db: 91, cooling_04_mcwb: 74, cooling_1_db: 88, cooling_1_mcwb: 73, heating_99_db: 4, heating_996_db: -1, summer_dp_04: 73, summer_hr: 105, winter_hr: 12 },
  { id: 'US-MI-GRR', name: 'Grand Rapids', state: 'MI', country: 'USA', lat: 42.88, lon: -85.52, elevation_ft: 794, cooling_04_db: 90, cooling_04_mcwb: 74, cooling_1_db: 87, cooling_1_mcwb: 73, heating_99_db: 2, heating_996_db: -4, summer_dp_04: 73, summer_hr: 105, winter_hr: 12 },
  
  // MINNESOTA
  { id: 'US-MN-MSP', name: 'Minneapolis', state: 'MN', country: 'USA', lat: 44.88, lon: -93.22, elevation_ft: 841, cooling_04_db: 91, cooling_04_mcwb: 74, cooling_1_db: 89, cooling_1_mcwb: 73, heating_99_db: -12, heating_996_db: -17, summer_dp_04: 73, summer_hr: 105, winter_hr: 5 },
  
  // MISSISSIPPI
  { id: 'US-MS-JAN', name: 'Jackson', state: 'MS', country: 'USA', lat: 32.32, lon: -90.08, elevation_ft: 331, cooling_04_db: 97, cooling_04_mcwb: 77, cooling_1_db: 95, cooling_1_mcwb: 77, heating_99_db: 23, heating_996_db: 19, summer_dp_04: 77, summer_hr: 120, winter_hr: 30 },
  
  // MISSOURI
  { id: 'US-MO-STL', name: 'St. Louis', state: 'MO', country: 'USA', lat: 38.75, lon: -90.37, elevation_ft: 604, cooling_04_db: 96, cooling_04_mcwb: 76, cooling_1_db: 94, cooling_1_mcwb: 76, heating_99_db: 6, heating_996_db: 1, summer_dp_04: 76, summer_hr: 118, winter_hr: 18 },
  { id: 'US-MO-MCI', name: 'Kansas City', state: 'MO', country: 'USA', lat: 39.30, lon: -94.71, elevation_ft: 1024, cooling_04_db: 98, cooling_04_mcwb: 76, cooling_1_db: 95, cooling_1_mcwb: 75, heating_99_db: 4, heating_996_db: -2, summer_dp_04: 75, summer_hr: 115, winter_hr: 15 },
  
  // MONTANA
  { id: 'US-MT-BIL', name: 'Billings', state: 'MT', country: 'USA', lat: 45.80, lon: -108.54, elevation_ft: 3652, cooling_04_db: 95, cooling_04_mcwb: 62, cooling_1_db: 92, cooling_1_mcwb: 61, heating_99_db: -10, heating_996_db: -17, summer_dp_04: 58, summer_hr: 62, winter_hr: 10 },
  
  // NEBRASKA
  { id: 'US-NE-OMA', name: 'Omaha', state: 'NE', country: 'USA', lat: 41.30, lon: -95.90, elevation_ft: 984, cooling_04_db: 95, cooling_04_mcwb: 76, cooling_1_db: 93, cooling_1_mcwb: 75, heating_99_db: -5, heating_996_db: -10, summer_dp_04: 75, summer_hr: 115, winter_hr: 10 },
  
  // NEVADA
  { id: 'US-NV-LAS', name: 'Las Vegas', state: 'NV', country: 'USA', lat: 36.08, lon: -115.15, elevation_ft: 2181, cooling_04_db: 110, cooling_04_mcwb: 66, cooling_1_db: 108, cooling_1_mcwb: 66, heating_99_db: 30, heating_996_db: 26, summer_dp_04: 60, summer_hr: 65, winter_hr: 22 },
  { id: 'US-NV-RNO', name: 'Reno', state: 'NV', country: 'USA', lat: 39.50, lon: -119.78, elevation_ft: 4412, cooling_04_db: 98, cooling_04_mcwb: 61, cooling_1_db: 95, cooling_1_mcwb: 60, heating_99_db: 14, heating_996_db: 8, summer_dp_04: 52, summer_hr: 50, winter_hr: 18 },
  
  // NEW HAMPSHIRE
  { id: 'US-NH-MHT', name: 'Manchester', state: 'NH', country: 'USA', lat: 42.93, lon: -71.44, elevation_ft: 233, cooling_04_db: 91, cooling_04_mcwb: 73, cooling_1_db: 88, cooling_1_mcwb: 72, heating_99_db: -1, heating_996_db: -8, summer_dp_04: 72, summer_hr: 100, winter_hr: 10 },
  
  // NEW JERSEY
  { id: 'US-NJ-EWR', name: 'Newark', state: 'NJ', country: 'USA', lat: 40.69, lon: -74.17, elevation_ft: 30, cooling_04_db: 94, cooling_04_mcwb: 75, cooling_1_db: 91, cooling_1_mcwb: 74, heating_99_db: 14, heating_996_db: 9, summer_dp_04: 74, summer_hr: 110, winter_hr: 18 },
  { id: 'US-NJ-ACY', name: 'Atlantic City', state: 'NJ', country: 'USA', lat: 39.46, lon: -74.58, elevation_ft: 66, cooling_04_db: 93, cooling_04_mcwb: 76, cooling_1_db: 90, cooling_1_mcwb: 75, heating_99_db: 15, heating_996_db: 10, summer_dp_04: 76, summer_hr: 118, winter_hr: 22 },
  
  // NEW MEXICO
  { id: 'US-NM-ABQ', name: 'Albuquerque', state: 'NM', country: 'USA', lat: 35.04, lon: -106.62, elevation_ft: 5355, cooling_04_db: 97, cooling_04_mcwb: 61, cooling_1_db: 95, cooling_1_mcwb: 61, heating_99_db: 16, heating_996_db: 11, summer_dp_04: 57, summer_hr: 60, winter_hr: 15 },
  
  // NEW YORK
  { id: 'US-NY-NYC', name: 'New York City', state: 'NY', country: 'USA', lat: 40.78, lon: -73.97, elevation_ft: 33, cooling_04_db: 93, cooling_04_mcwb: 75, cooling_1_db: 90, cooling_1_mcwb: 74, heating_99_db: 15, heating_996_db: 11, summer_dp_04: 74, summer_hr: 110, winter_hr: 18 },
  { id: 'US-NY-LGA', name: 'New York (LaGuardia)', state: 'NY', country: 'USA', lat: 40.77, lon: -73.90, elevation_ft: 22, cooling_04_db: 92, cooling_04_mcwb: 75, cooling_1_db: 89, cooling_1_mcwb: 74, heating_99_db: 14, heating_996_db: 10, summer_dp_04: 74, summer_hr: 110, winter_hr: 18 },
  { id: 'US-NY-JFK', name: 'New York (JFK)', state: 'NY', country: 'USA', lat: 40.64, lon: -73.78, elevation_ft: 13, cooling_04_db: 91, cooling_04_mcwb: 74, cooling_1_db: 88, cooling_1_mcwb: 73, heating_99_db: 15, heating_996_db: 11, summer_dp_04: 74, summer_hr: 110, winter_hr: 20 },
  { id: 'US-NY-BUF', name: 'Buffalo', state: 'NY', country: 'USA', lat: 42.94, lon: -78.74, elevation_ft: 705, cooling_04_db: 88, cooling_04_mcwb: 72, cooling_1_db: 85, cooling_1_mcwb: 71, heating_99_db: 4, heating_996_db: -2, summer_dp_04: 71, summer_hr: 98, winter_hr: 12 },
  { id: 'US-NY-ALB', name: 'Albany', state: 'NY', country: 'USA', lat: 42.75, lon: -73.80, elevation_ft: 285, cooling_04_db: 90, cooling_04_mcwb: 73, cooling_1_db: 87, cooling_1_mcwb: 72, heating_99_db: -2, heating_996_db: -8, summer_dp_04: 72, summer_hr: 100, winter_hr: 10 },
  { id: 'US-NY-SYR', name: 'Syracuse', state: 'NY', country: 'USA', lat: 43.11, lon: -76.11, elevation_ft: 421, cooling_04_db: 89, cooling_04_mcwb: 73, cooling_1_db: 86, cooling_1_mcwb: 72, heating_99_db: 0, heating_996_db: -6, summer_dp_04: 72, summer_hr: 100, winter_hr: 10 },
  
  // NORTH CAROLINA
  { id: 'US-NC-CLT', name: 'Charlotte', state: 'NC', country: 'USA', lat: 35.21, lon: -80.94, elevation_ft: 769, cooling_04_db: 95, cooling_04_mcwb: 75, cooling_1_db: 93, cooling_1_mcwb: 75, heating_99_db: 21, heating_996_db: 17, summer_dp_04: 74, summer_hr: 110, winter_hr: 25 },
  { id: 'US-NC-RDU', name: 'Raleigh', state: 'NC', country: 'USA', lat: 35.87, lon: -78.79, elevation_ft: 435, cooling_04_db: 95, cooling_04_mcwb: 76, cooling_1_db: 93, cooling_1_mcwb: 76, heating_99_db: 20, heating_996_db: 15, summer_dp_04: 76, summer_hr: 118, winter_hr: 25 },
  
  // NORTH DAKOTA
  { id: 'US-ND-FAR', name: 'Fargo', state: 'ND', country: 'USA', lat: 46.90, lon: -96.80, elevation_ft: 900, cooling_04_db: 91, cooling_04_mcwb: 71, cooling_1_db: 88, cooling_1_mcwb: 70, heating_99_db: -18, heating_996_db: -24, summer_dp_04: 69, summer_hr: 90, winter_hr: 5 },
  
  // OHIO
  { id: 'US-OH-CLE', name: 'Cleveland', state: 'OH', country: 'USA', lat: 41.41, lon: -81.85, elevation_ft: 791, cooling_04_db: 90, cooling_04_mcwb: 74, cooling_1_db: 88, cooling_1_mcwb: 73, heating_99_db: 5, heating_996_db: 0, summer_dp_04: 73, summer_hr: 105, winter_hr: 15 },
  { id: 'US-OH-CMH', name: 'Columbus', state: 'OH', country: 'USA', lat: 40.00, lon: -82.88, elevation_ft: 815, cooling_04_db: 92, cooling_04_mcwb: 74, cooling_1_db: 89, cooling_1_mcwb: 74, heating_99_db: 5, heating_996_db: 0, summer_dp_04: 74, summer_hr: 110, winter_hr: 15 },
  { id: 'US-OH-CVG', name: 'Cincinnati', state: 'OH', country: 'USA', lat: 39.05, lon: -84.67, elevation_ft: 896, cooling_04_db: 93, cooling_04_mcwb: 75, cooling_1_db: 91, cooling_1_mcwb: 75, heating_99_db: 8, heating_996_db: 2, summer_dp_04: 75, summer_hr: 115, winter_hr: 18 },
  
  // OKLAHOMA
  { id: 'US-OK-OKC', name: 'Oklahoma City', state: 'OK', country: 'USA', lat: 35.39, lon: -97.60, elevation_ft: 1295, cooling_04_db: 101, cooling_04_mcwb: 74, cooling_1_db: 99, cooling_1_mcwb: 74, heating_99_db: 13, heating_996_db: 8, summer_dp_04: 73, summer_hr: 105, winter_hr: 20 },
  { id: 'US-OK-TUL', name: 'Tulsa', state: 'OK', country: 'USA', lat: 36.20, lon: -95.89, elevation_ft: 677, cooling_04_db: 101, cooling_04_mcwb: 76, cooling_1_db: 99, cooling_1_mcwb: 76, heating_99_db: 12, heating_996_db: 7, summer_dp_04: 76, summer_hr: 118, winter_hr: 22 },
  
  // OREGON
  { id: 'US-OR-PDX', name: 'Portland', state: 'OR', country: 'USA', lat: 45.59, lon: -122.60, elevation_ft: 39, cooling_04_db: 92, cooling_04_mcwb: 67, cooling_1_db: 88, cooling_1_mcwb: 66, heating_99_db: 26, heating_996_db: 22, summer_dp_04: 61, summer_hr: 70, winter_hr: 30 },
  { id: 'US-OR-EUG', name: 'Eugene', state: 'OR', country: 'USA', lat: 44.12, lon: -123.21, elevation_ft: 374, cooling_04_db: 92, cooling_04_mcwb: 66, cooling_1_db: 88, cooling_1_mcwb: 65, heating_99_db: 24, heating_996_db: 20, summer_dp_04: 60, summer_hr: 68, winter_hr: 30 },
  
  // PENNSYLVANIA
  { id: 'US-PA-PHL', name: 'Philadelphia', state: 'PA', country: 'USA', lat: 39.87, lon: -75.23, elevation_ft: 30, cooling_04_db: 94, cooling_04_mcwb: 76, cooling_1_db: 91, cooling_1_mcwb: 75, heating_99_db: 14, heating_996_db: 10, summer_dp_04: 75, summer_hr: 115, winter_hr: 18 },
  { id: 'US-PA-PIT', name: 'Pittsburgh', state: 'PA', country: 'USA', lat: 40.50, lon: -80.22, elevation_ft: 1224, cooling_04_db: 90, cooling_04_mcwb: 73, cooling_1_db: 88, cooling_1_mcwb: 72, heating_99_db: 5, heating_996_db: 0, summer_dp_04: 72, summer_hr: 100, winter_hr: 15 },
  
  // RHODE ISLAND
  { id: 'US-RI-PVD', name: 'Providence', state: 'RI', country: 'USA', lat: 41.72, lon: -71.43, elevation_ft: 62, cooling_04_db: 90, cooling_04_mcwb: 73, cooling_1_db: 87, cooling_1_mcwb: 72, heating_99_db: 7, heating_996_db: 2, summer_dp_04: 72, summer_hr: 100, winter_hr: 12 },
  
  // SOUTH CAROLINA
  { id: 'US-SC-CAE', name: 'Columbia', state: 'SC', country: 'USA', lat: 34.00, lon: -81.03, elevation_ft: 226, cooling_04_db: 98, cooling_04_mcwb: 76, cooling_1_db: 96, cooling_1_mcwb: 76, heating_99_db: 24, heating_996_db: 20, summer_dp_04: 76, summer_hr: 118, winter_hr: 28 },
  { id: 'US-SC-CHS', name: 'Charleston', state: 'SC', country: 'USA', lat: 32.90, lon: -80.04, elevation_ft: 46, cooling_04_db: 96, cooling_04_mcwb: 78, cooling_1_db: 94, cooling_1_mcwb: 78, heating_99_db: 28, heating_996_db: 24, summer_dp_04: 78, summer_hr: 130, winter_hr: 35 },
  
  // SOUTH DAKOTA
  { id: 'US-SD-FSD', name: 'Sioux Falls', state: 'SD', country: 'USA', lat: 43.58, lon: -96.74, elevation_ft: 1430, cooling_04_db: 93, cooling_04_mcwb: 73, cooling_1_db: 90, cooling_1_mcwb: 72, heating_99_db: -11, heating_996_db: -16, summer_dp_04: 72, summer_hr: 100, winter_hr: 8 },
  
  // TENNESSEE
  { id: 'US-TN-BNA', name: 'Nashville', state: 'TN', country: 'USA', lat: 36.12, lon: -86.69, elevation_ft: 599, cooling_04_db: 96, cooling_04_mcwb: 76, cooling_1_db: 94, cooling_1_mcwb: 76, heating_99_db: 14, heating_996_db: 9, summer_dp_04: 76, summer_hr: 118, winter_hr: 22 },
  { id: 'US-TN-MEM', name: 'Memphis', state: 'TN', country: 'USA', lat: 35.04, lon: -89.98, elevation_ft: 331, cooling_04_db: 98, cooling_04_mcwb: 78, cooling_1_db: 96, cooling_1_mcwb: 77, heating_99_db: 18, heating_996_db: 13, summer_dp_04: 77, summer_hr: 120, winter_hr: 25 },
  
  // TEXAS
  { id: 'US-TX-DFW', name: 'Dallas/Fort Worth', state: 'TX', country: 'USA', lat: 32.90, lon: -97.02, elevation_ft: 607, cooling_04_db: 103, cooling_04_mcwb: 75, cooling_1_db: 101, cooling_1_mcwb: 75, heating_99_db: 22, heating_996_db: 17, summer_dp_04: 74, summer_hr: 110, winter_hr: 28 },
  { id: 'US-TX-IAH', name: 'Houston', state: 'TX', country: 'USA', lat: 29.98, lon: -95.36, elevation_ft: 97, cooling_04_db: 98, cooling_04_mcwb: 78, cooling_1_db: 96, cooling_1_mcwb: 78, heating_99_db: 31, heating_996_db: 27, summer_dp_04: 78, summer_hr: 130, winter_hr: 38 },
  { id: 'US-TX-SAT', name: 'San Antonio', state: 'TX', country: 'USA', lat: 29.53, lon: -98.47, elevation_ft: 794, cooling_04_db: 100, cooling_04_mcwb: 74, cooling_1_db: 98, cooling_1_mcwb: 74, heating_99_db: 28, heating_996_db: 24, summer_dp_04: 75, summer_hr: 115, winter_hr: 32 },
  { id: 'US-TX-AUS', name: 'Austin', state: 'TX', country: 'USA', lat: 30.18, lon: -97.68, elevation_ft: 620, cooling_04_db: 102, cooling_04_mcwb: 74, cooling_1_db: 100, cooling_1_mcwb: 74, heating_99_db: 27, heating_996_db: 22, summer_dp_04: 74, summer_hr: 110, winter_hr: 30 },
  { id: 'US-TX-ELP', name: 'El Paso', state: 'TX', country: 'USA', lat: 31.81, lon: -106.38, elevation_ft: 3958, cooling_04_db: 102, cooling_04_mcwb: 64, cooling_1_db: 100, cooling_1_mcwb: 64, heating_99_db: 24, heating_996_db: 20, summer_dp_04: 61, summer_hr: 70, winter_hr: 20 },
  
  // UTAH
  { id: 'US-UT-SLC', name: 'Salt Lake City', state: 'UT', country: 'USA', lat: 40.78, lon: -111.97, elevation_ft: 4227, cooling_04_db: 98, cooling_04_mcwb: 62, cooling_1_db: 96, cooling_1_mcwb: 62, heating_99_db: 8, heating_996_db: 3, summer_dp_04: 56, summer_hr: 58, winter_hr: 18 },
  
  // VERMONT
  { id: 'US-VT-BTV', name: 'Burlington', state: 'VT', country: 'USA', lat: 44.47, lon: -73.15, elevation_ft: 341, cooling_04_db: 88, cooling_04_mcwb: 72, cooling_1_db: 85, cooling_1_mcwb: 71, heating_99_db: -7, heating_996_db: -12, summer_dp_04: 71, summer_hr: 98, winter_hr: 8 },
  
  // VIRGINIA
  { id: 'US-VA-DCA', name: 'Washington DC', state: 'VA', country: 'USA', lat: 38.85, lon: -77.04, elevation_ft: 66, cooling_04_db: 95, cooling_04_mcwb: 76, cooling_1_db: 92, cooling_1_mcwb: 76, heating_99_db: 17, heating_996_db: 13, summer_dp_04: 76, summer_hr: 118, winter_hr: 22 },
  { id: 'US-VA-RIC', name: 'Richmond', state: 'VA', country: 'USA', lat: 37.51, lon: -77.32, elevation_ft: 168, cooling_04_db: 95, cooling_04_mcwb: 76, cooling_1_db: 93, cooling_1_mcwb: 76, heating_99_db: 17, heating_996_db: 13, summer_dp_04: 76, summer_hr: 118, winter_hr: 22 },
  { id: 'US-VA-ORF', name: 'Norfolk', state: 'VA', country: 'USA', lat: 36.90, lon: -76.19, elevation_ft: 26, cooling_04_db: 94, cooling_04_mcwb: 77, cooling_1_db: 92, cooling_1_mcwb: 76, heating_99_db: 22, heating_996_db: 18, summer_dp_04: 77, summer_hr: 120, winter_hr: 28 },
  
  // WASHINGTON
  { id: 'US-WA-SEA', name: 'Seattle', state: 'WA', country: 'USA', lat: 47.45, lon: -122.30, elevation_ft: 433, cooling_04_db: 86, cooling_04_mcwb: 65, cooling_1_db: 82, cooling_1_mcwb: 64, heating_99_db: 27, heating_996_db: 23, summer_dp_04: 60, summer_hr: 68, winter_hr: 30 },
  { id: 'US-WA-GEG', name: 'Spokane', state: 'WA', country: 'USA', lat: 47.62, lon: -117.53, elevation_ft: 2356, cooling_04_db: 93, cooling_04_mcwb: 63, cooling_1_db: 90, cooling_1_mcwb: 62, heating_99_db: 6, heating_996_db: 0, summer_dp_04: 55, summer_hr: 55, winter_hr: 18 },
  
  // WEST VIRGINIA
  { id: 'US-WV-CRW', name: 'Charleston', state: 'WV', country: 'USA', lat: 38.37, lon: -81.59, elevation_ft: 981, cooling_04_db: 91, cooling_04_mcwb: 74, cooling_1_db: 89, cooling_1_mcwb: 73, heating_99_db: 11, heating_996_db: 5, summer_dp_04: 73, summer_hr: 105, winter_hr: 18 },
  
  // WISCONSIN
  { id: 'US-WI-MKE', name: 'Milwaukee', state: 'WI', country: 'USA', lat: 42.95, lon: -87.90, elevation_ft: 693, cooling_04_db: 90, cooling_04_mcwb: 74, cooling_1_db: 87, cooling_1_mcwb: 73, heating_99_db: -6, heating_996_db: -11, summer_dp_04: 73, summer_hr: 105, winter_hr: 10 },
  { id: 'US-WI-MSN', name: 'Madison', state: 'WI', country: 'USA', lat: 43.13, lon: -89.34, elevation_ft: 866, cooling_04_db: 90, cooling_04_mcwb: 74, cooling_1_db: 87, cooling_1_mcwb: 73, heating_99_db: -9, heating_996_db: -14, summer_dp_04: 73, summer_hr: 105, winter_hr: 8 },
  
  // WYOMING
  { id: 'US-WY-CYS', name: 'Cheyenne', state: 'WY', country: 'USA', lat: 41.15, lon: -104.82, elevation_ft: 6141, cooling_04_db: 90, cooling_04_mcwb: 58, cooling_1_db: 87, cooling_1_mcwb: 57, heating_99_db: -4, heating_996_db: -10, summer_dp_04: 55, summer_hr: 55, winter_hr: 12 },
]

// ============================================
// CANADA - Major Cities
// ============================================

export const CANADA_LOCATIONS: ASHRAELocation[] = [
  { id: 'CA-ON-YYZ', name: 'Toronto', state: 'ON', country: 'Canada', lat: 43.68, lon: -79.63, elevation_ft: 569, cooling_04_db: 90, cooling_04_mcwb: 73, cooling_1_db: 87, cooling_1_mcwb: 72, heating_99_db: -1, heating_996_db: -7, summer_dp_04: 72, summer_hr: 100, winter_hr: 12 },
  { id: 'CA-ON-YOW', name: 'Ottawa', state: 'ON', country: 'Canada', lat: 45.32, lon: -75.67, elevation_ft: 374, cooling_04_db: 89, cooling_04_mcwb: 72, cooling_1_db: 86, cooling_1_mcwb: 71, heating_99_db: -13, heating_996_db: -20, summer_dp_04: 71, summer_hr: 98, winter_hr: 5 },
  { id: 'CA-QC-YUL', name: 'Montreal', state: 'QC', country: 'Canada', lat: 45.47, lon: -73.74, elevation_ft: 118, cooling_04_db: 88, cooling_04_mcwb: 72, cooling_1_db: 85, cooling_1_mcwb: 71, heating_99_db: -11, heating_996_db: -17, summer_dp_04: 71, summer_hr: 98, winter_hr: 6 },
  { id: 'CA-QC-YQB', name: 'Quebec City', state: 'QC', country: 'Canada', lat: 46.79, lon: -71.38, elevation_ft: 243, cooling_04_db: 85, cooling_04_mcwb: 70, cooling_1_db: 82, cooling_1_mcwb: 69, heating_99_db: -16, heating_996_db: -22, summer_dp_04: 69, summer_hr: 90, winter_hr: 5 },
  { id: 'CA-BC-YVR', name: 'Vancouver', state: 'BC', country: 'Canada', lat: 49.19, lon: -123.18, elevation_ft: 13, cooling_04_db: 79, cooling_04_mcwb: 65, cooling_1_db: 76, cooling_1_mcwb: 64, heating_99_db: 23, heating_996_db: 19, summer_dp_04: 62, summer_hr: 72, winter_hr: 30 },
  { id: 'CA-AB-YYC', name: 'Calgary', state: 'AB', country: 'Canada', lat: 51.11, lon: -114.02, elevation_ft: 3557, cooling_04_db: 86, cooling_04_mcwb: 60, cooling_1_db: 82, cooling_1_mcwb: 59, heating_99_db: -20, heating_996_db: -26, summer_dp_04: 56, summer_hr: 58, winter_hr: 5 },
  { id: 'CA-AB-YEG', name: 'Edmonton', state: 'AB', country: 'Canada', lat: 53.31, lon: -113.58, elevation_ft: 2373, cooling_04_db: 84, cooling_04_mcwb: 62, cooling_1_db: 81, cooling_1_mcwb: 61, heating_99_db: -26, heating_996_db: -31, summer_dp_04: 59, summer_hr: 65, winter_hr: 3 },
  { id: 'CA-MB-YWG', name: 'Winnipeg', state: 'MB', country: 'Canada', lat: 49.91, lon: -97.24, elevation_ft: 783, cooling_04_db: 89, cooling_04_mcwb: 72, cooling_1_db: 86, cooling_1_mcwb: 71, heating_99_db: -25, heating_996_db: -31, summer_dp_04: 70, summer_hr: 95, winter_hr: 3 },
  { id: 'CA-NS-YHZ', name: 'Halifax', state: 'NS', country: 'Canada', lat: 44.88, lon: -63.51, elevation_ft: 145, cooling_04_db: 81, cooling_04_mcwb: 68, cooling_1_db: 78, cooling_1_mcwb: 67, heating_99_db: 2, heating_996_db: -4, summer_dp_04: 67, summer_hr: 88, winter_hr: 15 },
]

// ============================================
// INTERNATIONAL - Common Destinations
// ============================================

export const INTERNATIONAL_LOCATIONS: ASHRAELocation[] = [
  // Europe
  { id: 'UK-LHR', name: 'London', country: 'United Kingdom', lat: 51.48, lon: -0.45, elevation_ft: 79, cooling_04_db: 84, cooling_04_mcwb: 65, cooling_1_db: 80, cooling_1_mcwb: 64, heating_99_db: 28, heating_996_db: 25, summer_dp_04: 63, summer_hr: 75, winter_hr: 35 },
  { id: 'FR-CDG', name: 'Paris', country: 'France', lat: 49.01, lon: 2.55, elevation_ft: 387, cooling_04_db: 89, cooling_04_mcwb: 68, cooling_1_db: 85, cooling_1_mcwb: 67, heating_99_db: 25, heating_996_db: 21, summer_dp_04: 66, summer_hr: 82, winter_hr: 30 },
  { id: 'DE-FRA', name: 'Frankfurt', country: 'Germany', lat: 50.03, lon: 8.57, elevation_ft: 364, cooling_04_db: 90, cooling_04_mcwb: 68, cooling_1_db: 86, cooling_1_mcwb: 67, heating_99_db: 14, heating_996_db: 9, summer_dp_04: 66, summer_hr: 82, winter_hr: 22 },
  { id: 'ES-MAD', name: 'Madrid', country: 'Spain', lat: 40.47, lon: -3.56, elevation_ft: 2001, cooling_04_db: 99, cooling_04_mcwb: 67, cooling_1_db: 96, cooling_1_mcwb: 66, heating_99_db: 27, heating_996_db: 23, summer_dp_04: 58, summer_hr: 62, winter_hr: 28 },
  { id: 'IT-FCO', name: 'Rome', country: 'Italy', lat: 41.79, lon: 12.25, elevation_ft: 49, cooling_04_db: 95, cooling_04_mcwb: 72, cooling_1_db: 92, cooling_1_mcwb: 71, heating_99_db: 32, heating_996_db: 29, summer_dp_04: 70, summer_hr: 95, winter_hr: 38 },
  { id: 'NL-AMS', name: 'Amsterdam', country: 'Netherlands', lat: 52.31, lon: 4.79, elevation_ft: -11, cooling_04_db: 81, cooling_04_mcwb: 66, cooling_1_db: 77, cooling_1_mcwb: 65, heating_99_db: 23, heating_996_db: 18, summer_dp_04: 64, summer_hr: 78, winter_hr: 30 },
  { id: 'CH-ZRH', name: 'Zurich', country: 'Switzerland', lat: 47.46, lon: 8.54, elevation_ft: 1417, cooling_04_db: 87, cooling_04_mcwb: 67, cooling_1_db: 84, cooling_1_mcwb: 66, heating_99_db: 12, heating_996_db: 7, summer_dp_04: 64, summer_hr: 78, winter_hr: 22 },
  
  // Asia Pacific
  { id: 'JP-NRT', name: 'Tokyo', country: 'Japan', lat: 35.76, lon: 140.39, elevation_ft: 141, cooling_04_db: 93, cooling_04_mcwb: 79, cooling_1_db: 91, cooling_1_mcwb: 78, heating_99_db: 30, heating_996_db: 27, summer_dp_04: 78, summer_hr: 130, winter_hr: 30 },
  { id: 'CN-PEK', name: 'Beijing', country: 'China', lat: 40.08, lon: 116.59, elevation_ft: 115, cooling_04_db: 97, cooling_04_mcwb: 74, cooling_1_db: 94, cooling_1_mcwb: 73, heating_99_db: 5, heating_996_db: -1, summer_dp_04: 74, summer_hr: 110, winter_hr: 10 },
  { id: 'CN-PVG', name: 'Shanghai', country: 'China', lat: 31.15, lon: 121.80, elevation_ft: 13, cooling_04_db: 96, cooling_04_mcwb: 80, cooling_1_db: 94, cooling_1_mcwb: 80, heating_99_db: 27, heating_996_db: 23, summer_dp_04: 80, summer_hr: 140, winter_hr: 32 },
  { id: 'HK-HKG', name: 'Hong Kong', country: 'Hong Kong', lat: 22.31, lon: 113.92, elevation_ft: 28, cooling_04_db: 94, cooling_04_mcwb: 80, cooling_1_db: 93, cooling_1_mcwb: 80, heating_99_db: 48, heating_996_db: 45, summer_dp_04: 81, summer_hr: 145, winter_hr: 50 },
  { id: 'SG-SIN', name: 'Singapore', country: 'Singapore', lat: 1.36, lon: 103.99, elevation_ft: 52, cooling_04_db: 93, cooling_04_mcwb: 80, cooling_1_db: 92, cooling_1_mcwb: 80, heating_99_db: 73, heating_996_db: 72, summer_dp_04: 80, summer_hr: 140, winter_hr: 100 },
  { id: 'AU-SYD', name: 'Sydney', country: 'Australia', lat: -33.95, lon: 151.18, elevation_ft: 21, cooling_04_db: 91, cooling_04_mcwb: 72, cooling_1_db: 87, cooling_1_mcwb: 71, heating_99_db: 42, heating_996_db: 39, summer_dp_04: 72, summer_hr: 100, winter_hr: 45 },
  { id: 'AU-MEL', name: 'Melbourne', country: 'Australia', lat: -37.67, lon: 144.85, elevation_ft: 433, cooling_04_db: 97, cooling_04_mcwb: 68, cooling_1_db: 93, cooling_1_mcwb: 66, heating_99_db: 37, heating_996_db: 34, summer_dp_04: 64, summer_hr: 78, winter_hr: 42 },
  
  // Middle East
  { id: 'AE-DXB', name: 'Dubai', country: 'UAE', lat: 25.25, lon: 55.36, elevation_ft: 62, cooling_04_db: 113, cooling_04_mcwb: 79, cooling_1_db: 111, cooling_1_mcwb: 78, heating_99_db: 52, heating_996_db: 48, summer_dp_04: 80, summer_hr: 140, winter_hr: 55 },
  { id: 'IL-TLV', name: 'Tel Aviv', country: 'Israel', lat: 32.00, lon: 34.90, elevation_ft: 135, cooling_04_db: 94, cooling_04_mcwb: 76, cooling_1_db: 92, cooling_1_mcwb: 76, heating_99_db: 41, heating_996_db: 38, summer_dp_04: 77, summer_hr: 120, winter_hr: 50 },
  
  // Americas
  { id: 'MX-MEX', name: 'Mexico City', country: 'Mexico', lat: 19.44, lon: -99.07, elevation_ft: 7349, cooling_04_db: 84, cooling_04_mcwb: 57, cooling_1_db: 82, cooling_1_mcwb: 56, heating_99_db: 37, heating_996_db: 35, summer_dp_04: 55, summer_hr: 55, winter_hr: 40 },
  { id: 'BR-GRU', name: 'São Paulo', country: 'Brazil', lat: -23.63, lon: -46.66, elevation_ft: 2624, cooling_04_db: 91, cooling_04_mcwb: 73, cooling_1_db: 88, cooling_1_mcwb: 72, heating_99_db: 46, heating_996_db: 43, summer_dp_04: 72, summer_hr: 100, winter_hr: 50 },
]

// ============================================
// Combined Export
// ============================================

export const ALL_LOCATIONS: ASHRAELocation[] = [
  ...US_LOCATIONS,
  ...CANADA_LOCATIONS,
  ...INTERNATIONAL_LOCATIONS,
]

// ============================================
// Helper Functions
// ============================================

/**
 * Get location by ID
 */
export function getLocationById(id: string): ASHRAELocation | undefined {
  return ALL_LOCATIONS.find(loc => loc.id === id)
}

/**
 * Search locations by name, state, or country
 */
export function searchLocations(query: string): ASHRAELocation[] {
  const lowerQuery = query.toLowerCase()
  return ALL_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(lowerQuery) ||
    loc.state?.toLowerCase().includes(lowerQuery) ||
    loc.country.toLowerCase().includes(lowerQuery) ||
    loc.id.toLowerCase().includes(lowerQuery)
  ).slice(0, 20) // Limit results for performance
}

/**
 * Get locations by country
 */
export function getLocationsByCountry(country: string): ASHRAELocation[] {
  return ALL_LOCATIONS.filter(loc => loc.country === country)
}

/**
 * Get US locations by state
 */
export function getLocationsByState(state: string): ASHRAELocation[] {
  return US_LOCATIONS.filter(loc => loc.state === state)
}

/**
 * Get all unique US states
 */
export function getUSStates(): string[] {
  const states = new Set(US_LOCATIONS.map(loc => loc.state).filter(Boolean))
  return Array.from(states).sort() as string[]
}

/**
 * Get design temperatures for a location
 */
export function getDesignTemps(
  locationId: string,
  coolingCondition: '0.4%' | '1%' = '0.4%',
  heatingCondition: '99%' | '99.6%' = '99%'
): {
  coolingDb: number
  coolingWb: number
  heatingDb: number
  elevation: number
} | null {
  const loc = getLocationById(locationId)
  if (!loc) return null
  
  return {
    coolingDb: coolingCondition === '0.4%' ? loc.cooling_04_db : loc.cooling_1_db,
    coolingWb: coolingCondition === '0.4%' ? loc.cooling_04_mcwb : loc.cooling_1_mcwb,
    heatingDb: heatingCondition === '99%' ? loc.heating_99_db : loc.heating_996_db,
    elevation: loc.elevation_ft,
  }
}

/**
 * Calculate altitude correction factor
 * Based on barometric pressure ratio at altitude
 */
export function getAltitudeCorrectionFactor(elevation_ft: number): number {
  // Standard atmosphere formula: P/P0 = (1 - 0.0000068753 * h)^5.2559
  // Density ratio approximately follows the same
  return Math.pow(1 - 0.0000068753 * elevation_ft, 5.2559)
}

/**
 * Format location for display
 */
export function formatLocationDisplay(loc: ASHRAELocation): string {
  if (loc.state) {
    return `${loc.name}, ${loc.state}`
  }
  return `${loc.name}, ${loc.country}`
}

/**
 * Format design conditions preview
 */
export function formatDesignConditionsPreview(loc: ASHRAELocation): string {
  return `Summer: ${loc.cooling_04_db}°F DB / ${loc.cooling_04_mcwb}°F WB | Winter: ${loc.heating_99_db}°F`
}
