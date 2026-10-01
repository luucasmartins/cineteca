'use client'

import { useEffect, useState } from 'react'
import type { CorPaleta } from '@/lib/paleta/extrair'
import { paletaDasCenas } from '@/lib/paleta/navegador'

export type EstadoPaleta = { estado: 'carregando' | 'pronta' | 'indisponivel'; cores: CorPaleta[] }

export function usePaleta(cenas: string[]): EstadoPaleta {
  const chave = cenas.join('|')
  const [resultado, setResultado] = useState<{ chave: string; cores: CorPaleta[] } | null>(null)

  useEffect(() => {
    let ativo = true
    paletaDasCenas(chave ? chave.split('|') : []).then((cores) => {
      if (ativo) setResultado({ chave, cores })
    })
    return () => {
      ativo = false
    }
  }, [chave])

  if (!resultado || resultado.chave !== chave) return { estado: 'carregando', cores: [] }
  if (resultado.cores.length === 0) return { estado: 'indisponivel', cores: [] }
  return { estado: 'pronta', cores: resultado.cores }
}
