import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from 'wa-sqlite';
import { IDBMinimalVFS } from 'wa-sqlite/src/examples/IDBMinimalVFS.js';
import { generateStockCodes } from '../utils/warehouseUtils';

let sqlite3 = null;
let db = null;
let dbInitPromise = null;

const DB_NAME = 'green_coffee_erp_v15'; 

export const STAGE_ORDER = ['Farm', 'Cora', 'Port-Export', 'Port-Import', 'Final Destination'];

export function getNextStage(currentStage) {
  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function getCostFieldForTransition(currentStage) {
  switch (currentStage) {
    case 'Farm': return 'cost_to_warehouse';
    case 'Cora': return 'cost_to_export';
    case 'Port-Export': return 'cost_to_import';
    case 'Port-Import': return 'cost_to_client';
    default: return null;
  }
}

/**
 * Serialized Execution Queue
 */
let queryQueue = Promise.resolve();

export async function execute(sql, bind = []) {
  // Ensure DB is initialized before queuing
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    queryQueue = queryQueue.then(async () => {
      try {
        const results = await executeRaw(sql, bind);
        resolve(results);
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Internal Raw Execution (Bypasses Queue)
 * Only use during initialization or within existing queue blocks
 */
async function executeRaw(sql, bind = []) {
  let stmt = null;
  let str = null;

  try {
    str = sqlite3.str_new(db, sql);
    const sqlPtr = sqlite3.str_value(str);
    const prepared = await sqlite3.prepare_v2(db, sqlPtr);
    
    if (!prepared) return [];
    stmt = prepared.stmt;

    if (bind.length) {
        bind.forEach((val, i) => {
            const pos = i + 1;
            if (typeof val === 'number') {
                if (Number.isInteger(val)) sqlite3.bind_int(stmt, pos, val);
                else sqlite3.bind_double(stmt, pos, val);
            } else if (val === null) {
                sqlite3.bind_null(stmt, pos);
            } else {
                sqlite3.bind_text(stmt, pos, String(val));
            }
        });
    }

    const results = [];
    const cols = sqlite3.column_names(stmt);

    while (true) {
        const rc = await sqlite3.step(stmt);
        if (rc === SQLite.SQLITE_ROW) {
            const row = {};
            const rowData = sqlite3.row(stmt);
            cols.forEach((col, i) => { row[col] = rowData[i]; });
            results.push(row);
        } else if (rc === SQLite.SQLITE_DONE) {
            break;
        } else {
            throw new Error(sqlite3.errmsg(db));
        }
    }
    return results;
  } catch (e) {
    if (e.name === 'SQLiteError' && e.message === 'not an error') {
        return [];
    }
    throw e;
  } finally {
    if (stmt) await sqlite3.finalize(stmt);
    if (str) sqlite3.str_finish(str);
  }
}

export function initDB() {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      console.log('🏗 Initializing Persistent DB...');
      const module = await SQLiteESMFactory({
        locateFile: (file) => `/${file}`
      });
      
      sqlite3 = SQLite.Factory(module);
      const vfs = new IDBMinimalVFS(DB_NAME);
      sqlite3.vfs_register(vfs, true);

      db = await sqlite3.open_v2(
        DB_NAME,
        SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_URI,
        vfs.name
      );

      await runMigrationsInternal();
      await seedDataInternal();
      
      console.log('🚀 DB Ready');
      return db;
    } catch (err) {
      console.error("❌ Failed to init DB:", err);
      dbInitPromise = null; 
      throw err;
    }
  })();

  return dbInitPromise;
}

async function runMigrationsInternal() {
  const schema = `
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS producers (id TEXT PRIMARY KEY, name TEXT NOT NULL, relationship TEXT CHECK(relationship IN ('Important', 'Direct Trade', 'Co-op', 'Other')));
    CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT NOT NULL, relationship TEXT CHECK(relationship IN ('VIP', 'International', 'National', 'Other')), destination_country TEXT, destination_port TEXT, destination_city TEXT);
    CREATE TABLE IF NOT EXISTS farms (id TEXT PRIMARY KEY, producer_id TEXT NOT NULL, name TEXT NOT NULL, region TEXT CHECK(region IN ('Cusco', 'Cajamarca', 'Junin', 'Other')), altitude_meters REAL, location TEXT, certification TEXT CHECK(certification IN ('Organic', 'Fair Trade', 'Rainforest Alliance', 'None')), FOREIGN KEY (producer_id) REFERENCES producers(id));
    CREATE TABLE IF NOT EXISTS lots (id TEXT PRIMARY KEY, public_id TEXT, farm_id TEXT, variety TEXT CHECK(variety IN ('Typica', 'Caturra', 'Catuai', 'Geisha', 'Other')), process_method TEXT CHECK(process_method IN ('Washed', 'Natural', 'Honey', 'Anaerobic', 'Other')), total_weight_kg REAL, harvest_date TEXT, base_farm_cost_per_kg REAL, FOREIGN KEY (farm_id) REFERENCES farms(id));
    CREATE TABLE IF NOT EXISTS cost_ledger (id TEXT PRIMARY KEY, lot_id TEXT NOT NULL, cost_type TEXT CHECK(cost_type IN ('Milling', 'Drying', 'Sorting', 'Lab/Grading', 'Packaging', 'Transportation', 'Other')), amount_usd REAL NOT NULL, date_incurred TEXT, notes TEXT, FOREIGN KEY (lot_id) REFERENCES lots(id));
    CREATE TABLE IF NOT EXISTS contracts (id TEXT PRIMARY KEY, public_id TEXT, client_id TEXT NOT NULL, sale_price_per_kg REAL, required_quality_score REAL, required_flavor_profile TEXT, status TEXT CHECK(status IN ('Offered', 'Pending Allocation', 'Fulfilled')), FOREIGN KEY (client_id) REFERENCES clients(id));
    CREATE TABLE IF NOT EXISTS bags (id TEXT PRIMARY KEY, public_id TEXT, lot_id TEXT NOT NULL, weight_kg REAL NOT NULL, warehouse_location TEXT DEFAULT 'Cora', stock_code TEXT, status TEXT CHECK(status IN ('Available', 'Allocated', 'Shipped')), allocated_contract_id TEXT, FOREIGN KEY (lot_id) REFERENCES lots(id), FOREIGN KEY (allocated_contract_id) REFERENCES contracts(id));
    CREATE TABLE IF NOT EXISTS cupping_sessions (id TEXT PRIMARY KEY, public_id TEXT, lot_id TEXT NOT NULL, cupper_name TEXT NOT NULL, cupping_date TEXT, roast_level REAL, fragrance_dry REAL, fragrance_break REAL, score_fragrance REAL, score_flavor REAL, score_aftertaste REAL, score_acidity REAL, acidity_intensity REAL, score_body REAL, body_level REAL, score_balance REAL, score_overall REAL, uniformity_cups TEXT DEFAULT '1,1,1,1,1', score_uniformity REAL DEFAULT 10.0, clean_cup_cups TEXT DEFAULT '1,1,1,1,1', score_clean_cup REAL DEFAULT 10.0, sweetness_cups TEXT DEFAULT '1,1,1,1,1', score_sweetness REAL DEFAULT 10.0, defect_type TEXT CHECK(defect_type IN ('Taint', 'Fault', 'None')), defect_cups INTEGER DEFAULT 0, defect_score_subtract REAL DEFAULT 0.0, total_score REAL, final_score REAL, notes TEXT, primary_flavor_note TEXT, FOREIGN KEY (lot_id) REFERENCES lots(id));
    CREATE TABLE IF NOT EXISTS bag_milestones (id TEXT PRIMARY KEY, bag_id TEXT UNIQUE, current_stage TEXT DEFAULT 'Farm' CHECK (current_stage IN ('Farm', 'Cora', 'Port-Export', 'Port-Import','Final Destination')), cost_to_warehouse REAL, cost_to_export REAL, cost_to_import REAL, cost_to_client REAL, final_sale_price REAL, FOREIGN KEY (bag_id) REFERENCES bags(id));
  `;
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const sql of statements) {
      await executeRaw(sql);
  }
}

async function seedDataInternal() {
  const checkRes = await executeRaw("SELECT count(*) as count FROM producers");
  if (checkRes.length > 0 && checkRes[0].count > 0) return; 

  console.log("🌱 Seeding Demo Data...");
  await executeRaw(`INSERT INTO producers (id, name, relationship) VALUES ('prod-1', 'Finca La Huella', 'Direct Trade')`);
  await executeRaw(`INSERT INTO clients (id, name, relationship, destination_city) VALUES ('cli-1', 'Blue Bottle Tokyo', 'VIP', 'Tokyo')`);
  await executeRaw(`INSERT INTO contracts (id, public_id, client_id, sale_price_per_kg, status) VALUES ('con-1', 'CTR-24-001', 'cli-1', 15.50, 'Pending Allocation')`);
  await executeRaw(`INSERT INTO farms (id, producer_id, name, region, altitude_meters, location, certification) VALUES ('farm-1', 'prod-1', 'La Huella', 'Cusco', 1800, 'Santa Teresa', 'Organic')`);
  await executeRaw(`INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, harvest_date, base_farm_cost_per_kg) VALUES ('lot-1', 'L-2401', 'farm-1', 'Geisha', 'Washed', 690, '2023-06-15', 8.50)`);
  await executeRaw(`INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, harvest_date, base_farm_cost_per_kg) VALUES ('lot-2', 'L-2402', 'farm-1', 'Typica', 'Natural', 1000, '2023-06-20', 6.00)`);
  await executeRaw(`INSERT INTO cost_ledger (id, lot_id, cost_type, amount_usd, date_incurred) VALUES ('cl-1', 'lot-1', 'Milling', 345.00, '2023-06-20')`);
  await executeRaw(`INSERT INTO cost_ledger (id, lot_id, cost_type, amount_usd, date_incurred) VALUES ('cl-2', 'lot-1', 'Lab/Grading', 138.00, '2023-06-25')`);
  for(let i=1; i<=10; i++) {
     const bid = `bag-1-${i}`;
     await executeRaw(`INSERT INTO bags (id, public_id, lot_id, weight_kg, warehouse_location, stock_code, status, allocated_contract_id) VALUES (?, ?, 'lot-1', 69.0, 'Cora', ?, 'Allocated', 'con-1')`, [bid, `B-1-${i}`, `AA-${i}`]);
     await executeRaw(`INSERT INTO bag_milestones (id, bag_id, current_stage, cost_to_warehouse, cost_to_export, cost_to_import, cost_to_client, final_sale_price) VALUES (?, ?, 'Farm', 0, 0, 0, 0, 9.20)`, [`ms-${bid}`, bid]);
  }
}

export { generateStockCodes };

export async function buyLotTransaction(lotData) {
  if (!db) await initDB();
  const { farm_id, variety, process_method, total_weight_kg, base_farm_cost_per_kg } = lotData;
  const lotId = `lot-${Date.now()}`;
  const lotPublicId = `L-${String(Date.now()).slice(-4)}`;
  const BAG_SIZE = 69.0;
  const numBags = Math.ceil(total_weight_kg / BAG_SIZE);
  const remainder = total_weight_kg % BAG_SIZE;
  
  try {
    await execute('BEGIN TRANSACTION');
    await execute(`
      INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, base_farm_cost_per_kg, harvest_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [lotId, lotPublicId, farm_id, variety, process_method, total_weight_kg, base_farm_cost_per_kg, new Date().toISOString().split('T')[0]]);

    const lastBag = await execute(`SELECT stock_code FROM bags ORDER BY stock_code DESC LIMIT 1`);
    const lastCode = lastBag.length > 0 ? lastBag[0].stock_code : null;
    const newCodes = generateStockCodes(lastCode, numBags);
    
    for (let i = 0; i < numBags; i++) {
        const bagId = `bag-${lotId}-${i}`;
        const bagPublicId = `B-${lotPublicId}-${i+1}`;
        const stockCode = newCodes[i];
        const currentBagWeight = (i === numBags - 1 && remainder > 0) ? remainder : BAG_SIZE;
        
        await execute(`
            INSERT INTO bags (id, public_id, lot_id, weight_kg, status, stock_code, warehouse_location)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bagId, bagPublicId, lotId, currentBagWeight, 'Available', stockCode, 'Cora']);
        
        await execute(`
            INSERT INTO bag_milestones (id, bag_id, current_stage, final_sale_price)
            VALUES (?, ?, 'Farm', ?)
        `, [`ms-${bagId}`, bagId, base_farm_cost_per_kg]);
    }
    await execute('COMMIT');
    return { success: true, lotPublicId, numBags };
  } catch (err) {
    await execute('ROLLBACK');
    throw err;
  }
}

