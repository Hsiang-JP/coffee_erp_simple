/**
 * MathAuditor utility for "Shadow Math" verification.
 * Provides methods to verify financial calculations in the Coffee ERP.
 */
export class MathAuditor {
  constructor({ execute } = {}) {
    this.execute = execute;
  }

  /**
   * Manually calculates the landed cost for a specific lot.
   */
  async calculateLandedCost(lotId) {
    const lotRes = await this.execute(
      'SELECT base_farm_cost_per_kg, total_weight_kg FROM lots WHERE id = ?',
      [lotId]
    );

    if (lotRes.length === 0) {
      throw new Error(`Lot ${lotId} not found`);
    }

    const { base_farm_cost_per_kg, total_weight_kg } = lotRes[0];

    const ledgerRes = await this.execute(
      'SELECT SUM(amount_usd) as total_additional_cost FROM cost_ledger WHERE lot_id = ?',
      [lotId]
    );

    const totalAdditionalCost = ledgerRes[0].total_additional_cost || 0;
    const additionalCostPerKg = total_weight_kg > 0 ? totalAdditionalCost / total_weight_kg : 0;
    const calculatedLandedCost = base_farm_cost_per_kg + additionalCostPerKg;

    const viewRes = await this.execute(
      'SELECT current_per_kg_cost FROM available_inventory_optimization WHERE lot_id = ? LIMIT 1',
      [lotId]
    );

    let discrepancy = 0;
    if (viewRes.length > 0) {
      discrepancy = Math.abs(calculatedLandedCost - viewRes[0].current_per_kg_cost);
    }

    return {
      calculated: Number(calculatedLandedCost.toFixed(4)),
      discrepancy: Number(discrepancy.toFixed(4)),
      details: {
        baseCost: base_farm_cost_per_kg,
        totalAdditionalCost,
        totalWeight: total_weight_kg,
        additionalCostPerKg
      }
    };
  }

  /**
   * Verifies the contract cost integrity and detects margin issues.
   */
  async verifyContractPrice(contractId) {
    const contractRes = await this.execute(
      'SELECT sale_price_per_kg FROM contracts WHERE id = ?',
      [contractId]
    );

    if (contractRes.length === 0) {
      throw new Error(`Contract ${contractId} not found`);
    }

    const revenuePerKg = contractRes[0].sale_price_per_kg;

    // Get the DB's calculated landed cost from the view
    const journeyRes = await this.execute(
      'SELECT total_landed FROM vw_contract_journey WHERE contract_id = ?',
      [contractId]
    );
    const dbLandedCost = journeyRes.length > 0 ? journeyRes[0].total_landed : 0;

    const bags = await this.execute(
      'SELECT id, lot_id, weight_kg FROM bags WHERE contract_id = ?',
      [contractId]
    );

    if (bags.length === 0) {
      return {
        calculated: 0,
        actual: dbLandedCost,
        discrepancy: dbLandedCost,
        isMatch: dbLandedCost === 0,
        margin: revenuePerKg
      };
    }

    let totalShadowCost = 0;
    let totalContractWeight = 0;

    const uniqueLotIds = [...new Set(bags.map(bag => bag.lot_id))];
    const lotDataMap = new Map();

    // Pre-fetch lot data (base cost and total ledger)
    for (const lotId of uniqueLotIds) {
      const lotRes = await this.execute(
        'SELECT base_farm_cost_per_kg, total_weight_kg FROM lots WHERE id = ?',
        [lotId]
      );
      if (lotRes.length === 0) continue;

      const ledgerRes = await this.execute(
        'SELECT SUM(amount_usd) as total_additional_cost FROM cost_ledger WHERE lot_id = ?',
        [lotId]
      );
      
      lotDataMap.set(lotId, {
        baseCost: lotRes[0].base_farm_cost_per_kg,
        totalWeight: lotRes[0].total_weight_kg,
        ledgerTotal: ledgerRes[0].total_additional_cost || 0
      });
    }

    // Calculate shadow cost bag-by-bag for maximum precision
    for (const bag of bags) {
      const lot = lotDataMap.get(bag.lot_id);
      if (!lot) continue;

      // 1. Proportional Ledger Cost Per KG for this lot
      const ledgerPerKg = lot.totalWeight > 0 ? lot.ledgerTotal / lot.totalWeight : 0;

      // 2. Logistics Cost Per KG for this bag (stored as per-kg in milestones)
      const milestoneRes = await this.execute(`
        SELECT 
          (COALESCE(cost_to_warehouse, 0) + COALESCE(cost_to_export, 0) + 
           COALESCE(cost_to_import, 0) + COALESCE(cost_to_client, 0)) as per_kg_logistics
        FROM bag_milestones 
        WHERE bag_id = ?
      `, [bag.id]);
      
      const logisticsPerKg = milestoneRes.length > 0 ? milestoneRes[0].per_kg_logistics : 0;

      // Total Cost for this bag = (Base + LedgerPerKg + LogisticsPerKg) * BagWeight
      const bagCost = (lot.baseCost + ledgerPerKg + logisticsPerKg) * bag.weight_kg;
      
      totalShadowCost += bagCost;
      totalContractWeight += bag.weight_kg;
    }

    const shadowLandedCost = totalContractWeight > 0 ? totalShadowCost / totalContractWeight : 0;
    
    // Discrepancy is between Shadow Math and DB Calculated Landed Cost
    const discrepancy = Math.abs(shadowLandedCost - dbLandedCost);
    const isMatch = discrepancy < 0.0001;
    const margin = revenuePerKg - dbLandedCost;

    return {
      calculated: Number(shadowLandedCost.toFixed(4)),
      actual: Number(dbLandedCost.toFixed(4)),
      discrepancy: Number(discrepancy.toFixed(4)),
      isMatch,
      margin: Number(margin.toFixed(4)),
      revenue: revenuePerKg
    };
  }
}
