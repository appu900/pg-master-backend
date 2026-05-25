/*
  Warnings:

  - A unique constraint covering the columns `[propertyId]` on the table `PropertyOtherMetrics` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PropertyOtherMetrics_propertyId_key" ON "PropertyOtherMetrics"("propertyId");
