import { extrairPaleta, type CorPaleta } from './extrair'

// Cada cena vira 48×27 pontos: o bastante para as cores principais, rápido até no celular.
const LARGURA = 48
const ALTURA = 27

function carregar(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const imagem = new Image()
    // Sem isto o canvas fica "contaminado" e não deixa ler os pixels. O TMDB libera CORS.
    imagem.crossOrigin = 'anonymous'
    imagem.onload = () => resolve(imagem)
    imagem.onerror = () => resolve(null)
    imagem.src = url
  })
}

/** Paleta das cenas; cena que não carrega é pulada. Lista vazia se nenhuma servir. */
export async function paletaDasCenas(urls: string[]): Promise<CorPaleta[]> {
  const imagens = (await Promise.all(urls.map(carregar))).filter((i): i is HTMLImageElement => i !== null)
  if (imagens.length === 0) return []

  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = ALTURA * imagens.length
  const contexto = canvas.getContext('2d', { willReadFrequently: true })
  if (!contexto) return []
  imagens.forEach((imagem, i) => contexto.drawImage(imagem, 0, i * ALTURA, LARGURA, ALTURA))
  try {
    return extrairPaleta(contexto.getImageData(0, 0, canvas.width, canvas.height).data)
  } catch (erro: unknown) {
    console.error('[CineTeca] Não foi possível ler as cores das cenas -', erro instanceof Error ? erro.name : 'desconhecido')
    return []
  }
}
