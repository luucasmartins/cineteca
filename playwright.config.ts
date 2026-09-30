import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Os ajudantes dos testes usam a chave secreta do projeto de testes para criar e apagar contas.
if (existsSync('.env.test.local')) process.loadEnvFile('.env.test.local')

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node e2e/iniciar-servidor.mjs',
    url: 'http://localhost:3100',
    timeout: 300_000,
    reuseExistingServer: false,
  },
})
