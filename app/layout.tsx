import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'CineTeca', template: '%s · CineTeca' },
  description: 'Descubra filmes, veja onde assistir e monte suas listas.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={manrope.variable}>
      <body className="min-h-screen bg-fundo font-sans text-white antialiased">{children}</body>
    </html>
  )
}
