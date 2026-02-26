export const CORE_SCHEMA = `
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. THE ACTORS
-- ==========================================
CREATE TABLE IF NOT EXISTS producers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    relationship TEXT CHECK(relationship IN ('Important', 'Direct Trade', 'Co-op', 'Other'))
);

CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    relationship TEXT CHECK(relationship IN ('VIP', 'International', 'National', 'Other')),
    destination_country TEXT,
    destination_port TEXT,
    destination_city TEXT NOT NULL
);

-- ==========================================
-- 2. THE COFFEE & TRACEABILITY
-- ==========================================
CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    producer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    altitude_meters REAL,
    location TEXT NOT NULL,
    certification TEXT CHECK(certification IN ('Organic', 'Fair Trade', 'Rainforest Alliance', 'None')),
    FOREIGN KEY (producer_id) REFERENCES producers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lots (
    id TEXT PRIMARY KEY,
    public_id TEXT,
    farm_id TEXT,
    variety TEXT NOT NULL, 
    process_method TEXT NOT NULL, 
    total_weight_kg REAL NOT NULL,
    harvest_date TEXT,
    base_farm_cost_per_kg REAL NOT NULL,
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cost_ledger (
    id TEXT PRIMARY KEY,
    lot_id TEXT NOT NULL,
    cost_type TEXT CHECK(cost_type IN ('Milling', 'Drying', 'Sorting', 'Lab/Grading', 'Packaging', 'Transportation', 'Other')),
    amount_usd REAL NOT NULL,
    date_incurred TEXT,
    notes TEXT,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    public_id TEXT,
    client_id TEXT NOT NULL,
    sale_price_per_kg REAL NOT NULL,
    required_quality_score REAL NOT NULL,
    required_flavor_profile TEXT,
    status TEXT CHECK(status IN ('Processing', 'Fulfilled')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bags (
    id TEXT PRIMARY KEY,
    public_id TEXT,
    lot_id TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    location TEXT DEFAULT 'Cora' CHECK(location IN ('Cora', 'Port-Export', 'Transport', 'Port-Import', 'Final Destination')),
    stock_code TEXT, 
    status TEXT CHECK(status IN ('Available', 'Allocated', 'Shipped')),
    contract_id TEXT,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE CASCADE,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- ==========================================
-- 3. QUALITY CONTROL
-- ==========================================
CREATE TABLE IF NOT EXISTS cupping_sessions (
    id TEXT PRIMARY KEY,
    public_id TEXT,
    lot_id TEXT NOT NULL,
    cupper_name TEXT NOT NULL,
    cupping_date TEXT NOT NULL,
    roast_level REAL,
    fragrance_dry REAL,
    fragrance_break REAL,
    score_fragrance REAL,
    score_flavor REAL,
    score_aftertaste REAL,
    score_acidity REAL,
    acidity_intensity REAL,
    score_body REAL,
    body_level REAL,
    score_balance REAL,
    score_overall REAL,
    uniformity_cups TEXT DEFAULT '1,1,1,1,1',
    score_uniformity REAL DEFAULT 10.0,
    clean_cup_cups TEXT DEFAULT '1,1,1,1,1',
    score_clean_cup REAL DEFAULT 10.0,
    sweetness_cups TEXT DEFAULT '1,1,1,1,1',
    score_sweetness REAL DEFAULT 10.0,
    defect_type TEXT CHECK(defect_type IN ('Taint', 'Fault', 'None')),
    defect_cups INTEGER DEFAULT 0,
    defect_score_subtract REAL DEFAULT 0.0,
    total_score REAL,
    final_score REAL,
    notes TEXT,
    primary_flavor_note TEXT,
    FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE CASCADE
);

-- ==========================================
-- 4. THE JOURNEY
-- ==========================================
CREATE TABLE IF NOT EXISTS bag_milestones (
    id TEXT PRIMARY KEY,
    bag_id TEXT UNIQUE,
    contract_id TEXT,
    current_stage TEXT DEFAULT 'Farm' CHECK (current_stage IN ('Farm', 'Cora', 'Port-Export', 'Port-Import','Final Destination')),
    cost_to_warehouse REAL,
    cost_to_export REAL,
    cost_to_import REAL,
    cost_to_client REAL,
    final_sale_price REAL,
    FOREIGN KEY (bag_id) REFERENCES bags(id) ON DELETE CASCADE,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

-- ==========================================
-- 5. VIEWS & TRIGGERS
-- ==========================================
-- Drop the old one first if updating an existing database
DROP VIEW IF EXISTS available_inventory_optimization;

CREATE VIEW available_inventory_optimization AS
SELECT 
    b.*,
    l.variety,
    l.process_method,
    l.base_farm_cost_per_kg,
    
    -- THE MAGIC LINE: Dynamically calculates the true current cost per kg
    (l.base_farm_cost_per_kg + (COALESCE((SELECT SUM(amount_usd) FROM cost_ledger WHERE lot_id = l.id), 0) / NULLIF(l.total_weight_kg, 1))) AS current_per_kg_cost,
    
    CAST(SUBSTR(b.stock_code, INSTR(b.stock_code, '-') + 1) AS INTEGER) AS storage_level,
    (SELECT primary_flavor_note FROM cupping_sessions WHERE lot_id = b.lot_id ORDER BY cupping_date DESC LIMIT 1) AS primary_flavor_note,
    (SELECT AVG(total_score) FROM cupping_sessions WHERE lot_id = b.lot_id) AS quality_score
FROM bags b
JOIN lots l ON b.lot_id = l.id
WHERE b.status = 'Available';

DROP VIEW IF EXISTS vw_contract_journey;

CREATE VIEW vw_contract_journey AS
SELECT 
    b.contract_id,
    SUM(b.weight_kg) as total_weight,
    
    -- Base Farm Cost
    AVG(l.base_farm_cost_per_kg + (SELECT COALESCE(SUM(amount_usd), 0) FROM cost_ledger WHERE lot_id = l.id) / NULLIF(l.total_weight_kg, 0)) as farm_cost,
    
    -- Individual stage costs per kg (Changed from SUM to AVG)
    AVG(COALESCE(bm.cost_to_warehouse, 0)) AS cost_to_warehouse_per_kg,
    AVG(COALESCE(bm.cost_to_export, 0)) AS cost_to_export_per_kg,
    AVG(COALESCE(bm.cost_to_import, 0)) AS cost_to_import_per_kg,
    AVG(COALESCE(bm.cost_to_client, 0)) AS cost_to_client_per_kg,

    -- Total ops cost
    (AVG(COALESCE(bm.cost_to_warehouse, 0)) + 
     AVG(COALESCE(bm.cost_to_export, 0)) + 
     AVG(COALESCE(bm.cost_to_import, 0)) + 
     AVG(COALESCE(bm.cost_to_client, 0))) as ops_cost,
    
    -- Total landed
    AVG(l.base_farm_cost_per_kg + (SELECT COALESCE(SUM(amount_usd), 0) FROM cost_ledger WHERE lot_id = l.id) / NULLIF(l.total_weight_kg, 0)) + 
    (AVG(COALESCE(bm.cost_to_warehouse, 0)) + 
     AVG(COALESCE(bm.cost_to_export, 0)) + 
     AVG(COALESCE(bm.cost_to_import, 0)) + 
     AVG(COALESCE(bm.cost_to_client, 0))) as total_landed,
    
    -- FIX: Grab the actual stage from one of the contract's milestones, bypassing alphabetical sorting
    (SELECT current_stage FROM bag_milestones WHERE contract_id = b.contract_id LIMIT 1) as current_stage
FROM bags b
JOIN lots l ON b.lot_id = l.id
JOIN bag_milestones bm ON bm.bag_id = b.id
GROUP BY b.contract_id;

CREATE TRIGGER IF NOT EXISTS update_final_price_after_milestone_insert
AFTER INSERT ON bag_milestones
FOR EACH ROW
BEGIN
    UPDATE bag_milestones
    SET final_sale_price = (
        SELECT 
          l.base_farm_cost_per_kg + 
          (SELECT COALESCE(SUM(amount_usd), 0) FROM cost_ledger WHERE lot_id = l.id) / NULLIF(l.total_weight_kg, 0) +
          COALESCE(NEW.cost_to_warehouse, 0) + 
          COALESCE(NEW.cost_to_export, 0) + 
          COALESCE(NEW.cost_to_import, 0) + 
          COALESCE(NEW.cost_to_client, 0)
        FROM bags b
        JOIN lots l ON b.lot_id = l.id
        WHERE b.id = NEW.bag_id
    )
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_final_price_after_milestone_update
AFTER UPDATE ON bag_milestones
FOR EACH ROW
BEGIN
    UPDATE bag_milestones
    SET final_sale_price = (
        SELECT 
          l.base_farm_cost_per_kg + 
          (SELECT COALESCE(SUM(amount_usd), 0) FROM cost_ledger WHERE lot_id = l.id) / NULLIF(l.total_weight_kg, 0) +
          COALESCE(NEW.cost_to_warehouse, 0) + 
          COALESCE(NEW.cost_to_export, 0) + 
          COALESCE(NEW.cost_to_import, 0) + 
          COALESCE(NEW.cost_to_client, 0)
        FROM bags b
        JOIN lots l ON b.lot_id = l.id
        WHERE b.id = NEW.bag_id
    )
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_bag_prices_on_ledger_insert
AFTER INSERT ON cost_ledger
FOR EACH ROW
BEGIN
    UPDATE bag_milestones
    SET final_sale_price = (
        SELECT 
          l.base_farm_cost_per_kg + 
          (SELECT COALESCE(SUM(amount_usd), 0) FROM cost_ledger WHERE lot_id = l.id) / NULLIF(l.total_weight_kg, 0) +
          COALESCE(bm.cost_to_warehouse, 0) + 
          COALESCE(bm.cost_to_export, 0) + 
          COALESCE(bm.cost_to_import, 0) + 
          COALESCE(bm.cost_to_client, 0)
        FROM bag_milestones bm
        JOIN bags b ON bm.bag_id = b.id
        JOIN lots l ON b.lot_id = l.id
        WHERE bm.id = bag_milestones.id
    )
    WHERE bag_id IN (SELECT id FROM bags WHERE lot_id = NEW.lot_id);
END;

CREATE TRIGGER IF NOT EXISTS update_bag_prices_on_ledger_update
AFTER UPDATE ON cost_ledger
FOR EACH ROW
BEGIN
    UPDATE bag_milestones
    SET final_sale_price = (
        SELECT 
          l.base_farm_cost_per_kg + 
          (SELECT COALESCE(SUM(amount_usd), 0) FROM cost_ledger WHERE lot_id = l.id) / NULLIF(l.total_weight_kg, 0) +
          COALESCE(bm.cost_to_warehouse, 0) + 
          COALESCE(bm.cost_to_export, 0) + 
          COALESCE(bm.cost_to_import, 0) + 
          COALESCE(bm.cost_to_client, 0)
        FROM bag_milestones bm
        JOIN bags b ON bm.bag_id = b.id
        JOIN lots l ON b.lot_id = l.id
        WHERE bm.id = bag_milestones.id
    )
    WHERE bag_id IN (SELECT id FROM bags WHERE lot_id = NEW.lot_id);
END;

CREATE TRIGGER IF NOT EXISTS update_bag_prices_on_ledger_delete
AFTER DELETE ON cost_ledger
FOR EACH ROW
BEGIN
    UPDATE bag_milestones
    SET final_sale_price = (
        SELECT 
          l.base_farm_cost_per_kg + 
          (SELECT COALESCE(SUM(amount_usd), 0) FROM cost_ledger WHERE lot_id = l.id) / NULLIF(l.total_weight_kg, 0) +
          COALESCE(bm.cost_to_warehouse, 0) + 
          COALESCE(bm.cost_to_export, 0) + 
          COALESCE(bm.cost_to_import, 0) + 
          COALESCE(bm.cost_to_client, 0)
        FROM bag_milestones bm
        JOIN bags b ON bm.bag_id = b.id
        JOIN lots l ON b.lot_id = l.id
        WHERE bm.id = bag_milestones.id
    )
    WHERE bag_id IN (SELECT id FROM bags WHERE lot_id = OLD.lot_id);
END;


-- Trigger for New Cupping Sessions
CREATE TRIGGER IF NOT EXISTS calculate_cupping_scores_insert
AFTER INSERT ON cupping_sessions
FOR EACH ROW
BEGIN
    UPDATE cupping_sessions
    SET 
        total_score = (
            NEW.score_fragrance + NEW.score_flavor + NEW.score_aftertaste + 
            NEW.score_acidity + NEW.score_body + NEW.score_balance + 
            NEW.score_overall + NEW.score_uniformity + NEW.score_clean_cup + 
            NEW.score_sweetness
        ),
        final_score = (
            (NEW.score_fragrance + NEW.score_flavor + NEW.score_aftertaste + 
             NEW.score_acidity + NEW.score_body + NEW.score_balance + 
             NEW.score_overall + NEW.score_uniformity + NEW.score_clean_cup + 
             NEW.score_sweetness) - COALESCE(NEW.defect_score_subtract, 0)
        )
    WHERE id = NEW.id;
END;

-- 6. THE SPATIAL ISLAND (Geocoding Cache)
  CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL, 
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Seed data for static hubs
  INSERT OR IGNORE INTO locations (id, name, latitude, longitude) VALUES 
  ('loc-cora', 'Cora', -12.8637, -72.6919),
  ('loc-callao', 'Callao Port', -12.0534, -77.1464),
  ('loc-lima', 'Lima', -12.1195, -77.0365),
  ('loc-chancay', 'Chancay Port', -11.5821, -77.2721),
  ('loc-keelung', 'Keelung Port', 25.1288, 121.7419),
  ('loc-taiwan', 'Taiwan', 25.0345, 121.4876),
  ('loc-taichung', 'Taichung', 24.1702, 120.7067),
  ('loc-cusco', 'Cusco', -13.5319, -71.9675),
  ('loc-cajamarca', 'Cajamarca', -7.1638, -78.5002),
  ('loc-junin', 'Junin', -11.1583, -75.2754),
  ('loc-quillabamba', 'Quillabamba', -12.9000, -72.6833),
  ('loc-inkawasi', 'Inkawasi', -13.326, -73.2040),
  ('loc-santa-teresa', 'Santa Teresa', -13.1500, -72.7500),
  ('loc-quellouno', 'Quellouno', -13.2000, -72.6000);

`;