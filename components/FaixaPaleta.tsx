import type { CorPaleta } from '@/lib/paleta/extrair'

/** Cores lado a lado (linha) ou empilhadas (coluna), cada uma do tamanho da presença dela nas cenas. */
export function FaixaPaleta({ cores, direcao, className = '' }: { cores: CorPaleta[]; direcao: 'linha' | 'coluna'; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex ${direcao === 'coluna' ? 'flex-col' : 'flex-row'} ${className}`}>
      {cores.map((cor) => (
        <span key={cor.hex} data-cor={cor.hex} style={{ backgroundColor: cor.hex, flexGrow: cor.peso, flexBasis: 0 }} />
      ))}
    </div>
  )
}
