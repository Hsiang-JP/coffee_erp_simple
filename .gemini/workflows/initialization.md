
### Phase 1: Project Scaffolding & State (The Gatekeeper)

**Goal:** Set up the Vite PWA, install dependencies, and create the Zustand store before any UI is built. Do not touch the map or the algorithms yet.

1. **Your Action:** Open your AI IDE (Cursor, Windsurf, etc.) and attach `GEMINI.md`.
2. **Prompt for Agent 3 (Code Gatekeeper):**
> "Read `GEMINI.md`. You are acting as **Agent 3 (Code Gatekeeper)**. We are initializing the project.
> 1. Give me the `package.json` dependencies we need (React, Vite, wa-sqlite, react-simple-maps, gsap, zustand, tailwindcss).
> 2. Create the Zustand store shell (`store.js`) with empty actions for `coffees`, `cuppingReports`, and `milestones`.
> 3. Set up the folder structure. Do not write the UI components yet."
> 
> 



### Phase 2: The Database & Seed Data (The Backend Master)

**Goal:** Get `wa-sqlite` running in the browser and inject the "Happy Path" data so the frontend has something to render.

1. **Your Action:** Pass the folder structure Agent 3 created to Agent 2.
2. **Prompt for Agent 2 (Backend Master):**
> "Read `GEMINI.md`. You are acting as **Agent 2 (Backend Master)**.
> 1. Create `dbSetup.js`. Write the initialization code for `wa-sqlite` using IndexedDB for persistence.
> 2. Implement the exact schema from Section 3 of `GEMINI.md`.
> 3. Write a seed function that inserts 1 Finca (in Cusco), 10 Bags, 3 Cupping Sessions, and 1 Milestone starting at 'Farm'.
> 4. Create a custom React hook `useCoffeeData()` that fetches this data and pushes it to the Zustand store."
> 
> 



### Phase 3: The UI Shell & SVG Map (The Frontend Master)

**Goal:** Build the navigation and the Page 1 "God View" map without worrying about complex interactions yet.

1. **Your Action:** Attach `GEMINI.md` and the `useCoffeeData()` hook created by Agent 2.
2. **Prompt for Agent 1 (Frontend Master):**
> "Read `GEMINI.md`. You are acting as **Agent 1 (Frontend Master)**.
> 1. Build the main layout with a navigation bar for the 4 pages.
> 2. Build Page 1. Use `react-simple-maps` with a 110m resolution GeoJSON of the world.
> 3. Read data from the Zustand store to place a static SVG pin on the map corresponding to the bag's current milestone stage. Do not add GSAP animations yet. Use Tailwind for a premium, clean aesthetic."
> 
> 


### Phase 4: Cupping Reports & Filtering (Frontend + Backend Sync)

**Goal:** Build Page 2. This requires Agent 2 to write complex `SELECT` queries and Agent 1 to build the filter UI.

1. **Prompt for Agent 2 (Backend):**
> "Agent 2, write the SQLite query for Page 2 to get 'Same Farm, Multiple Lots'. We need one random cupping session per lot. Write the hook `useCuppingFilters(farm, cupper, lotId)`."


2. **Prompt for Agent 1 (Frontend):**
> "Agent 1, using the hook Agent 2 just wrote, build the UI for Page 2. Create the 3 dropdowns. Render the cupping sessions as grid cards. Use Tailwind to make the `total_score` pop visually."



### Phase 5: Smart Allocation (The Boss & Gatekeeper)

**Goal:** Build Page 3. This is the hardest part. You need the greedy algorithm.

1. **Your Action:** Define the math for the algorithm so the AI doesn't invent its own logic.
2. **Prompt for Agent 4 (The Boss) & Agent 3 (Gatekeeper):**
> "Read `GEMINI.md`. Act as **Agent 4** and **Agent 3**. We are building Page 3 (Smart Allocation).
> We need a greedy algorithm function `allocateBags(requiredScore, requiredWeight)`.
> The evaluation function for a bag combination must use this formula:
> 
> 
> 
> Where  are weights (use 0.5, 0.3, 0.2). The WarehouseLevel is extracted from `stock_code` (e.g., AA-1 means level 1).
> Write this logic as a pure JavaScript utility function. Do not touch the UI."



### Phase 6: Bringing it to Life (GSAP & The Developer HUD)

**Goal:** Connect the Developer HUD (Page 4) to trigger the GSAP animations on Page 1.

1. **Prompt for Agent 1 (Frontend Master):**
> "Read `GEMINI.md`. Act as **Agent 1**.
> 1. Build Page 4 (The Developer HUD) with a button to advance `bag_milestones.current_stage`.
> 2. Go back to Page 1. Wrap the SVG map pin in a GSAP target. When the Zustand store updates the `current_stage`, use GSAP `to()` to animate the pin from its current X/Y projection to the new X/Y projection over 2 seconds with `power2.inOut`.
> 3. Animate a number counter for the Landed Cost."
> 
> 



---

### Pro-Tips for Managing Context

* **If an Agent breaks the code:** Do not ask the same agent to fix it. Switch to Agent 3: *"Act as Agent 3. Agent 1 just broke the GSAP animation because it lost sync with the Zustand store. Review this component and fix the architecture."*
* **Keep files small:** If you tell an AI to "build Page 1", it will try to write 500 lines of code. Tell it to "Build the Map Component", then "Build the Cost Stepper Component".
