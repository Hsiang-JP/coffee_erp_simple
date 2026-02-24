export const SEED_DATA = {
  producers: [
    { id: 'prod-1', name: 'Finca La Huella', relationship: 'Direct Trade' }
  ],
  clients: [
    { id: 'cli-1', name: 'Blue Bottle Tokyo', relationship: 'VIP', destination_city: 'Tokyo' }
  ],
  farms: [
    { id: 'farm-1', producer_id: 'prod-1', name: 'La Huella', region: 'Cusco', altitude_meters: 1800, location: 'Santa Teresa', certification: 'Organic' }
  ],
  lots: [
    { id: 'lot-1', public_id: 'L-2401', farm_id: 'farm-1', variety: 'Geisha', process_method: 'Washed', total_weight_kg: 690, harvest_date: '2023-06-15', base_farm_cost_per_kg: 8.50 },
    { id: 'lot-2', public_id: 'L-2402', farm_id: 'farm-1', variety: 'Typica', process_method: 'Natural', total_weight_kg: 1000, harvest_date: '2023-06-20', base_farm_cost_per_kg: 6.00 }
  ],
  cost_ledger: [
    { id: 'cl-1', lot_id: 'lot-1', cost_type: 'Milling', amount_usd: 345.00, date_incurred: '2023-06-20' },
    { id: 'cl-2', lot_id: 'lot-1', cost_type: 'Lab/Grading', amount_usd: 138.00, date_incurred: '2023-06-25' }
  ],
  contracts: [
    { id: 'con-1', public_id: 'CTR-24-001', client_id: 'cli-1', sale_price_per_kg: 15.50, status: 'Processing' }
  ],
  bags: Array.from({ length: 10 }, (_, i) => ({
    id: `bag-1-${i + 1}`,
    public_id: `B-1-${i + 1}`,
    lot_id: 'lot-1',
    weight_kg: 69.0,
    location: 'Cora',
    stock_code: `AA-${i + 1}`,
    status: 'Allocated',
    contract_id: 'con-1'
  })),
  bag_milestones: Array.from({ length: 10 }, (_, i) => ({
    id: `ms-bag-1-${i + 1}`,
    bag_id: `bag-1-${i + 1}`,
    contract_id: 'con-1',
    current_stage: 'Farm',
    cost_to_warehouse: 0,
    cost_to_export: 0,
    cost_to_import: 0,
    cost_to_client: 0,
    final_sale_price: 9.20
  }))
};
