# Green Coffee ERP - God View Demo

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. **Important:** Copy the `wa-sqlite` WASM file to public (if not automatically handled by Vite):
   ```bash
   cp node_modules/wa-sqlite/dist/wa-sqlite-async.wasm public/
   ```
   *Note: You might need to create the `public` folder if it doesn't exist.*

3. Run the dev server:
   ```bash
   npm run dev
   ```

## Features

- **God View:** Visual traceability map and cost accumulation.
- **QC Reports:** Filterable cupping session reports.
- **Smart Allocation:** Greedy algorithm for contract fulfillment.
- **Dev HUD:** Seed data and simulate supply chain movements.

## Architecture

- **Database:** SQLite running in browser via `wa-sqlite` (WASM) + IndexedDB persistence.
- **State:** Zustand global store.
- **UI:** React + TailwindCSS.
- **Maps:** `react-simple-maps`.
