#!/usr/bin/env node

/**
 * Landed Cost Validation Script
 * Generates deterministic test data for 5 seeds and calculates landed costs.
 * Use this to verify architectural changes don't break business logic.
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

// --- 1. Seeded Random Generator ---
class SeededRandom {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  next() {
    return this.seed = this.seed * 16807 % 2147483647;
  }
  nextFloat() {
    return (this.next() - 1) / 2147483646;
  }
  nextInt(min, max) {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }
  pick(arr) {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

// --- 2. Database Setup ---
const projectRoot = process.cwd();
const SEEDS = [123, 456, 789, 101, 202];
const OUTPUT_FILE = path.join(projectRoot, 'math_validation_results.json');

function initMemoryDB() {
  const db = new DatabaseSync(':memory:');
  const schemaPath = path.join(projectRoot, 'src/db/schema.js');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const coreSchemaMatch = schemaContent.match(/export\s+const\s+CORE_SCHEMA\s+=\s+`([\s\S]+?)`;/);
  const CORE_SCHEMA = coreSchemaMatch[1];
  
  // DatabaseSync.exec can handle multiple statements in a single call
  try {
    db.exec(CORE_SCHEMA);
  } catch (err) {
    console.error("Error loading schema:", err);
  }
  
  return db;
}

// --- 3. Validation Logic ---
async function validateSeed(seed) {
  const db = initMemoryDB();
  const rng = new SeededRandom(seed);
  
  function query(sql, bind = []) {
    return db.prepare(sql).all(...bind);
  }
  function exec(sql, bind = []) {
    return db.prepare(sql).run(...bind);
  }

  // A. Generate Actors
  const producerId = `p-${seed}`;
  exec("INSERT INTO producers (id, name, relationship) VALUES (?, ?, ?)", [producerId, `Producer ${seed}`, 'Direct Trade']);
  
  const farmId = `f-${seed}`;
  exec("INSERT INTO farms (id, producer_id, name, region, location) VALUES (?, ?, ?, ?, ?)", 
    [farmId, producerId, `Farm ${seed}`, 'Cusco', 'Santa Teresa']);

  const clientId = `c-${seed}`;
  exec("INSERT INTO clients (id, name, relationship, destination_city) VALUES (?, ?, ?, ?)", [clientId, `Client ${seed}`, 'VIP', 'Taipei']);

  // B. Generate Lots
  const lotCount = rng.nextInt(2, 5);
  const bagResults = [];

  for (let i = 0; i < lotCount; i++) {
    const lotId = `lot-${seed}-${i}`;
    const baseCost = rng.nextInt(5, 15);
    const totalWeight = rng.nextInt(500, 2000);
    const variety = rng.pick(['Geisha', 'Caturra', 'Typica']);
    
    exec("INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, base_farm_cost_per_kg) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [lotId, `LOT-${seed}-${i}`, farmId, variety, 'Washed', totalWeight, baseCost]);

    // C. Generate Ledger Costs
    const ledgerCount = rng.nextInt(1, 4);
    let totalLedgerCost = 0;
    for (let j = 0; j < ledgerCount; j++) {
      const amount = rng.nextInt(50, 200);
      totalLedgerCost += amount;
      exec("INSERT INTO cost_ledger (id, lot_id, cost_type, amount_usd) VALUES (?, ?, ?, ?)",
        [`cl-${seed}-${i}-${j}`, lotId, 'Milling', amount]);
    }

    // D. Generate Bags
    const bagCount = Math.floor(totalWeight / 69);
    for (let j = 0; j < bagCount; j++) {
      const bagId = `bag-${seed}-${i}-${j}`;
      exec("INSERT INTO bags (id, lot_id, weight_kg, status) VALUES (?, ?, ?, ?)",
        [bagId, lotId, 69, 'Available']);

      // E. Generate Milestones
      const warehouseCost = rng.nextInt(1, 5);
      const exportCost = rng.nextInt(2, 8);
      
      exec("INSERT INTO bag_milestones (id, bag_id, current_stage, cost_to_warehouse, cost_to_export) VALUES (?, ?, ?, ?, ?)",
        [`bm-${bagId}`, bagId, 'Cora', warehouseCost, exportCost]);
    }
  }

  // F. Calculate Landed Costs (Simulation of the View/Trigger logic)
  const results = query(`
    SELECT 
      b.id as bag_id,
      l.base_farm_cost_per_kg,
      l.total_weight_kg,
      (SELECT SUM(amount_usd) FROM cost_ledger WHERE lot_id = l.id) as ledger_total,
      bm.cost_to_warehouse,
      bm.cost_to_export,
      bm.cost_to_import,
      bm.cost_to_client,
      bm.final_sale_price as db_calculated_price
    FROM bags b
    JOIN lots l ON b.lot_id = l.id
    JOIN bag_milestones bm ON b.id = bm.bag_id
  `);

  const auditResults = results.map(row => {
    const ledgerPerKg = (row.ledger_total || 0) / row.total_weight_kg;
    const logisticsTotal = (row.cost_to_warehouse || 0) + (row.cost_to_export || 0) + (row.cost_to_import || 0) + (row.cost_to_client || 0);
    
    // Landed Cost = Base + (Ledger / Weight) + Logistics
    const manualCalculation = row.base_farm_cost_per_kg + ledgerPerKg + logisticsTotal;
    
    return {
      bag_id: row.bag_id,
      manual_landed_cost: Number(manualCalculation.toFixed(4)),
      db_landed_cost: Number(row.db_calculated_price?.toFixed(4) || 0)
    };
  });

  return auditResults;
}

// --- 4. Execution ---
async function run() {
  console.log(`🚀 Starting Math Validation for ${SEEDS.length} seeds...`);
  const finalResults = {};

  for (const seed of SEEDS) {
    process.stdout.write(`  Processing seed ${seed}... `);
    const seedResults = await validateSeed(seed);
    finalResults[seed] = seedResults;
    console.log(`Done (${seedResults.length} bags)`);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalResults, null, 2));
  console.log(`
✅ Validation Complete!`);
  console.log(`Results saved to: ${OUTPUT_FILE}`);
  console.log(`Use this file as a baseline for future refactors.`);
}

run().catch(console.error);
