import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  // tsconfig uses jsx:'preserve' (Next transpiles JSX); Vitest's esbuild needs the automatic runtime
  // so .tsx (e.g. RSC route components) transpile without an explicit React import, matching Next.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    // Loads root .env (DATABASE_URL etc.) into each worker — see vitest.setup.ts.
    setupFiles: ['./vitest.setup.ts'],
  },
});
