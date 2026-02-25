import { execute, wrapInTransaction } from '../dbSetup';

// Helper to determine the strictly enforced stage sequence
export function getNextStage(currentStage) {
  const stages = ['Farm', 'Cora', 'Port-Export', 'Port-Import', 'Final Destination'];
  const idx = stages.indexOf(currentStage);
  return idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null;
}

export async function advanceContractStage(contractId, totalInputCost) {
  return await wrapInTransaction(async () => {
    // 1. Get the ACTUAL total weight of all bags in this contract
    const bagsQuery = await execute(
      `SELECT SUM(weight_kg) as total_weight FROM bags WHERE contract_id = ?`, 
      [contractId]
    );
    
    // Fallback to 1 to prevent dividing by zero
    const totalWeight = bagsQuery[0]?.total_weight || 1; 

    // 2. Get the current stage from the milestones
    const stageQuery = await execute(
      `SELECT current_stage FROM bag_milestones WHERE contract_id = ? LIMIT 1`, 
      [contractId]
    );

    if (!stageQuery.length) throw new Error("Contract milestones not found.");
    const currentStage = stageQuery[0].current_stage;

    // 3. 🧮 THE MATH FIX: Total USD / Total KG
    // Example: $100 input / 276 kg = $0.3623 per kg
    const costPerKg = totalInputCost / totalWeight;

    // 4. Determine next stage
    const nextStage = getNextStage(currentStage);
    if (!nextStage) throw new Error("Contract is already at Final Destination");

    // 5. Map the stage to the correct cost column
    const columnMap = {
      'Farm': 'cost_to_warehouse',
      'Cora': 'cost_to_export',
      'Port-Export': 'cost_to_import',
      'Port-Import': 'cost_to_client'
    };
    const col = columnMap[currentStage];

    // 6. Update the Database
    await execute(`
      UPDATE bag_milestones 
      SET current_stage = ?, 
          ${col} = COALESCE(${col}, 0) + ? 
      WHERE contract_id = ?`, 
      [nextStage, costPerKg, contractId]
    );
    
    // Keep the bags table location synced with the milestone stage
    await execute(
      `UPDATE bags SET location = ? WHERE contract_id = ?`, 
      [nextStage, contractId]
    );

    return { success: true };
  });
}