import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from 'wa-sqlite';
// @ts-ignore
import { IDBMinimalVFS } from 'wa-sqlite/src/examples/IDBMinimalVFS.js';
import { generateStockCodes } from '../utils/warehouseUtils';
import { useStore } from '../store/store';
// @ts-ignore
import schemaSql from '../../Database Schema/simple_db.sql?raw';
import { 
  Producer, 
  Farm, 
  Client, 
  Lot, 
  Contract, 
  Bag, 
  CostLedger, 
  CuppingSession,
  StageType
} from '../types/database';

let sqlite3: any = null;
let db: any = null;
let dbInitPromise: Promise<any> | null = null;

const DB_NAME = 'green_coffee_erp_v10'; 

export const STAGE_ORDER: StageType[] = ['Farm', 'Cora', 'Port-Export', 'Port-Import', 'Final Destination'];

export function getNextStage(currentStage: StageType): StageType | null {
  const idx = STAGE_ORDER.indexOf(currentStage);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function getCostFieldForTransition(currentStage: StageType): string | null {
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

type QueryExecutor = <T>(sql: string, bind?: any[]) => Promise<T[]>;

/**
 * Safe Transaction Wrapper (Safe Rollback Pattern)
 * Ensures atomicity and prevents "no transaction active" errors.
 */
export async function executeTransaction<T>(callback: (tx: QueryExecutor) => Promise<T>): Promise<T> {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    queryQueue = queryQueue.then(async () => {
      try {
        await executeRaw('BEGIN TRANSACTION');
        const result = await callback(executeRaw); 
        await executeRaw('COMMIT');
        resolve(result);
      } catch (err: any) {
        try {
          await executeRaw('ROLLBACK');
        } catch (rbErr) {
          // Ignore rollback errors if transaction never started
        }
        console.error("🚫 [Transaction Aborted]:", err.message);
        reject(err);
      }
    });
  });
}

export async function execute<T>(sql: string, bind: any[] = []): Promise<T[]> {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    queryQueue = queryQueue.then(async () => {
      try {
        const results = await executeRaw<T>(sql, bind);
        resolve(results);
      } catch (e: any) {
        console.error("🚫 [SQL Execution Error]:", e.message, "\nSQL:", sql);
        reject(e);
      }
    }).catch(() => {});
  });
}

/**
 * Internal Raw Execution (Bypasses Queue)
 */
async function executeRaw<T>(sql: string, bind: any[] = []): Promise<T[]> {
  let stmt: any = null;
  let str: any = null;

  try {
    str = sqlite3.str_new(db, sql);
    const sqlPtr = sqlite3.str_value(str);
    const prepared = await sqlite3.prepare_v2(db, sqlPtr);
    
    if (!prepared || !prepared.stmt) {
        throw new Error(`SQLite Prepare Error: ${sqlite3.errmsg(db)} | SQL: ${sql.slice(0, 100)}...`);
    }
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

    const results: T[] = [];
    const cols = sqlite3.column_names(stmt);

    while (true) {
        const rc = await sqlite3.step(stmt);
        if (rc === SQLite.SQLITE_ROW) {
            const row: any = {};
            const rowData = sqlite3.row(stmt);
            cols.forEach((col: string, i: number) => { row[col] = rowData[i]; });
            results.push(row as T);
        } else if (rc === SQLite.SQLITE_DONE) {
            break;
        } else {
            throw new Error(sqlite3.errmsg(db));
        }
    }
    return results;
  } catch (e: any) {
    if (e.name === 'SQLiteError' && e.message === 'not an error') {
        return [];
    }
    throw e;
  } finally {
    if (stmt) await sqlite3.finalize(stmt);
    if (str) sqlite3.str_finish(str);
  }
}

export function initDB(): Promise<any> {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      console.log('🏗 Initializing Persistent DB via SQL Loader...');
      const module = await SQLiteESMFactory({
        locateFile: (file: string) => `/${file}`
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
      
      console.log('🚀 DB Ready (Thick Database Architecture)');
      return db;
    } catch (err) {
      console.error("❌ Failed to init DB:", err);
      dbInitPromise = null; 
      throw err;
    }
  })();

  return dbInitPromise;
}

