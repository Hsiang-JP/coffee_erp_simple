import { 
  VwBagDetails, 
  Lot, 
  VwCuppingDetails, 
  Contract, 
  BagMilestone, 
  CostLedger, 
  Producer, 
  Farm, 
  Client, 
  VwContractMetrics 
} from './database';

export interface StoreContract extends Contract {
  client_name: string;
}

export interface StoreState {
  coffees: VwBagDetails[];
  lots: Lot[];
  cuppingReports: VwCuppingDetails[];
  contracts: StoreContract[];
  milestones: BagMilestone[];
  ledger: CostLedger[];
  producers: Producer[];
  farms: Farm[];
  clients: Client[];
  contractMetrics: VwContractMetrics[];
  isDevMode: boolean;
  refreshTrigger: number;

  toggleDevMode: () => void;
  triggerRefresh: () => void;
  syncStore: () => Promise<void>;
}
