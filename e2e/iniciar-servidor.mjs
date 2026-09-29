// Sobe o TMDB simulado, compila o site e o inicia apontando para o simulador.
import { spawn, spawnSync } from 'node:child_process'
import { iniciarMockTmdb, TOKEN_E2E } from './mock-tmdb/servidor.mjs'

const PORTA_MOCK = 4010
const PORTA_APP = 3100

await iniciarMockTmdb(PORTA_MOCK)

const env = {
  ...process.env,
  TMDB_API_BASE: `http://localhost:${PORTA_MOCK}/3`,
  TMDB_READ_TOKEN: TOKEN_E2E,
}

const build = spawnSync('npx', ['next', 'build'], { stdio: 'inherit', env, shell: true })
if (build.status !== 0) process.exit(build.status ?? 1)

const app = spawn('npx', ['next', 'start', '-p', String(PORTA_APP)], { stdio: 'inherit', env, shell: true })
app.on('exit', (codigo) => process.exit(codigo ?? 0))
