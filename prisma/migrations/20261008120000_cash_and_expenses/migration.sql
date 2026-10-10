-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('VEGETABLES_FRUITS', 'GROCERY', 'DAIRY', 'PACKAGING', 'GAS', 'ELECTRICITY_WATER', 'RENT', 'SALARIES', 'REPAIRS', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpensePayment" AS ENUM ('CASH', 'UPI', 'CARD', 'BANK');

-- CreateEnum
CREATE TYPE "CashOpening" AS ENUM ('ENTERED', 'CARRIED');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountPaise" INTEGER NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "paidWith" "ExpensePayment" NOT NULL,
    "paidTo" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDay" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "openingPaise" INTEGER NOT NULL,
    "openingSource" "CashOpening" NOT NULL,
    "openedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "cashSalesPaise" INTEGER,
    "cashExpensesPaise" INTEGER,
    "expectedPaise" INTEGER,
    "countedPaise" INTEGER,
    "closeNote" TEXT,
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_paidAt_idx" ON "Expense"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashDay_day_key" ON "CashDay"("day");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDay" ADD CONSTRAINT "CashDay_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDay" ADD CONSTRAINT "CashDay_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

