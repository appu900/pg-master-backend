-- Add granular app-level permission flags to MaintenanceStaffProfile.
-- All default to false so existing staff have no access until explicitly granted by the owner.
ALTER TABLE "MaintenanceStaffProfile"
  ADD COLUMN IF NOT EXISTS "canAccessRooms"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "canAccessTenants"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "canAccessFinance"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "canAccessComplaints" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "canManageStaff"     BOOLEAN NOT NULL DEFAULT false;
