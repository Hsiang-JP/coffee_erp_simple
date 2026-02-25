import { MathAuditor } from './MathAuditor';
import { execute } from '../db/dbSetup';

/**
 * @typedef {Object} StressTestAction
 * @property {string} type - The type of action (e.g., 'farmer:intake').
 * @property {Object} params - Parameters for the action.
 */

/**
 * @typedef {Object} StressTestScenario
 * @property {string} name - Name of the scenario.
 * @property {StressTestAction[]} actions - Sequence of actions to perform.
 */

/**
 * StressTestEngine orchestrates business scenarios to test the system's integrity.
 * It supports modular Persona Agents for executing specific business roles.
 */
export class StressTestEngine {
  constructor() {
    this.logs = [];
    this.agents = new Map();
  }

  /**
   * Registers a persona agent to the engine.
   * @param {string} role - The role of the agent (e.g., 'farmer', 'marketer', 'buyer').
   * @param {Object} agent - The agent instance.
   */
  registerAgent(role, agent) {
    this.agents.set(role.toLowerCase(), agent);
    this.addLog(`Agent registered for role: ${role}`, 'info');
  }

  /**
   * Adds a log entry to the session.
   * @param {string} message - The log message.
   * @param {'info'|'success'|'warning'|'error'} type - The type of log.
   * @param {Object} [data] - Optional metadata.
   */
  addLog(message, type = 'info', data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      type,
      data
    };
    this.logs.push(entry);
    
    // Console output for real-time monitoring during development
    const color = type === 'error' ? '\x1b[31m' : type === 'success' ? '\x1b[32m' : '\x1b[0m';
    console.log(`${color}[StressTest] [${type.toUpperCase()}] ${message}\x1b[0m`, data || '');
  }

  /**
   * Executes a sequence of business actions defined in a scenario.
   * @param {StressTestScenario} scenario - The scenario configuration.
   * @returns {Promise<Object[]>} The logs of the execution.
   */
  async run(scenario) {
    this.addLog(`Starting scenario: ${scenario.name}`, 'info');
    
    try {
      for (const action of scenario.actions) {
        this.addLog(`Executing action: ${action.type}`, 'info', action.params);
        
        await this.executeAction(action);
        
        // Verify math after each action to catch discrepancies early
        await this.verifyMath();
      }
      
      this.addLog(`Scenario "${scenario.name}" completed successfully`, 'success');
    } catch (error) {
      this.addLog(`Scenario "${scenario.name}" failed: ${error.message}`, 'error', { 
        action: this.currentAction,
        stack: error.stack 
      });
      throw error;
    }

    return this.logs;
  }

  /**
   * Dispatches actions to registered agents or handles them internally.
   * @param {StressTestAction} action - The action to execute.
   * @private
   */
  async executeAction(action) {
    this.currentAction = action;
    const { type } = action;
    
    // Extract role from action type (e.g., 'farmer:intake' -> 'farmer')
    const role = type.split(':')[0].toLowerCase();
    const agent = this.agents.get(role);

    if (agent && typeof agent.handleAction === 'function') {
      return await agent.handleAction(action);
    }

    // Fallback for Phase 1 or when agents are not registered
    this.addLog(`No agent registered for role "${role}". Action "${type}" skipped or handled by fallback.`, 'warning');
    
    switch (type) {
      case 'farmer:intake':
        // Placeholder for Phase 1
        break;
      case 'marketer:sale':
        // Placeholder for Phase 1
        break;
      case 'buyer:logistics':
        // Placeholder for Phase 1
        break;
      default:
        this.addLog(`Unknown action type: ${type}`, 'warning');
    }
  }

  /**
   * Performs a comprehensive math audit of the current state.
   * Logs any discrepancies found.
   */
  async verifyMath() {
    this.addLog('Running Math Audit...', 'info');
    
    try {
      // 1. Verify all lots for landed cost consistency
      const lots = await execute('SELECT id FROM lots');
      for (const lot of lots) {
        const result = await MathAuditor.calculateLandedCost(lot.id);
        if (result.discrepancy > 0.0001) {
          this.addLog(`Math Discrepancy in Lot ${lot.id}: ${result.discrepancy}`, 'error', result);
        }
      }

      // 2. Verify all contracts for sale price consistency
      const contracts = await execute('SELECT id FROM contracts');
      for (const contract of contracts) {
        const result = await MathAuditor.verifyContractPrice(contract.id);
        if (!result.isMatch) {
          this.addLog(`Math Discrepancy in Contract ${contract.id}: ${result.discrepancy}`, 'error', result);
        }
      }

      this.addLog('Math Audit completed', 'info');
    } catch (error) {
      this.addLog(`Math Audit failed: ${error.message}`, 'error');
      throw error; // Propagate audit failures as they indicate system instability
    }
  }

  /**
   * Returns the full log of the stress test session.
   * @returns {Object[]}
   */
  getLogs() {
    return this.logs;
  }
}
