import { execute, getNextStage, getCostFieldForTransition, wrapInTransaction } from '../dbSetup';

/**
 * Advances the stage of all bags associated with a contract.
 * Updates the relevant cost field and the current stage.
 * Relies on the database trigger 'update_final_price_after_milestone' for price calculations.
 * 
 * @param {string} contractId - ID of the contract.
 * @param {number} costValue - Cost incurred during this transition.
 * @returns {Promise<Object>} - Object containing success status and the next stage.
 */
export async function advanceContractStage(contractId, costValue) {
  return wrapInTransaction(async () => {
    // 1. Determine the current stage of the bags in this contract
    const bagRes = await execute(`
      SELECT bm.current_stage 
      FROM bag_milestones bm
      JOIN bags b ON bm.bag_id = b.id
      WHERE b.contract_id = ?
      LIMIT 1
    `, [contractId]);
    
    if (bagRes.length === 0) {
      throw new Error("No milestones found for this contract");
    }

    const currentStage = bagRes[0].current_stage;
    const nextStage = getNextStage(currentStage);

    if (!nextStage) {
      throw new Error("Already at final destination");
    }

    const costField = getCostFieldForTransition(currentStage); 

    // 2. Update milestones with the new cost and stage
    // This update will trigger 'update_final_price_after_milestone' in the DB
    // which automatically recalculates final_sale_price.
    await execute(`
      UPDATE bag_milestones 
      SET ${costField} = ?, current_stage = ? 
      WHERE bag_id IN (SELECT id FROM bags WHERE contract_id = ?)
    `, [Number(costValue) || 0, nextStage, contractId]);

    // 3. Update bag location and status
    // Aligning with new schema column names: 'location' and 'contract_id'
    // We update the location in the bags table to match the new stage.
    // If the next stage is 'Port-Export', we also update the status to 'Shipped'.
    
    let statusUpdate = '';
    if (nextStage === 'Port-Export') {
      statusUpdate = ", status = 'Shipped'";
    }

    await execute(`
      UPDATE bags 
      SET location = ? ${statusUpdate}
      WHERE contract_id = ?
    `, [nextStage, contractId]);

    // 4. Update contract status if complete
    if (nextStage === 'Final Destination') {
      await execute(`UPDATE contracts SET status = 'Fulfilled' WHERE id = ?`, [contractId]);
    }

    return { success: true, nextStage };
  });
}