export async function advanceContractStage(contractId, costValue) {
  if (!db) await initDB();
  const bagRes = await execute(`
    SELECT bm.current_stage 
    FROM bag_milestones bm
    JOIN bags b ON bm.bag_id = b.id
    WHERE b.allocated_contract_id = ?
    LIMIT 1
  `, [contractId]);
  
  if (bagRes.length === 0) throw new Error("No milestones found for this contract");
  const currentStage = bagRes[0].current_stage;
  const nextStage = getNextStage(currentStage);
  if (!nextStage) throw new Error("Already at final destination");
  const costField = getCostFieldForTransition(currentStage); 
  
  try {
    await execute('BEGIN TRANSACTION');
    await execute(`
      UPDATE bag_milestones 
      SET ${costField} = ?, current_stage = ? 
      WHERE bag_id IN (SELECT id FROM bags WHERE allocated_contract_id = ?)
    `, [Number(costValue) || 0, nextStage, contractId]);

    await execute(`
      UPDATE bag_milestones
      SET final_sale_price = (
        SELECT 
          l.base_farm_cost_per_kg + 
          (SELECT COALESCE(SUM(amount_usd), 0) FROM cost_ledger WHERE lot_id = l.id) / l.total_weight_kg +
          COALESCE(cost_to_warehouse, 0) + 
          COALESCE(cost_to_export, 0) + 
          COALESCE(cost_to_import, 0) + 
          COALESCE(cost_to_client, 0)
        FROM bags b
        JOIN lots l ON b.lot_id = l.id
        WHERE b.id = bag_milestones.bag_id
      )
      WHERE bag_id IN (SELECT id FROM bags WHERE allocated_contract_id = ?)
    `, [contractId]);

    if (nextStage === 'Port-Export') {
        await execute(`UPDATE bags SET status = 'Shipped' WHERE allocated_contract_id = ?`, [contractId]);
    }
    await execute('COMMIT');
    return { success: true, nextStage };
  } catch (err) {
    await execute('ROLLBACK');
    throw err;
  }
}

