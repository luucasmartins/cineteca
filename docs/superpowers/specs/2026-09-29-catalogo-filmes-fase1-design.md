# CineTeca — Fase 1 (Front-end do catálogo) — Design

**Data:** 2026-09-29
**Status:** aprovada

## 1. Contexto e objetivo

CineTeca é um produto público de catálogo de filmes. A visão completa: qualquer pessoa cria uma conta (login e senha), navega por um catálogo com milhares de filmes e mantém suas próprias listas de **Favoritos** e **Salvos para assistir**.

O projeto foi dividido em duas fases, cada uma com seu próprio ciclo de spec → plano → implementação:

- **Fase 1 (esta spec):** site de catálogo alimentado pelo TMDB, sem login e sem banco de dados. Favoritos e Salvos já funcionam, guardados no navegador.
- **Fase 2 (spec futura):** contas de usuário (login, senha, recuperação de senha), banco de dados (Supabase) e listas vinculadas à conta.

**Quem mantém:** o dono do produto não programa. Tudo deve ser construído com serviços prontos, fácil de publicar e sem manutenção manual.

**Sucesso da Fase 1:** um visitante consegue, no computador e no celular, descobrir filmes (navegando ou buscando), ver os detalhes completos de um filme, assistir ao trailer, saber onde assistir no Brasil e montar suas listas de Favoritos e Salvos, que continuam lá quando ele volta no mesmo navegador.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Fonte dos filmes | API pública do TMDB (não há cadastro manual) |
| Idioma | Português do Brasil (`language=pt-BR`, `region=BR`) |
| Stack | Next.js (App Router) + TypeScript + Tailwind CSS |
| Hospedagem | Vercel (plano gratuito) |
| Listas na Fase 1 | `localStorage` do navegador, atrás de uma interface que a Fase 2 troca pelo Supabase |
| Conteúdo | Somente filmes (séries ficam fora) |
| Direção visual | Escuro e cinematográfico, com vermelho como cor de destaque, inspirado na interface atual da Netflix, com identidade própria |

## 3. Identidade visual

- **Nome:** CineTeca (logotipo em texto na barra superior).
- **Fundo:** quase preto (`#0B0B0F`), superfícies em cinza muito escuro (`#16161D`).
- **Paleta escura com vermelho como única cor de destaque:** preto, cinzas, branco e o vermelho CineTeca (`#D7263D`, um carmim próprio, diferente do vermelho da marca Netflix).
  - Botão principal: fundo vermelho com texto branco (ex.: *Ver detalhes*, *Trailer*).
  - Botões secundários: cinza translúcido com texto branco (ex.: *+ Minha lista*).
  - Coração de **favorito marcado**: vermelho.
  - Foco e estados ativos: contorno branco.
  - Logo CineTeca em branco, com tipografia forte.
  - Não usar o logo nem o nome da marca Netflix.
- **Tipografia:** Manrope (Google Fonts), com fallback `system-ui, sans-serif`.
- **Linguagem de interface:** banner grande com gradiente sobre a imagem, fileiras horizontais de pôsteres, cartões que ampliam ao passar o mouse, cantos levemente arredondados, animações curtas (150–250 ms).

## 4. Páginas e navegação

**Barra superior (fixa):** transparente sobre o banner, fica sólida ao rolar. Itens: logo CineTeca · Início · Gêneros (menu com a lista de gêneros do TMDB) · Minha lista · ícone de busca. No celular, os links viram um menu recolhível.

### 4.1 Início — `/`
- **Banner destaque:** um filme de "Em alta hoje" que tenha imagem de fundo e sinopse. Mostra título, sinopse curta (até 3 linhas) e os botões *Ver detalhes* e *+ Minha lista* (salvar).
- **Fileiras:** Em alta hoje · Populares · Em cartaz nos cinemas · Mais bem avaliados · Ação · Comédia · Terror · Animação · Ficção científica.
- **Cartão com hover** (desktop): o pôster amplia e mostra ano, nota, gêneros e os botões Favoritar e Salvar. No celular não há hover: tocar no cartão abre a página de detalhes.

### 4.2 Gênero — `/genero/[id]`
- Título do gênero, seletor de ordenação (Popularidade · Nota · Lançamento) e grade de pôsteres.
- Rolagem infinita: carrega a próxima página do TMDB quando o usuário chega ao fim da grade.

### 4.3 Busca — `/busca?q=termo`
- O ícone de busca abre um campo na barra superior. Ao digitar, a URL muda para `/busca?q=...` depois de 400 ms sem digitação.
- Os resultados aparecem em grade, com rolagem infinita.
- Busca vazia mostra "Digite o nome de um filme". Sem resultados mostra "Nenhum filme encontrado para "termo"".

### 4.4 Detalhes do filme — `/filme/[id]`
- Imagem de fundo com gradiente, pôster, título, ano, duração, nota, gêneros e sinopse.
- Botões: **Trailer** (abre um modal com o vídeo do YouTube; aparece só se houver trailer), **Favoritar**, **Salvar**.
- **Onde assistir:** serviços de streaming, aluguel e compra no Brasil (dados de watch providers do TMDB, fornecidos pela JustWatch). Se não houver dados, mostra "Não disponível em streaming no Brasil".
- **Elenco principal:** fileira com até 15 pessoas (foto, nome, personagem).
- **Filmes semelhantes:** fileira de recomendações.

