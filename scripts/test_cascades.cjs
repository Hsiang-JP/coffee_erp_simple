#!/usr/bin/env node

/**
 * Cascade Verification Script
 * Verifies that ON DELETE CASCADE is working correctly across the schema.
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();

function initMemoryDB() {
  const db = new DatabaseSync(':memory:');
  const schemaPath = path.join(projectRoot, 'src/db/schema.js');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const coreSchemaMatch = schemaContent.match(/export\s+const\s+CORE_SCHEMA\s+=\s+`([\s\S]+?)`;/);
  const CORE_SCHEMA = coreSchemaMatch[1];
  
  db.exec(CORE_SCHEMA);
  return db;
}

function testProducerCascade() {
  console.log('--- Testing Producer -> Farm -> Lot -> Bag Cascade ---');
  const db = initMemoryDB();
  
  const producerId = 'p1';
  const farmId = 'f1';
  const lotId = 'l1';
  const bagId = 'b1';
  const milestoneId = 'm1';
  const ledgerId = 'cl1';
  const cuppingId = 'cs1';

  // Insert data
  db.prepare("INSERT INTO producers (id, name, relationship) VALUES (?, ?, ?)").run(producerId, 'Test Producer', 'Direct Trade');
  db.prepare("INSERT INTO farms (id, producer_id, name, region, location) VALUES (?, ?, ?, ?, ?)").run(farmId, producerId, 'Test Farm', 'Cusco', 'Santa Teresa');
  db.prepare("INSERT INTO lots (id, public_id, farm_id, variety, total_weight_kg, base_farm_cost_per_kg) VALUES (?, ?, ?, ?, ?, ?)").run(lotId, 'LOT-1', farmId, 'Geisha', 1000, 10);
  db.prepare("INSERT INTO bags (id, lot_id, weight_kg, status) VALUES (?, ?, ?, ?)").run(bagId, lotId, 69, 'Available');
  db.prepare("INSERT INTO bag_milestones (id, bag_id, current_stage) VALUES (?, ?, ?)").run(milestoneId, bagId, 'Farm');
  db.prepare("INSERT INTO cost_ledger (id, lot_id, cost_type, amount_usd) VALUES (?, ?, ?, ?)").run(ledgerId, lotId, 'Milling', 100);
  db.prepare("INSERT INTO cupping_sessions (id, lot_id, cupper_name, cupping_date) VALUES (?, ?, ?, ?)").run(cuppingId, lotId, 'Tester', '2023-01-01');

  // Verify existence
  const check = (table, id) => db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE id = ?`).get(id).count;

  if (check('producers', producerId) !== 1) throw new Error('Producer not inserted');
  if (check('farms', farmId) !== 1) throw new Error('Farm not inserted');
  if (check('lots', lotId) !== 1) throw new Error('Lot not inserted');
  if (check('bags', bagId) !== 1) throw new Error('Bag not inserted');
  if (check('bag_milestones', milestoneId) !== 1) throw new Error('Milestone not inserted');
  if (check('cost_ledger', ledgerId) !== 1) throw new Error('Ledger not inserted');
  if (check('cupping_sessions', cuppingId) !== 1) throw new Error('Cupping session not inserted');

  console.log('✅ All entities inserted successfully.');

  // Delete Producer
  console.log(`Deleting Producer ${producerId}...`);
  db.prepare("DELETE FROM producers WHERE id = ?").run(producerId);

  // Verify cascade
  if (check('producers', producerId) !== 0) throw new Error('Producer not deleted');
  if (check('farms', farmId) !== 0) throw new Error('Farm NOT deleted (Cascade failed)');
  if (check('lots', lotId) !== 0) throw new Error('Lot NOT deleted (Cascade failed)');
  if (check('bags', bagId) !== 0) throw new Error('Bag NOT deleted (Cascade failed)');
  if (check('bag_milestones', milestoneId) !== 0) throw new Error('Milestone NOT deleted (Cascade failed)');
  if (check('cost_ledger', ledgerId) !== 0) throw new Error('Ledger NOT deleted (Cascade failed)');
  if (check('cupping_sessions', cuppingId) !== 0) throw new Error('Cupping session NOT deleted (Cascade failed)');

  console.log('✅ Producer cascade verified: Farm, Lot, Bag, Milestone, Ledger, and Cupping Session were deleted.');
}

function testContractCascade() {
  console.log('\n--- Testing Contract -> Bag & Milestone Cascade ---');
  const db = initMemoryDB();

  const clientId = 'c1';
  const contractId = 'con1';
  const lotId = 'l1';
  const bagId = 'b1';
  const milestoneId = 'm1';

  // Setup prerequisites (Producer/Farm/Lot)
  db.prepare("INSERT INTO producers (id, name) VALUES (?, ?)").run('p1', 'P1');
  db.prepare("INSERT INTO farms (id, producer_id, name, region) VALUES (?, ?, ?, ?)").run('f1', 'p1', 'F1', 'Cusco');
  db.prepare("INSERT INTO lots (id, farm_id, total_weight_kg) VALUES (?, ?, ?)").run(lotId, 'f1', 1000);

  // Insert Client and Contract
  db.prepare("INSERT INTO clients (id, name, relationship) VALUES (?, ?, ?)").run(clientId, 'Test Client', 'VIP');
  db.prepare("INSERT INTO contracts (id, client_id, sale_price_per_kg, required_quality_score, status) VALUES (?, ?, ?, ?, ?)").run(contractId, clientId, 20, 85, 'Processing');

  // Insert Bag associated with Contract
  db.prepare("INSERT INTO bags (id, lot_id, weight_kg, status, contract_id) VALUES (?, ?, ?, ?, ?)").run(bagId, lotId, 69, 'Allocated', contractId);
  db.prepare("INSERT INTO bag_milestones (id, bag_id, contract_id, current_stage) VALUES (?, ?, ?, ?)").run(milestoneId, bagId, contractId, 'Cora');

  // Verify existence
  const check = (table, id) => db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE id = ?`).get(id).count;

  if (check('contracts', contractId) !== 1) throw new Error('Contract not inserted');
  if (check('bags', bagId) !== 1) throw new Error('Bag not inserted');
  if (check('bag_milestones', milestoneId) !== 1) throw new Error('Milestone not inserted');

  console.log('✅ Contract and associated Bag/Milestone inserted successfully.');

  // Delete Contract
  console.log(`Deleting Contract ${contractId}...`);
  db.prepare("DELETE FROM contracts WHERE id = ?").run(contractId);

  // Verify cascade
  if (check('contracts', contractId) !== 0) throw new Error('Contract not deleted');
  if (check('bags', bagId) !== 0) throw new Error('Bag NOT deleted (Cascade failed)');
  if (check('bag_milestones', milestoneId) !== 0) throw new Error('Milestone NOT deleted (Cascade failed)');

  console.log('✅ Contract cascade verified: Bag and Milestone were deleted.');
}

try {
  testProducerCascade();
  testContractCascade();
  console.log('\n✨ ALL CASCADE TESTS PASSED! ✨');
} catch (err) {
  console.error(`\n❌ TEST FAILED: ${err.message}`);
  process.exit(1);
}
