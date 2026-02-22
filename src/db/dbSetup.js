import SQLiteFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite';
import { MemoryVFS } from 'wa-sqlite/src/examples/MemoryVFS.js';

let sqlite3 = null;
let db = null;
let dbInitPromise = null;

const DB_NAME = 'green_coffee_erp_v4';

export function initDB() {
  // Singleton Pattern: Return existing instance or running promise
  if (db) return Promise.resolve(db);
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      console.log('Initializing DB...');
      const module = await SQLiteFactory({
        locateFile: (file) => '/wa-sqlite.wasm' // Force use of synchronous WASM
      });
      
      sqlite3 = SQLite.Factory(module);
      
      // Use MemoryVFS for stability (no IndexedDB locking issues)
      const vfs = new MemoryVFS();
      sqlite3.vfs_register(vfs, true);

      db = await sqlite3.open_v2(
        DB_NAME,
        SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_URI,
        vfs.name
      );

      await runMigrations();
      await seedData();
      
      console.log('DB Initialized');
      return db;
    } catch (err) {
      console.error("Failed to init DB:", err);
      dbInitPromise = null; // Allow retry
      throw err;
    }
  })();

  return dbInitPromise;
}

// PASTE THIS NEW VERSION IN ITS PLACE:

// A simple queue to serialize queries and protect WASM memory from React Strict Mode
let queryQueue = Promise.resolve();

export async function execute(sql, bind = []) {
  if (!db) await initDB();

  // We wrap the execution in a Promise queue to prevent concurrent WASM memory collisions
  return new Promise((resolve, reject) => {
    queryQueue = queryQueue.then(async () => {
      const results = [];
      
      try {
        // sqlite3.statements() automatically handles memory allocation and finalization safely!
        for await (const stmt of sqlite3.statements(db, sql)) {
          
          // 1. Bind parameters if they exist
          if (bind.length) {
            bind.forEach((val, i) => {
              sqlite3.bind_text(stmt, i + 1, String(val));
            });
          }

          // 2. Fetch column names once per statement
          const cols = sqlite3.column_names(stmt);

          // 3. Execute and map rows
          while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
            const row = {};
            const rowData = sqlite3.row(stmt); // Built-in helper is much cleaner!
            
            cols.forEach((col, i) => {
              row[col] = rowData[i];
            });
            
            results.push(row);
          }
        }
        resolve(results);
      } catch (e) {
        // Ignore innocuous errors that wa-sqlite sometimes throws during hot-reloads
        if (e.name === 'SQLiteError' && e.message === 'not an error') {
          resolve(results);
        } else {
          console.error("SQL Execute Error:", e);
          reject(e);
        }
      }
    });
  });
}

