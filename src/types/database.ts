export type RelationshipType = 'Important' | 'Direct Trade' | 'Co-op' | 'Other';
export type ClientRelationshipType = 'VIP' | 'International' | 'National' | 'Other';
export type RegionType = 'Cusco' | 'Cajamarca' | 'Junin' | 'Other';
export type LocationType = 'Quillabamba' | 'Santa Teresa' | 'Quellouno' | 'Other';
export type CertificationType = 'Organic' | 'Fair Trade' | 'Rainforest Alliance' | 'None';
export type VarietyType = 'Typica' | 'Caturra' | 'Catuai' | 'Geisha' | 'Other';
export type ProcessMethodType = 'Washed' | 'Natural' | 'Honey' | 'Anaerobic' | 'Other';
export type ContractStatus = 'Processing' | 'Fulfilled';
export type StageType = 'Farm' | 'Cora' | 'Port-Export' | 'Port-Import' | 'Final Destination';
export type BagLocation = 'Cora' | 'Transport' | 'Port-Export' | 'Port-Import' | 'Final Destination';
export type BagStatus = 'Available' | 'Allocated' | 'Shipped';
export type CostType = 'Milling' | 'Drying' | 'Sorting' | 'Lab/Grading' | 'Packaging' | 'Transportation' | 'Export Tax' | 'Other';
export type DefectType = 'Taint' | 'Fault' | 'None';

export interface Producer {
  id: string;
  name: string;
  relationship: RelationshipType | null;
}

export interface Client {
  id: string;
  name: string;
  relationship: ClientRelationshipType | null;
  destination_country: string | null;
  destination_port: string | null;
  destination_city: string | null;
  public_id: string | null;
}

export interface Farm {
  id: string;
  producer_id: string;
  name: string;
  region: RegionType | null;
  altitude_meters: number | null;
  location: LocationType | null;
  certification: CertificationType | null;
}

export interface Lot {
  id: string;
  public_id: string | null;
  farm_id: string | null;
  variety: VarietyType | null;
  process_method: ProcessMethodType | null;
  total_weight_kg: number | null;
  harvest_date: string | null;
  base_farm_cost_per_kg: number | null;
}

export interface Contract {
  id: string;
  public_id: string | null;
  client_id: string;
  sale_price_per_kg: number | null;
  required_quality_score: number | null;
  required_flavor_profile: string | null;
  status: ContractStatus | null;
  current_stage: StageType | null;
}

export interface Bag {
  id: string;
  public_id: string | null;
  lot_id: string;
  weight_kg: number;
  location: BagLocation | null;
  stock_code: string | null;
  status: BagStatus | null;
  contract_id: string | null;
}

export interface CostLedger {
  id: string;
  public_id: string | null;
  lot_id: string | null;
  contract_id: string | null;
  cost_type: CostType | null;
  amount_usd: number;
  date_incurred: string | null;
  notes: string | null;
}

export interface CuppingSession {
  id: string;
  public_id: string | null;
  lot_id: string;
  cupper_name: string;
  cupping_date: string | null;
  roast_level: string | null;
  score_fragrance: number | null;
  score_flavor: number | null;
  score_aftertaste: number | null;
  score_acidity: number | null;
  score_body: number | null;
  score_balance: number | null;
  score_overall: number | null;
  score_uniformity: number | null;
  score_clean_cup: number | null;
  score_sweetness: number | null;
  defect_type: DefectType | null;
  defect_cups: number | null;
  defect_score_subtract: number | null;
  total_score: number;
  final_score: number;
  notes: string | null;
  primary_flavor_note: string | null;
}

export interface BagMilestone {
  id: string;
  bag_id: string;
  stage: string;
  timestamp: string | null;
  notes: string | null;
}

export interface VwLotCosts {
  lot_id: string;
  base_farm_cost_per_kg: number | null;
  total_lot_ledger_usd: number;
  lot_cost_per_kg: number | null;
}

export interface VwContractCosts {
  contract_id: string;
  total_contract_ledger_usd: number;
  contract_cost_per_kg: number | null;
}

export interface VwBagDetails {
  id: string;
  public_id: string | null;
  lot_id: string;
  stock_code: string | null;
  weight_kg: number;
  status: BagStatus | null;
  contract_id: string | null;
  current_location: BagLocation | null;
  current_stage: StageType | null;
  lot_cost_per_kg: number | null;
  contract_cost_per_kg: number;
  total_landed_cost_per_kg: number | null;
  variety: VarietyType | null;
  farm_name: string | null;
  avg_score: number;
  aggregate_flavor_profile: string | null;
}

export interface VwCuppingAnalytics {
  lot_id: string;
  total_sessions: number;
  last_cupped_date: string | null;
  avg_final_score: number | null;
  avg_acidity: number | null;
  avg_body: number | null;
  avg_sweetness: number | null;
  total_defect_cups_found: number | null;
  aggregate_flavor_profile: string | null;
}

export interface VwContractFinancials {
  contract_id: string;
  public_id: string | null;
  sale_price_per_kg: number | null;
  total_allocated_kg: number;
  projected_revenue_usd: number | null;
  total_landed_cost_usd: number;
  net_profit_usd: number | null;
  profit_margin_percent: number;
}

export interface VwContractMetrics {
  contract_id: string;
  public_id: string | null;
  status: ContractStatus | null;
  current_stage: StageType | null;
  required_quality_score: number | null;
  allocated_avg_score: number;
  quality_delta: number | null;
  total_bags_allocated: number;
  bags_shipped: number;
  fulfillment_progress_percent: number;
  total_weight: number;
  total_contract_cost: number;
  avg_landed_cost: number;
  avg_farm_cost: number;
  avg_to_warehouse: number;
  avg_to_export: number;
  avg_to_import: number;
  avg_to_client: number;
}

export interface VwWarehouseHealth {
  lot_id: string;
  lot_public_id: string | null;
  expected_weight_kg: number | null;
  actual_physical_weight_kg: number;
  weight_discrepancy_kg: number | null;
  days_since_harvest: number | null;
  physical_bag_count: number;
  bags_needing_putaway: number | null;
}

export interface VwPalletUtilization {
  pallet_id: string | null;
  occupied_slots: number;
  empty_slots: number;
}

export interface VwCuppingDetails extends CuppingSession {
  lot_public_id: string | null;
  variety: VarietyType | null;
  process_method: ProcessMethodType | null;
  farm_name: string | null;
  producer_name: string | null;
}
