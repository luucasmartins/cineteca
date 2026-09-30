import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Testes de integração rodam contra o projeto Supabase de testes (nunca o de produção).
if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local')

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
    include: ['testes-integracao/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
