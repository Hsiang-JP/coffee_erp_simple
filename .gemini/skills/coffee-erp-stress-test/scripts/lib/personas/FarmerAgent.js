/**
 * FarmerAgent simulates the intake of new coffee lots into the system.
 */
export class FarmerAgent {
  constructor({ execute, buyLotTransaction } = {}) {
    this.execute = execute;
    this.buyLotTransaction = buyLotTransaction;
  }

  /**
   * Handles actions for the farmer persona.
   */
  async handleAction(action) {
    const { type, params = {} } = action;

    if (type === 'farmer:intake') {
      let farm_id = params.farm_id;
      
      if (!farm_id) {
        const farms = await this.execute('SELECT id FROM farms LIMIT 1');
        if (farms.length > 0) {
          farm_id = farms[0].id;
        } else {
          return { success: false, message: 'No farms available in the system for intake.' };
        }
      }

      const lotData = {
        farm_id,
        variety: params.variety || ['Caturra', 'Bourbon', 'Geisha', 'Typica'][Math.floor(Math.random() * 4)],
        process_method: params.process_method || ['Washed', 'Natural', 'Honey'][Math.floor(Math.random() * 3)],
        total_weight_kg: params.total_weight_kg || (Math.floor(Math.random() * 500) + 100),
        base_farm_cost_per_kg: params.base_farm_cost_per_kg || parseFloat((Math.random() * 2 + 3).toFixed(2))
      };

      return await this.buyLotTransaction(lotData);
    }

    throw new Error(`FarmerAgent cannot handle action type: ${type}`);
  }
}
