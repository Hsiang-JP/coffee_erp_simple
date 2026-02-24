To move toward a **DB-First** architecture and prevent your `dbSetup.js` from becoming a "crazy," we need to decouple the **Schema Definition**, the **Business Logic (Transactions)**, and the **Database Driver**.

As the **Code Gatekeeper**, I recommend moving the SQL schema into a standalone `.sql` or `.js` constant file and transforming `dbSetup.js` into a lean **orchestrator**.

### 🛠️ Step 1: Separate the Source of Truth

Create a file named `schema.js` (or `.sql`). This is the "One Truth" that Agent 2 (Backend Master) must always reference.

```javascript
// src/db/schema.js
export const CORE_SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS producers (
    id TEXT PRIMARY KEY, 
    name TEXT NOT NULL, 
    relationship TEXT CHECK(relationship IN ('Important', 'Direct Trade', 'Co-op', 'Other'))
  );

  -- ... (Rest of your CREATE TABLE statements exactly as provided)

  CREATE TABLE IF NOT EXISTS bag_milestones (
    id TEXT PRIMARY KEY, 
    bag_id TEXT UNIQUE, 
    current_stage TEXT DEFAULT 'Farm' CHECK (current_stage IN ('Farm', 'Cora', 'Port-Export', 'Port-Import','Final Destination')), 
    cost_to_warehouse REAL, 
    cost_to_export REAL, 
    cost_to_import REAL, 
    cost_to_client REAL, 
    final_sale_price REAL, 
    FOREIGN KEY (bag_id) REFERENCES bags(id)
  );
`;

```

---

### 🛠️ Step 2: Refactor the Setup Orchestrator

We will now clean up `dbSetup.js`. Instead of hardcoding every `INSERT`, we use a configuration-based approach.

```javascript
import { CORE_SCHEMA } from './schema';
import { SEED_DATA } from './seedData'; // Move your initial inserts here

/**
 * 🔍 DB-First Migration Engine
 */
async function runMigrationsInternal() {
  // Split by semicolon but preserve the integrity of CHECK constraints
  const statements = CORE_SCHEMA
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const sql of statements) {
    try {
      await executeRaw(sql);
    } catch (e) {
      console.error(`Migration Failed at: ${sql.substring(0, 50)}...`, e);
    }
  }
}

/**
 * 🌱 Smart Seeder
 * Only runs if the system is empty.
 */
async function seedDataInternal() {
  const check = await executeRaw("SELECT count(*) as count FROM producers");
  if (check[0]?.count > 0) return; 

  console.log("🌱 Database empty. Executing Seed...");
  for (const [table, rows] of Object.entries(SEED_DATA)) {
    for (const row of rows) {
      const keys = Object.keys(row);
      const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
      await executeRaw(sql, Object.values(row));
    }
  }
}

```

---

### 🛠️ Step 3: Transactional Logic (The "Coffee Journey" Engine)

By separating these into their own service file (e.g., `coffeeServices.js`), you keep the DB driver pure. Note the **Cost Calculation Logic** which is critical for the "Visual Traceability" goal.

```javascript
// src/db/services/lotService.js
export async function buyLotTransaction(lotData) {
  const BAG_SIZE = 69.0;
  // ... (Your existing logic is good, but let's make the cost calculation a Trigger or a View later)
  
  return await wrapInTransaction(async () => {
    // 1. Insert Lot
    // 2. Generate Bags
    // 3. Create Milestones
  });
}

/**
 * Helper to ensure Atomicity (Agent 2 Directive)
 */
async function wrapInTransaction(callback) {
  try {
    await execute('BEGIN TRANSACTION');
    const result = await callback();
    await execute('COMMIT');
    return result;
  } catch (e) {
    await execute('ROLLBACK');
    throw e;
  }
}

