# BACKEND PROTOCOL: DB-FIRST INTEGRITY
**Version:** 1.1.0
**Status:** SOLID / THICK DATABASE

## 1. CORE ARCHITECTURE: THE "THICK DATABASE"
To prevent synchronization competition and "split-brain" bugs, this project employs a **Thick Database** pattern using `wa-sqlite`.

### A. Single Source of Truth (Database)
*   **The View (`vw_bag_details`)**: All complex joins, cost calculations, and quality scoring live in this SQL View. Components must **NEVER** perform manual joins between `bags`, `lots`, and `milestones`.
*   **The Projection (Zustand)**: The Zustand store is a **Read-Only** mirror of the database. It is hydrated via `syncStore()` which fetches the full projection in parallel.

### B. Unidirectional Data Flow
1.  **UI Component** calls a **Transaction Function** (in `dbSetup.js`).
2.  **Database** executes an atomic `BEGIN...COMMIT` block.
3.  **Success** triggers a global `refreshTrigger` increment.
4.  **App.jsx** hears the trigger and calls `syncStore()`.
5.  **UI Components** re-render with the new state.

---

## 2. DEVELOPER HANDBOOK (FRONTEND CALLS)

### 🚫 FORBIDDEN ACTIONS
*   **DO NOT** use `execute("INSERT INTO...")` or `execute("UPDATE...")` directly inside a React component.
*   **DO NOT** perform cost or score math in `useMemo` or component logic. Use the values provided by `vw_bag_details`.
*   **DO NOT** use "Optimistic UI" updates that modify the Zustand store before the DB confirms success.

### ✅ MANDATORY PATTERNS

#### Writing Data (Transactions)
Always use the specialized transaction functions in `src/db/dbSetup.js`. They are atomic and handle ID generation.
```javascript
// Example: Registering a new Producer
try {
  setIsSubmitting(true);
  await registerEntity('producers', { name: 'Finca Example', relationship: 'Direct Trade' });
  triggerRefresh(); // This is the ONLY way to update the UI
} catch (err) {
  alert(err.message); // Transaction functions throw meaningful errors
} finally {
  setIsSubmitting(false);
}
```

#### Reading Data (Selectors)
Always consume state directly from the store. The data is already "Enriched" by the SQL View.
```javascript
const coffees = useStore(state => state.coffees); // Comes from vw_bag_details
const bag = coffees.find(c => c.public_id === 'B-101');
console.log(bag.landed_cost); // Already calculated by the DB
```

---

## 3. STRUCTURAL INTEGRITY GATES
*   **Atomic Constraints**: `registerEntity` and all `*Transaction` functions are wrapped in transactions. If one part fails, the whole operation rolls back.
*   **Structural Upgrades**: The boot sequence includes an "Integrity Guard" that adds missing columns to the physical DB. Do not remove the column-check logic in `runMigrationsInternal`.
*   **Traceability Cascade**: `deleteRow` handles the deletion of child records (Bags, Milestones, QC) automatically. Do not manually delete related records in the UI.

---

## 4. SCHEMA REFERENCE (VW_BAG_DETAILS)
When building frontend features, rely on these exact keys from the store's `coffees` array:
*   `avgScore`: Latest cupping `final_score` (SCAA compliant).
*   `landed_cost`: Sum of base farm cost + all logistics overhead.
*   `current_stage`: Physical stage ('Farm', 'Cora', 'Port-Export', etc.).
*   `producer_name`: Pre-joined for the UI.
*   `client_name`: Pre-joined if allocated.
