import { execute } from '../db/dbSetup';

// The API Fetcher (Internal use only)
const fetchFromAPI = async (query) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
    }
    return null;
  } catch (error) {
    console.warn(`API failed for query: ${query}`);
    return null;
  }
};

/**
 * 🕵️‍♂️ THE AGENT: Checks the Local Island first, falls back to API, and saves new discoveries.
 */
// 🚨 FIX: Removed locationType parameter
export const getOrAddLocation = async (locationName) => { 
  // 1. Check the local database (The Island)
  try {
    const existing = await execute(`SELECT * FROM locations WHERE name = ?`, [locationName]);
    if (existing.length > 0) {
      console.log(`📍 Loaded from Local Island: ${locationName}`);
      return existing[0]; // Returns {id, name, latitude, longitude}
    }
  } catch (e) {
    console.error("Local lookup failed", e);
  }

  // 2. Not found locally. Use the API (Requires Internet this one time)
  console.log(`🌐 Fetching from API: ${locationName}`);
  const coords = await fetchFromAPI(locationName);
  
  // 3. Fallback safely if API fails or location is totally unknown
  const finalLon = coords ? coords[0] : 0; 
  const finalLat = coords ? coords[1] : 0; 

  // 4. Save to the Island so we never have to ask the API again
  const newId = `loc-${Date.now()}`;
  try {
    // 🚨 FIX: Removed 'type' from the INSERT statement entirely
    await execute(
      `INSERT INTO locations (id, name, latitude, longitude) VALUES (?, ?, ?, ?)`,
      [newId, locationName, finalLat, finalLon]
    );
  } catch (e) {
    console.error("Failed to save to Island", e);
  }

  return { id: newId, name: locationName, latitude: finalLat, longitude: finalLon };
};

/**
 * 🌍 OMNI-SCANNER: Scans all geographic fields across both tables
 */
export const syncAllDatabaseLocations = async (onProgress) => {
  const farmRegions = await execute(`SELECT DISTINCT region FROM farms WHERE region IS NOT NULL AND region != ''`);
  const farmLocations = await execute(`SELECT DISTINCT location FROM farms WHERE location IS NOT NULL AND location != ''`);
  
  const clientPorts = await execute(`SELECT DISTINCT destination_port FROM clients WHERE destination_port IS NOT NULL AND destination_port != ''`);
  const clientCities = await execute(`SELECT DISTINCT destination_city FROM clients WHERE destination_city IS NOT NULL AND destination_city != ''`);
  const clientCountries = await execute(`SELECT DISTINCT destination_country FROM clients WHERE destination_country IS NOT NULL AND destination_country != ''`);

  // 2. Flatten into a unique list of exact database strings
  // 🚨 FIX: No longer tracking types, just grabbing the names
  const rawList = [
    ...farmRegions.map(f => f.region),
    ...farmLocations.map(f => f.location),
    ...clientPorts.map(c => c.destination_port),
    ...clientCities.map(c => c.destination_city),
    ...clientCountries.map(c => c.destination_country)
  ].filter(name => name && name.trim() !== "");

  // Remove duplicates
  const uniqueList = [...new Set(rawList)];

  let count = 0;
  for (const locationName of uniqueList) {
    count++;
    if (onProgress) onProgress(`Syncing ${count}/${uniqueList.length}: ${locationName}`);
    
    // 🚨 FIX: Only pass the name to the agent
    await getOrAddLocation(locationName);

    // 🛑 IMPORTANT: Nominatim API requires 1-second delay between requests
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  return uniqueList.length;
};