
ALTER TABLE "MaintenanceStaffProfile"
  ADD COLUMN IF NOT EXISTS "granularPermissions" JSONB NOT NULL DEFAULT '{}';
