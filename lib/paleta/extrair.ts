export type CorPaleta = { hex: string; peso: number }

const ITERACOES = 10

type Rgb = [number, number, number]

const luminancia = ([r, g, b]: Rgb) => 0.299 * r + 0.587 * g + 0.114 * b

function distancia(a: Rgb, b: Rgb): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
}

const paraHex = (c: Rgb) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/** Cores principais de um conjunto de pixels RGBA (k-means), da mais presente para a menos presente. */
export function extrairPaleta(pixels: Uint8ClampedArray, quantidade = 5): CorPaleta[] {
  const pontos: Rgb[] = []
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] >= 128) pontos.push([pixels[i], pixels[i + 1], pixels[i + 2]])
  }
  if (pontos.length === 0) return []

  // Sementes nos quantis de luminância: espalha os grupos do escuro ao claro e torna o resultado determinístico.
  const ordenados = [...pontos].sort((a, b) => luminancia(a) - luminancia(b))
  let centros: Rgb[] = Array.from({ length: quantidade }, (_, i) => [
    ...ordenados[Math.floor(((i + 0.5) * ordenados.length) / quantidade)],
  ] as Rgb)

  const grupo = new Array<number>(pontos.length).fill(0)
  for (let iteracao = 0; iteracao < ITERACOES; iteracao++) {
    const somas = centros.map(() => [0, 0, 0, 0])
    pontos.forEach((p, i) => {
      let melhor = 0
      let menor = Infinity
      centros.forEach((c, j) => {
        const d = distancia(p, c)
        if (d < menor) {
          menor = d
          melhor = j
        }
      })
      grupo[i] = melhor
      const s = somas[melhor]
      s[0] += p[0]
      s[1] += p[1]
      s[2] += p[2]
      s[3]++
    })
    centros = somas.map((s, j) => (s[3] > 0 ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centros[j]))
  }

  const contagem = new Map<string, number>()
  grupo.forEach((j) => {
    const hex = paraHex(centros[j])
    contagem.set(hex, (contagem.get(hex) ?? 0) + 1)
  })
  return [...contagem.entries()]
    .map(([hex, n]) => ({ hex, peso: n / pontos.length }))
    .sort((a, b) => b.peso - a.peso)
}
