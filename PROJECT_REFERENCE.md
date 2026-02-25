# PROJECT REFERENCE: Green Coffee ERP (DB-First Architecture)

**Version:** 1.1.0  
**Last Updated:** 2026-02-24  
**Architecture Pattern:** DB-First with Shadow-Math Validation

---

## 1. CORE TECHNOLOGY STACK
- **Frontend:** React (Vite) + TailwindCSS
- **Database:** `wa-sqlite` (SQLite WASM) running in the browser.
- **Persistence:** `IDBMinimalVFS` (IndexedDB persistence) — current DB: `green_coffee_erp_v15`.
- **Animations:** GSAP (State transitions & Warehouse Map).
- **Mapping:** `react-simple-maps` (GeoJSON trade routes).
- **State Management:** Zustand (Global Store) with auto-refresh triggers.

---

## 2. DB-FIRST LAYERING MODEL

The system is designed with the Database as the absolute source of truth. Logic is pushed as close to the data as possible.

### Layer 1: Schema (`src/db/schema.js`)
- **Source of Truth:** All table definitions, foreign keys, and constraints.
- **Referential Integrity:** `PRAGMA foreign_keys = ON`.
- **Cascading Deletes:** Not strictly enforced in schema to prevent accidental data loss (per user mandate), but managed via service layer.

### Layer 2: Views (Optimization & Enrichment)
- **`available_inventory_optimization`:** The critical view for the Allocation engine. It calculates **Dynamic True Cost** (Base Cost + Ledger overhead) and pulls the latest QC Scores and Flavor Notes.

### Layer 3: SQL Triggers (Automated Logic)
- **Price/Cost Syncing:** Triggers on `bag_milestones` and `cost_ledger` automatically recalculate `final_sale_price` (Total Accumulated Cost) whenever data changes.
- **QC Scoring:** Triggers on `cupping_sessions` calculate total and final scores in real-time on `INSERT`.

### Layer 4: Service Layer (`src/db/services/`)
- **Transactional Logic:** JS wrappers (`lotService`, `allocationService`, `contractService`) that use `wrapInTransaction` to ensure multi-table updates (e.g., creating a contract and updating 50 bags) are atomic.
- **Separation of Concerns:** UI components *never* write raw SQL; they call these services.

### Layer 5: Data Syncing (`src/hooks/useCoffeeData.js`)
- **Zustand Bridge:** A custom hook that listens for `refreshTrigger` and re-queries the DB to keep the UI reactive without manual state management.

---

## 3. KEY DOMAIN LOGIC & UTILITIES

### Smart Allocation (`src/utils/allocation.js`)
- **Greedy Strategy:** Selects bags based on multi-variable scoring (Quality, Cost, FIFO, and Operational Efficiency/Level).
- **Flavor Bonus:** Applies a +20 point bonus to the "Value Score" for keyword matches in sensory notes.

### Warehouse Stacking (`src/utils/warehouseUtils.js`)
- **Clustering:** Logic to ensure lots are stacked together.
- **Coordinate System:** `[Pallet]-[Level]` (e.g., `AA-1` to `ZZ-10`).

### Spatial Island (`src/utils/geoAgent.js`)
- **Local Cache:** A `locations` table that stores lat/lon for regions and ports.
- **Dynamic Mapping:** Bypasses hardcoded coordinates; fetches from Nominatim API once and persists locally.

---

## 4. VERIFICATION & QUALITY ASSURANCE

### Shadow Math Auditor (`src/utils/MathAuditor.js`)
- **The Critic:** A specialized class that manually recalculates DB math in JS.
- **Purpose:** Identifies discrepancies in triggers or service logic (e.g., detecting if profit margins are being accidentally erased).

### Stress Test Skill (`.gemini/skills/coffee-erp-stress-test`)
- **Reusable Simulation:** A modular skill that simulates Farmer, Marketer, and Buyer personas to verify the system against complex "Multi-Lot Blend" scenarios.

---

## 5. CRITICAL CAVEATS FOR FUTURE AGENTS
1. **Naming Confusion:** Currently, the DB field `final_sale_price` often stores **Total Accumulated Cost**. Exercise caution when building financial reports.
2. **Database Locks:** React Strict Mode or multiple tabs can cause `disk I/O errors`. The `dbSetup.js` includes a singleton promise and retry logic to mitigate this.