export async function updateCell(tableName, id, column, newValue) {
  if (!db) await initDB();
  const numericColumns = [
    'weight_kg', 'total_weight_kg', 'altitude_meters', 'amount_usd', 
    'cost_to_warehouse', 'cost_to_export', 'cost_to_import', 'cost_to_client',
    'base_farm_cost_per_kg', 'sale_price_per_kg', 'total_score', 'final_score',
    'required_quality_score', 'roast_level', 'fragrance_dry', 'fragrance_break',
    'score_fragrance', 'score_flavor', 'score_aftertaste', 'score_acidity',
    'acidity_intensity', 'score_body', 'body_level', 'score_balance', 'score_overall',
    'score_uniformity', 'score_clean_cup', 'score_sweetness', 'defect_cups', 
    'defect_score_subtract'
  ];
  let val = newValue;
  if (numericColumns.includes(column)) val = parseFloat(newValue) || 0;
  await execute(`UPDATE ${tableName} SET ${column} = ? WHERE id = ?`, [val, id]);

  if (tableName === 'bag_milestones' && (column.startsWith('cost_') || column === 'final_sale_price')) {
      await execute(`
        UPDATE bag_milestones
        SET final_sale_price = (
          SELECT 
            l.base_farm_cost_per_kg + 
            (SELECT COALESCE(SUM(amount_usd), 0) FROM cost_ledger WHERE lot_id = l.id) / l.total_weight_kg +
            COALESCE(cost_to_warehouse, 0) + 
            COALESCE(cost_to_export, 0) + 
            COALESCE(cost_to_import, 0) + 
            COALESCE(cost_to_client, 0)
          FROM bags b
          JOIN lots l ON b.lot_id = l.id
          WHERE b.id = bag_milestones.bag_id
        )
        WHERE id = ?
      `, [id]);
  }
}

