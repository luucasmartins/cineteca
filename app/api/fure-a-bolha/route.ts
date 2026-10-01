import { NextResponse } from 'next/server'
import { lerIdPositivo } from '@/lib/parametros'
import { sortearJoia } from '@/lib/tmdb/joia'

export async function GET(request: Request) {
  const evitar = lerIdPositivo(new URL(request.url).searchParams.get('evitar'))
  try {
    // Cada pedido é um sorteio novo: nada de cache na resposta.
    return NextResponse.json(await sortearJoia(evitar), { headers: { 'Cache-Control': 'no-store' } })
  } catch (falha) {
    console.error('[CineTeca] /api/fure-a-bolha falhou:', falha instanceof Error ? falha.name : 'desconhecido')
    return NextResponse.json({ erro: true }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
