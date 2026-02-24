import { create } from 'zustand';
import { execute } from '../db/dbSetup';
import { StoreState, StoreContract } from '../types/store';
import { 
  VwBagDetails, 
  Lot, 
  VwCuppingDetails, 
  BagMilestone, 
  CostLedger, 
  Producer, 
  Farm, 
  Client, 
  VwContractMetrics 
} from '../types/database';

export const useStore = create<StoreState>((set) => ({
  coffees: [],
  lots: [],
  cuppingReports: [],
  contracts: [],
  milestones: [],
  ledger: [],
  producers: [],
  farms: [],
  clients: [],
  contractMetrics: [],
  isDevMode: false,
  refreshTrigger: 0,

  toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
  
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

  syncStore: async () => {
    try {
      console.log("🔄 [Code Gatekeeper] Syncing Store Projection...");
      
      const safeFetch = async <T>(query: string, defaultValue: T[] = []): Promise<T[]> => {
        try {
          return await execute<T>(query);
        } catch (e: any) {
          console.warn(`⚠️ [Sync Warning] Query failed: ${query.slice(0, 50)}...`, (e as Error).message);
          return defaultValue;
        }
      };

      const [
        resCoffees,
        resLots,
        resCupping,
        resContracts,
        resMilestones,
        resLedger,
        resProducers,
        resFarms,
        resClients,
        resContractMetrics
      ] = await Promise.all([
        safeFetch<VwBagDetails>("SELECT * FROM vw_bag_details"),
        safeFetch<Lot>("SELECT * FROM lots"),
        safeFetch<VwCuppingDetails>("SELECT * FROM vw_cupping_details"),
        safeFetch<StoreContract>(`
          SELECT con.*, cli.name as client_name 
          FROM contracts con 
          JOIN clients cli ON con.client_id = cli.id
        `),
        safeFetch<BagMilestone>("SELECT * FROM bag_milestones"),
        safeFetch<CostLedger>("SELECT * FROM cost_ledger"),
        safeFetch<Producer>("SELECT * FROM producers"),
        safeFetch<Farm>("SELECT * FROM farms"),
        safeFetch<Client>("SELECT * FROM clients"),
        safeFetch<VwContractMetrics>("SELECT * FROM vw_contract_metrics")
      ]);
      
      set({ 
        coffees: resCoffees, 
        lots: resLots, 
        cuppingReports: resCupping, 
        contracts: resContracts,
        milestones: resMilestones,
        ledger: resLedger,
        producers: resProducers,
        farms: resFarms,
        clients: resClients,
        contractMetrics: resContractMetrics
      });
      
      console.log("✅ [Code Gatekeeper] Store Projected Successfully");
    } catch (err) {
      console.error("❌ [Code Gatekeeper] Store sync failed:", err);
    }
  }
}));
