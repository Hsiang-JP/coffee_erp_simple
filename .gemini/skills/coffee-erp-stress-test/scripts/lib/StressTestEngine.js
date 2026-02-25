/**
 * StressTestEngine orchestrates business scenarios to test the system's integrity.
 * It supports modular Persona Agents for executing specific business roles.
 */
export class StressTestEngine {
  /**
   * @param {Object} options
   * @param {Object} options.mathAuditor - Injected MathAuditor instance
   * @param {Function} options.execute - Injected database execute function
   */
  constructor({ mathAuditor, execute } = {}) {
    this.logs = [];
    this.agents = new Map();
    this.mathAuditor = mathAuditor;
    this.execute = execute;
    this.currentAction = null;
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
   */
  addLog(message, type = 'info', data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      type,
      data
    };
    this.logs.push(entry);
    
    // Console output for real-time monitoring
    const color = type === 'error' ? '\x1b[31m' : type === 'success' ? '\x1b[32m' : '\x1b[0m';
    console.log(`${color}[StressTest] [${type.toUpperCase()}] ${message}\x1b[0m`, data || '');
  }

  /**
   * Executes a sequence of business actions defined in a scenario.
   */
  async run(scenario) {
    this.addLog(`Starting scenario: ${scenario.name}`, 'info');
    
    try {
      for (const action of scenario.actions) {
        this.addLog(`Executing action: ${action.type}`, 'info', action.params);
        await this.executeAction(action);
        
        // Verify math after each action to catch discrepancies early
        if (this.mathAuditor) {
          await this.verifyMath();
        }
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
   * Dispatches actions to registered agents.
   */
  async executeAction(action) {
    this.currentAction = action;
    const { type } = action;
    
    const role = type.split(':')[0].toLowerCase();
    const agent = this.agents.get(role);

    if (agent && typeof agent.handleAction === 'function') {
      return await agent.handleAction(action);
    }

    this.addLog(`No agent registered for role "${role}". Action "${type}" skipped.`, 'warning');
  }

  /**
   * Performs a comprehensive math audit of the current state.
   */
  async verifyMath() {
    this.addLog('Running Math Audit...', 'info');
    
    try {
      if (!this.execute || !this.mathAuditor) {
        this.addLog('Math Audit skipped: execute or mathAuditor dependency missing', 'warning');
        return;
      }

      // 1. Verify all lots
      const lots = await this.execute('SELECT id FROM lots');
      for (const lot of lots) {
        const result = await this.mathAuditor.calculateLandedCost(lot.id);
        if (result.discrepancy > 0.0001) {
          this.addLog(`Math Discrepancy in Lot ${lot.id}: ${result.discrepancy}`, 'error', result);
        }
      }

      // 2. Verify all contracts
      const contracts = await this.execute('SELECT id FROM contracts');
      for (const contract of contracts) {
        const result = await this.mathAuditor.verifyContractPrice(contract.id);
        if (!result.isMatch) {
          this.addLog(`Math Discrepancy in Contract ${contract.id}: ${result.discrepancy}`, 'error', result);
        }
      }

      this.addLog('Math Audit completed', 'info');
    } catch (error) {
      this.addLog(`Math Audit failed: ${error.message}`, 'error');
      throw error;
    }
  }

  getLogs() {
    return this.logs;
  }
}
