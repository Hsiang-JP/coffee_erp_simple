import { execute, wrapInTransaction } from '../dbSetup';
import { generateUuid } from '../../utils/allocation';

/**
 * Finalizes a coffee allocation by creating a new contract and
 * updating the status of selected bags.
 * Ensures atomicity using a database transaction.
 */
export async function finalizeAllocation(client_id, selectedBags, contractDetails) {
  return wrapInTransaction(async () => {
    const contractId = `contract-${generateUuid()}`;
    const publicId = `C-${generateUuid().slice(0, 8)}`; 
    
    // Extract the negotiated sale price (default to 0 if not provided)
    const negotiatedSalePrice = contractDetails.sale_price_per_kg || 0;

    // 1. Create a new entry in the contracts table with the REAL sale price
    await execute(
      `INSERT INTO contracts (id, public_id, client_id, required_quality_score, sale_price_per_kg, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [contractId, publicId, client_id, contractDetails.required_quality_score || 0, negotiatedSalePrice, 'Processing']
    );

    // 2. Conflict Prevention and Bag Updates
    const bagIds = selectedBags.map(bag => bag.id);
    const bagPlaceholders = bagIds.map(() => '?').join(', ');

    // Fetch all bag info in one query to verify availability
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
    }

    // Update all selected bags to link them to this contract
    for (const bag of selectedBags) {
      await execute(
        `UPDATE bags SET status = 'Allocated', contract_id = ? WHERE id = ?`,
        [contractId, bag.id]
      );
    }

    // 3. Return the exact negotiated price back to the UI
    return { 
      success: true, 
      contractId, 
      publicId, 
      salePricePerKg: negotiatedSalePrice 
    };
  });
}