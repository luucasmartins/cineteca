'use client'

import { useEffect, type RefObject } from 'react'

const FOCAVEIS = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Enquanto a janela está montada, Tab e Shift+Tab circulam só pelos controles dela.
export function usePrenderFoco(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return
      const focaveis = [...ref.current.querySelectorAll<HTMLElement>(FOCAVEIS)]
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      const dentro = ref.current.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === primeiro || !dentro)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (document.activeElement === ultimo || !dentro)) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [ref])
}
