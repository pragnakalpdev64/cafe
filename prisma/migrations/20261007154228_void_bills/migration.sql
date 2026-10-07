-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT,
ADD COLUMN     "voidedOrderNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