/**
 * Clean Schema Loader
 * Executes simple_db.sql statement by statement using prepare_v2 loop.
 */
async function runMigrationsInternal(): Promise<void> {
  console.log("🛠 [Database] Syncing with simple_db.sql...");
  
  if (!schemaSql || typeof schemaSql !== 'string') {
    console.error("❌ [Migration] Schema SQL is missing or invalid type:", typeof schemaSql);
    throw new Error("Schema SQL source is invalid.");
  }

  console.log(`📊 [Migration] Schema length: ${schemaSql.length} characters`);
  
  let str = sqlite3.str_new(db, schemaSql);
  let sqlPtr = sqlite3.str_value(str);
  let statementsCount = 0;

  try {
    while (sqlPtr) {
      const prepared = await sqlite3.prepare_v2(db, sqlPtr);
      if (!prepared) {
        console.warn("⚠️ [Migration] prepare_v2 returned null/undefined at ptr:", sqlPtr);
        break;
      }

      const { stmt, sql_after } = prepared;
      
      if (stmt) {
        statementsCount++;
        while (true) {
          const rc = await sqlite3.step(stmt);
          if (rc === SQLite.SQLITE_ROW) {
            // Ignore results for migrations
          } else if (rc === SQLite.SQLITE_DONE) {
            break;
          } else {
            const msg = sqlite3.errmsg(db);
            console.error(`❌ [Migration] Step error at statement ${statementsCount}:`, msg);
            throw new Error(`Migration step failed: ${msg}`);
          }
        }
        await sqlite3.finalize(stmt);
      }

      // Check if we've moved forward
      if (sql_after === sqlPtr) {
        console.error("❌ [Migration] Pointer did not advance. Infinite loop guarded.");
        break;
      }

      sqlPtr = sql_after;
    }
    console.log(`✅ [Migration] Successfully executed ${statementsCount} SQL statements.`);
  } catch (e: any) {
    console.error("❌ [Migration Critical Failure]:", e.message);
    throw e; // Re-throw to prevent seedDataInternal from running
  } finally {
    sqlite3.str_finish(str);
  }
}

async function seedDataInternal(): Promise<void> {
  const checkRes = await executeRaw<{count: number}>("SELECT count(*) as count FROM producers");
  if (checkRes.length > 0 && checkRes[0].count > 0) return; 

  console.log("🌱 Seeding Demo Data...");
  await executeRaw(`INSERT INTO producers (id, name, relationship) VALUES ('prod-1', 'Finca La Huella', 'Direct Trade')`);
  await executeRaw(`INSERT INTO clients (id, name, relationship, destination_city) VALUES ('cli-1', 'Blue Bottle Tokyo', 'VIP', 'Tokyo')`);
  await executeRaw(`INSERT INTO contracts (id, public_id, client_id, sale_price_per_kg, status) VALUES ('con-1', 'CTR-24-001', 'cli-1', 15.50, 'Processing')`);
  await executeRaw(`INSERT INTO farms (id, producer_id, name, region, altitude_meters, location, certification) VALUES ('farm-1', 'prod-1', 'La Huella', 'Cusco', 1800, 'Santa Teresa', 'Organic')`);
  await executeRaw(`INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, harvest_date, base_farm_cost_per_kg) VALUES ('lot-1', 'L-2401', 'farm-1', 'Geisha', 'Washed', 690, '2023-06-15', 8.50)`);
  await executeRaw(`INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, harvest_date, base_farm_cost_per_kg) VALUES ('lot-2', 'L-2402', 'farm-1', 'Typica', 'Natural', 1000, '2023-06-20', 6.00)`);
  await executeRaw(`INSERT INTO cost_ledger (id, lot_id, cost_type, amount_usd, date_incurred) VALUES ('cl-1', 'lot-1', 'Milling', 345.00, '2023-06-20')`);
  await executeRaw(`INSERT INTO cost_ledger (id, lot_id, cost_type, amount_usd, date_incurred) VALUES ('cl-2', 'lot-1', 'Lab/Grading', 138.00, '2023-06-25')`);
  for(let i=1; i<=10; i++) {
     const bid = `bag-1-${i}`;
     await executeRaw(`INSERT INTO bags (id, public_id, lot_id, weight_kg, location, stock_code, status, contract_id) VALUES (?, ?, 'lot-1', 69.0, 'Cora', ?, 'Allocated', 'con-1')`, [bid, `B-1-${i}`, `AA-${i}`]);
  }
}

