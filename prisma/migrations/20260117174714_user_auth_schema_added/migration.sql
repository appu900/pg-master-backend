-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PROPERTY_OWNER', 'TENANT', 'MAINTENANCE_STAFF');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "pinCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlockedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOwnerProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "Gender" TEXT,
    "Profession" TEXT,
    "pinCode" TEXT NOT NULL,
    "State" TEXT,
    "BusinessName" TEXT,
    "BusinessType" TEXT,
    "profileImage" TEXT,

    CONSTRAINT "PropertyOwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccountDetails" (
    "id" SERIAL NOT NULL,
    "propertyOwnerProfileId" INTEGER NOT NULL,

    CONSTRAINT "BankAccountDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyOwnerProfile_userId_key" ON "PropertyOwnerProfile"("userId");

-- AddForeignKey
ALTER TABLE "PropertyOwnerProfile" ADD CONSTRAINT "PropertyOwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccountDetails" ADD CONSTRAINT "BankAccountDetails_propertyOwnerProfileId_fkey" FOREIGN KEY ("propertyOwnerProfileId") REFERENCES "PropertyOwnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
