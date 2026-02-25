import { create } from 'zustand';
import { execute } from '../db/dbSetup';

export const useStore = create((set) => ({
  coffees: [],
  lots: [],
  cuppingReports: [],
  contracts: [],
  milestones: [],
  ledger: [],
  farms: [],
  producers: [],
  clients: [],
  locations: [], // 📍 INITIALIZED: The Spatial Island
  isDevMode: false,
  refreshTrigger: 0,

  toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
  
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

  fetchAll: async () => {
    try {
      console.log("🔄 Syncing Store Data...");
      
      // Added locations to the Promise.all array
      const [b, l, cr, ct, m, led, f, p, cli, locs] = await Promise.all([
        execute("SELECT * FROM bags"),
        execute("SELECT * FROM lots"),
        execute("SELECT * FROM cupping_sessions"),
        execute(`
          SELECT c.*, cl.name as client_name 
          FROM contracts c
          LEFT JOIN clients cl ON c.client_id = cl.id
        `),
        execute("SELECT * FROM bag_milestones"),
        execute("SELECT * FROM cost_ledger"),
        execute("SELECT * FROM farms"),
        execute("SELECT * FROM producers"),
        execute("SELECT * FROM clients"),
        execute("SELECT * FROM locations") // 🗺️ FETCHED: Pulling the Island data
      ]);
      
      set({ 
        coffees: b || [], 
        lots: l || [], 
        cuppingReports: cr || [], 
        contracts: ct || [],
        milestones: m || [],
        ledger: led || [],
        farms: f || [],
        producers: p || [],
        clients: cli || [],
        locations: locs || [] // ⚓️ SAVED: Updating the store
      });
      
      console.log("✅ Store Synced");
    } catch (err) {
      console.error("❌ Store sync failed:", err);
    }
  }
}));