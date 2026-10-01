import { clienteAdmin, criarUsuarioTeste, apagarUsuarioTeste, type UsuarioTeste } from './conta/ajudantes'
import { expect, test } from './conta/fixtures'

// O ranking soma os votos de todo mundo no mesmo banco de testes. Um filme só deste arquivo, fora do
// TMDB simulado, e os testes que gravam rodam em série e só no desktop: votos de outro teste em
// paralelo mudariam a porcentagem.
const FILME = 990001
const TITULO = 'Filme Teste Ranking'

async function votarNoBanco(usuarios: UsuarioTeste[], curtidas: number) {
  await clienteAdmin().from('filmes_avaliados').upsert({
    filme_id: FILME,
    titulo: TITULO,
    poster_url: null,
    ano: '2024',
  })
  const linhas = usuarios.map((u, i) => ({ usuario_id: u.id, filme_id: FILME, curtiu: i < curtidas }))
  const { error } = await clienteAdmin().from('avaliacoes').insert(linhas)
  if (error) throw error
}

test.describe('ranking com votos no banco', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(({ isMobile }) => isMobile, 'grava votos globais; roda uma vez só')

  test('sem filmes qualificados, a página convida a avaliar', async ({ page }) => {
    await page.goto('/mais-curtidos')
    await expect(page.getByRole('heading', { level: 1, name: 'Mais curtidos na CineTeca' })).toBeVisible()
    await expect(page.getByText('Ainda não há filmes avaliados o suficiente.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Explorar filmes' })).toBeVisible()
  })

  test('com 3 votos o filme entra no ranking, com posição e porcentagem', async ({ page }) => {
    const usuarios = [await criarUsuarioTeste(), await criarUsuarioTeste(), await criarUsuarioTeste()]
    try {
      await votarNoBanco(usuarios, 2)
      await page.goto('/mais-curtidos')
      const linha = page.getByRole('listitem').filter({ hasText: TITULO })
      await expect(linha).toBeVisible()
      await expect(linha.getByText('67% curtiram')).toBeVisible()
      await expect(linha.getByText('3 votos')).toBeVisible()
      await expect(page.getByText('Ainda não há filmes avaliados o suficiente.')).toHaveCount(0)
    } finally {
      for (const u of usuarios) await apagarUsuarioTeste(u)
    }
  })

  test('visitante sem conta vê o ranking', async ({ page }) => {
    const usuarios = [await criarUsuarioTeste(), await criarUsuarioTeste(), await criarUsuarioTeste()]
    try {
      await votarNoBanco(usuarios, 3)
      await page.goto('/mais-curtidos')
      await expect(page.getByText(TITULO)).toBeVisible()
      await expect(page.getByText('100% curtiram')).toBeVisible()
    } finally {
      for (const u of usuarios) await apagarUsuarioTeste(u)
    }
  })

  test('a home não mostra a fileira quando há poucos filmes qualificados', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('region', { name: 'Mais curtidos na CineTeca' })).toHaveCount(0)
  })

  test('a home mostra a fileira com 3 filmes qualificados', async ({ page }) => {
    const usuarios = [await criarUsuarioTeste(), await criarUsuarioTeste(), await criarUsuarioTeste()]
    const filmes = [FILME, FILME + 1, FILME + 2]
    try {
      for (const filmeId of filmes) {
        await clienteAdmin()
          .from('filmes_avaliados')
          .upsert({ filme_id: filmeId, titulo: `${TITULO} ${filmeId}`, poster_url: null, ano: '2024' })
        const { error } = await clienteAdmin()
          .from('avaliacoes')
          .insert(usuarios.map((u) => ({ usuario_id: u.id, filme_id: filmeId, curtiu: true })))
        if (error) throw error
      }
      await page.goto('/')
      const fileira = page.getByRole('region', { name: 'Mais curtidos na CineTeca' })
      await expect(fileira).toBeVisible()
      await expect(fileira.getByRole('link', { name: /Ver tudo/ })).toHaveAttribute('href', '/mais-curtidos')
    } finally {
      for (const u of usuarios) await apagarUsuarioTeste(u)
    }
  })
})

test('o menu leva para a página de ranking', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Mais curtidos', exact: true })
    .click()
  await expect(page).toHaveURL(/\/mais-curtidos$/)
})
