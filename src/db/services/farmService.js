import { execute } from '../dbSetup';

/**
 * Fetches all farms.
 */
export async function getFarms() {
  return await execute('SELECT * FROM farms ORDER BY name ASC');
}

/**
 * Creates a new farm.
 * @param {Object} farmData 
 */
export async function createFarm(farmData) {
  const { producerId, name, region, altitude, location, certification } = farmData;
  return await execute(
    'INSERT INTO farms (id, producer_id, name, region, altitude_meters, location, certification) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [`farm-${Date.now()}`, producerId, name, region, parseFloat(altitude) || null, location, certification]
  );
}
