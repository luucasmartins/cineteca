import { AREAS, CATEGORIAS, PREMIOS } from './catalogo'
import type { LinhaPremio, PremioFilme } from './tipos'

const ORDEM_AREA = new Map<string, number>(AREAS.map((area, i) => [area, i]))

type Grupo = { area: number; nome: string; venceu: boolean; pessoas: Set<string> }

export function montarPremios(linhas: LinhaPremio[]): PremioFilme[] {
  const grupos = new Map<string, Map<string, Grupo>>()
  for (const linha of linhas) {
    const cat = CATEGORIAS[linha.categoria]
    if (!cat) continue
    const doPremio = grupos.get(cat.premio) ?? new Map<string, Grupo>()
    grupos.set(cat.premio, doPremio)
    // Agrupa pelo nome: o Wikidata separa categorias antigas ("Fotografia, Cor") que exibimos como uma só.
    const grupo = doPremio.get(cat.nome) ?? { area: ORDEM_AREA.get(cat.area) ?? 0, nome: cat.nome, venceu: false, pessoas: new Set<string>() }
    doPremio.set(cat.nome, grupo)
    // Quem venceu também aparece como indicado; a vitória prevalece e só ela traz os nomes.
    if (linha.venceu) {
      grupo.venceu = true
      const pessoa = limparPessoa(linha.pessoa)
      if (pessoa) grupo.pessoas.add(pessoa)
    }
  }

  return PREMIOS.flatMap(({ chave, nome }) => {
    const doPremio = grupos.get(chave)
    if (!doPremio) return []
    const ordenados = [...doPremio.values()].sort((a, b) => a.area - b.area || a.nome.localeCompare(b.nome, 'pt-BR'))
    return [
      {
        chave,
        nome,
        vitorias: ordenados.filter((g) => g.venceu).map((g) => ({ categoria: g.nome, quem: textoPessoas([...g.pessoas]) })),
        indicacoes: ordenados.filter((g) => !g.venceu).map((g) => g.nome),
      },
    ]
  })
}

function limparPessoa(pessoa: string | null): string | null {
  if (!pessoa) return null
  // Sem rótulo, o serviço do Wikidata devolve o próprio Q-id.
  if (/^Q\d+$/.test(pessoa)) return null
  // Tira a desambiguação: "Paul Lambert (efeitos visuais)".
  return pessoa.replace(/\s*\([^)]*\)$/, '').trim() || null
}

export function textoPessoas(pessoas: string[]): string | null {
  const nomes = [...pessoas].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  if (nomes.length === 0) return null
  if (nomes.length === 1) return nomes[0]
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`
  return `${nomes[0]} e outros ${nomes.length - 1}`
}

export function resumoContagem(p: PremioFilme): string {
  const partes: string[] = []
  const v = p.vitorias.length
  const i = p.indicacoes.length
  if (v > 0) partes.push(`${v} ${v === 1 ? 'vitória' : 'vitórias'}`)
  if (i > 0) partes.push(`${i} ${i === 1 ? 'indicação' : 'indicações'}`)
  return partes.join(' · ')
}
