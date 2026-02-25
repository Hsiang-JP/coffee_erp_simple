import { execute, wrapInTransaction } from '../dbSetup';
import { generateStockCodes } from '../../utils/warehouseUtils';

/**
 * Refactored lot purchase transaction.
 * Extracts logic from dbSetup.js and aligns with new schema column names.
 * 
 * @param {Object} lotData - Data for the new lot.
 * @param {string} lotData.farm_id - ID of the farm.
 * @param {string} lotData.variety - Coffee variety.
 * @param {string} lotData.process_method - Processing method.
 * @param {number} lotData.total_weight_kg - Total weight of the lot.
 * @param {number} lotData.base_farm_cost_per_kg - Base cost paid to the farm per kg.
 * @returns {Promise<Object>} - Object containing success status, public ID, and number of bags created.
 */
export async function buyLotTransaction(lotData) {
  const { farm_id, variety, process_method, total_weight_kg, base_farm_cost_per_kg } = lotData;
  const lotId = `lot-${Date.now()}`;
  const lotPublicId = `L-${String(Date.now()).slice(-4)}`;
  const BAG_SIZE = 69.0;
  const numBags = Math.ceil(total_weight_kg / BAG_SIZE);
  const remainder = total_weight_kg % BAG_SIZE;

  return wrapInTransaction(async () => {
    // 1. Create the Lot record
    await execute(`
      INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, base_farm_cost_per_kg, harvest_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      lotId, 
      lotPublicId, 
      farm_id, 
      variety, 
      process_method, 
      total_weight_kg, 
      base_farm_cost_per_kg, 
      new Date().toISOString().split('T')[0]
    ]);

    // 2. Determine stock codes for bags using warehouse utility
    // We order by ID to get the literal last bag inserted, ensuring continuous stacking.
    const lastBag = await execute(`SELECT stock_code FROM bags ORDER BY id DESC LIMIT 1`);
    const lastCode = lastBag.length > 0 ? lastBag[0].stock_code : null;
    const newCodes = generateStockCodes(lastCode, numBags);

    // 3. Create Bags and initial Milestones in batches
    const bagValues = [];
    const bagPlaceholders = [];
    const msValues = [];
    const msPlaceholders = [];

    for (let i = 0; i < numBags; i++) {
      const bagId = `bag-${lotId}-${i}`;
      const bagPublicId = `B-${lotPublicId}-${i + 1}`;
      const stockCode = newCodes[i];
      const currentBagWeight = (i === numBags - 1 && remainder > 0) ? remainder : BAG_SIZE;

      bagPlaceholders.push('(?, ?, ?, ?, ?, ?, ?)');
      bagValues.push(bagId, bagPublicId, lotId, currentBagWeight, stockCode, 'Cora', 'Available');

      msPlaceholders.push('(?, ?, ?)');
      msValues.push(`ms-${bagId}`, bagId, 'Farm');
    }

    if (numBags > 0) {
      // Use location instead of warehouse_location as per new schema
      await execute(`
        INSERT INTO bags (id, public_id, lot_id, weight_kg, stock_code, location, status)
        VALUES ${bagPlaceholders.join(', ')}
      `, bagValues);

      // Initial milestone at 'Farm' stage.
      await execute(`
        INSERT INTO bag_milestones (id, bag_id, current_stage)
        VALUES ${msPlaceholders.join(', ')}
      `, msValues);
    }

    return { success: true, lotPublicId, numBags };
  });
}
