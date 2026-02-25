#!/usr/bin/env node
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = '/home/hsiang/projects/Coffee simple';
const dbFilePath = path.join(projectRoot, 'test_persistence.db');
const schemaPath = path.join(projectRoot, 'src/db/schema.js');
const seedDataPath = path.join(projectRoot, 'src/db/seedData.js');

const STAGE_ORDER = ['Farm', 'Cora', 'Port-Export', 'Port-Import', 'Final Destination'];

function getNextStage(currentStage) {
  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

function getCostFieldForTransition(currentStage) {
  switch (currentStage) {
    case 'Farm': return 'cost_to_warehouse';
    case 'Cora': return 'cost_to_export';
    case 'Port-Export': return 'cost_to_import';
    case 'Port-Import': return 'cost_to_client';
    default: return null;
  }
}

function initDB(filePath) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const db = new DatabaseSync(filePath);
    
    // Load Schema
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const coreSchemaMatch = schemaContent.match(/export\s+const\s+CORE_SCHEMA\s+=\s+`([\s\S]+?)`;/);
    const CORE_SCHEMA = coreSchemaMatch[1];
    
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
        try { db.exec(sql); } catch (err) {}
    }

    // Load Seed Data
    const seedContent = fs.readFileSync(seedDataPath, 'utf8');
    const seedDataMatch = seedContent.match(/export\s+const\s+SEED_DATA\s+=\s+({[\s\S]+?});/);
    let seedDataStr = seedDataMatch[1];
    const seedData = eval(`(${seedDataStr})`);

    for (const [table, rows] of Object.entries(seedData)) {
        for (const row of rows) {
            const keys = Object.keys(row);
            const columns = keys.join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = Object.values(row);
            const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
            db.prepare(sql).run(...values);
        }
    }

    return db;
}

function advanceContractStage(db, contractId, costValue) {
    const bagRes = db.prepare(`
      SELECT bm.current_stage 
      FROM bag_milestones bm
      JOIN bags b ON bm.bag_id = b.id
      WHERE b.contract_id = ?
      LIMIT 1
    `).get(contractId);
    
    if (!bagRes) throw new Error("No milestones found for this contract");

    const currentStage = bagRes.current_stage;
    const nextStage = getNextStage(currentStage);
    if (!nextStage) throw new Error("Already at final destination");

    const costField = getCostFieldForTransition(currentStage); 

    db.prepare(`
      UPDATE bag_milestones 
      SET ${costField} = ?, current_stage = ? 
      WHERE bag_id IN (SELECT id FROM bags WHERE contract_id = ?)
    `).run(Number(costValue) || 0, nextStage, contractId);

    db.prepare(`
      UPDATE bags 
      SET location = ?
      WHERE contract_id = ?
    `).run(nextStage, contractId);
}

async function run() {
    console.log("🚀 Starting Persistence & Workflow Test...");
    
    // 1. Initialize DB
    let db = initDB(dbFilePath);
    console.log("  - DB Initialized with seed data.");

    // 2. Verify initial state
    let journey = db.prepare("SELECT * FROM vw_contract_journey WHERE contract_id = 'con-1'").get();
    console.log(`  - Initial total_landed: ${journey.total_landed}`);
    const initialLanded = journey.total_landed;
    const totalWeight = journey.total_weight;

    // 3. Advance Stage
    const addedCost = 50.00;
    console.log(`  - Advancing contract 'con-1' with $${addedCost} cost...`);
    advanceContractStage(db, 'con-1', addedCost);

    // 4. Verify immediate changes
    journey = db.prepare("SELECT * FROM vw_contract_journey WHERE contract_id = 'con-1'").get();
    console.log(`  - New current_stage: ${journey.current_stage}`);
    console.log(`  - New total_landed: ${journey.total_landed}`);

    const expectedLanded = initialLanded + (addedCost / totalWeight);
    if (journey.current_stage !== 'Cora') {
        throw new Error(`Expected stage 'Cora', got '${journey.current_stage}'`);
    }
    if (Math.abs(journey.total_landed - expectedLanded) > 0.001) {
        throw new Error(`Expected total_landed ${expectedLanded}, got ${journey.total_landed}`);
    }
    console.log("  - Immediate verification passed.");

    // 5. Simulate Refresh (Close and Reopen)
    console.log("  - Simulating refresh (re-initializing DB engine)...");
    // In node:sqlite, closing is just letting it be GC'd or we can't explicitly close in this version easily?
    // Actually, we can just create a new DatabaseSync instance on the same file.
    db = new DatabaseSync(dbFilePath);
    
    // 6. Verify persistence
    journey = db.prepare("SELECT * FROM vw_contract_journey WHERE contract_id = 'con-1'").get();
    console.log(`  - Persisted current_stage: ${journey.current_stage}`);
    console.log(`  - Persisted total_landed: ${journey.total_landed}`);

    if (journey.current_stage !== 'Cora') {
        throw new Error(`Persistence failed: Expected stage 'Cora', got '${journey.current_stage}'`);
    }
    if (Math.abs(journey.total_landed - expectedLanded) > 0.001) {
        throw new Error(`Persistence failed: Expected total_landed ${expectedLanded}, got ${journey.total_landed}`);
    }
    console.log("  - Persistence verification passed.");

    console.log("✅ Persistence & Workflow Test Passed!");
    
    // Cleanup
    fs.unlinkSync(dbFilePath);
}

run().catch(err => {
    console.error("❌ Test Failed:", err.message);
    if (fs.existsSync(dbFilePath)) fs.unlinkSync(dbFilePath);
    process.exit(1);
});
