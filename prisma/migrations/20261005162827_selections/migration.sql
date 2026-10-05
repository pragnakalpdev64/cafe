-- CreateTable
CREATE TABLE "Selection" (
    "id" TEXT NOT NULL,
    "tableId" TEXT,
    "phone" TEXT,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Selection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Selection_updatedAt_idx" ON "Selection"("updatedAt");

-- AddForeignKey
ALTER TABLE "Selection" ADD CONSTRAINT "Selection_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "CafeTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
