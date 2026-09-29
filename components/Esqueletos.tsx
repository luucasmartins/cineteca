import { CONTEUDO } from './estilos'

export function CartaoEsqueleto() {
  return <div className="aspect-[2/3] w-full animate-pulse rounded-md bg-white/10" />
}

export function FileiraEsqueleto({ titulo }: { titulo: string }) {
  return (
    <div aria-hidden>
      <div className={CONTEUDO}>
        <p className="text-lg font-bold text-white/40 md:text-2xl">{titulo}</p>
      </div>
      <div className="flex gap-2 overflow-hidden px-4 py-4 md:px-10">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="w-[38%] shrink-0 sm:w-[27%] md:w-[19%] lg:w-[15.5%] xl:w-[12.5%]">
            <CartaoEsqueleto />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GradeEsqueleto({ quantidade = 12 }: { quantidade?: number }) {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: quantidade }, (_, i) => (
        <CartaoEsqueleto key={i} />
      ))}
    </div>
  )
}
