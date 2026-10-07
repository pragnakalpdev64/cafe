-- Tables and per-table QR codes were removed (one café QR, guests order themselves – 7 Oct 2026).
-- Old orders/bills lose only their table link; amounts and items stay.

-- AlterEnum
BEGIN;
CREATE TYPE "SelectionStatus_new" AS ENUM ('SELECTING', 'CONFIRMED');
ALTER TABLE "public"."Selection" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Selection" ALTER COLUMN "status" TYPE "SelectionStatus_new" USING ("status"::text::"SelectionStatus_new");
ALTER TYPE "SelectionStatus" RENAME TO "SelectionStatus_old";
ALTER TYPE "SelectionStatus_new" RENAME TO "SelectionStatus";
DROP TYPE "public"."SelectionStatus_old";
ALTER TABLE "Selection" ALTER COLUMN "status" SET DEFAULT 'SELECTING';
COMMIT;

-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_tableId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_tableId_fkey";

-- DropForeignKey
ALTER TABLE "Selection" DROP CONSTRAINT "Selection_tableId_fkey";

-- DropIndex
DROP INDEX "Order_tableId_status_idx";

-- DropIndex
DROP INDEX "Selection_tableId_idx";

-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "tableId";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "tableId";

-- AlterTable
ALTER TABLE "Selection" DROP COLUMN "readyAt",
DROP COLUMN "tableId";

-- DropTable
DROP TABLE "CafeTable";

