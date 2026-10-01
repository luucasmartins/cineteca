'use client'

import { type RefObject, useEffect, useState } from 'react'

const VELOCIDADE = 25 // pixels por segundo
const RETOMAR_MS = 3000

/**
 * Desliza o trilho para a esquerda sem parar. O trilho precisa ter os itens duas vezes
 * (lista + cópia): ao chegar na cópia, volta uma "volta" inteira e o salto não aparece.
 * Devolve se está rodando, para o carrossel só renderizar a cópia nesse caso.
 */
export function useRolagemAutomatica(trilhoRef: RefObject<HTMLElement | null>, ativo: boolean) {
  const [rodando, setRodando] = useState(false)

  useEffect(() => {
    if (!ativo) return
    const consulta = window.matchMedia('(prefers-reduced-motion: no-preference)')
    setRodando(consulta.matches)
    const aoMudar = () => setRodando(consulta.matches)
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [ativo])

  useEffect(() => {
    const trilho = trilhoRef.current
    // As setas são irmãs do trilho: pausar no pai cobre o mouse em cima delas também.
    const area = trilho?.parentElement
    if (!rodando || !trilho || !area) return

    let posicao = trilho.scrollLeft
    let anterior: number | null = null
    let parado = false
    let retomar: ReturnType<typeof setTimeout> | undefined
    let quadro = requestAnimationFrame(function passo(agora) {
      if (anterior !== null && !parado) {
        const itens = trilho.children
        const volta = (itens[itens.length / 2] as HTMLElement).offsetLeft - (itens[0] as HTMLElement).offsetLeft
        // Limita o intervalo para não dar um pulo ao voltar de uma aba em segundo plano.
        posicao += (VELOCIDADE * Math.min(agora - anterior, 100)) / 1000
        if (posicao >= volta) posicao -= volta
        trilho.scrollLeft = posicao
      }
      anterior = agora
      quadro = requestAnimationFrame(passo)
    })

    const parar = () => {
      clearTimeout(retomar)
      parado = true
    }
    const soltar = () => {
      clearTimeout(retomar)
      retomar = setTimeout(() => {
        posicao = trilho.scrollLeft // a pessoa pode ter rolado com as setas ou o dedo
        parado = false
      }, RETOMAR_MS)
    }
    const aoEntrarMouse = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') parar()
    }
    const aoSairMouse = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') soltar()
    }

    area.addEventListener('pointerenter', aoEntrarMouse)
    area.addEventListener('pointerleave', aoSairMouse)
    area.addEventListener('touchstart', parar, { passive: true })
    area.addEventListener('touchend', soltar)
    area.addEventListener('touchcancel', soltar)
    area.addEventListener('focusin', parar)
    area.addEventListener('focusout', soltar)
    return () => {
      cancelAnimationFrame(quadro)
      clearTimeout(retomar)
      area.removeEventListener('pointerenter', aoEntrarMouse)
      area.removeEventListener('pointerleave', aoSairMouse)
      area.removeEventListener('touchstart', parar)
      area.removeEventListener('touchend', soltar)
      area.removeEventListener('touchcancel', soltar)
      area.removeEventListener('focusin', parar)
      area.removeEventListener('focusout', soltar)
    }
  }, [rodando, trilhoRef])

  return rodando
}
