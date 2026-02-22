
```markdown
# GREEN COFFEE ERP: "GOD VIEW" PWA DEMO
**Version:** 1.0.0
**Tech Stack:** React (Vite/PWA), wa-sqlite (Browser WASM Database), GSAP (Animations), React-Simple-Maps (SVG Map), Zustand (State Management), TailwindCSS (Styling).

## 1. PROJECT CONTEXT & GOALS
This is a serverless, browser-based ERP demo for the specialty coffee industry. It runs a full SQLite database in the browser. The goal is to pitch the software to high-end coffee buyers by demonstrating "Visual Traceability," "Quality Calibration," and "Smart Inventory Allocation" in an offline-capable PWA.

---

## 2. MULTI-AGENT WORKFLOW & PERSONAS

## 🔍 GLOBAL SCHEMA DISCOVERY
* **Global Scan:** At the start of every session, you MUST search the Global Skills directory (`~/.gemini/skills/` or environment-defined path) for any folder named `database-design` or `database-structure`.
* **Precedence:** If a global schema is found, it overrides local interpretations of table structures (e.g., specific field names for 'Batch' or 'Producer'). Don't modify the global schema `schema.py` this is the source of truth.
* **Consistency:** Ensure all feature pages align with the global definitions to maintain cross-project compatibility.

### Agent 1: The Frontend Master (React & UI)
* **Role:** Build components, handle GSAP animations, SVG map rendering, and Tailwind styling.
* **Directives:** Keep animations smooth (`requestAnimationFrame`), build responsive cards, and ensure the UI reflects the "Premium Specialty Coffee" aesthetic. You own the visual interpretation of data.

### Agent 2: The Backend Master (SQLite & Data Flow)
* **Role:** Manage the `wa-sqlite` instance, write SQL queries, handle transactions, and shape the data for the frontend.
* **Directives:** Ensure all database updates are atomic. Write optimized `SELECT` statements (using JOINs) so the frontend doesn't have to manipulate large arrays. Provide clean seed data.

### Agent 3: The Code Gatekeeper (Architecture & Quality)
* **Role:** Maintain clean code, enforce DRY principles, manage the Zustand store, and review agent PRs/commits.
* **Directives:** Enforce separation of concerns. The database logic should not leak into UI components (use custom hooks like `useCoffeeData`). Ensure the PWA configuration is lightweight.

### Agent 4: The Boss (Domain Expert & Business Logic)
* **Role:** Provide the coffee industry context, validate feature utility, and ensure the app solves real business problems.
* **Directives:** Enforce the physical realities of coffee (e.g., bags are 69kg). Ensure the "Landed Cost" math and "Smart Allocation" logic prioritize business margins and warehouse efficiency.

---

## 3. CORE DATABASE SCHEMA (Source of Truth)
*Backend Master: Use this schema exactly. Do not modify the schema, always check back this file: *

`Database Schema/simple_db.sql`

## 4. PAGE REQUIREMENTS

### Page 1: The "God View" (Value & Physical Chain)

* **Goal:** Show the financial and physical journey of a single bag or lot simultaneously.
* **UI:** * Top: SVG Map (using `react-simple-maps` with a 110m resolution GeoJSON).
* Bottom: Vertical Stepper showing accumulated cost.


* **Logic:** * Use a "Simulator Admin Panel" to trigger state changes. Let the user select one contract (show the public_id). Then a button to advance the state. The coffee will move on the map, also show the value changes.
* When a stage updates (e.g., Farm -> Cora), execute an `UPDATE bag_milestones` query.
* **GSAP Trigger:** Use a coordinate dictionary. Animate the bag icon (`x, y`) on the SVG map using GSAP `power2.inOut` easing. Animate the cost counter simultaneously.



### Page 2: QC Calibration Reports

* **Goal:** Visualize cupping data to identify lot quality and cupper bias.
* **Filter UI:** 3 simple dropdowns/inputs: `Farm Name`, `Cupper Name`, `Lot Public ID`. Logic is strictly **AND**.
* **Views (Rendered as Grid Cards):**
First, design a card to fit all the important fields in the cupping session. Then display all the cards from the filtering results. Do one column stack. 


### Page 3: Smart Allocation

* **Goal:** Recommend the best physical bags to fulfill a client contract based on multi-variable optimization.
* **Input Criteria:** * Minimum Score (e.g., 85)
* Variety (Optional/Fallback)
* Required Weight (Calculated in increments of 69kg full bags).


* **The Algorithm (Greedy + Weights):**
* *Step 1 (Filter):* Query all bags where `status = 'Available'` and `lot.score >= Min Score`.
* *Step 2 (Greedy Selection):* Each bag is 69kg, so the bag count will be required cuantity devided by 69 and ceiling to the next integer. For example, for a 100kg order, the combination is always 1 full bag(69kg) plus a split bag(31kg). NEVER split two bags, for exampe: 50kg and 50kg. Find all the combinations. 
* *Step 3 (Criteria) Among all those combinations. Caculate these criteria and select the best combination:  

1. Quality (Highest quality score).
2. Lowest Base Cost (Maximize margin).
3. FIFO (Earliest intake date).
4. Operational Cost (Prefer Level 3 or 4 over Level 1), use the sotck_code of the bags table to calculate the cost, for example, code: AA-1, AA is the palette code, and the 1 is the level. 1 means ground level, which is the hardest to fetch if the stack is full. And 10 is the highest level, by definition the easiest to get.

For this part, consult with a optimization experts to find good ways to get to these results.


* **UI Output:** Display 4 recommended bag combinations. Show a breakdown of the *Cost Per KG* for the suggested combination to aid the sales team in pricing. 

* **Inventory visualization:** Use CSS sqaures to show the map of the warehouse. For example, make a 10 by 6 grid, the 10 is the stack height and the 6 is the palette count, each palette will be AA, AB, AC, AD, AE, AF. The default is white, meaning empty. When it's black means occupied by one bag. Show an "x" when the bag is selected for allocation. 

Consult with your ui artist to optimze this part.

### Page 4: Developer HUD / Data Simulator

* **Goal:** Control the PWA for the pitch.
* **Features:** Buttons to instantly seed the SQLite database, clear data, and advance specific bags through the supply chain stages to trigger the Page 1 animations without needing a real backend.

Maje usre CRUD implementation is there. Implement some automation for the ids.

### Using hooks
Everytime you finish one task, run the `DESIGN_HOOK.md` to review the codebase and the style. 