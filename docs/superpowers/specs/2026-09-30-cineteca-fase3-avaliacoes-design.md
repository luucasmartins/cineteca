# CineTeca — Fase 3 (Avaliações e ranking) — Design

**Data:** 2026-09-30
**Status:** aprovada
**Depende de:** Fase 2 (`docs/superpowers/specs/2026-09-29-cineteca-fase2-contas-design.md`), no ar em https://cineteca-gules.vercel.app

## 1. Objetivo

Quem tem conta na CineTeca pode dizer se curtiu ou não os filmes que já viu. O site reúne esses votos e mostra quais filmes o público da CineTeca mais aprova.

**Sucesso da Fase 3:**

- Na página de um filme, quem está logado consegue marcar "Curti" ou "Não curti", mudar de ideia e desfazer.
- Depois de votar, a pessoa vê o resultado do público naquele filme.
- Existe uma página de ranking com os filmes mais aprovados, numerada, aberta a qualquer visitante.
- A página inicial tem uma fileira "Mais curtidos na CineTeca".
- Nenhum visitante — nem outra pessoa logada — consegue descobrir como alguém votou.

**Fora de escopo nesta fase:**

- Notas por estrelas ou de 0 a 10.
- Comentários ou resenhas.
- Avaliar direto no cartão do filme (só na página do filme).
- Ranking por período ("em alta nos últimos 30 dias").
- Lista de "menos curtidos".
- Usar o "não curti" para esconder recomendações.

## 2. Decisões de produto

Tomadas com o dono em 2026-09-30.

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Forma de avaliar | Joinha: curti / não curti | Mais gente participa do que com estrelas |
| Relação com Favoritos | Separados | Favoritar é coleção pessoal; curtir é voto público |
| Ordem do ranking | Percentual de aprovação | Mede qualidade, não popularidade |
| Mínimo de votos | 3 | Impede 100% com um voto só, sem travar o lançamento |
| Desempate | Mais votos primeiro | Entre dois filmes com o mesmo percentual, vale o mais testado |
| Onde aparece | Fileira na home + página própria | Visível para quem chega, aprofundável para quem se interessa |
| Onde se vota | Só na página do filme | Evita quatro botões no cartão, dois deles parecidos |
| Privacidade | Só números agregados | O ranking é público; os votos, não |

### 2.1 A confusão com Favoritar

Favoritar e curtir significam coisas próximas, e o risco é a pessoa não usar nenhum dos dois. A separação se apoia em três diferenças simultâneas:

- **Lugar:** Favoritar fica na fileira de ações do cabeçalho; a avaliação fica num bloco abaixo da sinopse.
- **Formato:** coração contra joinha.
- **Pergunta:** o bloco de avaliação começa com "Você já viu esse filme?", que explica sozinho para que serve.

## 3. Telas

### 3.1 Bloco de avaliação na página do filme

Fica em `app/filme/[id]/page.tsx`, abaixo da sinopse, antes de "Onde assistir".

**Quem nunca votou:**

```
Você já viu esse filme?
[ 👍 Curti ]   [ 👎 Não curti ]
```

**Depois de votar:**

```
Você curtiu.
82% das pessoas curtiram · 41 votos
Mudar meu voto
```

- "Mudar meu voto" devolve os dois botões, com o voto atual marcado (`aria-pressed`).
- Clicar no botão já marcado desfaz o voto, e o bloco volta ao estado inicial.
- Quando o filme tem menos de 3 votos, a linha do público some e fica só "Você curtiu." — não se mostra percentual que não significa nada.

**Quem não tem conta:** os dois botões aparecem. Clicar abre a `JanelaLogin` que já existe, com `voltar` apontando para a página do filme. Depois do login a pessoa volta e clica de novo — o voto **não** é executado sozinho, diferente do Favoritar. Um voto é uma opinião, e repetir o clique é barato porque o bloco está na tela.

### 3.2 Página `/mais-curtidos`

Aberta a qualquer visitante. Lista numerada, até 50 filmes.

Cada linha: posição, pôster pequeno, título, ano, percentual em destaque e número de votos. O título leva para a página do filme.

```
1.  [pôster]  Cidade de Deus · 2002      94% curtiram · 52 votos
2.  [pôster]  Parasita · 2019            91% curtiram · 38 votos
```

