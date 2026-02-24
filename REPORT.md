# Green Coffee ERP: "Coffee Journey" PWA - Instruction Manual (Final Version)

## 1. Introduction
The Coffee Journey PWA is a serverless, browser-based ERP solution designed for specialty coffee buyers and logistics teams. This manual covers the functional workflows for four primary modules: **Traceability**, **Quality Control**, **Inventory Allocation**, and **Operations**.

---

## 2. Coffee Journey: Live Traceability & Value Chain
This module provides a dual-layer visualization of the physical supply chain and the financial accumulation of landed costs.

### Core Functions:
- **Active Contract Selection:** Choose a contract (e.g., `CT-001`) to initialize the map and ledger.
- **Logistics Stage Tracker:** 
    - Real-time status indicators for: **Farm** → **Cora** → **Port-Export** → **Port-Import** → **Final Destination**.
    - **Landed Cost Aggregate:** Dynamically updates the $/KG cost as logistics expenses are added.
- **Stage Advancement Workflow:**
    - **Expense Logging:** When at a stage, the user must input the cost to move to the next.
    - **Transaction Execution:** Clicking "Move to [Stage]" triggers a state update in the `wa-sqlite` database and updates the bag's milestone record.
- **Financial Projections:** 
    - Calculates **Total Contract Value** (Landed Cost x Total Weight).
    - Provides **Margin Analysis** comparing the contract's fixed sale price against the accumulating landed costs.
- **Visual Interpretation:** 
    - **SVG World Map:** Markers animate between coordinates using GSAP "ping" effects.
    - **Cost Stepper:** A vertical timeline visualizing the financial "journey" of the coffee.

### Use Case: Real-Time Landed Cost Tracking
1. Select contract `CT-002`.
2. Observe current stage is `Port-Export`.
3. Input $0.60 for `cost_to_import`.
4. Click "Move to Port-Import".
5. The map marker transitions to the destination port, and the margin analysis adjusts to reflect the new expense.

---

## 3. QC Calibration: Sensory Analysis & Quality Mapping
A centralized hub for SCAA-compliant sensory data visualization and cupper calibration.

### Core Functions:
- **Advanced Filtering:** Multi-variable search using **Farm Name**, **Lead Cupper**, and **Lot ID** (AND logic).
- **Sensory Bento-Cards:**
    - **SCAA Grade Badge:** Color-coded for rapid screening (Emerald Green for 85+ Specialty, Amber for < 85 Premium).
    - **10-Attribute sensory Grid:** Fragrance, Flavor, Aftertaste, Acidity, Body, Balance, Uniformity, Clean Cup, Sweetness, and Overall.
    - **Interactive Definitions:** Hovering over attributes displays official SCAA scoring criteria.
- **Quality Safeguards:**
    - **5-Cup Verification:** Tracks uniformity across a 5-cup table.
    - **Defect Alerts:** Automatic visual flags for defects (e.g., Mold, Ferment) with real-time scoring penalties.
- **Qualitative Metadata:** Primary flavor archetypes and cupper's sensory notes.

### Use Case: Bias Identification
1. Filter reports by "Cupper: Jane Smith".
2. Review scores for "Finca Los Robles" over multiple harvests.
3. Compare Jane's "Body" scores against the company average to identify scoring calibration needs.

---

## 4. Smart Allocation: Inventory Optimization
An optimization engine that uses greedy algorithms to fulfillment client contracts from available physical inventory.

### Core Functions:
- **Constraint Management:** Set **Weight** (69kg standard units), **Min Score**, **Variety**, and **Flavor Note**.
- **Optimization Strategies:**
    - **Best Quality:** Prioritizes highest SCAA scores and fuzzy flavor matches.
    - **Lowest Cost:** Prioritizes lots with the lowest landed cost to maximize profit.
    - **FIFO (First-In, First-Out):** Prioritizes the oldest inventory based on intake date.
- **Warehouse Operational Efficiency:**
    - **Top-Down Picking:** All algorithms prioritize bags at higher vertical levels (Level 10 down to 1) for faster retrieval.
    - **Gravity Drop Protocol:** A manual "Resort Warehouse" function to shift inventory down to empty ground slots.
- **Warehouse Grid:** A 10x6 (AA-AF) interactive map. Recommended bags are highlighted with high-contrast borders for picking teams.
- **Contract Finalization:** Assigns selected bags to a client and applies a **20% Markup** (`1.2x`) to the average landed cost.

### Use Case: High-Efficiency Fulfillment
1. Input 138kg (2 bags) and "Min Score: 87".
2. Select "Lowest Cost" strategy.
3. Observe the highlighted bags in stacks `AC-10` and `AD-9`.
4. Finalize the contract for "London Roastery" to reserve the inventory.

---

## 5. Intake Terminal: Operational Data Entry
The operational terminal for registering physical assets and supply chain entities.

### Functional Modules:
- **Compra Lote (Lot Purchase):**
    - **Traceable Bagging:** Splitting bulk weight into unique ID-tracked 69kg bags.
    - **Field Auto-Rounding:** UI blur handler rounds weight to the nearest 69kg increment to ensure standard unit compliance.
- **Laboratorio (QC Lab):** Input interface for SCAA scoring, defect counts, and flavor profiles.
- **Costos (Logistics Ledger):** Assigns processing and transportation costs (Milling, Grading, etc.) to specific lots.
- **Entity Registry:** 
    - **Producers & Farms:** Registering source origins and certification status.
    - **Client Registry:** Managing business profiles and destination logistics (Ports/Cities).

### Use Case: New Lot Intake
1. Navigate to "Compra Lote".
2. Enter "Weight: 1000kg".
3. Field auto-rounds to `1035kg` (15 bags).
4. Select "Variety: Geisha" and "Farm: Finca San Jose".
5. Authorize Intake to generate unique bag IDs and initialize the lot's financial ledger.
