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
  locations: [],
  contractMetrics: [], 
  isDevMode: false,
  refreshTrigger: 0,

  toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
  
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

  fetchAll: async () => {
    try {
      console.log("🔄 Syncing Store Data...");
      
      const [b, l, cr, ct, m, led, f, p, cli, locs, cm] = await Promise.all([
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
        execute("SELECT * FROM producers"), // Changed to producers
        execute("SELECT * FROM clients"),
        execute("SELECT * FROM locations"),
        execute("SELECT * FROM vw_contract_journey") 
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
        locations: locs || [],
        contractMetrics: cm || [] // ✅ Using 'cm' from the array above
      });
      
      console.log("✅ Store Synced");
    } catch (err) {
      console.error("❌ Store sync failed:", err);
    }
  }
}));