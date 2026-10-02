import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'CineTeca — Descubra filmes, monte suas listas.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B0B0F',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 96, fontWeight: 800, color: '#01BD4E' }}>
            Cine
          </span>
          <span style={{ fontSize: 96, fontWeight: 800, color: '#FFFFFF' }}>
            Teca
          </span>
        </div>
        <span style={{ fontSize: 32, color: '#A1A1AA', fontWeight: 400 }}>
          Descubra filmes, veja onde assistir e monte suas listas.
        </span>
      </div>
    ),
    { ...size },
  )
}
