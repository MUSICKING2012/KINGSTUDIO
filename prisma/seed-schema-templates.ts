import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { type Prisma, SchemaType } from '@prisma/client';
import { prisma } from '../lib/db/prisma';
import { MUSIC_RECORDING_REQUIRED_FIELDS } from '../lib/seo/song-jsonld';

// SchemaTemplate seed (PRD §6.3 decision 3): JSON-LD templates are code-managed via this idempotent
// seed, NOT an admin screen. This slice (2b-2b-3) creates ONLY the MusicRecording row (8th type);
// the existing 7 MVP templates are a separate slice (PRD debt).
//
// Option 2 (approved): the row is a REGISTRY / METADATA entry — the route does NOT read it at render
// time (JSON-LD is built in code, lib/seo/song-jsonld.ts). The A↔B link is the `type` contract +
// `requiredFields` (sourced from the builder, asserted by tests). `jsonTemplate` is a required column
// but is NOT consumed at render — it holds a reference note only, deliberately NOT the real output
// shape, to avoid a second source of truth.

const MUSIC_RECORDING_TEMPLATE = {
  type: SchemaType.MusicRecording,
  name: 'Song detail — MusicRecording',
  version: '1.0.0',
  // Single source of truth = the builder's exported field list (A↔B consistency).
  requiredFields: [...MUSIC_RECORDING_REQUIRED_FIELDS] as Prisma.InputJsonValue,
  jsonTemplate: {
    _note:
      'Not consumed at render. JSON-LD is built in code (lib/seo/song-jsonld.ts); this row is a registry/metadata entry only.',
  } as Prisma.InputJsonValue,
};

// Idempotent: SchemaTemplate has no natural unique key (only id), so match on `type` then
// create-or-update (no schema change). Re-running never inserts a duplicate MusicRecording row.
export async function seedSchemaTemplates(): Promise<{
  action: 'created' | 'updated';
  id: string;
}> {
  const existing = await prisma.schemaTemplate.findFirst({
    where: { type: SchemaType.MusicRecording },
  });
  if (existing) {
    await prisma.schemaTemplate.update({
      where: { id: existing.id },
      data: MUSIC_RECORDING_TEMPLATE,
    });
    return { action: 'updated', id: existing.id };
  }
  const created = await prisma.schemaTemplate.create({ data: MUSIC_RECORDING_TEMPLATE });
  return { action: 'created', id: created.id };
}

// Run only when executed directly (`tsx prisma/seed-schema-templates.ts`), not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedSchemaTemplates()
    .then((r) => console.log(`SchemaTemplate MusicRecording ${r.action} (id=${r.id}).`))
    .finally(() => prisma.$disconnect());
}
