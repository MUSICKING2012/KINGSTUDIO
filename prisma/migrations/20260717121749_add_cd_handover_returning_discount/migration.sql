-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "returning_discount_krw" INTEGER;

-- AlterTable
ALTER TABLE "checkins" ADD COLUMN     "cd_handed_over_at" TIMESTAMP(3),
ADD COLUMN     "cd_handed_over_by" TEXT;

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "cd_included" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "returning_discount_eligible" BOOLEAN NOT NULL DEFAULT false;
