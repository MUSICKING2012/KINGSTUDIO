/*
  Warnings:

  - Added the required column `canonical_artist` to the `songs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `canonical_title` to the `songs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "songs" ADD COLUMN     "canonical_artist" TEXT NOT NULL,
ADD COLUMN     "canonical_title" TEXT NOT NULL;
