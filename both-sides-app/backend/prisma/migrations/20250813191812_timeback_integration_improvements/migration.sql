/*
  Warnings:

  - The `timeback_sync_status` column on the `classes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `timeback_sync_status` column on the `organizations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `timeback_sync_status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."TimeBackSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'ERROR');

-- AlterTable
ALTER TABLE "public"."classes" ADD COLUMN     "timeback_sync_version" INTEGER DEFAULT 1,
DROP COLUMN "timeback_sync_status",
ADD COLUMN     "timeback_sync_status" "public"."TimeBackSyncStatus" DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "timeback_sync_version" INTEGER DEFAULT 1,
DROP COLUMN "timeback_sync_status",
ADD COLUMN     "timeback_sync_status" "public"."TimeBackSyncStatus" DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "timeback_sync_version" INTEGER DEFAULT 1,
DROP COLUMN "timeback_sync_status",
ADD COLUMN     "timeback_sync_status" "public"."TimeBackSyncStatus" DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "classes_timeback_class_id_idx" ON "public"."classes"("timeback_class_id");

-- CreateIndex
CREATE INDEX "organizations_timeback_org_id_idx" ON "public"."organizations"("timeback_org_id");

-- CreateIndex
CREATE INDEX "users_timeback_user_id_idx" ON "public"."users"("timeback_user_id");
