-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";

-- Table: User Inventory (Extracted from Receipts)
CREATE TABLE user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    brand TEXT NOT NULL,
    product_name TEXT NOT NULL,
    model_number TEXT,
    category TEXT NOT NULL DEFAULT 'Other',
    purchase_date DATE,
    source_email_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Master Recall Feed
CREATE TABLE active_recalls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_source TEXT NOT NULL,
    agency_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    affected_models TEXT[] DEFAULT '{}',
    recall_date DATE,
    remedy_url TEXT,
    embedding VECTOR(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: User Alerts (Matched Recalls)
CREATE TABLE user_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    inventory_item_id UUID REFERENCES user_inventory(id) ON DELETE CASCADE NOT NULL,
    recall_id UUID REFERENCES active_recalls(id) ON DELETE CASCADE NOT NULL,
    match_score REAL NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'new',
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(inventory_item_id, recall_id)
);

-- Indexes
CREATE INDEX idx_inventory_user ON user_inventory(user_id);
CREATE INDEX idx_inventory_brand ON user_inventory(brand);
CREATE INDEX idx_recalls_agency ON active_recalls(agency_source);
CREATE INDEX idx_recalls_date ON active_recalls(recall_date DESC);
CREATE INDEX idx_alerts_user ON user_alerts(user_id);
CREATE INDEX idx_alerts_status ON user_alerts(status);

-- Row Level Security
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory" ON user_inventory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory" ON user_inventory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory" ON user_inventory
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts" ON user_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON user_alerts
    FOR UPDATE USING (auth.uid() = user_id);

-- Active recalls are public read
ALTER TABLE active_recalls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read recalls" ON active_recalls
    FOR SELECT USING (true);