export async function deleteRow(tableName, id) {
  if (!db) await initDB();
  if (tableName === 'bags') await execute(`DELETE FROM bag_milestones WHERE bag_id = ?`, [id]);
  await execute(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
}

export async function exportDatabase() {
  const tables = ['producers', 'clients', 'farms', 'lots', 'cost_ledger', 'bags', 'cupping_sessions', 'contracts', 'bag_milestones'];
  const backup = {};
  for (const table of tables) backup[table] = await execute(`SELECT * FROM ${table}`);
  return JSON.stringify(backup, null, 2);
}

export async function importDatabase(jsonString) {
  const backup = JSON.parse(jsonString);
  const tablesInDeleteOrder = ['bag_milestones', 'cupping_sessions', 'cost_ledger', 'bags', 'contracts', 'lots', 'farms', 'producers', 'clients'];
  const tablesInInsertOrder = ['producers', 'clients', 'farms', 'lots', 'contracts', 'bags', 'cost_ledger', 'cupping_sessions', 'bag_milestones'];
  try {
    await execute('BEGIN TRANSACTION');
    for (const table of tablesInDeleteOrder) await execute(`DELETE FROM ${table}`);
    for (const table of tablesInInsertOrder) {
      if (backup[table] && Array.isArray(backup[table])) {
        for (const row of backup[table]) {
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(',');
          const values = Object.values(row);
          await executeRaw(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`, values);
        }
      }
    }
    await execute('COMMIT');
    return { success: true };
  } catch (err) {
    await execute('ROLLBACK');
    throw err;
  }
}
