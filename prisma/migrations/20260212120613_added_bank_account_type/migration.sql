-- CreateEnum
CREATE TYPE "AccountDetailsType" AS ENUM ('BANKACCOUNT', 'UPI');

-- AlterTable
ALTER TABLE "BankAccountDetails" ADD COLUMN     "accountType" "AccountDetailsType";
