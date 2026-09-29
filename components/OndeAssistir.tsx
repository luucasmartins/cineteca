import type { Provider, WatchProviders } from '@/lib/tmdb/tipos'

export function OndeAssistir({ provedores }: { provedores: WatchProviders | null }) {
  const grupos: [string, Provider[]][] = provedores
    ? [
        ['Streaming', provedores.streaming],
        ['Alugar', provedores.rent],
        ['Comprar', provedores.buy],
      ]
    : []

  return (
    <section aria-labelledby="onde-assistir-titulo" className="space-y-4">
      <h2 id="onde-assistir-titulo" className="text-xl font-bold md:text-2xl">
        Onde assistir
      </h2>
      {!provedores ? (
        <p className="text-white/70">Não disponível em streaming no Brasil</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-8">
            {grupos
              .filter(([, lista]) => lista.length > 0)
              .map(([nome, lista]) => (
                <div key={nome}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/50">{nome}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {lista.map((p) => (
                      <li key={p.id} title={p.name}>
                        {p.logoUrl ? (
                          <img src={p.logoUrl} alt={p.name} className="h-12 w-12 rounded-lg" loading="lazy" />
                        ) : (
                          <span className="flex h-12 items-center rounded-lg bg-superficie px-3 text-sm">{p.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
          <p className="text-xs text-white/50">
            Dados de disponibilidade fornecidos pela{' '}
            <a href="https://www.justwatch.com/br" target="_blank" rel="noreferrer" className="underline hover:text-white">
              JustWatch
            </a>
            .
            {provedores.link && (
              <>
                {' '}
                <a href={provedores.link} target="_blank" rel="noreferrer" className="underline hover:text-white">
                  Ver todas as opções
                </a>
              </>
            )}
          </p>
        </>
      )}
    </section>
  )
}
