import type { ChavePremio } from './tipos'

export const PREMIOS: { chave: ChavePremio; nome: string }[] = [
  { chave: 'oscar', nome: 'Oscar' },
  { chave: 'bafta', nome: 'BAFTA' },
  { chave: 'globo', nome: 'Globo de Ouro' },
  { chave: 'cannes', nome: 'Festival de Cannes' },
  { chave: 'veneza', nome: 'Festival de Veneza' },
  { chave: 'berlim', nome: 'Festival de Berlim' },
]

/** Ordem das categorias dentro de cada prêmio: as técnicas primeiro. */
export const AREAS = [
  'fotografia',
  'direcao-arte',
  'efeitos',
  'montagem',
  'som',
  'figurino',
  'maquiagem',
  'trilha',
  'artistica',
  'filme',
  'juri',
  'direcao',
  'roteiro',
  'atuacao',
  'cancao',
  'animacao',
  'internacional',
  'documentario',
] as const

export type Area = (typeof AREAS)[number]

type Categoria = { premio: ChavePremio; area: Area; nome: string }

const c = (premio: ChavePremio, area: Area, nome: string): Categoria => ({ premio, area, nome })

// Q-ids do Wikidata, levantados em 2026-10-01. Só o que está aqui aparece no site:
// garante que só os seis prêmios entrem e que o nome saia certo em pt-BR.
// Categorias antigas que o Wikidata separa ("Fotografia, Cor") usam o nome da atual.
export const CATEGORIAS: Record<string, Categoria> = {
  // Oscar
  Q102427: c('oscar', 'filme', 'Melhor Filme'),
  Q103360: c('oscar', 'direcao', 'Melhor Direção'),
  Q131520: c('oscar', 'fotografia', 'Melhor Fotografia'),
  Q21995136: c('oscar', 'fotografia', 'Melhor Fotografia'),
  Q21995139: c('oscar', 'fotografia', 'Melhor Fotografia'),
  Q277751: c('oscar', 'direcao-arte', 'Melhor Direção de Arte'),
  Q22253131: c('oscar', 'direcao-arte', 'Melhor Direção de Arte'),
  Q22253133: c('oscar', 'direcao-arte', 'Melhor Direção de Arte'),
  Q393686: c('oscar', 'efeitos', 'Melhores Efeitos Visuais'),
  Q22917729: c('oscar', 'efeitos', 'Melhores Efeitos Especiais'),
  Q281939: c('oscar', 'montagem', 'Melhor Montagem'),
  Q830079: c('oscar', 'som', 'Melhor Som'),
  Q277536: c('oscar', 'figurino', 'Melhor Figurino'),
  Q22120066: c('oscar', 'figurino', 'Melhor Figurino'),
  Q22120095: c('oscar', 'figurino', 'Melhor Figurino'),
  Q487136: c('oscar', 'maquiagem', 'Melhor Maquiagem e Penteado'),
  Q488651: c('oscar', 'trilha', 'Melhor Trilha Sonora'),
  Q4671338: c('oscar', 'trilha', 'Melhor Trilha Sonora'),
  Q22235305: c('oscar', 'trilha', 'Melhor Trilha Sonora'),
  Q22235329: c('oscar', 'trilha', 'Melhor Trilha Sonora'),
  Q22344608: c('oscar', 'trilha', 'Melhor Trilha Sonora'),
  Q22752734: c('oscar', 'trilha', 'Melhor Trilha Sonora'),
  Q22752811: c('oscar', 'trilha', 'Melhor Trilha Sonora'),
  Q22752868: c('oscar', 'trilha', 'Melhor Trilha Sonora'),
  Q41417: c('oscar', 'roteiro', 'Melhor Roteiro Original'),
  Q107258: c('oscar', 'roteiro', 'Melhor Roteiro Adaptado'),
  Q103916: c('oscar', 'atuacao', 'Melhor Ator'),
  Q103618: c('oscar', 'atuacao', 'Melhor Atriz'),
  Q106291: c('oscar', 'atuacao', 'Melhor Ator Coadjuvante'),
  Q106301: c('oscar', 'atuacao', 'Melhor Atriz Coadjuvante'),
  Q112243: c('oscar', 'cancao', 'Melhor Canção Original'),
  Q106800: c('oscar', 'animacao', 'Melhor Animação'),
  Q105304: c('oscar', 'internacional', 'Melhor Filme Internacional'),
  Q111332: c('oscar', 'documentario', 'Melhor Documentário'),

  // BAFTA
  Q139184: c('bafta', 'filme', 'Melhor Filme'),
  Q2663714: c('bafta', 'filme', 'Melhor Filme Britânico'),
  Q787131: c('bafta', 'direcao', 'Melhor Direção'),
  Q778870: c('bafta', 'fotografia', 'Melhor Fotografia'),
  Q508166: c('bafta', 'direcao-arte', 'Melhor Direção de Arte'),
  Q787127: c('bafta', 'efeitos', 'Melhores Efeitos Visuais'),
  Q787145: c('bafta', 'montagem', 'Melhor Montagem'),
  Q739633: c('bafta', 'som', 'Melhor Som'),
  Q787104: c('bafta', 'figurino', 'Melhor Figurino'),
  Q918617: c('bafta', 'maquiagem', 'Melhor Maquiagem e Penteado'),
  Q787098: c('bafta', 'trilha', 'Melhor Trilha Sonora'),
  Q41375: c('bafta', 'roteiro', 'Melhor Roteiro Original'),
  Q739694: c('bafta', 'roteiro', 'Melhor Roteiro Adaptado'),
  Q400007: c('bafta', 'atuacao', 'Melhor Ator'),
  Q687123: c('bafta', 'atuacao', 'Melhor Atriz'),
  Q548389: c('bafta', 'atuacao', 'Melhor Ator Coadjuvante'),
  Q787123: c('bafta', 'atuacao', 'Melhor Atriz Coadjuvante'),
  Q240201: c('bafta', 'animacao', 'Melhor Animação'),
  Q2925687: c('bafta', 'internacional', 'Melhor Filme em Língua Não Inglesa'),
  Q511553: c('bafta', 'documentario', 'Melhor Documentário'),

  // Globo de Ouro
  Q1011509: c('globo', 'filme', 'Melhor Filme – Drama'),
  Q670282: c('globo', 'filme', 'Melhor Filme – Musical ou Comédia'),
  Q586356: c('globo', 'direcao', 'Melhor Direção'),
  Q1422140: c('globo', 'trilha', 'Melhor Trilha Sonora'),
  Q849124: c('globo', 'roteiro', 'Melhor Roteiro'),
  Q593098: c('globo', 'atuacao', 'Melhor Ator – Drama'),
  Q181883: c('globo', 'atuacao', 'Melhor Ator – Musical ou Comédia'),
  Q463085: c('globo', 'atuacao', 'Melhor Atriz – Drama'),
  Q1011564: c('globo', 'atuacao', 'Melhor Atriz – Musical ou Comédia'),
  Q723830: c('globo', 'atuacao', 'Melhor Ator Coadjuvante'),
  Q822907: c('globo', 'atuacao', 'Melhor Atriz Coadjuvante'),
  Q1472235: c('globo', 'cancao', 'Melhor Canção Original'),
  Q878902: c('globo', 'animacao', 'Melhor Animação'),
  Q387380: c('globo', 'internacional', 'Melhor Filme em Língua Não Inglesa'),

  // Festival de Cannes
  Q179808: c('cannes', 'filme', 'Palma de Ouro'),
  Q844804: c('cannes', 'juri', 'Grande Prêmio'),
  Q164200: c('cannes', 'juri', 'Prêmio do Júri'),
  Q775091: c('cannes', 'juri', 'Câmera de Ouro'),
  Q510175: c('cannes', 'direcao', 'Melhor Direção'),
  Q978420: c('cannes', 'roteiro', 'Melhor Roteiro'),
  Q586140: c('cannes', 'atuacao', 'Melhor Ator'),
  Q840286: c('cannes', 'atuacao', 'Melhor Atriz'),

  // Festival de Veneza
  Q209459: c('veneza', 'filme', 'Leão de Ouro'),
  Q944480: c('veneza', 'juri', 'Grande Prêmio do Júri'),
  Q20001886: c('veneza', 'juri', 'Prêmio Especial do Júri'),
  Q1337827: c('veneza', 'direcao', 'Leão de Prata de Melhor Direção'),
  Q2089923: c('veneza', 'atuacao', 'Copa Volpi de Melhor Ator'),
  Q2089918: c('veneza', 'atuacao', 'Copa Volpi de Melhor Atriz'),

  // Festival de Berlim
  Q154590: c('berlim', 'filme', 'Urso de Ouro'),
  Q664212: c('berlim', 'juri', 'Urso de Prata – Grande Prêmio do Júri'),
  Q321207: c('berlim', 'juri', 'Urso de Prata – Prêmio do Júri'),
  Q1266608: c('berlim', 'artistica', 'Urso de Prata de Contribuição Artística'),
  Q706031: c('berlim', 'direcao', 'Urso de Prata de Melhor Direção'),
  Q2285851: c('berlim', 'roteiro', 'Urso de Prata de Melhor Roteiro'),
  Q110961984: c('berlim', 'atuacao', 'Urso de Prata de Melhor Atuação'),
  Q110961983: c('berlim', 'atuacao', 'Urso de Prata de Melhor Atuação Coadjuvante'),
  Q819973: c('berlim', 'atuacao', 'Urso de Prata de Melhor Ator'),
  Q376834: c('berlim', 'atuacao', 'Urso de Prata de Melhor Atriz'),
}
