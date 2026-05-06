-- CreateTable
CREATE TABLE "NoticePeriodTenants" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "MoveoutDate" INTEGER NOT NULL,
    "noticePeriodLastDate" INTEGER NOT NULL,

    CONSTRAINT "NoticePeriodTenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoticePeriodTenants_propertyId_idx" ON "NoticePeriodTenants"("propertyId");

-- AddForeignKey
ALTER TABLE "NoticePeriodTenants" ADD CONSTRAINT "NoticePeriodTenants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticePeriodTenants" ADD CONSTRAINT "NoticePeriodTenants_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticePeriodTenants" ADD CONSTRAINT "NoticePeriodTenants_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