export { generateStockCodes };

/**
 * Generic safe insert for Producers, Farms, and Clients.
 */
export async function registerEntity<T>(table: string, data: any): Promise<T> {
  if (!db) await initDB();
  const allowedTables = ['producers', 'farms', 'clients'];
  if (!allowedTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  const id = `${table.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const keys = ['id', ...Object.keys(data)];
  const values = [id, ...Object.values(data)];
  const placeholders = keys.map(() => '?').join(',');

  return executeTransaction(async (tx) => {
    await tx(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values);
    (useStore.getState() as any).triggerRefresh();
    return { id, ...data } as T;
  });
}

/**
 * ID Generation Protocol (Internal)
 */
async function generatePublicId(base: string, table: string): Promise<string> {
    let publicId = base.toUpperCase().replace(/\s+/g, '_');
    const existing = await execute<{id: string}>(`SELECT id FROM ${table} WHERE public_id = ?`, [publicId]);
    if (existing.length > 0) {
        publicId += `-${Math.floor(Math.random() * 90) + 10}`;
    }
    return publicId;
}

export async function buyLotTransaction(lotData: Partial<Lot>): Promise<{ success: boolean, id: string, lotPublicId: string, numBags: number }> {
  if (!db) await initDB();
  const { farm_id, variety, process_method, total_weight_kg, base_farm_cost_per_kg, harvest_date } = lotData;
  
  if (!farm_id) throw new Error("Missing Farm ID reference.");

  const farmRes = await execute<{name: string}>("SELECT name FROM farms WHERE id = ?", [farm_id]);
  if (farmRes.length === 0) throw new Error(`Traceability Error: Farm ID ${farm_id} does not exist.`);
  
  const farmName = farmRes[0].name;
  const lotCountRes = await execute<{count: number}>("SELECT COUNT(*) as count FROM lots WHERE farm_id = ?", [farm_id]);
  const lotIndex = String(lotCountRes[0].count + 1).padStart(2, '0');
  
  const lotId = `lot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const lotPublicId = await generatePublicId(`${farmName}-${lotIndex}`, 'lots');
  
  const BAG_SIZE = 69.0;
  const numBags = Math.ceil((total_weight_kg || 0) / BAG_SIZE);
  const remainder = (total_weight_kg || 0) % BAG_SIZE;
  const formattedDate = (harvest_date || '').replace(/-/g, '');
  
  return executeTransaction(async (tx) => {
    await tx(`
      INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, base_farm_cost_per_kg, harvest_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [lotId, lotPublicId, farm_id, variety, process_method, total_weight_kg, base_farm_cost_per_kg, harvest_date]);

    const lastBag = await tx<{stock_code: string}>(`SELECT stock_code FROM bags ORDER BY stock_code DESC LIMIT 1`);
    const lastCode = lastBag.length > 0 ? lastBag[0].stock_code : null;
    const newCodes = generateStockCodes(lastCode, numBags);
    
    for (let i = 0; i < numBags; i++) {
        const bagId = `bag-${lotId}-${i}-${Math.floor(Math.random() * 1000)}`;
        const bagIndex = String(i + 1).padStart(2, '0');
        const bagPublicId = `${farmName.slice(0,3).toUpperCase()}-${(variety || 'UNK').toUpperCase()}-${formattedDate}-${bagIndex}`;
        const stockCode = newCodes[i];
        const currentBagWeight = (i === numBags - 1 && remainder > 0) ? remainder : BAG_SIZE;
        
        await tx(`
            INSERT INTO bags (id, public_id, lot_id, weight_kg, status, stock_code, location)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [bagId, bagPublicId, lotId, currentBagWeight, 'Available', stockCode, 'Cora']);
    }
    (useStore.getState() as any).triggerRefresh();
    return { success: true, id: lotId, lotPublicId, numBags };
  });
}

