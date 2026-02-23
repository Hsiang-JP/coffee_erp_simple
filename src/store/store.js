import { create } from 'zustand';
import { execute } from '../db/dbSetup';

export const useStore = create((set) => ({
  coffees: [],
  lots: [],
  cuppingReports: [],
  contracts: [],
  milestones: [],
  ledger: [],
  isDevMode: false,
  refreshTrigger: 0,

  // Fix: Toggle action was missing
  toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
  
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

  fetchAll: async () => {
    try {
      console.log("🔄 Syncing Store Data...");
      
      const [b, l, cr, ct, m, led] = await Promise.all([
        execute("SELECT * FROM bags"),
        execute("SELECT * FROM lots"),
        execute("SELECT * FROM cupping_sessions"),
        execute(`
          SELECT c.*, cl.name as client_name 
          FROM contracts c
          JOIN clients cl ON c.client_id = cl.id
        `),
        execute("SELECT * FROM bag_milestones"),
        execute("SELECT * FROM cost_ledger")
      ]);
      
      set({ 
        coffees: b || [], 
        lots: l || [], 
        cuppingReports: cr || [], 
        contracts: ct || [],
        milestones: m || [],
        ledger: led || []
      });
      
      console.log("✅ Store Synced");
    } catch (err) {
      console.error("❌ Store sync failed:", err);
    }
  }
}));
