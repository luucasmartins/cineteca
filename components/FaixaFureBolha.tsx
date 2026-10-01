import { BotaoFureBolha } from './BotaoFureBolha'
import { BOTAO_PRIMARIO, CONTEUDO } from './estilos'
import { IconeBolha } from './Icones'

// Faixa própria entre as fileiras da home: longe do banner, para não parecer um botão do filme em destaque.
export function FaixaFureBolha() {
  return (
    <section aria-labelledby="faixa-fure-bolha" className={CONTEUDO}>
      <div className="flex flex-col gap-4 rounded-xl bg-superficie p-5 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <h2 id="faixa-fure-bolha" className="flex items-center gap-2 text-lg font-extrabold md:text-xl">
            <IconeBolha className="h-5 w-5 text-destaque" /> Fure a bolha
          </h2>
          <p className="mt-1 text-sm text-white/70">Um filme aclamado, longe do circuito de sempre.</p>
        </div>
        <BotaoFureBolha className={`${BOTAO_PRIMARIO} shrink-0 self-start sm:self-auto`} rotulo="Sortear" />
      </div>
    </section>
  )
}
