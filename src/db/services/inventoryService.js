import { execute, wrapInTransaction } from '../dbSetup';

/**
 * Fetches the full inventory of bags with associated lot, farm, and quality data.
 * OPTIMIZED: Uses subqueries to prevent duplicate bags if a lot is cupped multiple times.
 */
export async function getInventory() {
  const query = `
    SELECT 
      b.*, 
      l.public_id AS lot_public_id, 
      l.variety, 
      l.process_method, 
      l.harvest_date, 
      l.base_farm_cost_per_kg,
      -- Dynamically calculate True Landed Cost
      (l.base_farm_cost_per_kg + COALESCE((SELECT SUM(amount_usd) FROM cost_ledger WHERE lot_id = l.id), 0) / NULLIF(l.total_weight_kg, 1)) AS current_per_kg_cost,
      f.name as farm_name,
      -- Subqueries guarantee no duplicate bags, grabbing the latest cupping session
      (SELECT final_score FROM cupping_sessions WHERE lot_id = b.lot_id ORDER BY cupping_date DESC LIMIT 1) AS quality_score,
      (SELECT primary_flavor_note FROM cupping_sessions WHERE lot_id = b.lot_id ORDER BY cupping_date DESC LIMIT 1) AS primary_flavor_note,
      (SELECT notes FROM cupping_sessions WHERE lot_id = b.lot_id ORDER BY cupping_date DESC LIMIT 1) AS cupping_notes
    FROM bags b
    JOIN lots l ON b.lot_id = l.id
    JOIN farms f ON l.farm_id = f.id
    WHERE b.status IN ('Available', 'Allocated') 
  `;
  return await execute(query);
}

/**
 * Fetches all bags with variety, process, farm, and current stage details.
 */
export async function getBagsWithDetails() {
  return await execute(`
    SELECT b.*, l.variety, l.process_method, f.name as farm_name, bm.current_stage 
    FROM bags b
    JOIN lots l ON b.lot_id = l.id
    JOIN farms f ON l.farm_id = f.id
    LEFT JOIN bag_milestones bm ON b.id = bm.bag_id
  `);
}

/**
 * Fetches all bag milestones.
 */
export async function getMilestones() {
  return await execute(`SELECT * FROM bag_milestones`);
}

/**
 * Fetches all registered clients.
 */
export async function getClients() {
  return await execute(`SELECT * FROM clients ORDER BY name ASC`);
}

/**
 * Creates a new client.
 * @param {Object} clientData 
 */
export async function createClient(clientData) {
  const { name, relationship, country, port, city } = clientData;
  return await execute(
    'INSERT INTO clients (id, name, relationship, destination_country, destination_port, destination_city) VALUES (?, ?, ?, ?, ?, ?)',
    [`cli-${Date.now()}`, name, relationship, country, port, city]
  );
}

/**
 * Creates a new cost ledger entry.
 * @param {Object} costData 
 */
export async function createCostLedgerEntry(costData) {
  const { lotId, costType, amountUsd, dateIncurred } = costData;
  return await execute(
    'INSERT INTO cost_ledger (id, lot_id, cost_type, amount_usd, date_incurred) VALUES (?, ?, ?, ?, ?)',
    [`cl-${Date.now()}`, lotId, costType, parseFloat(amountUsd), dateIncurred]
  );
}

/**
 * Updates the stock code for a specific bag.
 * @param {string|number} bagId 
 * @param {string} stockCode 
 */
export async function updateBagStockCode(bagId, stockCode) {
  return await execute(
    `UPDATE bags SET stock_code = ? WHERE id = ?`, 
    [stockCode, bagId]
  );
}

/**
 * Consolidates bags on pallets by removing gaps in levels (Apply Gravity).
 * @param {Array} inventory - Current inventory data.
 * @returns {Promise<number>} - Number of bags moved.
 */
export async function applyGravity(inventory) {
  const pallets = {};
  inventory.forEach(bag => {
    if (!bag.stock_code) return;
    const [p, l] = bag.stock_code.split('-');
    if (!pallets[p]) pallets[p] = [];
    pallets[p].push({ id: bag.id, level: parseInt(l, 10) });
  });

  let movedCount = 0;

  // Transaction ensures OPFS disk I/O is kept to a minimum
  await wrapInTransaction(async () => {
    for (const p in pallets) {
      pallets[p].sort((a, b) => a.level - b.level);
      let targetLevel = 1; 
      
      for (const bag of pallets[p]) {
        if (bag.level !== targetLevel) {
          await execute(
            `UPDATE bags SET stock_code = ? WHERE id = ?`, 
            [`${p}-${targetLevel}`, bag.id]
          );
          movedCount++;
        }
        targetLevel++; 
      }
    }
  });

  return movedCount;
}