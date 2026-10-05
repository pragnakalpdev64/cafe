-- AlterEnum
ALTER TYPE "SelectionStatus" ADD VALUE 'CONFIRMED';

-- AlterTable
ALTER TABLE "Selection" ADD COLUMN     "orderId" TEXT;

