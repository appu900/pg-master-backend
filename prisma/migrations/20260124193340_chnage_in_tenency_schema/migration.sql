-- AlterTable
ALTER TABLE "Tenancy" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE';
