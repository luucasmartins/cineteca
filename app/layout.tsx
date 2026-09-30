import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { AvisosProvider } from '@/components/AvisosProvider'
import { ListasProvider } from '@/components/ListasProvider'
import { Navbar } from '@/components/Navbar'
import { Rodape } from '@/components/Rodape'
import { SessaoProvider } from '@/components/SessaoProvider'
import { obterUsuario } from '@/lib/auth/sessao'
import { getGenres } from '@/lib/tmdb/filmes'
import type { Genero } from '@/lib/tmdb/tipos'
import './globals.css'

// Renderiza no servidor a cada visita; as respostas do TMDB ficam no cache de dados do Next.
export const dynamic = 'force-dynamic'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'CineTeca', template: '%s · CineTeca' },
  description: 'Descubra filmes, veja onde assistir e monte suas listas.',
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [generos, usuario] = await Promise.all([getGenres().catch((): Genero[] => []), obterUsuario()])

  return (
    <html lang="pt-BR" className={manrope.variable}>
      <body className="min-h-screen bg-fundo font-sans text-white antialiased">
        <SessaoProvider usuario={usuario}>
          <AvisosProvider>
            <ListasProvider>
              <Navbar generos={generos} usuario={usuario} />
              <main className="min-h-screen">{children}</main>
              <Rodape />
            </ListasProvider>
          </AvisosProvider>
        </SessaoProvider>
      </body>
    </html>
  )
}