**Sem filmes qualificados:** a página mostra "Ainda não há filmes avaliados o suficiente." e, abaixo, "Avalie os filmes que você já viu e ajude a montar o ranking.", com um botão "Explorar filmes" para `/`.

Entra no menu principal como "Mais curtidos", no computador e no menu do celular.

### 3.3 Fileira na página inicial

Título "Mais curtidos na CineTeca", no mesmo formato visual das outras fileiras, com um link "Ver tudo" para `/mais-curtidos`. Mostra os 20 primeiros.

**A fileira só aparece quando houver pelo menos 3 filmes qualificados.** Com menos que isso ela é omitida por completo, para a home não nascer com um buraco.

## 4. Banco de dados

Migração nova em `supabase/migrations/`, aplicada à mão no SQL Editor dos projetos `cineteca` e `cineteca-testes`, como na Fase 2.

### 4.1 `public.avaliacoes`

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `usuario_id` | uuid | referencia `auth.users`, apaga em cascata |
| `filme_id` | integer | maior que zero |
| `curtiu` | boolean | `true` = curti, `false` = não curti |
| `criado_em` | timestamptz | padrão `now()` |
| `atualizado_em` | timestamptz | padrão `now()` |

Chave primária `(usuario_id, filme_id)`. O banco impede fisicamente dois votos da mesma pessoa no mesmo filme.

**RLS**, no mesmo padrão da Fase 2 — `revoke all` primeiro, depois o mínimo:

- `authenticated` pode `select`, `insert`, `update (curtiu, atualizado_em)` e `delete`, sempre com `(select auth.uid()) = usuario_id`.
- `anon` não acessa a tabela.

Ninguém lê nem escreve o voto de outra pessoa.

### 4.2 `public.filmes_avaliados`

Cópia dos dados de exibição dos filmes que receberam voto, para o ranking não depender de 20 chamadas ao TMDB por visita.

| Coluna | Tipo |
| --- | --- |
| `filme_id` | integer, chave primária |
| `titulo` | text, no máximo 300 caracteres |
| `poster_url` | text, pode ser nulo |
| `ano` | text, pode ser nulo |
| `atualizado_em` | timestamptz |

**Nem `anon` nem `authenticated` escrevem nesta tabela.** Só a chave secreta, pelo servidor. Isso impede que alguém forje um título inventado no ranking. Leitura liberada para os dois, porque são dados públicos do TMDB.

### 4.3 `public.ranking_filmes`

Uma visão (view) que devolve o ranking pronto:

```
filme_id, titulo, poster_url, ano, votos, curtidas, aprovacao
```

- Só filmes com `votos >= 3`.
- `aprovacao` = `curtidas * 100 / votos`, arredondado para inteiro.
- Ordenada por `aprovacao` decrescente, depois `votos` decrescente, depois `filme_id` para ordem estável.

A visão é criada com `security_invoker = false`, para poder agregar votos de todo mundo mesmo com a RLS ativa na tabela de origem. **Ela devolve apenas números: nunca `usuario_id`, nunca quem votou.** Select liberado para `anon` e `authenticated`.

### 4.4 Desempenho

A agregação roda a cada consulta. No volume previsto para os próximos meses isso é instantâneo. Se ficar lento, a visão pode virar tabela recalculada periodicamente sem mexer em nenhuma tela.

## 5. Como o voto viaja

Diferente das listas da Fase 2, que o navegador grava direto no Supabase, **o voto passa por uma Server Action**. Três motivos:

1. Validar que o filme existe mesmo no TMDB.
2. Gravar o título verdadeiro em `filmes_avaliados`, sem confiar no que o navegador mandou.
3. Manter `filmes_avaliados` fora do alcance de quem está logado.

### 5.1 `avaliar(filmeId: number, curtiu: boolean | null)`

- `curtiu = true` ou `false` grava o voto; `null` desfaz.
- Sem sessão: devolve erro de sessão. A tela já abre a janela de login antes de chamar a ação quando sabe que a pessoa não está logada; a verificação no servidor existe para o caso de a sessão expirar com a página aberta.
- `filmeId` inválido ou inexistente no TMDB: devolve erro genérico e registra no log com o prefixo `[CineTeca]`, sem dados sensíveis.
- Ao gravar um voto, faz `upsert` em `filmes_avaliados` com os dados vindos do TMDB (que já estão em cache).
- Devolve o estado novo: o voto da pessoa e o agregado do filme.

