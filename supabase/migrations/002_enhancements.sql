-- ============================================================
-- 002_enhancements.sql
-- Adds user_aliases table, missing RLS policies, and indexes
-- ============================================================

-- Table: User Aliases (maps email alias → user)
CREATE TABLE user_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
    alias TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_aliases_alias ON user_aliases(alias);
CREATE INDEX idx_aliases_user ON user_aliases(user_id);

-- RLS for user_aliases
ALTER TABLE user_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alias" ON user_aliases
    FOR SELECT USING (auth.uid() = user_id);

-- Service role inserts aliases (bypasses RLS), but allow user reads.

-- Missing policy: users can UPDATE their own inventory items
CREATE POLICY "Users can update own inventory" ON user_inventory
    FOR UPDATE USING (auth.uid() = user_id);

-- Index for text search pre-filtering on active_recalls
CREATE INDEX idx_recalls_title_trgm ON active_recalls USING gin (title gin_trgm_ops);
CREATE INDEX idx_recalls_description_trgm ON active_recalls USING gin (description gin_trgm_ops);

-- Enable trigram extension (needed for ILIKE index optimization)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
