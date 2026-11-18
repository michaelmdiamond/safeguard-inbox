-- Also harden installations that already applied the original Gmail migration.
DROP POLICY IF EXISTS "Users can view own gmail connection" ON gmail_connections;
DROP POLICY IF EXISTS "Users can insert own gmail connection" ON gmail_connections;
DROP POLICY IF EXISTS "Users can update own gmail connection" ON gmail_connections;
ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE gmail_connections FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gmail_connections TO service_role;
