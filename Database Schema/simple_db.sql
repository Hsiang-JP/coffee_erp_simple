-- ==========================================
-- GREEN COFFEE ERP: CORE SCHEMA
-- Architecture: "Thick Database" (DB-First)
-- ==========================================
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. ENTITIES & ACTORS
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
    destination_city TEXT,
    public_id TEXT 
);

-- ==========================================
-- 2. PHYSICAL INVENTORY & TRACEABILITY
-- ==========================================
CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    producer_id TEXT NOT NULL REFERENCES producers(id),
    name TEXT NOT NULL,
    region TEXT CHECK(region IN ('Cusco', 'Cajamarca', 'Junin', 'Other')),
    altitude_meters REAL,
    location TEXT CHECK(location IN ('Quillabamba', 'Santa Teresa', 'Quellouno', 'Other')),
    certification TEXT CHECK(certification IN ('Organic', 'Fair Trade', 'Rainforest Alliance', 'None'))
);

CREATE TABLE IF NOT EXISTS lots (
    id TEXT PRIMARY KEY, 
    public_id TEXT UNIQUE, 
    farm_id TEXT REFERENCES farms(id),
    variety TEXT CHECK(variety IN ('Typica', 'Caturra', 'Catuai', 'Geisha', 'Other')),
    process_method TEXT CHECK(process_method IN ('Washed', 'Natural', 'Honey', 'Anaerobic', 'Other')),
    total_weight_kg REAL,
    harvest_date TEXT CHECK(harvest_date LIKE '____-__-__'), -- Enforces YYYY-MM-DD
    base_farm_cost_per_kg REAL
);

CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    public_id TEXT UNIQUE,
    client_id TEXT NOT NULL REFERENCES clients(id),
    sale_price_per_kg REAL,
    required_quality_score REAL,
    required_flavor_profile TEXT,
    status TEXT CHECK(status IN ('Processing', 'Fulfilled')),
    current_stage TEXT DEFAULT 'Farm' CHECK (current_stage IN ('Farm', 'Cora', 'Port-Export', 'Port-Import','Final Destination'))
);

CREATE TABLE IF NOT EXISTS bags (
    id TEXT PRIMARY KEY,
    public_id TEXT UNIQUE,
    lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    weight_kg REAL NOT NULL CHECK(weight_kg > 0),
    location TEXT DEFAULT 'Cora' CHECK(location IN ('Cora', 'Transport', 'Port-Export', 'Port-Import', 'Final Destination')), 
    stock_code TEXT, 
    status TEXT CHECK(status IN ('Available', 'Allocated', 'Shipped')),
    contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL
);

-- ==========================================
-- 3. FINANCIALS & QUALITY CONTROL
-- ==========================================
CREATE TABLE IF NOT EXISTS cost_ledger (
    id TEXT PRIMARY KEY,
    public_id TEXT UNIQUE,
    lot_id TEXT REFERENCES lots(id) ON DELETE CASCADE,          
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
    cost_type TEXT CHECK(cost_type IN ('Milling', 'Drying', 'Sorting', 'Lab/Grading', 'Packaging', 'Transportation', 'Export Tax', 'Other')),
    amount_usd REAL NOT NULL,
    date_incurred TEXT DEFAULT (datetime('now')),
    notes TEXT,
    CHECK (lot_id IS NOT NULL OR contract_id IS NOT NULL) 
);

CREATE TABLE IF NOT EXISTS cupping_sessions (
    id TEXT PRIMARY KEY,
    public_id TEXT UNIQUE,
    lot_id TEXT NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    cupper_name TEXT NOT NULL,
    cupping_date TEXT,
    roast_level TEXT,
    
    -- Raw Scores
    score_fragrance REAL DEFAULT 0, score_flavor REAL DEFAULT 0, score_aftertaste REAL DEFAULT 0, 
    score_acidity REAL DEFAULT 0, score_body REAL DEFAULT 0, score_balance REAL DEFAULT 0, score_overall REAL DEFAULT 0, 
    score_uniformity REAL DEFAULT 10.0, score_clean_cup REAL DEFAULT 10.0, score_sweetness REAL DEFAULT 10.0, 
    defect_type TEXT CHECK(defect_type IN ('Taint', 'Fault', 'None')), 
    defect_cups INTEGER DEFAULT 0, 
    defect_score_subtract REAL DEFAULT 0.0, 
    
    -- DB-Calculated Scores
    total_score REAL GENERATED ALWAYS AS (
        score_fragrance + score_flavor + score_aftertaste + score_acidity + 
        score_body + score_balance + score_overall + score_uniformity + 
        score_clean_cup + score_sweetness
    ) VIRTUAL,
    final_score REAL GENERATED ALWAYS AS (
        (score_fragrance + score_flavor + score_aftertaste + score_acidity + score_body + score_balance + score_overall + score_uniformity + score_clean_cup + score_sweetness) - defect_score_subtract
    ) VIRTUAL,
    
    notes TEXT, primary_flavor_note TEXT
);

