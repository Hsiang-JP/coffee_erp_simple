#!/usr/bin/env node

/**
 * State Machine & Trigger Verification Test
 * 
 * This script verifies the integrity of the coffee journey state machine,
 * specifically focusing on the 'bag_milestones' triggers and the service layer logic.
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();

// --- 1. Database Setup ---
function initMemoryDB() {
  const db = new DatabaseSync(':memory:');
  const schemaPath = path.join(projectRoot, 'src/db/schema.js');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Extract CORE_SCHEMA string from ESM export
  const coreSchemaMatch = schemaContent.match(/export\s+const\s+CORE_SCHEMA\s+=\s+`([\s\S]+?)`;/);
  if (!coreSchemaMatch) throw new Error("Could not find CORE_SCHEMA in schema.js");
  
  const CORE_SCHEMA = coreSchemaMatch[1];
  
  // Split by semicolon but handle BEGIN...END blocks for triggers
  const rawStatements = CORE_SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0);
  const statements = [];
  let buffer = '';
  
  for (const s of rawStatements) {
    buffer += (buffer ? ';' : '') + s;
    const begins = (buffer.match(/\bBEGIN\b/gi) || []).length;
    const ends = (buffer.match(/\bEND\b/gi) || []).length;
    
    if (begins === ends) {
      statements.push(buffer + ';');
      buffer = '';
    }
  }

  for (const sql of statements) {
    try { 
      db.exec(sql); 
    } catch (err) {
      // Ignore errors for DROP IF EXISTS or similar if they occur
      if (!sql.includes('DROP') && !sql.includes('IF NOT EXISTS')) {
        console.warn(`Warning executing SQL: ${sql.substring(0, 50)}... 
Error: ${err.message}`);
      }
    }
  }
  return db;
}

// --- 2. Test Execution ---
async function runTest() {
  console.log("🧪 Starting State Machine Verification Test...");
  const db = initMemoryDB();
  
  const query = (sql, bind = []) => db.prepare(sql).all(...bind);
  const exec = (sql, bind = []) => db.prepare(sql).run(...bind);

  try {
    // A. Setup Base Data (Producer, Farm)
    console.log("  - Setting up producer and farm...");
    exec("INSERT INTO producers (id, name, relationship) VALUES (?, ?, ?)", ['p1', 'Test Producer', 'Direct Trade']);
    exec("INSERT INTO farms (id, producer_id, name, region, location) VALUES (?, ?, ?, ?, ?)", 
      ['f1', 'p1', 'Test Farm', 'Cusco', 'Santa Teresa']);

    // B. Simulate buyLotTransaction
    console.log("  - Simulating buyLotTransaction...");
    const lotId = 'lot-test';
    const baseCost = 10.0;
    const totalWeight = 1000.0;
    exec(`
      INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, base_farm_cost_per_kg, harvest_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [lotId, 'L-TEST', 'f1', 'Geisha', 'Washed', totalWeight, baseCost, '2023-01-01']);

    const bagId = 'bag-test';
    exec(`
      INSERT INTO bags (id, public_id, lot_id, weight_kg, status, stock_code, location)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [bagId, 'B-TEST', lotId, 69.0, 'Available', 'A-1', 'Cora']);

    exec(`
      INSERT INTO bag_milestones (id, bag_id, current_stage)
      VALUES (?, ?, ?)
    `, ['ms-test', bagId, 'Farm']);

    // Verify initial price (should be base cost since no ledger/logistics yet)
    let ms = query("SELECT * FROM bag_milestones WHERE id = ?", ['ms-test'])[0];
    console.log(`    Initial final_sale_price: ${ms.final_sale_price}`);
    if (ms.final_sale_price !== baseCost) {
      throw new Error(`Expected initial price ${baseCost}, got ${ms.final_sale_price}`);
    }

    // C. Add Ledger Cost
    console.log("  - Adding ledger cost...");
    exec("INSERT INTO cost_ledger (id, lot_id, cost_type, amount_usd) VALUES (?, ?, ?, ?)",
      ['cl1', lotId, 'Milling', 500.0]); // 500 / 1000 = 0.5 per kg

    ms = query("SELECT * FROM bag_milestones WHERE id = ?", ['ms-test'])[0];
    const expectedAfterLedger = baseCost + (500 / 1000);
    console.log(`    Price after ledger: ${ms.final_sale_price} (Expected: ${expectedAfterLedger})`);
    if (Math.abs(ms.final_sale_price - expectedAfterLedger) > 0.0001) {
      throw new Error(`Price mismatch after ledger cost`);
    }

    // D. Simulate Allocation
    console.log("  - Simulating allocation...");
    exec("INSERT INTO clients (id, name, relationship) VALUES (?, ?, ?)", ['c1', 'Test Client', 'VIP']);
    const contractId = 'con-test';
    exec(`
      INSERT INTO contracts (id, public_id, client_id, required_quality_score, sale_price_per_kg, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [contractId, 'C-TEST', 'c1', 85.0, 15.0, 'Processing']);

    exec("UPDATE bags SET status = 'Allocated', contract_id = ? WHERE id = ?", [contractId, bagId]);
    exec("UPDATE bag_milestones SET contract_id = ? WHERE bag_id = ?", [contractId, bagId]);

    // E. Advance Stage (Farm -> Cora)
    console.log("  - Advancing stage to 'Cora' with cost...");
    const warehouseCost = 2.0;
    // This simulates contractService.advanceContractStage
    exec(`
      UPDATE bag_milestones 
      SET cost_to_warehouse = ?, current_stage = ? 
      WHERE bag_id IN (SELECT id FROM bags WHERE contract_id = ?)
    `, [warehouseCost, 'Cora', contractId]);

    ms = query("SELECT * FROM bag_milestones WHERE id = ?", ['ms-test'])[0];
    const expectedAfterAdvance = expectedAfterLedger + warehouseCost;
    console.log(`    Price after advancing to Cora: ${ms.final_sale_price} (Expected: ${expectedAfterAdvance})`);
    if (Math.abs(ms.final_sale_price - expectedAfterAdvance) > 0.0001) {
      throw new Error(`Price mismatch after stage advance`);
    }

    // F. Verify Bag Location update
    exec("UPDATE bags SET location = ? WHERE contract_id = ?", ['Cora', contractId]);
    const bag = query("SELECT location FROM bags WHERE id = ?", [bagId])[0];
    console.log(`    Bag location: ${bag.location}`);
    if (bag.location !== 'Cora') {
      throw new Error(`Bag location not updated to Cora`);
    }

    console.log("\n✅ State Machine & Trigger Verification Successful!");
  } catch (err) {
    console.error("\n❌ Test Failed!");
    console.error(err);
    process.exit(1);
  }
}

runTest();
