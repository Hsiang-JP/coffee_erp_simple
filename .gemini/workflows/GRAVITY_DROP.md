---

# 📦 PROPOSAL: Warehouse Gravity Consolidation (v1.2.0)

## 1. CONCEPT: THE "GRAVITY DROP"

In a high-efficiency coffee warehouse, ground-level space is the most valuable. When a bag is shipped out from a lower or middle level, the system should automatically "shift" all bags above it down to fill the gap. This keeps the physical inventory compact, accessible, and optimized for forklift operations.

---

## 2. DATABASE TRANSACTION (BACKEND)

This logic must be added to `src/db/dbSetup.js`. It should run as the final step of the `finalizeReservation` transaction or as a standalone `compactWarehouse` function.

### The Compaction Algorithm

1. **Identify Targets**: Find all unique pallets (`stock_code` prefixes like 'AA', 'AB') that had bags removed.
2. **Sequential Re-assignment**:
* For each affected pallet, query all remaining bags (`status` is 'Available' or 'Allocated').
* Sort these bags by their current `level` (1 through 10).
* Re-assign their `stock_code` sequentially starting from **Level 1**.


3. **Traceability**: Insert a record into `bag_milestones` for each moved bag: `Moved from [OldCode] to [NewCode] during Gravity Consolidation`.

```javascript
// Pseudocode for AI Agent 2
async function compactPallet(palletPrefix) {
  const bags = await execute(
    "SELECT id FROM bags WHERE stock_code LIKE ? AND status != 'Shipped' ORDER BY stock_code ASC",
    [`${palletPrefix}-%`]
  );

  for (let i = 0; i < bags.length; i++) {
    const newLevel = i + 1;
    const newCode = `${palletPrefix}-${newLevel}`;
    await execute("UPDATE bags SET stock_code = ? WHERE id = ?", [newCode, bags[i].id]);
  }
}

```

---

## 3. COMPONENT INTEGRATION (FRONTEND)

### WarehouseGrid.jsx

* **Motion Binding**: The agent must use `framer-motion` or `GSAP` to bind the bag elements to their `stock_code` coordinates.
* **Visual Continuity**: When `syncStore()` is called after a shipment, the grid should animate the transition. Bags should "slide" down the Y-axis into their new slots, providing immediate visual feedback that the warehouse has been reorganized.

### Allocation.jsx

* **Post-Finalize Refresh**: The `handleFinalize` function must wait for the compaction transaction to finish before calling `syncStore()`.
* **UI Status**: Show a temporary overlay: *"Optimizing warehouse layout..."* while the compaction math is running to emphasize the value to the user.

---

## 4. BUSINESS VALUE FOR CUSTOMER (CORA)

* **Reduced Labor Cost**: Forklifts travel less distance vertically when inventory is consistently kept on lower levels.
* **Accuracy**: The "Digital Twin" (your map) always matches the physical floor, preventing "ghost inventory" where a manager thinks a spot is full when it's actually empty.
* **Safety**: Storing heavy coffee bags lower in the racks reduces the risk of top-heavy pallet collapses.

---

### **Next Step for AI Agent**

Implement the `compactWarehouse` logic within the `finalizeReservation` transaction in `dbSetup.js`. **Would you like me to generate the specific CSS transition logic for the WarehouseGrid to ensure the "Gravity Drop" looks smooth and professional?**