async function runMigrations() {
  const schema = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS producers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        relationship TEXT CHECK(relationship IN ('Important', 'Direct Trade', 'Co-op', 'Other'))
    );

    CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        relationship TEXT CHECK(relationship IN ('VIP', 'International', 'National', 'Other')),
        destination_country TEXT,
        destination_port TEXT,
        destination_city TEXT
    );

    CREATE TABLE IF NOT EXISTS farms (
        id TEXT PRIMARY KEY,
        producer_id TEXT NOT NULL,
        name TEXT NOT NULL,
        region TEXT CHECK(region IN ('Cusco', 'Cajamarca', 'Junin', 'Other')),
        altitude_meters REAL,
        location TEXT CHECK(location IN ('Quillabamba', 'Santa Teresa', 'Quellouno', 'Other')),
        certification TEXT CHECK(certification IN ('Organic', 'Fair Trade', 'Rainforest Alliance', 'None')),
        FOREIGN KEY (producer_id) REFERENCES producers(id)
    );

    CREATE TABLE IF NOT EXISTS lots (
        id TEXT PRIMARY KEY,
        public_id TEXT,
        farm_id TEXT,
        variety TEXT CHECK(variety IN ('Typica', 'Caturra', 'Catuai', 'Geisha', 'Other')),
        process_method TEXT CHECK(process_method IN ('Washed', 'Natural', 'Honey', 'Anaerobic', 'Other')),
        total_weight_kg REAL,
        harvest_date TEXT,
        base_farm_cost_per_kg REAL,
        FOREIGN KEY (farm_id) REFERENCES farms(id)
    );

    CREATE TABLE IF NOT EXISTS cost_ledger (
        id TEXT PRIMARY KEY,
        lot_id TEXT NOT NULL,
        cost_type TEXT CHECK(cost_type IN ('Milling', 'Drying', 'Sorting', 'Lab/Grading', 'Packaging', 'Transportation', 'Other')),
        amount_usd REAL NOT NULL,
        date_incurred TEXT,
        notes TEXT,
        FOREIGN KEY (lot_id) REFERENCES lots(id)
    );

    CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        public_id TEXT,
        client_id TEXT NOT NULL,
        sale_price_per_kg REAL,
        required_quality_score REAL,
        required_flavor_profile TEXT,
        status TEXT CHECK(status IN ('Offered', 'Pending Allocation', 'Fulfilled')),
        FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS bags (
        id TEXT PRIMARY KEY,
        public_id TEXT,
        lot_id TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        warehouse_location TEXT DEFAULT 'Cora', 
        stock_code TEXT, 
        status TEXT CHECK(status IN ('Available', 'Allocated', 'Shipped')),
        allocated_contract_id TEXT,
        FOREIGN KEY (lot_id) REFERENCES lots(id),
        FOREIGN KEY (allocated_contract_id) REFERENCES contracts(id)
    );

    CREATE TABLE IF NOT EXISTS cupping_sessions (
        id TEXT PRIMARY KEY,
        public_id TEXT,
        lot_id TEXT NOT NULL,
        cupper_name TEXT NOT NULL,
        cupping_date TEXT,
        roast_level REAL,
        fragrance_dry REAL,
        fragrance_break REAL,
        score_fragrance REAL,
        score_flavor REAL,
        score_aftertaste REAL,
        score_acidity REAL,
        acidity_intensity REAL,
        score_body REAL,
        body_level REAL,
        score_balance REAL,
        score_overall REAL,
        uniformity_cups TEXT DEFAULT '1,1,1,1,1',
        score_uniformity REAL DEFAULT 10.0,
        clean_cup_cups TEXT DEFAULT '1,1,1,1,1',
        score_clean_cup REAL DEFAULT 10.0,
        sweetness_cups TEXT DEFAULT '1,1,1,1,1',
        score_sweetness REAL DEFAULT 10.0,
        defect_type TEXT CHECK(defect_type IN ('Taint', 'Fault', 'None')),
        defect_cups INTEGER DEFAULT 0,
        defect_score_subtract REAL DEFAULT 0.0,
        total_score REAL,
        final_score REAL,
        notes TEXT,
        primary_flavor_note TEXT,
        FOREIGN KEY (lot_id) REFERENCES lots(id)
    );

    CREATE TABLE IF NOT EXISTS bag_milestones (
        id TEXT PRIMARY KEY,
        bag_id TEXT UNIQUE,
        contract_id TEXT,
        current_stage TEXT DEFAULT 'Farm' CHECK (current_stage IN ('Farm', 'Cora', 'Transportation', 'Port','Final Destination')),
        cost_at_farm REAL,
        cost_at_warehouse REAL,
        cost_at_export REAL,
        cost_at_transport REAL,
        cost_at_import REAL,
        final_sale_price REAL,
        FOREIGN KEY (bag_id) REFERENCES bags(id),
        FOREIGN KEY (contract_id) REFERENCES contracts(id)
    );
  `;
  
  // Split manually for synchronous execution
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
      await execute(stmt);
  }
}

async function seedData() {
  const check = await execute("SELECT count(*) as count FROM producers");
  if (check.length > 0 && check[0].count > 0) return; 

  console.log("Seeding Database...");

  await execute(`INSERT INTO producers (id, name, relationship) VALUES ('prod-1', 'Finca La Huella', 'Direct Trade')`);
  
  await execute(`INSERT INTO farms (id, producer_id, name, region, altitude_meters, location, certification) 
                 VALUES ('farm-1', 'prod-1', 'La Huella', 'Cusco', 1800, 'Santa Teresa', 'Organic')`);

  await execute(`INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, harvest_date, base_farm_cost_per_kg)
                 VALUES ('lot-1', 'L-2401', 'farm-1', 'Geisha', 'Washed', 690, '2023-06-15', 8.50)`);
  await execute(`INSERT INTO lots (id, public_id, farm_id, variety, process_method, total_weight_kg, harvest_date, base_farm_cost_per_kg)
                 VALUES ('lot-2', 'L-2402', 'farm-1', 'Typica', 'Natural', 1000, '2023-06-20', 6.00)`);

  for(let i=1; i<=10; i++) {
     await execute(`INSERT INTO bags (id, public_id, lot_id, weight_kg, warehouse_location, stock_code, status)
                    VALUES ('bag-1-${i}', 'B-1-${i}', 'lot-1', 69.0, 'Cora', 'AA-${i}', 'Available')`);
     
     await execute(`INSERT INTO bag_milestones (id, bag_id, current_stage, cost_at_farm, cost_at_warehouse)
                    VALUES ('ms-1-${i}', 'bag-1-${i}', 'Farm', 8.50, 9.20)`);
  }

  await execute(`INSERT INTO cupping_sessions (id, public_id, lot_id, cupper_name, cupping_date, total_score, notes)
                 VALUES ('cs-1', 'QC-001', 'lot-1', 'Head Roaster', '2023-07-01', 88.5, 'Floral, Jasmine, Tea-like')`);
  await execute(`INSERT INTO cupping_sessions (id, public_id, lot_id, cupper_name, cupping_date, total_score, notes)
                 VALUES ('cs-2', 'QC-002', 'lot-1', 'Assistant', '2023-07-01', 87.0, 'Clean, Sweet, Lemon')`);
  await execute(`INSERT INTO cupping_sessions (id, public_id, lot_id, cupper_name, cupping_date, total_score, notes)
                 VALUES ('cs-3', 'QC-003', 'lot-2', 'Head Roaster', '2023-07-02', 84.0, 'Fruity but slightly fermented')`);

  console.log("Database seeded.");
}