export async function finalizeReservation(contractData: Partial<Contract> & { variety?: string }, bagIds: string[]): Promise<{ success: boolean, id: string, contractPublicId: string }> {
  if (!db) await initDB();
  const { client_id, sale_price_per_kg, required_quality_score, required_flavor_profile, variety } = contractData;
  
  const clientRes = await execute<{name: string}>("SELECT name FROM clients WHERE id = ?", [client_id]);
  const clientName = clientRes[0]?.name || 'CLIENT';
  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  const contractId = `con-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const contractBase = `${clientName.slice(0,5)}-${variety || 'MIX'}-${currentDate}`;
  const contractPublicId = await generatePublicId(contractBase, 'contracts');

  return executeTransaction(async (tx) => {
    await tx(`
      INSERT INTO contracts (id, public_id, client_id, sale_price_per_kg, required_quality_score, required_flavor_profile, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [contractId, contractPublicId, client_id, sale_price_per_kg, required_quality_score, required_flavor_profile, 'Processing']);

    for (const bagId of bagIds) {
      await tx(`UPDATE bags SET contract_id = ? WHERE id = ?`, [contractId, bagId]);
    }

    (useStore.getState() as any).triggerRefresh();
    return { success: true, id: contractId, contractPublicId };
  });
}

export async function submitCuppingSession(qcData: Partial<CuppingSession>): Promise<{ success: boolean, id: string, publicId: string }> {
  if (!db) await initDB();
  
  const lotRes = await execute<{variety: string, farm_name: string}>("SELECT variety, f.name as farm_name FROM lots l JOIN farms f ON l.farm_id = f.id WHERE l.id = ?", [qcData.lot_id]);
  const { variety, farm_name } = lotRes[0] || { variety: 'UNK', farm_name: 'FARM' };
  
  const id = `qc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const qcBase = `${farm_name.slice(0,5)}-${variety}-${(qcData.cupper_name || 'UNK').slice(0,5)}`;
  const publicId = await generatePublicId(qcBase, 'cupping_sessions');
  
  const keys = ['id', 'public_id', ...Object.keys(qcData)];
  const values = [id, publicId, ...Object.values(qcData)];
  const placeholders = keys.map(() => '?').join(',');

  return executeTransaction(async (tx) => {
    await tx(`INSERT INTO cupping_sessions (${keys.join(', ')}) VALUES (${placeholders})`, values);
    (useStore.getState() as any).triggerRefresh();
    return { success: true, id, publicId };
  });
}

export async function logCostTransaction(costData: Partial<CostLedger>): Promise<{ success: boolean, id: string, publicId: string }> {
  if (!db) await initDB();
  const { lot_id, contract_id, cost_type, amount_usd, date_incurred, notes } = costData;

  const lotRes = await execute<{public_id: string}>("SELECT public_id FROM lots WHERE id = ?", [lot_id]);
  const lotPublicId = lotRes[0]?.public_id || 'UNK';
  const id = `cl-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const publicId = `COST-${lotPublicId}-${(cost_type || 'UNK').slice(0,3).toUpperCase()}-${Date.now()}`;

  return executeTransaction(async (tx) => {
    await tx(`
      INSERT INTO cost_ledger (id, public_id, lot_id, contract_id, cost_type, amount_usd, date_incurred, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, publicId, lot_id, contract_id, cost_type, amount_usd || 0, date_incurred, notes]);
    (useStore.getState() as any).triggerRefresh();
    return { success: true, id, publicId };
  });
}

export async function compactWarehouse(): Promise<{ success: boolean }> {
  if (!db) await initDB();
  const palletRes = await execute<{pallet: string}>(`SELECT DISTINCT SUBSTR(stock_code, 1, INSTR(stock_code, '-') - 1) as pallet FROM bags WHERE stock_code IS NOT NULL`);
  const pallets = palletRes.map(r => r.pallet).filter(p => p);

  return executeTransaction(async (tx) => {
    for (const pallet of pallets) {
      const remainingBags = await tx<{id: string, stock_code: string}>(
        `SELECT id, stock_code FROM bags WHERE stock_code LIKE ? AND status != 'Shipped' ORDER BY CAST(SUBSTR(stock_code, INSTR(stock_code, '-') + 1) AS INTEGER) ASC`,
        [`${pallet}-%`]
      );
      for (let i = 0; i < remainingBags.length; i++) {
        const oldCode = remainingBags[i].stock_code;
        const newCode = `${pallet}-${i + 1}`;
        if (oldCode !== newCode) {
          await tx(`UPDATE bags SET stock_code = NULL WHERE id = ?`, [remainingBags[i].id]);
          await tx(`UPDATE bags SET stock_code = ? WHERE id = ?`, [newCode, remainingBags[i].id]);
        }
      }
    }
    (useStore.getState() as any).triggerRefresh();
    return { success: true };
  });
}

export async function advanceContractStage(contractId: string, costValue: string | number): Promise<{ success: boolean, nextStage: StageType }> {
  if (!db) await initDB();
  const contractRes = await execute<{current_stage: StageType}>(`SELECT current_stage FROM contracts WHERE id = ?`, [contractId]);
  if (contractRes.length === 0) throw new Error("Contract not found.");
  
  const currentStage = contractRes[0].current_stage || 'Farm';
  const nextStage = getNextStage(currentStage);
  if (!nextStage) throw new Error("Contract is already at Final Destination.");

  return executeTransaction(async (tx) => {
    const bags = await tx<{id: string, lot_id: string}>(`SELECT id, lot_id FROM bags WHERE contract_id = ?`, [contractId]);
    const lotId = bags[0]?.lot_id;

    await tx(`UPDATE contracts SET current_stage = ? WHERE id = ?`, [nextStage, contractId]);
    await tx(`UPDATE bags SET location = ? WHERE contract_id = ?`, [nextStage, contractId]);

    if (lotId) {
      const costId = `cl-${Date.now()}`;
      await tx(`
        INSERT INTO cost_ledger (id, lot_id, contract_id, cost_type, amount_usd, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [costId, lotId, contractId, 'Transportation', parseFloat(costValue as string) || 0, `Auto-log: ${currentStage} -> ${nextStage}`]);
    }
    (useStore.getState() as any).triggerRefresh();
    return { success: true, nextStage };
  });
}

