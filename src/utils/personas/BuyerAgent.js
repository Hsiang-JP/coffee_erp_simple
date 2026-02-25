import { advanceContractStage } from '../../db/services/contractService';

/**
 * BuyerAgent simulates the logistics and shipping of coffee contracts.
 */
export class BuyerAgent {
  /**
   * Handles actions for the buyer persona.
   * @param {Object} action - The action to perform.
   * @param {string} action.type - The type of action (e.g., 'buyer:ship').
   * @param {Object} action.params - Parameters for the action.
   * @returns {Promise<Object>} The result of the service call.
   */
  async handleAction(action) {
    const { type, params = {} } = action;

    if (type === 'buyer:ship') {
      const { contractId, stages = 1, costPerStage = 0.1 } = params;

      if (!contractId) {
        throw new Error('contractId is required for buyer:ship action');
      }

      let lastResult = null;
      
      // Support advancing through multiple stages in sequence
      for (let i = 0; i < stages; i++) {
        try {
          lastResult = await advanceContractStage(contractId, costPerStage);
        } catch (error) {
          if (error.message === 'Already at final destination') {
            // Gracefully stop if we reached the end
            break;
          }
          throw error;
        }
      }

      return lastResult || { success: false, message: 'No stages advanced' };
    }

    throw new Error(`BuyerAgent cannot handle action type: ${type}`);
  }
}
