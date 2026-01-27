-- Row Level Security policies for Audit Mode
-- This ensures data cannot be modified during active audit sessions
-- even if someone bypasses the application layer

-- Enable RLS on critical tables
ALTER TABLE "TemperatureEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthCheck" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthCheckEmployee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RegistryDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CCP" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CCPAction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Nonconformity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LabTest" ENABLE ROW LEVEL SECURITY;

-- Function to check if audit mode is active
CREATE OR REPLACE FUNCTION is_audit_mode_active()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "AuditSession"
    WHERE status = 'active'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for TemperatureEntry: Block INSERT/UPDATE/DELETE during audit
CREATE POLICY "block_temperature_modifications_during_audit"
ON "TemperatureEntry"
FOR ALL
USING (NOT is_audit_mode_active())
WITH CHECK (NOT is_audit_mode_active());

-- Policy for HealthCheck: Block INSERT/UPDATE/DELETE during audit
CREATE POLICY "block_health_modifications_during_audit"
ON "HealthCheck"
FOR ALL
USING (NOT is_audit_mode_active())
WITH CHECK (NOT is_audit_mode_active());

-- Policy for HealthCheckEmployee: Block INSERT/UPDATE/DELETE during audit
CREATE POLICY "block_health_employee_modifications_during_audit"
ON "HealthCheckEmployee"
FOR ALL
USING (NOT is_audit_mode_active())
WITH CHECK (NOT is_audit_mode_active());

-- Policy for RegistryDocument: Block INSERT/UPDATE/DELETE during audit
CREATE POLICY "block_registry_modifications_during_audit"
ON "RegistryDocument"
FOR ALL
USING (NOT is_audit_mode_active())
WITH CHECK (NOT is_audit_mode_active());

-- Policy for Document: Block INSERT/UPDATE/DELETE during audit
CREATE POLICY "block_document_modifications_during_audit"
ON "Document"
FOR ALL
USING (NOT is_audit_mode_active())
WITH CHECK (NOT is_audit_mode_active());

-- Policy for CCP: Block INSERT/UPDATE/DELETE during audit
CREATE POLICY "block_ccp_modifications_during_audit"
ON "CCP"
FOR ALL
USING (NOT is_audit_mode_active())
WITH CHECK (NOT is_audit_mode_active());

-- Policy for CCPAction: Block INSERT/UPDATE/DELETE during audit
CREATE POLICY "block_ccp_action_modifications_during_audit"
ON "CCPAction"
FOR ALL
USING (NOT is_audit_mode_active())
WITH CHECK (NOT is_audit_mode_active());

-- Policy for Nonconformity: Block INSERT/UPDATE/DELETE during audit
CREATE POLICY "block_nonconformity_modifications_during_audit"
ON "Nonconformity"
FOR ALL
USING (NOT is_audit_mode_active())
WITH CHECK (NOT is_audit_mode_active());

-- Policy for LabTest: Block INSERT/UPDATE/DELETE during audit
CREATE POLICY "block_labtest_modifications_during_audit"
ON "LabTest"
FOR ALL
USING (NOT is_audit_mode_active())
WITH CHECK (NOT is_audit_mode_active());

-- Allow SELECT operations always (read-only during audit is OK)
CREATE POLICY "allow_read_temperature"
ON "TemperatureEntry"
FOR SELECT
USING (true);

CREATE POLICY "allow_read_health"
ON "HealthCheck"
FOR SELECT
USING (true);

CREATE POLICY "allow_read_health_employee"
ON "HealthCheckEmployee"
FOR SELECT
USING (true);

CREATE POLICY "allow_read_registry"
ON "RegistryDocument"
FOR SELECT
USING (true);

CREATE POLICY "allow_read_document"
ON "Document"
FOR SELECT
USING (true);

CREATE POLICY "allow_read_ccp"
ON "CCP"
FOR SELECT
USING (true);

CREATE POLICY "allow_read_ccp_action"
ON "CCPAction"
FOR SELECT
USING (true);

CREATE POLICY "allow_read_nonconformity"
ON "Nonconformity"
FOR SELECT
USING (true);

CREATE POLICY "allow_read_labtest"
ON "LabTest"
FOR SELECT
USING (true);

-- Create audit log for blocked attempts
CREATE TABLE IF NOT EXISTS "AuditModeViolation" (
  id SERIAL PRIMARY KEY,
  "attemptedOperation" TEXT NOT NULL,
  "tableName" TEXT NOT NULL,
  "userId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "sessionId" INTEGER REFERENCES "AuditSession"(id),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Function to log audit mode violations
CREATE OR REPLACE FUNCTION log_audit_violation()
RETURNS TRIGGER AS $$
DECLARE
  active_session_id INTEGER;
BEGIN
  -- Get active audit session
  SELECT id INTO active_session_id
  FROM "AuditSession"
  WHERE status = 'active'
  ORDER BY "startedAt" DESC
  LIMIT 1;

  -- Log the violation attempt
  INSERT INTO "AuditModeViolation" (
    "attemptedOperation",
    "tableName",
    "sessionId",
    "createdAt"
  ) VALUES (
    TG_OP,
    TG_TABLE_NAME,
    active_session_id,
    NOW()
  );

  -- Raise exception to block the operation
  RAISE EXCEPTION 'Operation blocked: Audit mode is active. All data modifications are frozen during audit.';
END;
$$ LANGUAGE plpgsql;

-- Create triggers to log violations (optional, for extra security)
-- These will fire if RLS policies are somehow bypassed
CREATE TRIGGER audit_violation_temperature
  BEFORE INSERT OR UPDATE OR DELETE ON "TemperatureEntry"
  FOR EACH ROW
  WHEN (is_audit_mode_active())
  EXECUTE FUNCTION log_audit_violation();

CREATE TRIGGER audit_violation_health
  BEFORE INSERT OR UPDATE OR DELETE ON "HealthCheck"
  FOR EACH ROW
  WHEN (is_audit_mode_active())
  EXECUTE FUNCTION log_audit_violation();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_audit_mode_active() TO authenticated;
GRANT SELECT ON "AuditModeViolation" TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION is_audit_mode_active() IS 
  'Checks if an audit session is currently active. Used by RLS policies to block data modifications during audits.';

COMMENT ON TABLE "AuditModeViolation" IS 
  'Logs all attempts to modify data during active audit sessions. Critical for audit trail and security compliance.';