CREATE TABLE IF NOT EXISTS bag_milestones (
    id TEXT PRIMARY KEY,
    bag_id TEXT NOT NULL REFERENCES bags(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')),
    notes TEXT
);

-- ==========================================
-- 4. DB-FIRST AUTOMATION (TRIGGERS)
-- ==========================================

-- Trigger 1: Auto-Log History
DROP TRIGGER IF EXISTS trg_log_bag_milestone;
CREATE TRIGGER trg_log_bag_milestone
AFTER UPDATE OF status, location ON bags
FOR EACH ROW
WHEN NEW.status != OLD.status OR NEW.location != OLD.location
BEGIN
    INSERT INTO bag_milestones (id, bag_id, stage, notes)
    VALUES (
        'ms-' || hex(randomblob(8)) || '-' || strftime('%s', 'now'), 
        NEW.id, 
        NEW.location, 
        'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
END;

-- Trigger 2: Auto-Clear Warehouse Slot on Shipping
DROP TRIGGER IF EXISTS trg_auto_clear_shipped_bag;
CREATE TRIGGER trg_auto_clear_shipped_bag
AFTER UPDATE OF status ON bags
FOR EACH ROW
WHEN NEW.status = 'Shipped' AND OLD.status != 'Shipped'
BEGIN
    UPDATE bags SET stock_code = NULL WHERE id = NEW.id;
END;

-- Trigger 3: Auto-Allocate Bag
DROP TRIGGER IF EXISTS trg_auto_status_allocated;
CREATE TRIGGER trg_auto_status_allocated
AFTER UPDATE OF contract_id ON bags
FOR EACH ROW
WHEN NEW.contract_id IS NOT NULL AND OLD.contract_id IS NULL
BEGIN
    UPDATE bags SET status = 'Allocated' WHERE id = NEW.id;
END;

-- Trigger 4: Auto-Release Bag
DROP TRIGGER IF EXISTS trg_auto_status_available;
CREATE TRIGGER trg_auto_status_available
AFTER UPDATE OF contract_id ON bags
FOR EACH ROW
WHEN NEW.contract_id IS NULL AND OLD.contract_id IS NOT NULL
BEGIN
    UPDATE bags SET status = 'Available' WHERE id = NEW.id;
END;

-- Trigger 5: Auto-Fulfill Contract on Final Delivery
DROP TRIGGER IF EXISTS trg_auto_fulfill_contract;
CREATE TRIGGER trg_auto_fulfill_contract
AFTER UPDATE OF location ON bags
FOR EACH ROW
WHEN NEW.location = 'Final Destination' AND NEW.contract_id IS NOT NULL
BEGIN
    UPDATE contracts
    SET status = 'Fulfilled', current_stage = 'Final Destination'
    WHERE id = NEW.contract_id
      AND (
          SELECT COUNT(id) FROM bags 
          WHERE contract_id = NEW.contract_id AND location != 'Final Destination'
      ) = 0;
END;

-- ==========================================
-- 5. THE "GOD VIEWS" (DYNAMIC CALCULATIONS)
-- ==========================================

-- Sub-View: Lot Costs
DROP VIEW IF EXISTS vw_lot_costs;
CREATE VIEW vw_lot_costs AS
SELECT 
    l.id AS lot_id,
    l.base_farm_cost_per_kg,
    COALESCE(SUM(cl.amount_usd), 0) AS total_lot_ledger_usd,
    (l.base_farm_cost_per_kg + (COALESCE(SUM(cl.amount_usd), 0) / NULLIF(l.total_weight_kg, 0))) AS lot_cost_per_kg
FROM lots l
LEFT JOIN cost_ledger cl ON l.id = cl.lot_id
GROUP BY l.id;

-- Sub-View: Contract Costs
DROP VIEW IF EXISTS vw_contract_costs;
CREATE VIEW vw_contract_costs AS
SELECT 
    c.id AS contract_id,
    COALESCE(SUM(cl.amount_usd), 0) AS total_contract_ledger_usd,
    (COALESCE(SUM(cl.amount_usd), 0) / NULLIF((SELECT SUM(weight_kg) FROM bags WHERE contract_id = c.id), 0)) AS contract_cost_per_kg
FROM contracts c
LEFT JOIN cost_ledger cl ON c.id = cl.contract_id
GROUP BY c.id;

-- Master View: Bag Details & Per-KG Value
DROP VIEW IF EXISTS vw_bag_details;
CREATE VIEW vw_bag_details AS
SELECT 
    b.id,
    b.public_id,
    b.lot_id,
    b.stock_code,
    b.weight_kg,
    b.status,
    b.contract_id,
    b.location AS current_location,
    con.current_stage,
    vlc.lot_cost_per_kg,
    COALESCE(vcc.contract_cost_per_kg, 0) AS contract_cost_per_kg,
    (vlc.lot_cost_per_kg + COALESCE(vcc.contract_cost_per_kg, 0)) AS total_landed_cost_per_kg,
    l.variety,
    f.name as farm_name,
    COALESCE(vca.avg_final_score, 0) as avg_score,
    vca.aggregate_flavor_profile
FROM bags b
JOIN lots l ON b.lot_id = l.id
JOIN farms f ON l.farm_id = f.id
JOIN vw_lot_costs vlc ON b.lot_id = vlc.lot_id
LEFT JOIN contracts con ON b.contract_id = con.id
LEFT JOIN vw_contract_costs vcc ON con.id = vcc.contract_id
LEFT JOIN vw_cupping_analytics vca ON b.lot_id = vca.lot_id;

-- Master View: Quality Control Analytics
DROP VIEW IF EXISTS vw_cupping_analytics;
CREATE VIEW vw_cupping_analytics AS
SELECT 
    lot_id,
    COUNT(id) AS total_sessions,
    MAX(cupping_date) AS last_cupped_date,
    ROUND(AVG(final_score), 2) AS avg_final_score,
    ROUND(AVG(score_acidity), 2) AS avg_acidity,
    ROUND(AVG(score_body), 2) AS avg_body,
    ROUND(AVG(score_sweetness), 2) AS avg_sweetness,
    SUM(defect_cups) AS total_defect_cups_found,
    GROUP_CONCAT(DISTINCT primary_flavor_note) AS aggregate_flavor_profile
FROM cupping_sessions
GROUP BY lot_id;

-- Master View: Cupping Session Details
DROP VIEW IF EXISTS vw_cupping_details;
CREATE VIEW vw_cupping_details AS
SELECT 
    cs.*,
    l.public_id as lot_public_id,
    l.variety,
    l.process_method,
    f.name as farm_name,
    p.name as producer_name
FROM cupping_sessions cs
JOIN lots l ON cs.lot_id = l.id
JOIN farms f ON l.farm_id = f.id
JOIN producers p ON f.producer_id = p.id;

-- Master View: Contract Profitability
DROP VIEW IF EXISTS vw_contract_financials;
CREATE VIEW vw_contract_financials AS
SELECT 
    c.id AS contract_id,
    c.public_id,
    c.sale_price_per_kg,
    COALESCE(SUM(b.weight_kg), 0) AS total_allocated_kg,
    (c.sale_price_per_kg * COALESCE(SUM(b.weight_kg), 0)) AS projected_revenue_usd,
    COALESCE(SUM(b.weight_kg * vbd.total_landed_cost_per_kg), 0) AS total_landed_cost_usd,
    ((c.sale_price_per_kg * COALESCE(SUM(b.weight_kg), 0)) - COALESCE(SUM(b.weight_kg * vbd.total_landed_cost_per_kg), 0)) AS net_profit_usd,
    CASE 
        WHEN (c.sale_price_per_kg * COALESCE(SUM(b.weight_kg), 0)) = 0 THEN 0 
        ELSE ROUND((((c.sale_price_per_kg * COALESCE(SUM(b.weight_kg), 0)) - COALESCE(SUM(b.weight_kg * vbd.total_landed_cost_per_kg), 0)) / (c.sale_price_per_kg * COALESCE(SUM(b.weight_kg), 0))) * 100, 2)
    END AS profit_margin_percent
FROM contracts c
LEFT JOIN bags b ON c.id = b.contract_id
LEFT JOIN vw_bag_details vbd ON b.id = vbd.id
GROUP BY c.id;

-- Master View: Logistics & Fulfillment Progress
DROP VIEW IF EXISTS vw_contract_metrics;
CREATE VIEW vw_contract_metrics AS
SELECT 
    c.id AS contract_id,
    c.public_id,
    c.status,
    c.current_stage,
    c.required_quality_score,
    COALESCE(ROUND(AVG(vca.avg_final_score), 2), 0) AS allocated_avg_score,
    (COALESCE(AVG(vca.avg_final_score), 0) - c.required_quality_score) AS quality_delta,
    COUNT(b.id) AS total_bags_allocated,
    SUM(CASE WHEN b.status = 'Shipped' THEN 1 ELSE 0 END) AS bags_shipped,
    CASE 
        WHEN COUNT(b.id) = 0 THEN 0
        ELSE ROUND((CAST(SUM(CASE WHEN b.status = 'Shipped' THEN 1 ELSE 0 END) AS REAL) / COUNT(b.id)) * 100, 1)
    END AS fulfillment_progress_percent,
    COALESCE(SUM(b.weight_kg), 0) as total_weight,
    COALESCE(SUM(b.weight_kg * vbd.total_landed_cost_per_kg), 0) as total_contract_cost,
    COALESCE(AVG(vbd.total_landed_cost_per_kg), 0) as avg_landed_cost,
    COALESCE(AVG(vbd.lot_cost_per_kg), 0) as avg_farm_cost,
    COALESCE((SELECT SUM(amount_usd) FROM cost_ledger WHERE contract_id = c.id AND notes LIKE '%Farm -> Cora%'), 0) / NULLIF(SUM(b.weight_kg), 0) as avg_to_warehouse,
    COALESCE((SELECT SUM(amount_usd) FROM cost_ledger WHERE contract_id = c.id AND notes LIKE '%Cora -> Port-Export%'), 0) / NULLIF(SUM(b.weight_kg), 0) as avg_to_export,
    COALESCE((SELECT SUM(amount_usd) FROM cost_ledger WHERE contract_id = c.id AND notes LIKE '%Port-Export -> Port-Import%'), 0) / NULLIF(SUM(b.weight_kg), 0) as avg_to_import,
    COALESCE((SELECT SUM(amount_usd) FROM cost_ledger WHERE contract_id = c.id AND notes LIKE '%Port-Import -> Final Destination%'), 0) / NULLIF(SUM(b.weight_kg), 0) as avg_to_client
FROM contracts c
LEFT JOIN bags b ON c.id = b.contract_id
LEFT JOIN vw_bag_details vbd ON b.id = vbd.id
LEFT JOIN vw_cupping_analytics vca ON b.lot_id = vca.lot_id
GROUP BY c.id;

-- Master View: Warehouse Audits
DROP VIEW IF EXISTS vw_warehouse_health;
CREATE VIEW vw_warehouse_health AS
SELECT 
    l.id AS lot_id,
    l.public_id AS lot_public_id,
    l.total_weight_kg AS expected_weight_kg,
    COALESCE(SUM(b.weight_kg), 0) AS actual_physical_weight_kg,
    (l.total_weight_kg - COALESCE(SUM(b.weight_kg), 0)) AS weight_discrepancy_kg,
    CAST(julianday('now') - julianday(l.harvest_date) AS INTEGER) AS days_since_harvest,
    COUNT(b.id) AS physical_bag_count,
    SUM(CASE WHEN b.stock_code IS NULL AND b.status != 'Shipped' THEN 1 ELSE 0 END) AS bags_needing_putaway
FROM lots l
LEFT JOIN bags b ON l.id = b.lot_id AND b.status != 'Shipped'
GROUP BY l.id;

-- Sub-View: Grid UI Support
DROP VIEW IF EXISTS vw_pallet_utilization;
CREATE VIEW vw_pallet_utilization AS
SELECT 
    SUBSTR(stock_code, 1, INSTR(stock_code, '-') - 1) AS pallet_id,
    COUNT(id) AS occupied_slots,
    (10 - COUNT(id)) AS empty_slots
FROM bags 
WHERE stock_code IS NOT NULL AND status != 'Shipped'
GROUP BY SUBSTR(stock_code, 1, INSTR(stock_code, '-') - 1);