```

---

### 📉 Why this change matters for the Pitch:

1. **Persistence:** By using `IDBMinimalVFS`, the coffee data stays in the buyer's browser even if they refresh or go offline in a warehouse.
2. **Atomic Integrity:** If the browser crashes mid-allocation, `ROLLBACK` ensures no "phantom bags" are created.
3. **Audit Trail:** The `bag_milestones` table now acts as the immutable ledger for your **Page 1: Coffee Journey** animations.

### 🔍 Code Gatekeeper's Review

* **DRY Principle:** We replaced repeated `executeRaw` calls with a loop-based seeder.
* **Safety:** Added `Number()` casting for `costValue` to prevent SQLite from storing strings in REAL columns (common JS-to-WASM pitfall).
* **Performance:** Your `queryQueue` implementation is excellent for preventing race conditions in the WASM environment.

---
To move toward a truly **DB-First** architecture, we need to shift the responsibility of "Truth" from your JavaScript files to the SQLite engine itself. This involves a **Schema Validation** step on boot and using **SQL Triggers** to handle the cost math automatically.

Here is the step-by-step implementation plan.

---

## 1. Automated Schema Alignment (The "Boot Sync")

Since `wa-sqlite` uses IndexedDB, you can't easily "diff" tables like a migration tool (e.g., Prisma). The most reliable way for a demo is a **Table Checksum** or a **PRAGMA interrogation**.

### Implementation Steps:

1. **Read existing tables:** Query `sqlite_master`.
2. **Compare columns:** Use `PRAGMA table_info(table_name)`.
3. **Auto-Patch:** If a table is missing or a column is added to your JS `schema.js`, execute the `CREATE` or `ALTER` statement.

```javascript
// Add this to your initDB logic
async function alignSchema() {
  const tables = ['producers', 'lots', 'bags', 'bag_milestones', 'cupping_sessions'];
  
  for (const table of tables) {
    const info = await executeRaw(`PRAGMA table_info(${table})`);
    if (info.length === 0) {
      console.log(`⚠️ Table ${table} missing. Creating...`);
      // Logic to pull CREATE statement from your schema.js
    }
  }
}

```

---

## 2. Moving Business Logic to Triggers

Instead of calculating `final_sale_price` in a JS function, we embed the math into the database. This ensures that even if you manually edit a row in the Developer HUD, the totals remain accurate.

### The "Cost Rollup" Trigger

We will create a trigger that fires whenever a milestone cost is updated.

```sql
-- Run this during your runMigrationsInternal()
CREATE TRIGGER IF NOT EXISTS update_final_price_after_milestone
AFTER UPDATE OF cost_to_warehouse, cost_to_export, cost_to_import, cost_to_client ON bag_milestones
BEGIN
    UPDATE bag_milestones
    SET final_sale_price = (
        SELECT 
            l.base_farm_cost_per_kg + 
            (SELECT COALESCE(SUM(amount_usd), 0) FROM cost_ledger WHERE lot_id = l.id) / l.total_weight_kg +
            NEW.cost_to_warehouse + 
            NEW.cost_to_export + 
            NEW.cost_to_import + 
            NEW.cost_to_client
        FROM bags b
        JOIN lots l ON b.lot_id = l.id
        WHERE b.id = NEW.bag_id
    )
    WHERE id = NEW.id;
END;

```

---

## 3. The Smart Allocation View

For **Page 3**, instead of writing complex JS filters, we create a **Virtual Selection View**. This helps the "Greedy Algorithm" by pre-calculating the **Operational Score** of the warehouse location.

```sql
CREATE VIEW IF NOT EXISTS available_inventory_optimization AS
SELECT 
    b.id as bag_id,
    b.public_id,
    b.stock_code,
    l.variety,
    -- Extract the level from stock_code (e.g., AA-10 -> 10)
    CAST(SUBSTR(b.stock_code, INSTR(b.stock_code, '-') + 1) AS INTEGER) as storage_level,
    (SELECT AVG(final_score) FROM cupping_sessions WHERE lot_id = l.id) as quality_score,
    l.base_farm_cost_per_kg
FROM bags b
JOIN lots l ON b.lot_id = l.id
WHERE b.status = 'Available';

```

---

## 4. Refined Multi-Agent Workflow

To keep this organized, follow this structure in your directory:

| File | Agent | Responsibility |
| --- | --- | --- |
| `schema.js` | **Gatekeeper** | The raw SQL strings (Tables, Triggers, Views). |
| `dbSetup.js` | **Backend Master** | WASM Init and the `alignSchema()` loop. |
| `coffeeServices.js` | **The Boss** | Clean JS wrappers (e.g., `fulfillContract()`). |

