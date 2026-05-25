-- DropForeignKey
ALTER TABLE "PaymentGatewayTransaction" DROP CONSTRAINT "PaymentGatewayTransaction_dueId_fkey";

-- AlterTable
ALTER TABLE "PaymentGatewayTransaction" ALTER COLUMN "dueId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PaymentGatewayTransactionDue" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "dueId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PaymentGatewayTransactionDue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentGatewayTransactionDue_transactionId_idx" ON "PaymentGatewayTransactionDue"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransactionDue_dueId_idx" ON "PaymentGatewayTransactionDue"("dueId");

-- AddForeignKey
ALTER TABLE "PaymentGatewayTransaction" ADD CONSTRAINT "PaymentGatewayTransaction_dueId_fkey" FOREIGN KEY ("dueId") REFERENCES "TenantDue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGatewayTransactionDue" ADD CONSTRAINT "PaymentGatewayTransactionDue_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PaymentGatewayTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGatewayTransactionDue" ADD CONSTRAINT "PaymentGatewayTransactionDue_dueId_fkey" FOREIGN KEY ("dueId") REFERENCES "TenantDue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
