/**
 * MarketerAgent simulates the sale and allocation of coffee bags to clients.
 */
export class MarketerAgent {
  constructor({ execute, finalizeAllocation } = {}) {
    this.execute = execute;
    this.finalizeAllocation = finalizeAllocation;
  }

  /**
   * Handles actions for the marketer persona.
   */
  async handleAction(action) {
    const { type, params = {} } = action;

    if (type === 'marketer:sell') {
      let { client_id, is_blend = false, salePrice } = params;

      if (!client_id) {
        const clients = await this.execute('SELECT id FROM clients LIMIT 1');
        if (clients.length > 0) {
          client_id = clients[0].id;
        } else {
          return { success: false, message: 'No clients available in the system for sale.' };
        }
      }

      // 1. Find available bags
      const bags = await this.execute(`
        SELECT id, lot_id, weight_kg 
        FROM bags 
        WHERE status = 'Available' 
        LIMIT 20
      `);

      if (bags.length === 0) {
        return { success: false, message: 'No available bags for sale' };
      }

      let selectedBags = [];

      if (is_blend) {
        // Intentionally pick bags from at least 2 different lots to test math accuracy
        const lotGroups = bags.reduce((acc, bag) => {
          if (!acc[bag.lot_id]) acc[bag.lot_id] = [];
          acc[bag.lot_id].push(bag);
          return acc;
        }, {});

        const lotIds = Object.keys(lotGroups);

        if (lotIds.length >= 2) {
          // Pick one bag from each of the first two lots
          selectedBags.push(lotGroups[lotIds[0]][0]);
          selectedBags.push(lotGroups[lotIds[1]][0]);
        } else {
          // Fallback: if only one lot is available, pick two bags from it if possible
          selectedBags = bags.slice(0, Math.min(bags.length, 2));
        }
      } else {
        // Single lot sale
        selectedBags = [bags[0]];
      }

      // 2. Finalize allocation
      const result = await this.finalizeAllocation(client_id, selectedBags, params);

      // 3. Override sale price if custom salePrice is provided
      if (result.success && salePrice !== undefined) {
        await this.execute(
          `UPDATE contracts SET sale_price_per_kg = ? WHERE id = ?`,
          [parseFloat(salePrice), result.contractId]
        );
        result.salePricePerKg = parseFloat(salePrice);
      }

      return result;
    }

    throw new Error(`MarketerAgent cannot handle action type: ${type}`);
  }
}
