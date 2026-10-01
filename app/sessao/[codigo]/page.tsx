import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BotaoCopiarLink } from '@/components/BotaoCopiarLink'
import { BOTAO_PRIMARIO, CONTEUDO } from '@/components/estilos'
import { ImagemComReserva } from '@/components/ImagemComReserva'
import { criarClienteAdmin } from '@/lib/supabase/admin'
import { lerUrlSite } from '@/lib/supabase/config'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import type { FilmeDaSessao } from '@/lib/sessao-dupla/tipos'

type Props = { params: Promise<{ codigo: string }> }

type LinhaSessao = {
  id: string
  titulo: string
  filme1_id: number
  filme1_titulo: string
  filme1_poster: string | null
  filme1_ano: string | null
  filme2_id: number
  filme2_titulo: string
  filme2_poster: string | null
  filme2_ano: string | null
  usuario_id: string
}

async function lerSessao(codigo: string) {
  const { data, error } = await criarClienteAdmin()
    .from('sessoes_duplas')
    .select('id, titulo, filme1_id, filme1_titulo, filme1_poster, filme1_ano, filme2_id, filme2_titulo, filme2_poster, filme2_ano, usuario_id')
    .eq('id', codigo)
    .maybeSingle()
  if (error || !data) return null
  return data as LinhaSessao
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params
  const sessao = await lerSessao(codigo)
  if (!sessao) return {}
  const siteUrl = lerUrlSite()
  return {
    title: sessao.titulo,
    description: `${sessao.filme1_titulo} + ${sessao.filme2_titulo}`,
    openGraph: {
      title: sessao.titulo,
      description: `${sessao.filme1_titulo} + ${sessao.filme2_titulo}`,
      images: [`${siteUrl}/sessao/${codigo}/imagem/previa`],
    },
  }
}

function CartaoFilme({ filme }: { filme: FilmeDaSessao }) {
  return (
    <Link href={`/filme/${filme.id}`} className="group block shrink-0">
      <ImagemComReserva
        src={filme.posterUrl}
        reserva="/poster-padrao.svg"
        alt={`Pôster de ${filme.titulo}`}
        className="w-36 rounded-lg shadow-xl shadow-black/50 transition-transform group-hover:scale-105 md:w-52"
      />
      <p className="mt-2 text-center text-sm font-semibold text-white/80 group-hover:text-white">{filme.titulo}</p>
      {filme.ano && <p className="text-center text-xs text-white/50">{filme.ano}</p>}
    </Link>
  )
}

export default async function PaginaSessao({ params }: Props) {
  const { codigo } = await params
  const sessao = await lerSessao(codigo)
  if (!sessao) notFound()

  // Verificar se a pessoa logada é a dona
  let minha = false
  try {
    const supabase = await criarClienteServidor()
    const { data } = await supabase.auth.getUser()
    minha = data.user?.id === sessao.usuario_id
  } catch {
    // visitante
  }

  const filme1: FilmeDaSessao = { id: sessao.filme1_id, titulo: sessao.filme1_titulo, posterUrl: sessao.filme1_poster, ano: sessao.filme1_ano }
  const filme2: FilmeDaSessao = { id: sessao.filme2_id, titulo: sessao.filme2_titulo, posterUrl: sessao.filme2_poster, ano: sessao.filme2_ano }
  const siteUrl = lerUrlSite()
  const linkCompleto = `${siteUrl}/sessao/${codigo}`

  return (
    <div className={`${CONTEUDO} flex min-h-screen flex-col items-center justify-center pb-16 pt-24`}>
      <h1 className="mb-8 text-center text-3xl font-extrabold md:text-5xl">{sessao.titulo}</h1>

      <div className="flex items-center gap-6 md:gap-10">
        <CartaoFilme filme={filme1} />
        <span className="text-3xl font-bold text-destaque md:text-5xl">+</span>
        <CartaoFilme filme={filme2} />
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <a
          href={`/sessao/${codigo}/imagem/stories`}
          download={`${sessao.titulo} - Stories.png`}
          className={BOTAO_PRIMARIO}
        >
          Baixar para Stories
        </a>
        <a
          href={`/sessao/${codigo}/imagem/quadrada`}
          download={`${sessao.titulo} - Quadrada.png`}
          className={BOTAO_PRIMARIO}
        >
          Baixar quadrada
        </a>
        {minha && <BotaoCopiarLink url={linkCompleto} />}
      </div>
    </div>
  )
}
