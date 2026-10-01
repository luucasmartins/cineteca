import { NextResponse } from 'next/server'
import { sortearHarmonia } from '@/lib/tmdb/harmonia'

export async function GET() {
  try {
    // Cada pedido é um sorteio novo: nada de cache na resposta.
    return NextResponse.json({ filmes: await sortearHarmonia() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (falha) {
    console.error('[CineTeca] /api/harmonia falhou:', falha instanceof Error ? falha.name : 'desconhecido')
    return NextResponse.json({ erro: true }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
