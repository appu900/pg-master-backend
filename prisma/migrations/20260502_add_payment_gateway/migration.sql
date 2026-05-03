-- CreateEnum
CREATE TYPE "GatewayEnvironment" AS ENUM ('TEST', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "GatewayTransactionStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PropertyPaymentGatewayConfig" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "merchantKey" TEXT NOT NULL,
    "merchantSalt" TEXT NOT NULL,
    "environment" "GatewayEnvironment" NOT NULL DEFAULT 'TEST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyPaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGatewayTransaction" (
    "id" SERIAL NOT NULL,
    "dueId" INTEGER NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "txnId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "GatewayTransactionStatus" NOT NULL DEFAULT 'INITIATED',
    "accessKey" TEXT,
    "easepayId" TEXT,
    "paymentSource" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyPaymentGatewayConfig_propertyId_key" ON "PropertyPaymentGatewayConfig"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyPaymentGatewayConfig_propertyId_idx" ON "PropertyPaymentGatewayConfig"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayTransaction_txnId_key" ON "PaymentGatewayTransaction"("txnId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_dueId_idx" ON "PaymentGatewayTransaction"("dueId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_tenancyId_idx" ON "PaymentGatewayTransaction"("tenancyId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_propertyId_idx" ON "PaymentGatewayTransaction"("propertyId");

-- CreateIndex
CREATE INDEX "PaymentGatewayTransaction_status_idx" ON "PaymentGatewayTransaction"("status");

-- AddForeignKey
ALTER TABLE "PropertyPaymentGatewayConfig" ADD CONSTRAINT "PropertyPaymentGatewayConfig_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGatewayTransaction" ADD CONSTRAINT "PaymentGatewayTransaction_dueId_fkey" FOREIGN KEY ("dueId") REFERENCES "TenantDue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGatewayTransaction" ADD CONSTRAINT "PaymentGatewayTransaction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
