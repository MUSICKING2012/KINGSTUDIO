import { SchemaType } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/db/prisma';
import { MUSIC_RECORDING_REQUIRED_FIELDS } from '../lib/seo/song-jsonld';
import { seedSchemaTemplates } from './seed-schema-templates';

// Owns the `schema_templates` table — no other test file touches it, so no cross-worker race
// (handoff note 2). This slice seeds ONLY the MusicRecording row (the 7 MVP templates are a
// separate slice / PRD debt).
beforeEach(async () => {
  await prisma.schemaTemplate.deleteMany();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('seedSchemaTemplates (MusicRecording)', () => {
  it('creates the MusicRecording template row', async () => {
    const r = await seedSchemaTemplates();
    expect(r.action).toBe('created');
    const rows = await prisma.schemaTemplate.findMany({
      where: { type: SchemaType.MusicRecording },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].version).toBe('1.0.0');
  });

  it('requiredFields matches the builder field list (A↔B contract)', async () => {
    await seedSchemaTemplates();
    const row = await prisma.schemaTemplate.findFirstOrThrow({
      where: { type: SchemaType.MusicRecording },
    });
    expect(row.requiredFields).toEqual([...MUSIC_RECORDING_REQUIRED_FIELDS]);
  });

  it('is idempotent: running twice keeps exactly one MusicRecording row', async () => {
    await seedSchemaTemplates();
    const second = await seedSchemaTemplates();
    expect(second.action).toBe('updated');
    expect(await prisma.schemaTemplate.count({ where: { type: SchemaType.MusicRecording } })).toBe(
      1,
    );
  });
});