export async function updateCell(tableName: string, id: string, column: string, newValue: any): Promise<{ success: boolean }> {
  if (!db) await initDB();
  let val = newValue;
  const numeric = ['weight_kg', 'total_weight_kg', 'amount_usd', 'base_farm_cost_per_kg', 'sale_price_per_kg', 'final_score', 'total_score'];
  if (numeric.includes(column)) val = parseFloat(newValue) || 0;
  
  await execute(`UPDATE ${tableName} SET ${column} = ? WHERE id = ?`, [val, id]);
  (useStore.getState() as any).triggerRefresh();
  return { success: true };
}

export async function deleteRow(tableName: string, id: string): Promise<{ success: boolean }> {
  if (!db) await initDB();
  return executeTransaction(async (tx) => {
    await tx(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    (useStore.getState() as any).triggerRefresh();
    return { success: true };
  });
}

export async function exportDatabase(): Promise<string> {
  const tables = ['producers', 'clients', 'farms', 'lots', 'cost_ledger', 'bags', 'cupping_sessions', 'contracts', 'bag_milestones'];
  const backup: any = {};
  for (const table of tables) backup[table] = await execute(`SELECT * FROM ${table}`);
  return JSON.stringify(backup, null, 2);
}

export async function importDatabase(jsonString: string): Promise<{ success: boolean }> {
  const backup = JSON.parse(jsonString);
  const tablesInDeleteOrder = ['bag_milestones', 'cupping_sessions', 'cost_ledger', 'bags', 'contracts', 'lots', 'farms', 'producers', 'clients'];
  const tablesInInsertOrder = ['producers', 'clients', 'farms', 'lots', 'contracts', 'bags', 'cost_ledger', 'cupping_sessions', 'bag_milestones'];
  
  return executeTransaction(async (tx) => {
    for (const table of tablesInDeleteOrder) await tx(`DELETE FROM ${table}`);
    for (const table of tablesInInsertOrder) {
      if (backup[table] && Array.isArray(backup[table])) {
        for (const row of backup[table]) {
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(',');
          const values = Object.values(row);
          await tx(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`, values);
        }
      }
    }
    (useStore.getState() as any).triggerRefresh();
    return { success: true };
  });
}
