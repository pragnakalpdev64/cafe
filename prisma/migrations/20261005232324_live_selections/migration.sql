-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('SELECTING', 'READY');

-- CreateTable
CREATE TABLE "Selection" (
    "id" TEXT NOT NULL,
    "tableId" TEXT,
    "takeaway" BOOLEAN NOT NULL DEFAULT false,
    "code" INTEGER NOT NULL,
    "status" "SelectionStatus" NOT NULL DEFAULT 'SELECTING',
    "readyAt" TIMESTAMP(3),
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Selection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Selection_updatedAt_idx" ON "Selection"("updatedAt");

-- CreateIndex
CREATE INDEX "Selection_tableId_idx" ON "Selection"("tableId");

-- AddForeignKey
ALTER TABLE "Selection" ADD CONSTRAINT "Selection_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "CafeTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

