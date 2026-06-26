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
    // 통합 테스트 전역 시드 공유 race 임시 회피. 근본 해법 = 각 통합
    // 테스트 데이터 자가 격리(부채). 병렬 복원은 그 후.
    fileParallelism: false,
    // fileParallelism:false 직렬 실행 + bcrypt cost12 무거운 테스트가
    // 5s 기본 timeout에 빠듯 → 상향. B(직렬)의 동반 설정.
    testTimeout: 10000,
    env: { TZ: 'Asia/Seoul' },
  },
});
