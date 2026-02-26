import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from 'wa-sqlite';
import { IDBMinimalVFS } from 'wa-sqlite/src/examples/IDBMinimalVFS.js';
import { generateStockCodes } from '../utils/warehouseUtils';
import { CORE_SCHEMA } from './schema';
import { SEED_DATA } from './seedData';

let sqlite3 = null;
let db = null;
let dbInitPromise = null;

const DB_NAME = 'green_coffee_erp_v16'; 

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

/**
 * Flag to track if we are currently inside a transaction block.
 * When true, 'execute' will bypass the queue to avoid deadlocks
 * and ensure atomicity within the transaction.
 */
let isTransactionActive = false;

export async function execute(sql, bind = []) {
  // Ensure DB is initialized before queuing
  if (!db) await initDB();

  // If we are in a transaction, we are already inside the queue lock.
  // Bypass the queue to execute immediately.
  if (isTransactionActive) {
    return executeRaw(sql, bind);
  }

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
 * Helper to wrap database operations in a transaction.
 * Ensures that all operations within the callback are executed atomically
 * as a single batch in the execution queue.
 * 
 * @param {Function} callback - Async function containing database operations.
 * @returns {Promise<any>} - The result of the callback.
 */
export async function wrapInTransaction(callback) {
  if (!db) await initDB();

  // If a transaction is already active, just execute the callback.
  // This prevents deadlocks from recursive calls.
  if (isTransactionActive) {
    return callback();
  }

  return new Promise((resolve, reject) => {
    queryQueue = queryQueue.then(async () => {
      let rollbackNeeded = false;
      try {
        await executeRaw('BEGIN TRANSACTION');
        rollbackNeeded = true;
        isTransactionActive = true;
        
        const result = await callback();
        
        isTransactionActive = false;
        await executeRaw('COMMIT');
        rollbackNeeded = false;
        resolve(result);
      } catch (err) {
        isTransactionActive = false;
        if (rollbackNeeded) {
          try {
            await executeRaw('ROLLBACK');
          } catch (rollbackErr) {
            console.warn("Rollback failed:", rollbackErr.message);
          }
        }
        reject(err);
      }
    });
  });
}

/**
 * Internal Raw Execution (Bypasses Queue)
 * Includes a safety mechanism for Disk I/O errors with retries.
 */
async function executeRaw(sql, bind = [], retryCount = 0) {
  const MAX_RETRIES = 3;
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
    // Safety Mechanism: Handle Disk I/O errors with exponential backoff
    if (e.message.includes('disk I/O error') && retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 100;
      console.warn(`⚠️ Disk I/O Error. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return await executeRaw(sql, bind, retryCount + 1);
    }

    if (e.name === 'SQLiteError' && e.message === 'not an error') {
        return [];
    }
    throw e;
  } finally {
    if (stmt) await sqlite3.finalize(stmt);
    if (str) sqlite3.str_finish(str);
  }
}

export async function initDB() {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      console.log('🏗 Initializing Persistent DB...');
      const module = await SQLiteESMFactory({ 
        locateFile: (f) => f.startsWith('/') ? f : `${import.meta.env.BASE_URL}${f}` 
      });
      sqlite3 = SQLite.Factory(module);
      
      // Use a unique VFS name to avoid collisions with old versions
      const vfs = new IDBMinimalVFS(DB_NAME); 
      sqlite3.vfs_register(vfs, true);

      // Open with specific flags for browser-based concurrency
      db = await sqlite3.open_v2(
        DB_NAME,
        SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_URI,
        vfs.name
      );

      await executeRaw('PRAGMA foreign_keys = ON;');

      await alignSchema();
      await seedDataInternal();
      
      console.log('🚀 DB Ready');
      return db;
    } catch (err) {
      dbInitPromise = null; // Allow retry after failure
      
      if (err.message.includes('disk I/O error')) {
        console.error("🚨 DISK LOCK: I/O Error detected. IndexedDB is locked by another thread.");
        // Redirect to a specialized repair page if this happens during the pitch
      }
      throw err;
    }
  })();

  return dbInitPromise;
}

/**
 * Ensures all tables, views, and triggers from CORE_SCHEMA exist.
 */
export async function alignSchema() {
  // 1. Run Core Schema (CREATE IF NOT EXISTS)
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
      await executeRaw(sql);
    } catch (err) {
      console.error("Failed to execute migration statement:", sql, err);
      // Don't throw here, allow partial success (e.g. if trigger already exists)
    }
  }

  // 2. Dynamic Column Migration (Fix for "no such column" errors)
  try {
    const bagsInfo = await executeRaw("PRAGMA table_info(bags)");
    const hasLocation = bagsInfo.some(c => c.name === 'location');
    const hasWarehouseLocation = bagsInfo.some(c => c.name === 'warehouse_location');
    const hasContractId = bagsInfo.some(c => c.name === 'contract_id');
    const hasAllocatedContractId = bagsInfo.some(c => c.name === 'allocated_contract_id');

    if (hasWarehouseLocation && !hasLocation) {
      console.log("⚠️ Migrating bags.warehouse_location -> bags.location");
      await executeRaw("ALTER TABLE bags RENAME COLUMN warehouse_location TO location");
    }

    if (hasAllocatedContractId && !hasContractId) {
      console.log("⚠️ Migrating bags.allocated_contract_id -> bags.contract_id");
      await executeRaw("ALTER TABLE bags RENAME COLUMN allocated_contract_id TO contract_id");
    } else if (!hasContractId) {
       // Only add if it doesn't exist and wasn't just renamed
       console.log("⚠️ Adding missing column bags.contract_id");
       await executeRaw("ALTER TABLE bags ADD COLUMN contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE");
    }

  } catch (err) {
    console.error("Column migration failed:", err);
    // Proceeding, as this might be a fresh DB where columns are already correct
  }
}

async function runMigrationsInternal() {
  await alignSchema();
}

export async function seedDataInternal() {
  const checkRes = await executeRaw("SELECT count(*) as count FROM producers");
  if (checkRes.length > 0 && checkRes[0].count > 0) return; 

  console.log("🌱 Seeding Demo Data...");
  
  try {
    await executeRaw('BEGIN TRANSACTION');
    for (const [table, rows] of Object.entries(SEED_DATA)) {
      for (const row of rows) {
        const keys = Object.keys(row);
        const columns = keys.join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = Object.values(row);
        
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
        await executeRaw(sql, values);
      }
    }
    await executeRaw('COMMIT');
  } catch (err) {
    await executeRaw('ROLLBACK');
    console.error("❌ Seeding failed:", err);
    throw err;
  }
}

export { generateStockCodes };

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
}

export async function deleteRow(tableName, id) {
  if (!db) await initDB();
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
