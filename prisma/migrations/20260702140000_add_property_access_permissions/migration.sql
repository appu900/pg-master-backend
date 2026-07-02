-- Add per-property permissions to MaintenanceStaffPropertyAccess
-- This allows SELECTIVE scope staff to have different access per assigned property.
ALTER TABLE "MaintenanceStaffPropertyAccess"
ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '{}';

-- Backfill: copy existing profile-level permissions into each property access record
-- so existing staff retain their access after migration.
UPDATE "MaintenanceStaffPropertyAccess" msa
SET permissions = jsonb_build_object(
  'canAccessRooms',       msp."canAccessRooms",
  'canAccessTenants',     msp."canAccessTenants",
  'canAccessFinance',     msp."canAccessFinance",
  'canAccessComplaints',  msp."canAccessComplaints",
  'granularPermissions',  msp."granularPermissions"
)
FROM "MaintenanceStaffProfile" msp
WHERE msa."staffProfileId" = msp.id;
