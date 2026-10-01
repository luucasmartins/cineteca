import type { DiretorRegistro, RegistroAssistido } from './tipos'

export type Topo = { sessoes: number; filmes: number; esteAno: number }
export type CelulaMapa = { contagem: number; nivel: number }
export type LinhaMapa = { ano: number; meses: CelulaMapa[] }
export type Decada = { decada: string; contagem: number; campea: boolean }
export type DiretorFavorito = { id: number; nome: string; fotoUrl: string | null; filmes: number; titulos: string[] }

export type Numeros = {
  topo: Topo
  mapa: LinhaMapa[]
  decadas: Decada[]
  diretores: DiretorFavorito[]
}

export function calcularNumeros(registros: RegistroAssistido[], hoje: string): Numeros {
  if (registros.length === 0) {
    return { topo: { sessoes: 0, filmes: 0, esteAno: 0 }, mapa: [], decadas: [], diretores: [] }
  }

  const anoAtual = Number(hoje.slice(0, 4))
  const filmesDistintos = new Set(registros.map((r) => r.filmeId))

  const topo: Topo = {
    sessoes: registros.length,
    filmes: filmesDistintos.size,
    esteAno: registros.filter((r) => r.assistidoEm.startsWith(String(anoAtual))).length,
  }

  // Mapa de calor
  const contagemPorMes = new Map<string, number>()
  let anoMinimo = anoAtual
  for (const r of registros) {
    const chave = r.assistidoEm.slice(0, 7)
    contagemPorMes.set(chave, (contagemPorMes.get(chave) ?? 0) + 1)
    const anoReg = Number(r.assistidoEm.slice(0, 4))
    if (anoReg < anoMinimo) anoMinimo = anoReg
  }

  let maiorMes = 0
  for (const c of contagemPorMes.values()) if (c > maiorMes) maiorMes = c

  const mapa: LinhaMapa[] = []
  for (let ano = anoAtual; ano >= anoMinimo; ano--) {
    const meses: CelulaMapa[] = Array.from({ length: 12 }, (_, m) => {
      const chave = `${ano}-${String(m + 1).padStart(2, '0')}`
      const contagem = contagemPorMes.get(chave) ?? 0
      const nivel = maiorMes === 0 ? 0 : Math.min(4, Math.max(contagem > 0 ? 1 : 0, Math.round((contagem / maiorMes) * 4)))
      return { contagem, nivel }
    })
    mapa.push({ ano, meses })
  }

  // Décadas (filmes distintos)
  const filmePorDecada = new Map<string, Set<number>>()
  const filmeJaContadoDecada = new Set<number>()
  for (const r of registros) {
    if (!r.ano || filmeJaContadoDecada.has(r.filmeId)) continue
    filmeJaContadoDecada.add(r.filmeId)
    const anoFilme = Number(r.ano)
    if (isNaN(anoFilme)) continue
    const decada = String(Math.floor(anoFilme / 10) * 10)
    const conjunto = filmePorDecada.get(decada) ?? new Set()
    conjunto.add(r.filmeId)
    filmePorDecada.set(decada, conjunto)
  }

  const decadasOrdenadas = [...filmePorDecada.keys()].sort()
  if (decadasOrdenadas.length > 0) {
    const primeira = Number(decadasOrdenadas[0])
    const ultima = Number(decadasOrdenadas[decadasOrdenadas.length - 1])
    for (let d = primeira; d <= ultima; d += 10) {
      const chave = String(d)
      if (!filmePorDecada.has(chave)) filmePorDecada.set(chave, new Set())
    }
  }

  const decadasFinal = [...filmePorDecada.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([decada, filmes]) => ({ decada, contagem: filmes.size, campea: false }))

  if (decadasFinal.length > 0) {
    let maxContagem = 0
    let idxCampea = -1
    for (let i = 0; i < decadasFinal.length; i++) {
      if (decadasFinal[i].contagem > maxContagem || (decadasFinal[i].contagem === maxContagem && decadasFinal[i].contagem > 0)) {
        maxContagem = decadasFinal[i].contagem
        idxCampea = i
      }
    }
    if (idxCampea >= 0) decadasFinal[idxCampea].campea = true
  }

  // Diretores (filmes distintos, top 5, desempate por mais recente)
  const diretorInfo = new Map<number, { nome: string; fotoUrl: string | null; filmes: Set<number>; titulos: string[]; ultimaData: string }>()
  const filmeJaContadoDiretor = new Map<number, Set<number>>()

  for (const r of registros) {
    for (const d of r.diretores) {
      const jaContou = filmeJaContadoDiretor.get(r.filmeId)
      if (jaContou?.has(d.id)) continue

      if (!filmeJaContadoDiretor.has(r.filmeId)) filmeJaContadoDiretor.set(r.filmeId, new Set())
      filmeJaContadoDiretor.get(r.filmeId)!.add(d.id)

      const info = diretorInfo.get(d.id) ?? { nome: d.nome, fotoUrl: d.fotoUrl, filmes: new Set(), titulos: [], ultimaData: '' }
      if (!info.filmes.has(r.filmeId)) {
        info.filmes.add(r.filmeId)
        info.titulos.push(r.titulo)
      }
      if (r.assistidoEm > info.ultimaData) info.ultimaData = r.assistidoEm
      diretorInfo.set(d.id, info)
    }
  }

  const diretores: DiretorFavorito[] = [...diretorInfo.entries()]
    .map(([id, info]) => ({ id, nome: info.nome, fotoUrl: info.fotoUrl, filmes: info.filmes.size, titulos: info.titulos, ultimaData: info.ultimaData }))
    .sort((a, b) => b.filmes - a.filmes || (b.ultimaData > a.ultimaData ? 1 : -1))
    .slice(0, 5)
    .map(({ ultimaData: _, ...rest }) => rest)

  return { topo, mapa, decadas: decadasFinal, diretores }
}
