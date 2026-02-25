#!/usr/bin/env node
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = '/home/hsiang/projects/Coffee simple';
const baselinePath = path.join(projectRoot, 'golden_baseline.json');
const schemaPath = path.join(projectRoot, 'src/db/schema.js');
const seedDataPath = path.join(projectRoot, 'src/db/seedData.js');

function initDB() {
    const db = new DatabaseSync(':memory:');
    
    // Load Schema
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const coreSchemaMatch = schemaContent.match(/export\s+const\s+CORE_SCHEMA\s+=\s+`([\s\S]+?)`;/);
    const CORE_SCHEMA = coreSchemaMatch[1];
    
    // Split and execute schema statements
    // Handle BEGIN...END blocks for triggers
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
        try { db.exec(sql); } catch (err) {
            console.error("Schema Error:", err.message, "\nSQL:", sql);
        }
    }

    // Load Seed Data
    // We need to parse the SEED_DATA from the ES module. 
    // Since we are in Node, we can't easily import ES modules with 'export const'.
    // I'll use a simple regex or just hardcode the relevant parts for this test.
    // Actually, I'll read the file and use a simple evaluation or regex.
    
    const seedContent = fs.readFileSync(seedDataPath, 'utf8');
    // This is risky but for a test script it might work if the structure is simple.
    // Better: extract the object literal.
    const seedDataMatch = seedContent.match(/export\s+const\s+SEED_DATA\s+=\s+({[\s\S]+?});/);
    if (!seedDataMatch) throw new Error("Could not find SEED_DATA in seedData.js");
    
    // Convert ES module object to something we can JSON.parse or eval
    // SEED_DATA contains 'Array.from', so JSON.parse won't work.
    // We'll use a trick: wrap it in a function and eval it.
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

async function run() {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const db = initDB();

    const row = db.prepare("SELECT * FROM vw_contract_journey WHERE contract_id = 'con-1'").get();

    console.log("--- Math Verification ---");
    console.log("Baseline:", baseline);
    console.log("Database:", row);

    const discrepancies = [];
    if (Math.abs(row.total_weight - baseline.total_weight) > 0.001) {
        discrepancies.push(`total_weight: expected ${baseline.total_weight}, got ${row.total_weight}`);
    }
    if (Math.abs(row.total_landed - baseline.total_landed_cost) > 0.001) {
        discrepancies.push(`total_landed: expected ${baseline.total_landed_cost}, got ${row.total_landed}`);
    }

    if (discrepancies.length === 0) {
        console.log("✅ Math Verification Passed!");
    } else {
        console.error("❌ Math Verification Failed!");
        discrepancies.forEach(d => console.error("  - " + d));
        process.exit(1);
    }
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
