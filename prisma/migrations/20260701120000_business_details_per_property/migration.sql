-- AlterTable: scope business details per property instead of per owner profile
ALTER TABLE "BusinessDetails" ADD COLUMN "propertyId" INTEGER;

UPDATE "BusinessDetails" bd
SET "propertyId" = (
  SELECT p.id
  FROM "Property" p
  INNER JOIN "PropertyOwnerProfile" pop ON pop."userId" = p."ownerId"
  WHERE pop.id = bd."propertyOwnerProfileId"
  ORDER BY p.id ASC
  LIMIT 1
);

ALTER TABLE "BusinessDetails" ALTER COLUMN "propertyId" SET NOT NULL;

DROP INDEX IF EXISTS "BusinessDetails_propertyOwnerProfileId_key";

CREATE UNIQUE INDEX "BusinessDetails_propertyId_key" ON "BusinessDetails"("propertyId");

CREATE INDEX "BusinessDetails_propertyId_idx" ON "BusinessDetails"("propertyId");

ALTER TABLE "BusinessDetails"
ADD CONSTRAINT "BusinessDetails_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
