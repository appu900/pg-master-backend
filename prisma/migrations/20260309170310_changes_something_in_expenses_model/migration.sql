/*
  Warnings:

  - You are about to drop the column `paidToUserName` on the `Expenses` table. All the data in the column will be lost.
  - You are about to drop the column `paidbyUserId` on the `Expenses` table. All the data in the column will be lost.
  - Added the required column `RecipientName` to the `Expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payerUserId` to the `Expenses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Expenses" DROP COLUMN "paidToUserName",
DROP COLUMN "paidbyUserId",
ADD COLUMN     "RecipientName" TEXT NOT NULL,
ADD COLUMN     "payerUserId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Expenses_payerUserId_idx" ON "Expenses"("payerUserId");

-- CreateIndex
CREATE INDEX "Expenses_propertyId_idx" ON "Expenses"("propertyId");

-- CreateIndex
CREATE INDEX "Expenses_propertyId_modeOfPayment_idx" ON "Expenses"("propertyId", "modeOfPayment");

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
