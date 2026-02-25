#!/usr/bin/env node

/**
 * Coffee ERP Stress Test Runner
 * Orchestrates a simulation of industry personas to verify system integrity.
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

// --- 1. Configuration & Argument Parsing ---
const args = process.argv.slice(2);
const isCI = args.includes('--ci');
const numContracts = parseInt(args.find(a => a.startsWith('--contracts='))?.split('=')[1]) || 5;
const projectRoot = process.cwd();

console.log(`☕ Coffee ERP Stress Test Runner`);
console.log(`Project Root: ${projectRoot}`);
console.log(`CI Mode: ${isCI ? 'ENABLED' : 'DISABLED'}`);
console.log(`Target Contracts: ${numContracts}
`);

// --- 2. Environment Setup ---
const db = new DatabaseSync(':memory:');

function execute(sql, bind = []) {
  try {
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
      return stmt.all(...bind);
    } else {
      const result = stmt.run(...bind);
      return { lastInsertRowid: result.lastInsertRowid, changes: result.changes };
    }
  } catch (err) {
    throw err;
  }
}

// 2.1 Load Schema
const schemaPath = path.join(projectRoot, 'src/db/schema.js');
if (!fs.existsSync(schemaPath)) {
  console.error(`Error: Schema not found at ${schemaPath}`);
  process.exit(1);
}

// Extract CORE_SCHEMA string from ESM file
const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const coreSchemaMatch = schemaContent.match(/export\s+const\s+CORE_SCHEMA\s+=\s+`([\s\S]+?)`;/);
if (!coreSchemaMatch) {
  console.error('Error: Could not parse CORE_SCHEMA from schema.js');
  process.exit(1);
}

const CORE_SCHEMA = coreSchemaMatch[1];
const statements = CORE_SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0);
for (const sql of statements) {
  try {
    db.exec(sql);
  } catch (err) {
    // Ignore errors for existing objects
  }
}

console.log('✅ Database initialized in memory');

// --- 3. Module Loader ---
/**
 * Loads an ESM module from the project and injects mocks.
 */
function loadModule(filePath, mocks = {}) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
  let content = fs.readFileSync(absolutePath, 'utf8');
  
  // Track original exports
  const exportNames = [];
  const exportRegex = /export\s+(?:class|async\s+function|function|const)\s+(\w+)/g;
  let m;
  while ((m = exportRegex.exec(content)) !== null) {
    exportNames.push(m[1]);
  }

  // Replace imports with mocks
  content = content.replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g, (match, imports, source) => {
    if (source.includes('dbSetup')) return `const { ${imports} } = mocks.dbSetup;`;
    if (source.includes('lotService')) return `const { ${imports} } = mocks.lotService;`;
    if (source.includes('allocationService')) return `const { ${imports} } = mocks.allocationService;`;
    if (source.includes('contractService')) return `const { ${imports} } = mocks.contractService;`;
    if (source.includes('warehouseUtils')) return `const { ${imports} } = mocks.warehouseUtils;`;
    if (source.includes('allocation')) return `const { ${imports} } = mocks.allocation;`;
    if (source.includes('MathAuditor')) return `const { ${imports} } = mocks.MathAuditor;`;
    return match;
  });

  // Convert to local declarations
  content = content.replace(/export\s+class/g, 'class');
  content = content.replace(/export\s+async\s+function/g, 'async function');
  content = content.replace(/export\s+function/g, 'function');
  content = content.replace(/export\s+const/g, 'const');

  const footer = `
return { ${exportNames.join(', ')} };`;
  
  try {
    const fn = new Function('mocks', content + footer);
    return fn(mocks);
  } catch (err) {
    console.error(`Error loading module ${filePath}:`, err);
    throw err;
  }
}

