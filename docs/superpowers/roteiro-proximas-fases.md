# CineTeca — Roteiro das próximas fases

Combinado com o dono em 2026-10-01. Ordem aprovada:

1. **Prêmios** na página do filme — concluído (spec e plano de 2026-10-01).
2. **Paleta de cores** ("Blind Watch") — concluído como "Harmonia de cores" (spec e plano de 2026-10-01).
3. **Sessão dupla.**
4. **Diário com Comunidade** — por último, numa fase própria.

Cada item ganha a própria spec e o próprio plano em `specs/` e `plans/` quando chegar a vez.

## 1. Prêmios

Destacar os prêmios do filme, com ênfase nas categorias técnicas (fotografia, direção de arte, efeitos visuais).

- **Fonte testada:** Wikidata (SPARQL, sem chave). O filme é encontrado pela propriedade P4947 (id do TMDB). Juntar os prêmios registrados no filme (P166 venceu, P1411 indicado) com os registrados nas pessoas, quando o qualificador P1686 ("pelo trabalho") aponta para o filme. Duna traz 6 Oscars técnicos com o nome de quem ganhou. Os 10 filmes testados têm dados.
- **Problemas e saídas previstas:**
  - Rótulos em pt bagunçados ("Óscar"/"Oscar", "lista de filmes premiados com..."): tabela própria de nomes em pt-BR por Q-id.
  - Quem venceu também aparece como indicado: deduplicar.
  - O endpoint às vezes estoura o tempo: cache de 1 dia, e a seção some se falhar.
- **Em aberto:** quais prêmios mostrar (recomendação: só os principais — Oscar, BAFTA, Globo de Ouro, Cannes, Veneza, Berlim) e onde a seção entra na página.
- Estimativa: 2–3 h.

## 2. Paleta de cores ("Blind Watch")

Esconder título, sinopse e pôster e mostrar só a paleta dominante, extraída dos backdrops, e o ano. A pessoa escolhe o filme pelo visual. Não precisa de banco.

- **Suposições não confirmadas:** página própria de descoberta e uma paleta pequena na página do filme.
- Estimativa: 2–3 h.

## 3. Sessão dupla

Agrupar dois filmes com um título dado pela pessoa (ex.: Blade Runner 2049 + Her = "Solidão Cyberpunk"), com os pôsteres lado a lado e exportáveis para redes sociais. Precisa de tabela no Supabase.

- **Suposição não confirmada:** pares criados por quem tem conta e públicos por link.
- Estimativa: 4–5 h.

## 4. Diário com Comunidade

- **Diário:** registrar "assisti em tal dia", com uma nota opcional.
- **Comunidade:** uma aba dentro do Diário, com comentários de quem tem conta junto à capa do filme.
- **Moderação mínima obrigatória:** denunciar, o dono poder apagar o que for ofensivo e o autor poder apagar o próprio.
- **Base necessária:** um perfil público (nome de exibição e foto). Hoje o nome em `perfis` só é lido pelo próprio dono da conta.
- Ainda sem nenhuma conversa de desenho.

## Também em aberto

- Os 5 ajustes menores da Fase 4, listados no `CLAUDE.md`, sem prioridade definida.
