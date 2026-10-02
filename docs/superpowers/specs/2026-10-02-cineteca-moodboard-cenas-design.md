# CineTeca — Moodboard de Cenas (Spec)

Data: 2026-10-02

## 1. Visão geral

Permitir que o usuário salve cenas (backdrops) de filmes diferentes em coleções temáticas chamadas **moodboards**. Cada moodboard tem título, descrição opcional e uma URL pública que qualquer pessoa pode acessar. O fluxo de adição parte da galeria de imagens na página do filme.

**Fora de escopo:**
- Composição visual (drag-and-drop, redimensionamento)
- Moodboards sugeridos pelo site
- Exportação como imagem
- Reordenação de cenas (campo `ordem` existe no banco para uso futuro)

## 2. Decisões de produto

| Decisão | Escolha |
|---|---|
| Direção | Curadoria pessoal (salvar cenas em coleções temáticas) |
| Visibilidade | Privado + link público (qualquer um acessa por URL) |
| Ponto de entrada | Galeria de imagens do filme (lightbox em tela cheia) |
| Layout das cenas | Grid uniforme (3 colunas desktop, 2 mobile), sem limite de cenas |
| Metadados | Título (obrigatório, 1-60 chars) + descrição (opcional, 0-200 chars) |
| Navegação | Link "Moodboards" no menu, só para usuários logados |

## 3. Modelo de dados

### Tabela `moodboards`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK, default `gen_random_uuid()` | |
| `usuario_id` | `uuid` FK `perfis(id)` on delete cascade | |
| `titulo` | `text` not null, check `char_length(titulo) between 1 and 60` | |
| `descricao` | `text`, check `descricao is null or char_length(descricao) <= 200` | |
| `criado_em` | `timestamptz` default `now()` | |
| `atualizado_em` | `timestamptz` default `now()` | |

### Tabela `moodboard_cenas`

| Coluna | Tipo | Notas |
|---|---|---|
| `moodboard_id` | `uuid` FK `moodboards(id)` on delete cascade | PK composta |
| `filme_id` | `integer` not null | PK composta |
| `caminho_imagem` | `text` not null | Path relativo do TMDB (ex.: `/abc123.jpg`) |
| `titulo_filme` | `text` | Denormalizado para a página pública |
| `ordem` | `integer` not null default `0` | Reservado para reordenação futura |
| `criado_em` | `timestamptz` default `now()` | |

PK composta: `(moodboard_id, filme_id, caminho_imagem)` — permite várias cenas do mesmo filme.

### RLS

Igual à Sessão dupla: o banco só libera o dono. A página pública lê pelo servidor com `criarClienteAdmin()`, para que ninguém consiga listar os moodboards (e os ids) de todos os usuários pela chave pública.

- **`moodboards`:** SELECT/INSERT/UPDATE/DELETE só quando `auth.uid() = usuario_id`
- **`moodboard_cenas`:** SELECT/INSERT/DELETE só quando o `moodboard_id` pertence ao `auth.uid()`
- Visitantes (`anon`) não têm acesso a nenhuma das duas tabelas.

### Origem dos dados da cena

O navegador manda só `moodboard_id`, `filme_id` e o caminho da imagem. O servidor busca o filme no TMDB (com cache) e só aceita o caminho se ele estiver entre as cenas daquele filme; o `titulo_filme` gravado vem do TMDB, nunca do navegador.

## 4. Fluxo do usuário

### Adicionar cena (galeria do filme)

1. Usuário abre uma imagem em tela cheia no lightbox da galeria
2. Botão "Salvar no moodboard" aparece no canto (ícone de grid/coleção)
3. Clica → modal lista os moodboards existentes + "Criar novo"
4. Se não logado → `JanelaLogin` (mesmo padrão do botão "Assisti"; nada é refeito depois do login)
5. Seleciona um moodboard → cena adicionada, toast de confirmação
6. "Criar novo" → campos de título (obrigatório) e descrição (opcional) inline

### Página `/moodboards` (listagem, requer conta)

- Grid de cards dos moodboards do usuário
- Cada card: miniatura 2×2 das primeiras 4 cenas, título, quantidade de cenas
- Botão "Criar moodboard" no topo (também permite criar sem cena)
- Card clicável → abre `/moodboard/[id]`

