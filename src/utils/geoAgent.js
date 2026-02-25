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
export const getOrAddLocation = async (locationName, locationType = 'Other') => {
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
  const finalLon = coords ? coords[0] : 0; // Or a safe default
  const finalLat = coords ? coords[1] : 0; // Or a safe default

  // 4. Save to the Island so we never have to ask the API again
  const newId = `loc-${Date.now()}`;
  try {
    await execute(
      `INSERT INTO locations (id, name, type, latitude, longitude) VALUES (?, ?, ?, ?, ?)`,
      [newId, locationName, locationType, finalLat, finalLon]
    );
  } catch (e) {
    console.error("Failed to save to Island", e);
  }

  return { id: newId, name: locationName, latitude: finalLat, longitude: finalLon };
};




export const syncAllDatabaseLocations = async (onProgress) => {
  // 1. Collect all unique strings that need coordinates
  const farmRegions = await execute(`SELECT DISTINCT region FROM farms`);
  const clientPorts = await execute(`SELECT DISTINCT destination_port FROM clients`);
  const clientCities = await execute(`SELECT DISTINCT destination_city FROM clients`);

  // 2. Flatten into a unique list of addresses
  const rawList = [
    ...farmRegions.map(f => ({ name: `${f.region}, Peru`, type: 'Farm/Region' })),
    ...clientPorts.map(c => ({ name: c.destination_port, type: 'Port' })),
    ...clientCities.map(c => ({ name: c.destination_city, type: 'Client/City' }))
  ].filter(item => item.name && item.name !== "");

  // Remove duplicates
  const uniqueList = Array.from(new Set(rawList.map(a => a.name)))
    .map(name => rawList.find(a => a.name === name));

  let count = 0;
  for (const item of uniqueList) {
    count++;
    if (onProgress) onProgress(`Syncing ${count}/${uniqueList.length}: ${item.name}`);
    
    // Call the Agent (which checks the DB first, then API)
    await getOrAddLocation(item.name, item.type);

    // 🛑 IMPORTANT: Nominatim API requires 1-second delay between requests
    await new Promise(resolve => setTimeout(resolve, 1100));
  }

  return uniqueList.length;
};