'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState, useTransition } from 'react'
import { editarMoodboardAction, excluirMoodboardAction, removerCenaAction } from '@/lib/moodboard/acoes'
import type { CenaMoodboard, Moodboard } from '@/lib/moodboard/tipos'
import { BotaoCopiarLink } from './BotaoCopiarLink'
import { CamposMoodboard } from './CamposMoodboard'
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from './estilos'
import { IconeFechar } from './Icones'
import { TelaCheia } from './TelaCheia'

const mesmaCena = (a: CenaMoodboard, b: CenaMoodboard) => a.filmeId === b.filmeId && a.caminho === b.caminho

export function PainelMoodboard({ moodboard, link }: { moodboard: Moodboard; link: string }) {
  const router = useRouter()
  const [cenas, setCenas] = useState(moodboard.cenas)
  const [aberta, setAberta] = useState<number | null>(null)
  const [editando, setEditando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [titulo, setTitulo] = useState(moodboard.titulo)
  const [descricao, setDescricao] = useState(moodboard.descricao ?? '')
  const [erro, setErro] = useState('')
  const [pendente, iniciar] = useTransition()
  const origemRef = useRef<HTMLButtonElement | null>(null)

  const fechar = useCallback(() => {
    setAberta(null)
    origemRef.current?.focus()
  }, [])

  function remover(cena: CenaMoodboard) {
    setErro('')
    setCenas((atuais) => atuais.filter((c) => !mesmaCena(c, cena)))
    iniciar(async () => {
      const r = await removerCenaAction(moodboard.id, cena.filmeId, cena.caminho)
      if (!r.ok) {
        setCenas((atuais) => {
          const ordem = moodboard.cenas
          return ordem.filter((c) => mesmaCena(c, cena) || atuais.some((a) => mesmaCena(a, c)))
        })
        setErro(r.erro)
      }
    })
  }

  function salvarEdicao() {
    setErro('')
    iniciar(async () => {
      const r = await editarMoodboardAction(moodboard.id, titulo, descricao)
      if (r.ok) {
        setEditando(false)
        router.refresh()
      } else setErro(r.erro)
    })
  }

  function excluir() {
    setErro('')
    iniciar(async () => {
      const r = await excluirMoodboardAction(moodboard.id)
      if (r.ok) router.push('/moodboards')
      else {
        setConfirmando(false)
        setErro(r.erro)
      }
    })
  }

  return (
    <>
      {moodboard.meu && (
        <div className="mt-6">
          {editando ? (
            <div className="max-w-xl space-y-4">
              <CamposMoodboard
                prefixo="editar-moodboard"
                titulo={titulo}
                descricao={descricao}
                aoMudarTitulo={setTitulo}
                aoMudarDescricao={setDescricao}
                focarTitulo
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditando(false)} disabled={pendente} className={BOTAO_SECUNDARIO}>
                  Cancelar
                </button>
                <button type="button" onClick={salvarEdicao} disabled={pendente || !titulo.trim()} className={BOTAO_PRIMARIO}>
                  {pendente ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <BotaoCopiarLink url={link} />
              <button type="button" onClick={() => setEditando(true)} className={BOTAO_SECUNDARIO}>
                Editar
              </button>
              {confirmando ? (
                <>
                  <button type="button" onClick={excluir} disabled={pendente} className={`${BOTAO_SECUNDARIO} text-perigo`}>
                    Confirmar
                  </button>
                  <button type="button" onClick={() => setConfirmando(false)} disabled={pendente} className={BOTAO_SECUNDARIO}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmando(true)} className={`${BOTAO_SECUNDARIO} text-perigo`}>
                  Excluir
                </button>
              )}
            </div>
          )}
          {erro && <p className="mt-3 text-sm text-perigo">{erro}</p>}
        </div>
      )}

      {cenas.length === 0 ? (
        <p className="py-16 text-center text-white/60">
          Nenhuma cena adicionada.
          {moodboard.meu && ' Abra as imagens de um filme e use o botão de moodboard para salvar cenas aqui.'}
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-3">
          {cenas.map((cena, i) => (
            <li key={`${cena.filmeId}${cena.caminho}`} className="group relative overflow-hidden rounded-lg bg-superficie">
              <button
                type="button"
                aria-label={`Abrir cena de ${cena.tituloFilme}`}
                onClick={(e) => {
                  origemRef.current = e.currentTarget
                  setAberta(i)
                }}
                className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
              >
                <img src={cena.imagem.media} alt="" loading="lazy" className="aspect-video w-full object-cover" />
              </button>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6 text-xs font-semibold md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100 motion-reduce:transition-none">
                {cena.tituloFilme}
              </span>
              {moodboard.meu && (
                <button
                  type="button"
                  aria-label={`Remover cena de ${cena.tituloFilme}`}
                  onClick={() => remover(cena)}
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-white/80 hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:opacity-0 md:group-hover:opacity-100"
                >
                  <IconeFechar className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {aberta !== null && cenas[aberta] && (
        <TelaCheia
          imagens={cenas.map((c) => c.imagem)}
          titulo={moodboard.titulo}
          indice={aberta}
          aoMudar={setAberta}
          aoFechar={fechar}
        />
      )}
    </>
  )
}
