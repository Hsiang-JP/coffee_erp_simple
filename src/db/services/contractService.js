import { execute, wrapInTransaction } from '../dbSetup';

export function getNextStage(currentStage) {
  const stages = ['Farm', 'Cora', 'Port-Export', 'Port-Import', 'Final Destination'];
  const idx = stages.indexOf(currentStage);
  return idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null;
}

export async function advanceContractStage(contractId, totalInputCost) {
  return await wrapInTransaction(async () => {
    // 1. Get current state and weight
    const bagsQuery = await execute(`SELECT SUM(weight_kg) as total_weight FROM bags WHERE contract_id = ?`, [contractId]);
    const totalWeight = bagsQuery[0]?.total_weight || 1; 

    const stageQuery = await execute(`SELECT current_stage FROM bag_milestones WHERE contract_id = ? LIMIT 1`, [contractId]);
    if (!stageQuery.length) throw new Error("Contract milestones not found.");
    
    const currentStage = stageQuery[0].current_stage;
    const nextStage = getNextStage(currentStage);
    
    if (!nextStage) throw new Error("Contract is already at Final Destination");

    // 2. Math Calculation
    const costPerKg = parseFloat(totalInputCost) / totalWeight;

    // 3. Map the stage to the correct cost column
    const columnMap = {
      'Farm': 'cost_to_warehouse',
      'Cora': 'cost_to_export',
      'Port-Export': 'cost_to_import',
      'Port-Import': 'cost_to_client'
    };
    
    const col = columnMap[currentStage];
    if (!col) throw new Error(`Could not map cost column for stage: ${currentStage}`);

    // 4. Update Milestones (Logs the cost and moves the stage)
    await execute(`
      UPDATE bag_milestones 
      SET current_stage = ?, ${col} = COALESCE(${col}, 0) + ? 
      WHERE contract_id = ?`, 
      [nextStage, costPerKg, contractId]
    );
    
    // 5. Update physical location of the bags
    await execute(`UPDATE bags SET location = ? WHERE contract_id = ?`, [nextStage, contractId]);

    // 🚨 6. THE FIX: Clear from Warehouse Grid when leaving Cora
    if (nextStage === 'Port-Export') {
      // By setting stock_code to NULL, it drops off the Allocation visualizer!
      await execute(`UPDATE bags SET status = 'Shipped', stock_code = NULL WHERE contract_id = ?`, [contractId]);
      console.log(`🚚 Contract ${contractId} left Cora. Bags marked Shipped and shelves cleared.`);
    }

    // 7. Synchronize final contract status
    if (nextStage === 'Final Destination') {
      // Update Contract to 'Fulfilled'
      await execute(`UPDATE contracts SET status = 'Fulfilled' WHERE id = ?`, [contractId]);
      
      // Re-affirm Shipped status just to be safe
      await execute(`UPDATE bags SET status = 'Shipped' WHERE contract_id = ?`, [contractId]);
      
      console.log(`✅ Contract ${contractId} fulfilled. Process complete.`);
    }

    return { success: true };
  });
}