-- AlterEnum
ALTER TYPE "SchemaType" ADD VALUE 'MusicRecording';

-- AlterTable
ALTER TABLE "song_translations" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "songs" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "songs_slug_key" ON "songs"("slug");
