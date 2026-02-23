# GREEN COFFEE ERP: "GOD VIEW" PWA DEMO
**Version:** 1.1.0
**Tech Stack:** React (Vite/PWA), wa-sqlite (Browser WASM Database), GSAP (Animations), React-Simple-Maps (SVG Map), Zustand (State Management), TailwindCSS (Styling).

## 1. PROJECT CONTEXT & GOALS
This is a serverless, browser-based ERP demo for the specialty coffee industry. It runs a full SQLite database in the browser. The goal is to demonstrate "Visual Traceability" by moving coffee through 5 physical/financial stages while accumulating specific costs at each node.

---

## 2. REFINED STAGE & COST MAPPING
The system must strictly follow this mapping between Physical Stages and Financial Fields:

| Current Stage | DB Cost Field to Update | Target Physical Location |
| :--- | :--- | :--- |
| **Farm** | `cost_at_farm` | The Producer's Farm |
| **Cora** | `cost_at_warehouse` | Cora Warehouse (Default) |
| **Port-Export** | `cost_at_export` | Origin Port |
| **Port-Import** | `cost_at_transport` | Destination Port |
| **Final Destination** | `cost_at_import` | Client Roastery |

---

## 3. UPDATED PAGE REQUIREMENTS

### Page 1: "Trace the Coffee" (The Interactive Value Chain)
* **Goal:** Visualize the accumulation of value as coffee moves globally.
* **Layout:** Two-Column Layout.
    * **Left Sidebar (Control Panel):**
        1. **Contract Dropdown:** Select an active contract from the `contracts` table. 
        2. **Bag Selector:** Once a contract is selected, display the bags allocated to it.
        3. **Stage Status:** Display the `current_stage` of the selected bag.
        4. **Cost Entry:** A text input field to enter a numerical USD value.
        5. **"Advance" Button:** * On Click: Update the `current_stage` to the next logical state.
           * Save the input cost into the corresponding database field (see Section 2).
           * Treat empty inputs as `0`.
        6. **Live Ledger:** Display the `final_sale_price` which is the sum of:
           `cost_at_farm + cost_at_warehouse + cost_at_export + cost_at_transport + cost_at_import`.
    * **Right Column (Visualization):**
        * **SVG Map:** High-end, minimalist world map.
        * **GSAP Animation:** When "Advance" is clicked, trigger a smooth arc movement of the bag icon to the new coordinate.
        * **Cost Counter:** Animate the `final_sale_price` incrementing in real-time.

### Page 2: QC Calibration Reports
* **Goal:** Visualize cupping data to identify lot quality and cupper bias.
* **Filter UI:** 3 dropdowns: `Farm Name`, `Cupper Name`, `Lot Public ID`. (Logic: **AND**).
* **Cupping Session Card** : Include all the fields of the cupping session. 
* **Layout:** Stack the card vertically with one column. Try to maintain the layout clean and professional. 

### Page 3: Smart Allocation
* **Goal:** Greedy algorithm to fulfill contracts using the 69kg bag standard.
* **Logic:** 1. Filter bags by `status = 'Available'` and quality score.
    2. **Constraint:** Parse `stock_code` (e.g., `AA-1`). `1` is ground level (hardest to get).
    3. Name the 4 reccomendations correctly. 1. Highest Quality 2. Lowest Cost 3. FIFO 4. Easy to Retrieve
* **UI:** Display the details bag_ID that are in the option with **Cost per KG** 

---

### Page 4: Dev CRUD
Add data Entry for the database. Do it smartly with frontend design skills 

## 4. AGENT DIRECTIVES (IMPLEMENTATION)

### Agent 2 (Backend Master):
* Update the `bag_milestones` schema to ensure the 5 cost fields are `REAL`.
* Implement a `getNextStage(current)` helper function to ensure the "Advance" button follows the correct order.
* Ensure the `final_sale_price` calculation happens inside the SQL query or a calculated field in the hook.

### Agent 1 (Frontend Master):
* Build the "Trace the Coffee" sidebar with a premium, tactile feel.
* Ensure the "Advance" button is disabled once 'Final Destination' is reached.
* Apply `DESIGN_HOOK.md` to ensure Page 1 looks like a high-end logistics dashboard.

### Agent 3 (Gatekeeper):
* Ensure that every cost update is wrapped in a transaction to keep the `current_stage` and the `cost_field` perfectly in sync.