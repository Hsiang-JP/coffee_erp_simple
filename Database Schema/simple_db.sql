-- DUMB-DOWN DEMO SCHEMA FOR GREEN COFFEE ERP
-- Focus: Visual Traceability, Easy QC Calibration, and Smart Allocation
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. THE ACTORS
-- ==========================================
CREATE TABLE producers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    relationship TEXT CHECK(relationship IN ('Important', 'Direct Trade', 'Co-op', 'Other'))
);

CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    relationship TEXT CHECK(relationship IN ('VIP', 'International', 'National', 'Other')),
    destination_country TEXT,
    destination_port TEXT,
    destination_city TEXT
);

-- ==========================================
-- 2. THE COFFEE & TRACEABILITY (Core Value 1)
-- ==========================================
CREATE TABLE farms (
    id TEXT PRIMARY KEY, --UUID
    producer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    region TEXT CHECK(region IN ('Cusco', 'Cajamarca', 'Junin', 'Other')),
    altitude_meters REAL,
    location TEXT CHECK(location IN ('Quillabamba', 'Santa Teresa', 'Quellouno', 'Other')),
    certification TEXT CHECK(certification IN ('Organic', 'Fair Trade', 'Rainforest Alliance', 'None')),
    FOREIGN KEY (producer_id) REFERENCES producers(id)
);

CREATE TABLE lots (
    id TEXT PRIMARY KEY, --UUID 
    public_id TEXT, -- for human user readability 
    farm_id TEXT,
    variety TEXT CHECK(variety IN ('Typica', 'Caturra', 'Catuai', 'Geisha', 'Other')),
    process_method TEXT CHECK(process_method IN ('Washed', 'Natural', 'Honey', 'Anaerobic', 'Other')),
    total_weight_kg REAL,
    harvest_date TEXT,
    base_farm_cost_per_kg REAL,
    FOREIGN KEY (farm_id) REFERENCES farms(id)
);

CREATE TABLE cost_ledger (
    id TEXT PRIMARY KEY,
    lot_id TEXT NOT NULL,
    cost_type TEXT CHECK(cost_type IN ('Milling', 'Drying', 'Sorting', 'Lab/Grading', 'Packaging', 'Transportation', 'Other')),
    amount_usd REAL NOT NULL,
    date_incurred TEXT,
    notes TEXT,
    FOREIGN KEY (lot_id) REFERENCES lots(id)
);

-- Note: In bags, I fixed the CHECK constraint to refer to current_location_stage (not cost_type)
-- Added missing commas and fixed the double FOREIGN KEY syntax.
CREATE TABLE bags (
    id TEXT PRIMARY KEY, --UUID
    public_id TEXT, -- for human user readability
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
-- 3. QUALITY CONTROL (Core Value 2)
-- ==========================================
CREATE TABLE cupping_sessions (
    id TEXT PRIMARY KEY, --UUID
    public_id TEXT, -- for human user readability
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
-- 4. SALES & SMART ALLOCATION (Core Value 3)
-- ==========================================
CREATE TABLE contracts (
    id TEXT PRIMARY KEY, --UUID
    public_id TEXT, -- for human user readability
    client_id TEXT NOT NULL,
    sale_price_per_kg REAL,
    required_quality_score REAL,
    required_flavor_profile TEXT,
    status TEXT CHECK(status IN ('Processing', 'Fulfilled')),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- 6. THE JOURNEY
CREATE TABLE bag_milestones (
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