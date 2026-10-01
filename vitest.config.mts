import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const raiz = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': raiz,
      'server-only': fileURLToPath(new URL('./test/server-only-vazio.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    // .claude/** guarda worktrees de outras sessões de IA: os testes de lá não são nossos.
    exclude: ['node_modules/**', '.next/**', '.claude/**', 'e2e/**', 'testes-integracao/**'],
  },
})
