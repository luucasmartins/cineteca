import { ImageResponse } from 'next/og'
import { criarClienteAdmin } from '@/lib/supabase/admin'

const TAMANHOS: Record<string, { width: number; height: number }> = {
  stories: { width: 1080, height: 1920 },
  quadrada: { width: 1080, height: 1080 },
  previa: { width: 1200, height: 630 },
}

type DadosSessao = {
  titulo: string
  filme1_titulo: string
  filme1_poster: string | null
  filme1_ano: string | null
  filme2_titulo: string
  filme2_poster: string | null
  filme2_ano: string | null
}

async function buscarPoster(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    return `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codigo: string; formato: string }> },
) {
  const { codigo, formato } = await params
  const tamanho = TAMANHOS[formato]
  if (!tamanho) return new Response('Formato inválido', { status: 400 })

  const { data } = await criarClienteAdmin()
    .from('sessoes_duplas')
    .select('titulo, filme1_titulo, filme1_poster, filme1_ano, filme2_titulo, filme2_poster, filme2_ano')
    .eq('id', codigo)
    .maybeSingle()

  if (!data) return new Response('Sessão não encontrada', { status: 404 })
  const sessao = data as DadosSessao

  const [poster1, poster2] = await Promise.all([
    buscarPoster(sessao.filme1_poster),
    buscarPoster(sessao.filme2_poster),
  ])

  const vertical = formato === 'stories'
  const compacto = formato === 'previa'
  const posterW = vertical ? 340 : compacto ? 180 : 280
  const posterH = Math.round(posterW * 1.5)
  const tituloSize = vertical ? 48 : compacto ? 28 : 36
  const plusSize = vertical ? 60 : compacto ? 32 : 40
  const subSize = vertical ? 24 : compacto ? 14 : 16
  const marcaSize = vertical ? 20 : 14

  const poster = (src: string | null, w: number, h: number) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={w} height={h} style={{ borderRadius: 12, objectFit: 'cover' }} />
    ) : (
      <div style={{ width: w, height: h, backgroundColor: '#16161D', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#555' }}>
        Sem pôster
      </div>
    )

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0B0B0F',
          color: 'white',
          fontFamily: 'sans-serif',
          padding: vertical ? '80px 60px' : '40px 60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: vertical ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: vertical ? 40 : 30,
            flex: 1,
          }}
        >
          {poster(poster1, posterW, posterH)}
          <div style={{ fontSize: plusSize, color: '#01BD4E', fontWeight: 700 }}>+</div>
          {poster(poster2, posterW, posterH)}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: vertical ? 40 : 20,
            gap: 12,
          }}
        >
          <div style={{ fontSize: tituloSize, fontWeight: 800, textAlign: 'center', maxWidth: '90%' }}>
            {sessao.titulo}
          </div>
          <div style={{ fontSize: subSize, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
            {sessao.filme1_titulo}{sessao.filme1_ano ? ` (${sessao.filme1_ano})` : ''} + {sessao.filme2_titulo}{sessao.filme2_ano ? ` (${sessao.filme2_ano})` : ''}
          </div>
          <div style={{ fontSize: marcaSize, color: '#01BD4E', fontWeight: 700, marginTop: 8 }}>
            CineTeca
          </div>
        </div>
      </div>
    ),
    { ...tamanho },
  )
}
