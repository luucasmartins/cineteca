import { test as base, expect } from '@playwright/test'
import { apagarUsuarioTeste, criarUsuarioTeste, entrarPelaTela, type UsuarioTeste } from './ajudantes'

// usuario: conta criada antes do teste e apagada depois. logado: a mesma conta, já logada na página.
export const test = base.extend<{ usuario: UsuarioTeste; logado: UsuarioTeste }>({
  usuario: async ({}, usar) => {
    const usuario = await criarUsuarioTeste()
    await usar(usuario)
    await apagarUsuarioTeste(usuario)
  },
  logado: async ({ page, usuario }, usar) => {
    await entrarPelaTela(page, usuario)
    await usar(usuario)
  },
})

export { expect }
