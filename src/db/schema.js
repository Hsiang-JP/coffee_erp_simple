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
    destination_city TEXT
);

-- ==========================================
-- 2. THE COFFEE & TRACEABILITY
-- ==========================================
CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    producer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    region TEXT CHECK(region IN ('Cusco', 'Cajamarca', 'Junin', 'Other')),
    altitude_meters REAL,
    location TEXT CHECK(location IN ('Quillabamba', 'Santa Teresa', 'Quellouno', 'Other')),
    certification TEXT CHECK(certification IN ('Organic', 'Fair Trade', 'Rainforest Alliance', 'None')),
    FOREIGN KEY (producer_id) REFERENCES producers(id)
);

CREATE TABLE IF NOT EXISTS lots (
    id TEXT PRIMARY KEY,
    public_id TEXT,
    farm_id TEXT,
    variety TEXT CHECK(variety IN ('Typica', 'Caturra', 'Catuai', 'Geisha', 'Other')),
    process_method TEXT CHECK(process_method IN ('Washed', 'Natural', 'Honey', 'Anaerobic', 'Other')),
    total_weight_kg REAL,
    harvest_date TEXT,
    base_farm_cost_per_kg REAL,
    FOREIGN KEY (farm_id) REFERENCES farms(id)
);

CREATE TABLE IF NOT EXISTS cost_ledger (
    id TEXT PRIMARY KEY,
    lot_id TEXT NOT NULL,
    cost_type TEXT CHECK(cost_type IN ('Milling', 'Drying', 'Sorting', 'Lab/Grading', 'Packaging', 'Transportation', 'Other')),
    amount_usd REAL NOT NULL,
    date_incurred TEXT,
    notes TEXT,
    FOREIGN KEY (lot_id) REFERENCES lots(id)
);

CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    public_id TEXT,
    client_id TEXT NOT NULL,
    sale_price_per_kg REAL NOT NULL,
    required_quality_score REAL NOT NULL,
    required_flavor_profile TEXT,
    status TEXT CHECK(status IN ('Processing', 'Fulfilled')),
    FOREIGN KEY (client_id) REFERENCES clients(id)
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
    FOREIGN KEY (lot_id) REFERENCES lots(id),
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- ==========================================
-- 3. QUALITY CONTROL
-- ==========================================
CREATE TABLE IF NOT EXISTS cupping_sessions (
    id TEXT PRIMARY KEY,
    public_id TEXT,
    lot_id TEXT NOT NULL,
    cupper_name TEXT NOT NULL,
    cupping_date TEXT,
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
    FOREIGN KEY (lot_id) REFERENCES lots(id)
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
    FOREIGN KEY (bag_id) REFERENCES bags(id),
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- ==========================================
-- 5. VIEWS & TRIGGERS
-- ==========================================
-- Update in CORE_SCHEMA Section 5
CREATE VIEW IF NOT EXISTS available_inventory_optimization AS
SELECT 
    b.*,
    l.variety,
    l.process_method,
    l.base_farm_cost_per_kg,
    CAST(SUBSTR(b.stock_code, INSTR(b.stock_code, '-') + 1) AS INTEGER) AS storage_level,
    (SELECT primary_flavor_note FROM cupping_sessions WHERE lot_id = b.lot_id ORDER BY cupping_date DESC LIMIT 1) AS primary_flavor_note,
    (SELECT AVG(total_score) FROM cupping_sessions WHERE lot_id = b.lot_id) AS quality_score
FROM bags b
JOIN lots l ON b.lot_id = l.id
WHERE b.status = 'Available';

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



`;