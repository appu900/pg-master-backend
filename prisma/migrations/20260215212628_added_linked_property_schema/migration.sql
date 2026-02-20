-- AlterEnum
ALTER TYPE "AccountDetailsType" ADD VALUE 'BOTH';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "bankAccountId" INTEGER;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccountDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;
