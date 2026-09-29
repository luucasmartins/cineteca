import Link from 'next/link'
import { BOTAO_PRIMARIO } from '@/components/estilos'

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 pt-16 text-center">
      <p className="text-7xl font-extrabold text-destaque">404</p>
      <h1 className="text-3xl font-extrabold">Página não encontrada</h1>
      <p className="max-w-md text-white/70">O filme ou a página que você procura não existe ou saiu de cartaz.</p>
      <Link href="/" className={BOTAO_PRIMARIO}>
        Voltar ao início
      </Link>
    </div>
  )
}
