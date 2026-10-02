import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CONTEUDO } from '@/components/estilos'
import { MensagemErro } from '@/components/MensagemErro'
import { PainelMoodboard } from '@/components/PainelMoodboard'
import { lerMoodboard } from '@/lib/moodboard/banco'
import { ehIdMoodboard } from '@/lib/moodboard/validacao'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { lerUrlSite } from '@/lib/supabase/config'
import { criarClienteServidor } from '@/lib/supabase/servidor'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  if (!ehIdMoodboard(id)) return {}
  const r = await lerMoodboard(criarClienteAdmin(), id, null)
  if (!r.ok || !r.valor) return {}
  const descricao = r.valor.descricao ?? `Moodboard com ${r.valor.cenas.length} cenas de filmes`
  return { title: r.valor.titulo, description: descricao, openGraph: { title: r.valor.titulo, description: descricao } }
}

export default async function PaginaMoodboard({ params }: Props) {
  const { id } = await params
  if (!ehIdMoodboard(id)) notFound()

  let usuarioId: string | null = null
  try {
    const supabase = await criarClienteServidor()
    const { data } = await supabase.auth.getUser()
    usuarioId = data.user?.id ?? null
  } catch {
    // visitante
  }

  const r = await lerMoodboard(criarClienteAdmin(), id, usuarioId)
  if (!r.ok) {
    console.error('[CineTeca] ler moodboard falhou:', r.codigo)
    return (
      <main className={`${CONTEUDO} min-h-screen pb-16 pt-24`}>
        <MensagemErro texto="Não foi possível carregar este moodboard" />
      </main>
    )
  }
  if (!r.valor) notFound()

  const moodboard = r.valor
  return (
    <main className={`${CONTEUDO} min-h-screen pb-16 pt-24`}>
      <h1 className="text-2xl font-extrabold md:text-4xl">{moodboard.titulo}</h1>
      {moodboard.descricao && <p className="mt-2 max-w-3xl text-white/70">{moodboard.descricao}</p>}
      <PainelMoodboard moodboard={moodboard} link={`${lerUrlSite()}/moodboard/${moodboard.id}`} />
    </main>
  )
}
