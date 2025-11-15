/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_externalId_key" ON "Invoice"("externalId");

-- CreateIndex
CREATE INDEX "Invoice_externalId_idx" ON "Invoice"("externalId");