### 5.2 Leitura

- O bloco na página do filme recebe do servidor, já na primeira renderização, o voto da pessoa e o agregado — sem piscar.
- A página de ranking e a fileira da home leem `ranking_filmes` no servidor.

## 6. Casos de borda

| Situação | Comportamento |
| --- | --- |
| Clicar duas vezes rápido | O segundo clique é ignorado enquanto o primeiro corre. Um voto só |
| Gravação recusada pelo banco | A tela desfaz o voto e mostra "Não foi possível salvar. Tente de novo." |
| Sessão expirou com a página aberta | A tela desfaz e reabre a janela de login |
| Pessoa exclui a conta | Os votos somem em cascata; o ranking recalcula sozinho |
| Empate no percentual | Ganha quem tem mais votos |
| Filme com 3 votos, todos "não curti" | Aparece com 0% no fim da lista |
| Filme com menos de 3 votos | Não entra no ranking, e o bloco não mostra percentual |
| Menos de 3 filmes qualificados | A fileira da home não aparece; a página mostra o convite |
| TMDB fora do ar na hora do voto | O voto falha com mensagem clara, e nada é gravado pela metade |

## 7. Mensagens na tela

Todas em português do Brasil, copiadas exatamente na implementação.

| Onde | Texto |
| --- | --- |
| Título do bloco | `Você já viu esse filme?` |
| Botões | `Curti` / `Não curti` |
| Depois de curtir | `Você curtiu.` |
| Depois de não curtir | `Você não curtiu.` |
| Agregado | `{N}% das pessoas curtiram · {V} votos` |
| Mudar | `Mudar meu voto` |
| Erro ao gravar | `Não foi possível salvar. Tente de novo.` |
| Ranking vazio | `Ainda não há filmes avaliados o suficiente.` |
| Convite no ranking vazio | `Avalie os filmes que você já viu e ajude a montar o ranking.` |
| Item do menu | `Mais curtidos` |
| Título da página | `Mais curtidos na CineTeca` |
| Linha do ranking | `{N}% curtiram · {V} votos` |

Singular e plural: `1 voto` / `{V} votos`.

## 8. Testes

**Unitários**

- Cálculo do percentual, inclusive arredondamento e divisão por zero.
- Regra do mínimo de 3 votos.
- Desempate por número de votos.
- Validação de `filmeId` e de `curtiu`.
- Singular e plural das mensagens.

**Integração contra o projeto `cineteca-testes`**

- Ninguém lê o voto de outra pessoa.
- Ninguém grava voto em nome de outra pessoa.
- `anon` não acessa `avaliacoes`.
- Nem `anon` nem `authenticated` escrevem em `filmes_avaliados`.
- A visão de ranking não devolve nenhuma coluna que identifique quem votou.
- A visão respeita o mínimo de 3 votos e a ordem.
- Excluir a conta apaga os votos.

**No navegador, computador e celular**

- Votar, ver o resultado, mudar de voto, desfazer.
- Votar sem conta abre a janela de login.
- Clique duplo gera um voto só.
- Página de ranking com filmes e sem filmes qualificados.
- Fileira na home aparece com 3 filmes qualificados e some com menos.
- O voto de uma pessoa não aparece para outra.

## 9. Restrições que continuam valendo

Da Fase 1 e da Fase 2:

- Tudo na tela em português do Brasil. Só filmes.
- Fundo `#0B0B0F`, superfícies `#16161D`, fonte Manrope. A cor de destaque está em `app/globals.css` e pode mudar de vermelho para verde numa tarefa separada — nenhuma tela desta fase deve escrever a cor à mão.
- `<img>` simples, não `next/image`.
- Atribuição do TMDB no rodapé.
- Nunca registrar em log tokens, chaves, senhas ou cabeçalhos.
- `params` e `searchParams` são `Promise` no Next 16.

## 10. Pendências conhecidas

- A recuperação de senha segue sem envio de e-mail até haver um domínio para o Resend. Não é bloqueio para esta fase.
- A migração precisa ser aplicada à mão nos dois projetos Supabase, com o dono, como na Fase 2.
