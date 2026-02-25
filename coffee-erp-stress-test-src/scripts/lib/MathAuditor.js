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
   * Verifies the contract price by recalculating it from constituent bags and lots.
   */
  async verifyContractPrice(contractId) {
    const contractRes = await this.execute(
      'SELECT sale_price_per_kg FROM contracts WHERE id = ?',
      [contractId]
    );

    if (contractRes.length === 0) {
      throw new Error(`Contract ${contractId} not found`);
    }

    const actualPrice = contractRes[0].sale_price_per_kg;

    const bags = await this.execute(
      'SELECT id, lot_id, weight_kg FROM bags WHERE contract_id = ?',
      [contractId]
    );

    if (bags.length === 0) {
      return {
        calculated: 0,
        actual: actualPrice,
        discrepancy: actualPrice,
        isMatch: actualPrice === 0
      };
    }

    const uniqueLotIds = [...new Set(bags.map(bag => bag.lot_id))];
    let totalContractCost = 0;
    let totalContractWeight = 0;

    for (const lotId of uniqueLotIds) {
      const lotRes = await this.execute(
        'SELECT base_farm_cost_per_kg FROM lots WHERE id = ?',
        [lotId]
      );
      
      if (lotRes.length === 0) continue;
      
      const baseFarmCost = lotRes[0].base_farm_cost_per_kg;

      const ledgerRes = await this.execute(
        'SELECT SUM(amount_usd) as total_additional_cost FROM cost_ledger WHERE lot_id = ?',
        [lotId]
      );
      const additionalCost = ledgerRes[0].total_additional_cost || 0;

      const weightFromThisLot = bags
        .filter(bag => bag.lot_id === lotId)
        .reduce((sum, bag) => sum + bag.weight_kg, 0);

      totalContractCost += (baseFarmCost * weightFromThisLot) + additionalCost;
      totalContractWeight += weightFromThisLot;
    }

    const calculatedPrice = totalContractWeight > 0 ? totalContractCost / totalContractWeight : 0;
    const discrepancy = Math.abs(calculatedPrice - actualPrice);
    const isMatch = discrepancy < 0.0001;

    return {
      calculated: Number(calculatedPrice.toFixed(4)),
      actual: Number(actualPrice.toFixed(4)),
      discrepancy: Number(discrepancy.toFixed(4)),
      isMatch
    };
  }
}