// --- 4. Mocks & Dependencies ---
const dbSetupMock = {
  execute,
  wrapInTransaction: async (cb) => {
    execute('BEGIN TRANSACTION');
    try {
      const res = await cb();
      execute('COMMIT');
      return res;
    } catch (err) {
      execute('ROLLBACK');
      throw err;
    }
  },
  getNextStage: (currentStage) => {
    const STAGE_ORDER = ['Farm', 'Cora', 'Port-Export', 'Port-Import', 'Final Destination'];
    const idx = STAGE_ORDER.indexOf(currentStage);
    if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
    return STAGE_ORDER[idx + 1];
  },
  getCostFieldForTransition: (currentStage) => {
    switch (currentStage) {
      case 'Farm': return 'cost_to_warehouse';
      case 'Cora': return 'cost_to_export';
      case 'Port-Export': return 'cost_to_import';
      case 'Port-Import': return 'cost_to_client';
      default: return null;
    }
  }
};

const warehouseUtils = loadModule(path.join(projectRoot, 'src/utils/warehouseUtils.js'), {});
const allocationUtils = loadModule(path.join(projectRoot, 'src/utils/allocation.js'), {});

const mocks = {
  dbSetup: dbSetupMock,
  warehouseUtils,
  allocation: allocationUtils
};

// Load Project Services
mocks.lotService = loadModule(path.join(projectRoot, 'src/db/services/lotService.js'), mocks);
mocks.allocationService = loadModule(path.join(projectRoot, 'src/db/services/allocationService.js'), mocks);
mocks.contractService = loadModule(path.join(projectRoot, 'src/db/services/contractService.js'), mocks);

// Load Skill Libraries
mocks.MathAuditor = loadModule('./lib/MathAuditor.js', mocks);
const { FarmerAgent } = loadModule('./lib/personas/FarmerAgent.js', mocks);
const { MarketerAgent } = loadModule('./lib/personas/MarketerAgent.js', mocks);
const { BuyerAgent } = loadModule('./lib/personas/BuyerAgent.js', mocks);
const { StressTestEngine } = loadModule('./lib/StressTestEngine.js', mocks);

// --- 5. Run Simulation ---
async function run() {
  const engine = new StressTestEngine({
    mathAuditor: new mocks.MathAuditor.MathAuditor({ execute }),
    execute
  });
  
  engine.registerAgent('farmer', new FarmerAgent({ 
    execute, 
    buyLotTransaction: mocks.lotService.buyLotTransaction 
  }));
  
  engine.registerAgent('marketer', new MarketerAgent({ 
    execute, 
    finalizeAllocation: mocks.allocationService.finalizeAllocation 
  }));
  
  engine.registerAgent('buyer', new BuyerAgent({ 
    advanceContractStage: mocks.contractService.advanceContractStage 
  }));

  // Bootstrap data: 1 Farm, 1 Client
  execute("INSERT INTO producers (id, name, relationship) VALUES ('p-1', 'Bootstrap Producer', 'Direct Trade')");
  execute("INSERT INTO farms (id, producer_id, name, region, altitude_meters, location, certification) VALUES ('f-1', 'p-1', 'Bootstrap Farm', 'Cusco', 1800, 'Santa Teresa', 'Organic')");
  execute("INSERT INTO clients (id, name, relationship, destination_city) VALUES ('cli-1', 'Bootstrap Client', 'VIP', 'Tokyo')");

  const actions = [
    { type: 'farmer:intake', params: { variety: 'Geisha', total_weight_kg: 1000, base_farm_cost_per_kg: 10.0 } },
    { type: 'farmer:intake', params: { variety: 'Caturra', total_weight_kg: 1000, base_farm_cost_per_kg: 7.0 } }
  ];

  for (let i = 0; i < numContracts; i++) {
    actions.push({ 
      type: 'marketer:sell', 
      params: { is_blend: i % 2 === 0, salePrice: 15.0 + i } 
    });
  }

  await engine.run({ name: 'Automated Stress Test', actions });

  const contracts = execute('SELECT id FROM contracts');
  const shipActions = contracts.map(c => ({
    type: 'buyer:ship',
    params: { contractId: c.id, stages: 2, costPerStage: 0.5 }
  }));

  await engine.run({ name: 'Logistics Lifecycle', actions: shipActions });

  const logs = engine.getLogs();
  const errors = logs.filter(l => l.type === 'error');

  if (errors.length > 0) {
    console.error(`\n❌ Found ${errors.length} discrepancies during simulation.`);
    if (isCI) process.exit(1);
  } else {
    console.log('\n✅ Simulation complete. No math discrepancies found.');
  }
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
