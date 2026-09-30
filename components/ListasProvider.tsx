'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { lerAcaoPendente, limparAcaoPendente, obterArmazenamentoDaSessao } from '@/lib/lista/acao-pendente'
import { importarListasDoNavegador } from '@/lib/lista/importacao'
import { obterArmazenamentoSeguro } from '@/lib/lista/local'
import { criarListaSupabase, ErroLista } from '@/lib/lista/supabase'
import type { FilmeSalvo, ListaStore, Listas, TipoLista } from '@/lib/lista/tipos'
import { obterClienteNavegador } from '@/lib/supabase/navegador'
import { useAvisos } from './AvisosProvider'
import { JanelaLogin } from './JanelaLogin'
import { useUsuario } from './SessaoProvider'

type ValorListas = {
  carregado: boolean
  logado: boolean
  erroAoCarregar: boolean
  listas: Listas
  contem(tipo: TipoLista, id: number): boolean
  alternar(tipo: TipoLista, filme: FilmeSalvo): void
  tentarDeNovo(): void
}

const TEXTOS: Record<TipoLista, { adicionado: string; removido: string }> = {
  favoritos: { adicionado: 'adicionado aos favoritos', removido: 'removido dos favoritos' },
  salvos: { adicionado: 'adicionado aos salvos', removido: 'removido dos salvos' },
}
const ERRO_AO_SALVAR = 'Não foi possível salvar. Tente de novo.'
const vazias = (): Listas => ({ favoritos: [], salvos: [] })

const textoImportacao = (n: number) =>
  `Trouxemos ${n} ${n === 1 ? 'filme' : 'filmes'} que você tinha salvo neste navegador`

const ContextoListas = createContext<ValorListas | null>(null)

export function ListasProvider({ children }: { children: ReactNode }) {
  const usuario = useUsuario()
  const { mostrar } = useAvisos()
  const usuarioId = usuario?.id ?? null

  const lojaRef = useRef<ListaStore | null>(null)
  const emAndamento = useRef(new Set<string>())
  // Cresce a cada mudança feita pela pessoa; serve para descartar leituras já vencidas.
  const versaoRef = useRef(0)
  const [listas, setListas] = useState<Listas>(vazias)
  const listasRef = useRef<Listas>(listas)
  const [carregado, setCarregado] = useState(false)
  const [erroAoCarregar, setErroAoCarregar] = useState(false)
  const [janela, setJanela] = useState<{ tipo: TipoLista; filme: FilmeSalvo } | null>(null)

  useEffect(() => {
    listasRef.current = listas
  }, [listas])

  const recarregar = useCallback(async (loja: ListaStore) => {
    const versaoAoIniciar = versaoRef.current
    try {
      const [favoritos, salvos] = await Promise.all([loja.listar('favoritos'), loja.listar('salvos')])
      // Se a pessoa mexeu na lista enquanto a leitura corria, o que está na tela é mais novo.
      if (versaoRef.current === versaoAoIniciar) setListas({ favoritos, salvos })
      setErroAoCarregar(false)
    } catch (erro) {
      // Nunca deixe uma leitura que falhou parecer uma lista vazia: a tela avisa e oferece tentar de novo.
      setErroAoCarregar(true)
      console.error('[CineTeca] Falha ao carregar as listas:', (erro as Error).message)
    } finally {
      setCarregado(true)
    }
  }, [])

  // Atualiza a tela na hora, grava no banco e desfaz se der errado.
  const aplicar = useCallback(
    async (tipo: TipoLista, filme: FilmeSalvo, adicionar: boolean) => {
      const loja = lojaRef.current
      if (!loja) return
      const chave = `${tipo}:${filme.id}`
      if (emAndamento.current.has(chave)) return
      emAndamento.current.add(chave)

      const colocar = (dentro: boolean) => {
        versaoRef.current += 1
        setListas((atuais) => ({
          ...atuais,
          [tipo]: dentro
            ? [filme, ...atuais[tipo].filter((f) => f.id !== filme.id)]
            : atuais[tipo].filter((f) => f.id !== filme.id),
        }))
      }

      colocar(adicionar)
      try {
        if (adicionar) await loja.adicionar(tipo, filme)
        else await loja.remover(tipo, filme.id)
        mostrar(`"${filme.title}" ${adicionar ? TEXTOS[tipo].adicionado : TEXTOS[tipo].removido}`)
      } catch (erro) {
        colocar(!adicionar)
        if (erro instanceof ErroLista && erro.sessaoExpirada) setJanela({ tipo, filme })
        else mostrar(ERRO_AO_SALVAR)
        console.error('[CineTeca] Falha ao gravar na lista:', (erro as Error).message)
      } finally {
        emAndamento.current.delete(chave)
      }
    },
    [mostrar],
  )

  useEffect(() => {
    if (!usuarioId) {
      lojaRef.current = null
      setListas(vazias())
      setCarregado(true)
      return
    }

    let cancelado = false
    setCarregado(false)
    const loja = criarListaSupabase(obterClienteNavegador(), usuarioId)
    lojaRef.current = loja

    void (async () => {
      await recarregar(loja)
      if (cancelado) return
      // Listas que a Fase 1 guardava no navegador.
      try {
        const trazidos = await importarListasDoNavegador(obterArmazenamentoSeguro(), loja)
        if (trazidos > 0 && !cancelado) {
          await recarregar(loja)
          mostrar(textoImportacao(trazidos))
        }
      } catch (erro) {
        console.error('[CineTeca] Falha ao importar as listas do navegador:', (erro as Error).message)
      }
      if (cancelado) return
      // Filme que a pessoa tentou salvar antes de entrar.
      const armazenamento = obterArmazenamentoDaSessao()
      const acao = lerAcaoPendente(armazenamento)
      if (!acao) return
      limparAcaoPendente(armazenamento)
      const jaEsta = await loja.contem(acao.tipo, acao.filme.id).catch(() => false)
      if (!jaEsta && !cancelado) await aplicar(acao.tipo, acao.filme, true)
    })()

    return () => {
      cancelado = true
    }
  }, [usuarioId, recarregar, aplicar, mostrar])

  const contem = useCallback((tipo: TipoLista, id: number) => listas[tipo].some((f) => f.id === id), [listas])

  const alternar = useCallback(
    (tipo: TipoLista, filme: FilmeSalvo) => {
      if (!usuarioId) {
        setJanela({ tipo, filme })
        return
      }
      const jaEsta = listasRef.current[tipo].some((f) => f.id === filme.id)
      void aplicar(tipo, filme, !jaEsta)
    },
    [usuarioId, aplicar],
  )

  const fecharJanela = useCallback(() => setJanela(null), [])

  const tentarDeNovo = useCallback(() => {
    const loja = lojaRef.current
    if (loja) void recarregar(loja)
  }, [recarregar])

  const valor = useMemo(
    () => ({ carregado, logado: usuarioId !== null, erroAoCarregar, listas, contem, alternar, tentarDeNovo }),
    [carregado, usuarioId, erroAoCarregar, listas, contem, alternar, tentarDeNovo],
  )

  return (
    <ContextoListas.Provider value={valor}>
      {children}
      {janela && <JanelaLogin pendente={janela} aoFechar={fecharJanela} />}
    </ContextoListas.Provider>
  )
}

export function useListas(): ValorListas {
  const valor = useContext(ContextoListas)
  if (!valor) throw new Error('useListas precisa estar dentro de <ListasProvider>')
  return valor
}
