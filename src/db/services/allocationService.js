import { execute, wrapInTransaction } from '../dbSetup';
import { generateUuid } from '../../utils/allocation';

export async function finalizeAllocation(client_id, selectedBags, contractDetails) {
  const details = contractDetails || {};
  
  return wrapInTransaction(async () => {
    const contractId = `contract-${generateUuid()}`;
    const publicId = `C-${generateUuid().slice(0, 8)}`; 
    const negotiatedSalePrice = details.sale_price_per_kg || 0;

    // 1. Create a new entry in the contracts table
    await execute(
      `INSERT INTO contracts (id, public_id, client_id, required_quality_score, sale_price_per_kg, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [contractId, publicId, client_id, details.required_quality_score || 0, negotiatedSalePrice, 'Processing']
    );

    // 2. Conflict Prevention and Bag Verification
    const bagIds = selectedBags.map(bag => String(bag.id));
    if (bagIds.length === 0) throw new Error("No bags selected.");
    
    const placeholders = bagIds.map(() => '?').join(', ');

    const existingBags = await execute(
      `SELECT id, status, contract_id, location FROM bags WHERE id IN (${placeholders})`,
      bagIds
    );

    const existingBagsMap = new Map(existingBags.map(bag => [String(bag.id), bag]));

    for (const id of bagIds) {
      const bagInfo = existingBagsMap.get(id);
      if (!bagInfo || bagInfo.status !== 'Available' || bagInfo.contract_id != null) {
        throw new Error(`Bag ${id} is not available or already allocated.`);
      }
    }

    // 3. Update all selected bags to link them to this contract
    await execute(
      `UPDATE bags SET status = 'Allocated', contract_id = ? WHERE id IN (${placeholders})`,
      [contractId, ...bagIds]
    );

    // 4. BULK UPSERT Bag Milestones
    const milestonePlaceholders = [];
    const milestoneValues = [];

    for (const id of bagIds) {
      // 🚨 THE FIX: Ignore physical bag location. Force the financial journey to start at the Farm.
      const safeStage = 'Farm'; 
      
      milestonePlaceholders.push(`(?, ?, ?, ?)`);
      milestoneValues.push(`ms-${generateUuid()}`, id, contractId, safeStage);
    }

    if (milestonePlaceholders.length > 0) {
      await execute(
        `INSERT INTO bag_milestones (id, bag_id, contract_id, current_stage) 
         VALUES ${milestonePlaceholders.join(', ')}
         ON CONFLICT(bag_id) DO UPDATE SET 
           contract_id = excluded.contract_id,
           current_stage = excluded.current_stage;`,
        milestoneValues
      );
    }

    // 5. Return the exactly negotiated price back to the UI
    return { 
      success: true, 
      contractId, 
      publicId, 
      salePricePerKg: negotiatedSalePrice 
    };
  });
}