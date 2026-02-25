-- CreateEnum
CREATE TYPE "TenancyStatus" AS ENUM ('ACTIVE', 'NOTICE_PERIOD', 'EXITED', 'EVICTED', 'PENDING');

-- AlterTable
ALTER TABLE "Tenancy" ADD COLUMN     "tenancyStatus" "TenancyStatus";

-- AlterTable
ALTER TABLE "TenantCharge" ADD COLUMN     "endDate" DATE,
ADD COLUMN     "startDate" DATE,
ALTER COLUMN "effectiveDate" DROP NOT NULL;
