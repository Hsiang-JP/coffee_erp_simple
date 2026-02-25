import { execute, wrapInTransaction } from '../dbSetup';
import { generateUuid } from '../../utils/allocation';

/**
 * @typedef {Object} SelectedBag
 * @property {string} id - The ID of the bag.
 * @property {string} lot_id - The ID of the lot the bag belongs to.
 * @property {number} weight_kg - The weight of the bag in kilograms.
 */

/**
 * Finalizes a coffee allocation by creating a new contract,
 * updating the status of selected bags, and calculating the final sale price.
 * Ensures atomicity using a database transaction.
 *
 * @param {string} client_id - The ID of the client making the allocation.
 * @param {SelectedBag[]} selectedBags - An array of bags selected for allocation.
 * @param {Object} contractDetails - Additional details for the contract (e.g., client_name, delivery_date).
 * @returns {Promise<{success: boolean, contractId: string, publicId: string, salePricePerKg: number}>} - An object indicating success, the new contract ID, public ID, and calculated sale price per kg.
 * @throws {Error} If any selected bag is not available or already allocated, or if any database operation fails.
 */
export async function finalizeAllocation(client_id, selectedBags, contractDetails) {
  return wrapInTransaction(async () => {
    const contractId = `contract-${generateUuid()}`;
    const publicId = `C-${generateUuid().slice(0, 8)}`; // Use a portion of UUID for publicId

    // 1. Create a new entry in the contracts table
    await execute(
      `INSERT INTO contracts (id, public_id, client_id, required_quality_score, sale_price_per_kg, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [contractId, publicId, client_id, contractDetails.required_quality_score || 0, 0, 'Processing']
    );

    let totalContractCost = 0;
    let totalContractWeight = 0;
    const uniqueLotIds = [...new Set(selectedBags.map(bag => bag.lot_id))];

    // 2. Conflict Prevention and Bag Updates (Optimized)
    const bagIds = selectedBags.map(bag => bag.id);
    const bagPlaceholders = bagIds.map(() => '?').join(', ');

    // Fetch all bag info in one query
    const existingBags = await execute(
      `SELECT id, status, contract_id FROM bags WHERE id IN (${bagPlaceholders})`,
      bagIds
    );

    const existingBagsMap = new Map(existingBags.map(bag => [bag.id, bag]));

    for (const bag of selectedBags) {
      const bagInfo = existingBagsMap.get(bag.id);
      if (!bagInfo || bagInfo.status !== 'Available' || bagInfo.contract_id !== null) {
        throw new Error(`Bag ${bag.id} is not available or already allocated.`);
      }
      totalContractWeight += bag.weight_kg;
    }

    // Update all bags. Individual updates are acceptable within a transaction after batched validation.
    for (const bag of selectedBags) {
      await execute(
        `UPDATE bags SET status = 'Allocated', contract_id = ? WHERE id = ?`,
        [contractId, bag.id]
      );
    }

    // 3. Calculate Final Price (sale_price_per_kg) (Optimized)
    const uniqueLotIdsPlaceholders = uniqueLotIds.map(() => '?').join(', ');

    // Fetch all lot base costs
    const lotsData = await execute(
      `SELECT id, base_farm_cost_per_kg FROM lots WHERE id IN (${uniqueLotIdsPlaceholders})`,
      uniqueLotIds
    );
    const lotsMap = new Map(lotsData.map(lot => [lot.id, lot]));

    // Fetch all cost ledger sums
    const costLedgerSums = await execute(
      `SELECT lot_id, SUM(amount_usd) as total_additional_cost FROM cost_ledger WHERE lot_id IN (${uniqueLotIdsPlaceholders}) GROUP BY lot_id`,
      uniqueLotIds
    );
    const costLedgerMap = new Map(costLedgerSums.map(item => [item.lot_id, item.total_additional_cost]));

    for (const lotId of uniqueLotIds) {
      const lot = lotsMap.get(lotId);
      if (!lot) {
        throw new Error(`Lot ${lotId} not found.`);
      }

      const additionalCost = costLedgerMap.get(lotId) || 0;

      const weightFromThisLot = selectedBags
        .filter(bag => bag.lot_id === lotId)
        .reduce((sum, bag) => sum + bag.weight_kg, 0);

      totalContractCost += (lot.base_farm_cost_per_kg * weightFromThisLot) + additionalCost;
    }

    const salePricePerKg = totalContractWeight > 0 ? totalContractCost / totalContractWeight : 0;

    // Update the contract with the calculated sale_price_per_kg
    await execute(
      `UPDATE contracts SET sale_price_per_kg = ? WHERE id = ?`,
      [salePricePerKg, contractId]
    );

    return { success: true, contractId, publicId, salePricePerKg };
  });
}
