-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SETTLED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "TenantKyc" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "verificationId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL,
    "aadharNumber" TEXT,
    "panNumber" TEXT,
    "aadharData" JSONB,
    "aadharImageUrl" TEXT,
    "panImageUrl" TEXT,
    "pandata" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantKyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertySettlementLedger" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "pendingSettelmentAmount" DECIMAL(10,2) NOT NULL,
    "totalSetteledAmount" DECIMAL(10,2) NOT NULL,
    "totalTax" DECIMAL(14,2),
    "totalCharges" DECIMAL(14,2),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertySettlementLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementTransactions" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "paymentTransactionId" INTEGER NOT NULL,
    "transactionId" TEXT NOT NULL,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "settledAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "expectedSettlementDate" TIMESTAMP(3),
    "settlementCompleteDate" TIMESTAMP(3),
    "serviceCharge" DECIMAL(10,2),
    "serviceTax" DECIMAL(10,2),
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantKyc_tenantId_key" ON "TenantKyc"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantKyc_verificationId_key" ON "TenantKyc"("verificationId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantKyc_status_key" ON "TenantKyc"("status");

-- CreateIndex
CREATE INDEX "TenantKyc_tenantId_idx" ON "TenantKyc"("tenantId");

-- CreateIndex
CREATE INDEX "TenantKyc_tenantId_status_idx" ON "TenantKyc"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PropertySettlementLedger_propertyId_key" ON "PropertySettlementLedger"("propertyId");

-- CreateIndex
CREATE INDEX "PropertySettlementLedger_propertyId_idx" ON "PropertySettlementLedger"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementTransactions_paymentTransactionId_key" ON "SettlementTransactions"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementTransactions_transactionId_key" ON "SettlementTransactions"("transactionId");

-- CreateIndex
CREATE INDEX "SettlementTransactions_propertyId_status_idx" ON "SettlementTransactions"("propertyId", "status");

-- CreateIndex
CREATE INDEX "SettlementTransactions_transactionId_status_idx" ON "SettlementTransactions"("transactionId", "status");

-- CreateIndex
CREATE INDEX "SettlementTransactions_transactionId_idx" ON "SettlementTransactions"("transactionId");

-- AddForeignKey
ALTER TABLE "TenantKyc" ADD CONSTRAINT "TenantKyc_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementTransactions" ADD CONSTRAINT "SettlementTransactions_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentGatewayTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