### 4.5 Minha lista — `/minha-lista`
- Abas **Favoritos** e **Salvos para assistir**, com os filmes em grade.
- Lista vazia: mensagem convidando a explorar, com um botão para o Início.

### 4.6 Página 404
- No estilo do site, com um botão para voltar ao Início. Usada para rotas inexistentes e para IDs de filme que o TMDB não conhece.

### 4.7 Rodapé
- Atribuição obrigatória do TMDB (logo + "Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB") e crédito à JustWatch nos dados de "Onde assistir".

## 5. Arquitetura

```
app/                 páginas (Início, Gênero, Busca, Filme, Minha lista, 404)
components/          componentes visuais reutilizáveis
lib/tmdb/            único ponto de acesso ao TMDB
lib/lista/           único ponto de acesso às listas do usuário
```

### 5.1 Camada TMDB (`lib/tmdb`)
- Roda **somente no servidor**. O token do TMDB fica na variável de ambiente `TMDB_READ_TOKEN` e nunca chega ao navegador.
- Funções: `getTrending()`, `getPopular(page)`, `getNowPlaying(page)`, `getTopRated(page)`, `getGenres()`, `discoverByGenre(genreId, sort, page)`, `searchMovies(query, page)`, `getMovieDetails(id)` (inclui vídeos, elenco, recomendações e onde assistir numa única chamada via `append_to_response`).
- Converte as respostas do TMDB em tipos próprios e enxutos (`MovieSummary`, `MovieDetails`, `CastMember`, `WatchProviders`) e monta as URLs completas das imagens. O resto do código não conhece o formato bruto do TMDB.
- **Cache:** listas e detalhes ficam em cache por 6 horas; a lista de gêneros, por 24 horas.
- A rolagem infinita e a busca, que rodam no navegador, chamam rotas internas do próprio site (`/api/...`), e essas rotas usam a camada TMDB. O navegador nunca chama o TMDB diretamente para dados. As imagens vêm direto do CDN de imagens do TMDB.

### 5.2 Camada Minha Lista (`lib/lista`)
- Interface: `listar(tipo)`, `contem(tipo, id)`, `adicionar(tipo, filme)`, `remover(tipo, id)`, com `tipo` sendo `"favoritos"` ou `"salvos"`.
- Guarda um resumo de cada filme (id, título, pôster, ano, nota), assim a página Minha lista abre sem precisar chamar o TMDB.
- Implementação da Fase 1: `localStorage`, na chave `cineteca:listas:v1`.
- Um estado compartilhado (React Context) mantém todos os botões sincronizados entre telas e abas do navegador.
- **Na Fase 2, só a implementação desta camada muda; componentes e páginas continuam iguais.**

### 5.3 Componentes
Barra superior · Banner destaque · Fileira (carrossel com setas no desktop e deslize no celular) · Cartão de filme · Grade com rolagem infinita · Modal de trailer · Botões Favoritar e Salvar · Esqueleto de carregamento · Mensagem de erro com "Tentar novamente" · Rodapé.

## 6. Tratamento de erros

- **TMDB fora do ar ou lento (tempo limite de 8 s):** a fileira ou seção afetada mostra "Não foi possível carregar" com o botão "Tentar novamente"; o resto da página continua funcionando.
- **Filme sem pôster/imagem:** imagem padrão da CineTeca. **Sem sinopse em pt-BR:** "Sinopse não disponível em português."
- **ID de filme inexistente:** página 404.
- **Carregamento:** esqueletos animados no formato dos cartões.
- **`localStorage` indisponível** (navegação privada, bloqueio): os botões continuam funcionando durante a visita, sem persistir, e não quebram a página.
- **Token do TMDB ausente:** erro claro no log do servidor na inicialização.

## 7. Testes

- **Unitários (Vitest):** camada TMDB (conversão de dados, URLs de imagem, casos sem pôster, sinopse ou trailer, tratamento de erros, com respostas do TMDB simuladas) e camada Minha Lista (adicionar, remover, persistir, `localStorage` indisponível).
- **Ponta a ponta (Playwright):** Início carrega banner e fileiras → abrir um filme → favoritar e salvar → Minha lista mostra os dois → recarregar a página e os filmes continuam lá. Também: busca retorna resultados e página de gênero carrega mais itens ao rolar.
- **Responsivo:** os testes ponta a ponta rodam em largura de desktop e de celular.

## 8. Publicação

- Repositório git; publicação na Vercel com `TMDB_READ_TOKEN` configurado nas variáveis de ambiente do projeto.
- Arquivo `.env.local` (fora do git) para rodar localmente.

## 9. Fora do escopo da Fase 1

Login, cadastro, senha e perfis; banco de dados; séries; avaliações, comentários e compartilhamento de listas; área administrativa; múltiplos idiomas.
