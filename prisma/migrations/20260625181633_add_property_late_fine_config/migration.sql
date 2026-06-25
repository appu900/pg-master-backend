-- CreateTable
CREATE TABLE "PropertyLateFineConfig" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fineType" "LateFeeType" NOT NULL DEFAULT 'FIXED',
    "fineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gracePeriod" INTEGER NOT NULL DEFAULT 0,
    "maxFineAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyLateFineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyLateFineConfig_propertyId_key" ON "PropertyLateFineConfig"("propertyId");

-- AddForeignKey
ALTER TABLE "PropertyLateFineConfig" ADD CONSTRAINT "PropertyLateFineConfig_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