### Página `/moodboard/[id]` (pública)

- Título e descrição (se houver). **Sem o nome do autor**: o nome do cadastro não é público em nenhum lugar do site; isso fica para os perfis públicos da fase Comunidade (decisão do dono, 2026-10-02).
- Grid 3 colunas (desktop) / 2 colunas (mobile) com todas as cenas
- Hover na cena → título do filme
- Cena clicável → lightbox em tela cheia (reutiliza o existente)
- Se é o dono:
  - Botão de remover em cada cena
  - Editar título/descrição
  - Excluir moodboard (com confirmação)

## 5. Componentes e arquivos

### Novos

| Caminho | Responsabilidade |
|---|---|
| `lib/moodboard/tipos.ts` | Tipos `Moodboard`, `MoodboardCena`, `MoodboardResumo` |
| `lib/moodboard/banco.ts` | Queries Supabase: listar, buscar por id, criar, excluir, adicionar/remover cena |
| `lib/moodboard/acoes.ts` | Server Actions |
| `lib/moodboard/validacao.ts` | Validação de título e descrição |
| `supabase/migrations/20261002000000_moodboards.sql` | Tabelas + RLS |
| `components/ModalMoodboard.tsx` | Modal de seleção/criação ao salvar cena |
| `components/CardMoodboard.tsx` | Card com miniatura 2×2 para listagem |
| `app/moodboards/page.tsx` | Listagem dos moodboards do usuário |
| `app/moodboard/[id]/page.tsx` | Página pública do moodboard |

### Modificados

| Caminho | Mudança |
|---|---|
| `components/GaleriaImagens.tsx` | Botão "Salvar no moodboard" no lightbox |
| `components/Navbar.tsx` | Link "Moodboards" no menu (só logado) |

### Reutilizados sem mudança

- `JanelaLogin` para quem não tem conta
- Estilos de `components/estilos.ts` (`CONTEUDO`, `BOTAO_PRIMARIO`, `BOTAO_SECUNDARIO`)
- `MensagemErro` para falhas de leitura

### Ajustes em código existente

- `TelaCheia` sai de dentro de `GaleriaImagens` para `components/TelaCheia.tsx` e é reutilizada na página do moodboard. Ganha `pausada` (desliga teclado e trava de foco enquanto outra janela está por cima) e `acoes` (botões extras no canto).
- `usePrenderFoco` ganha o parâmetro opcional `ativo`.
- `ImagemFilme` ganha `caminho` (o `file_path` do TMDB), para a galeria não precisar recortar URLs.

## 6. Tratamento de erros

- Falha ao criar/excluir moodboard ou adicionar/remover cena → desfaz na tela + mensagem de erro
- Falha ao ler moodboards (janela, `/moodboards`, página pública) → `MensagemErro` com "Tentar novamente", nunca lista vazia
- Editar/excluir que não alteram nenhuma linha contam como falha
- Sessão expirada → redireciona ao login (padrão `ErroLista`)
- Moodboard não encontrado → `notFound()` (404 do Next)
- Cena duplicada (PK) → server action retorna erro amigável ("Cena já está neste moodboard")
- Logs com prefixo `[CineTeca]`, sem dados sensíveis

## 7. Limites

- Máximo de 20 moodboards por usuário (verificado no server action)
- Título: 1-60 caracteres
- Descrição: 0-200 caracteres
- Sem limite de cenas por moodboard

## 8. Acessibilidade

- Modal com foco preso (`usePrenderFoco`)
- Botão no lightbox com `aria-label="Salvar no moodboard"`
- Grid de cenas com `role="list"`, cada cena com `role="listitem"`
- Respeita `prefers-reduced-motion` (sem animações de transição)

## 9. Testes

| Tipo | Cobertura |
|---|---|
| Vitest (unitário) | Validação de título/descrição, montagem de URLs de imagem |
| Vitest (integração, `test:supabase`) | CRUD de moodboard e cenas contra `cineteca-testes`, RLS (dono vs. outro vs. público) |
| Playwright (e2e) | Criar moodboard pela galeria, ver na listagem, abrir link público, remover cena, excluir moodboard |
