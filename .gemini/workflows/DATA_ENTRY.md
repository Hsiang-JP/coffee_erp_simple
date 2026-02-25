
---
```markdown

# Move the current page 4, the Data Management page to ?dev=True
Then start making this brand new data entry page. 

# DATA ENTRY & WAREHOUSE INTAKE WORKFLOW
**File:** `DATA_ENTRY.md`
**Purpose:** Instruct the AI agents to build Page 4 ("Data Management"), handle the complex "Buy Lot" auto-bagging transaction, build the comprehensive SCAA Cupping form, and hide the raw CRUD tools behind a `?dev=true` URL parameter.

## 🤖 AGENT ROLES & CONTEXT
* **Agent 1 (Frontend Master):** Build the UI forms using the Bento Box aesthetic defined in `DESIGN_HOOK.md`. Handle the massive Cupping Form UX.
* **Agent 2 (Backend Master):** Write the complex SQL Transaction for the "Buy Lot" action (Auto-generating bags and calculating `stock_code`).
* **Agent 3 (Gatekeeper):** Handle URL routing for Dev Mode, form validation, and real-time math for the cupping scores.
* **Agent 4 (The Boss):** Ensure the business logic (69kg bag standards, SCAA scoring math, and warehouse pallet stacking) is perfectly accurate.


---

## 1. PAGE 4 UI STRUCTURE: "DATA INTAKE" (Agent 1)
Build a sleek, tabbed interface or a side-nav layout containing 4 distinct intake forms:
1.  **New Priducer:** (Name, Relationship).
2.  **New Farm:** (Producer Dropdown, Name, Region, Altitude, Location, Certification).
3.  **Buy coffee:** (Farm Dropdown, Variety, Process, Total Weight, Base Cost). *This triggers the complex auto-bag logic.*
4.  **Cupping:** The SCAA QC Form.
5. **New Client:** Add new client. 

---

## 3. THE "BUY LOT" & AUTO-BAGGING LOGIC (Agent 2 & Agent 4)
When a user submits the "Compra de Lote" form, the system isn't just saving a lot; it is physically receiving inventory.

### The Math (Agent 4)
* Standard bag size in Peru = `69.0 kg`.
* `numberOfBags = Math.floor(total_weight_kg / 69)`. (For the demo, ignore partial bags, round up the quantity to the next multiple of the bag weight. For example, 100kg => 2 bags 138kg



### The Stock Code Algorithm (Agent 2)
The `stock_code` format is `[Pallet]-[Level]`. 
* **Pallet Codes:** Go from `AA` to `ZZ`.
* **Level Codes:** Start at `1` (ground, hardest to retrieve). A standard pallet holds 10 bags (levels `1` through `10`).
* **Logic:** 1. Query the database for the highest existing `stock_code` in the `bags` table. 
    2. If the last bag was `AA-10`, the next bag must be placed on a new pallet: `AB-1`.
    3. Same lots must stack together continuously. 

### The SQL Transaction (Agent 2)
USe the db-first logic to design the algorithm The concept is always assign the stock_code from low to high.

---

## 4. THE SCAA CUPPING FORM (Agent 1 & Agent 3)

This is a massive form. Do not just output 30 text inputs. It must look like a digital SCAA scoresheet.

### UX Design Rules:

* **Sliders (0.0 to 10.0):** Use range sliders (step 0.25) for Fragrance, Flavor, Aftertaste, Acidity, Body, Balance, and Overall.
* **Intensity Scales:** Use a visual horizontal bar (Low to High) for `acidity_intensity` and `body_level`.
* **The "5 Cups" Checkboxes:** For `uniformity_cups`, `clean_cup_cups`, and `sweetness_cups`.
* *UI:* Show 5 stylized coffee cup icons. Clicking one toggles it on/off (1 or 0).
* *Data:* Save as a comma-separated string (e.g., `'1,1,1,0,1'`).


* **Defects:** Dropdown for Taint (-2 points per cup) or Fault (-4 points per cup), plus a counter for `defect_cups`.

### Real-Time Math (Agent 3)

The total score trigger is defined in the `schema.js`

1. **Checkbox Scores:** Each checked cup = 2 points. (e.g., `'1,1,1,1,1'` = 10.0 points). Calculate this for Uniformity, Clean Cup, and Sweetness.
2. **Defect Subtract:** `defect_score_subtract = defect_cups * (defect_type === 'Taint' ? 2 : 4)`.
3. **Total Score:** Sum of the 7 main slider attributes + Uniformity Score + Clean Cup Score + Sweetness Score.
4. **Final Score:** `Total Score - defect_score_subtract`.

Display the `Final Score` prominently at the top of the form in a large, bold font.

## 🛠 REQUIRED ACTIONS

* **Agent 2:** Write the Auto-Bagging SQL Transaction and the `stock_code` generator utility.
* **Agent 1:** Build the Cupping Form component utilizing Tailwind Grid to fit all fields cleanly on screen without overwhelming the user.

```

