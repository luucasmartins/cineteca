# CineTeca — Fase 2 (Contas e listas na conta) — Design

**Data:** 2026-09-29
**Status:** aprovada
**Depende de:** Fase 1 (`docs/superpowers/specs/2026-09-29-catalogo-filmes-fase1-design.md`), no ar em https://cineteca-gules.vercel.app

## 1. Objetivo

Cada pessoa passa a ter a própria conta na CineTeca. As listas **Favoritos** e **Salvos para assistir** ficam guardadas na conta, e não mais no navegador, então aparecem iguais em qualquer aparelho.

**Sucesso da Fase 2:**
- Um visitante navega por tudo sem conta.
- Ao tentar favoritar ou salvar, é convidado a entrar ou criar conta, com e-mail e senha ou com Google.
- Depois de entrar, volta para onde estava com o filme já salvo.
- Vê as mesmas listas em outro aparelho.
- Recupera a senha por e-mail.
- Gerencia a própria conta: muda o nome, troca a senha, sai e exclui a conta.

**Quem mantém:** o dono do produto não programa. Tudo usa serviços prontos (Supabase, Vercel, Resend, Google Cloud). As configurações nos painéis são feitas por ele, com um passo a passo.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Acesso sem login | Navegação livre. Favoritar, salvar e ver Minha lista exigem conta. |
| Formas de entrar | E-mail + senha e "Continuar com Google". |
| Confirmação de e-mail no cadastro | Não. A conta funciona na hora. |
| Área da conta | Nome (editável), e-mail (leitura), trocar senha, sair, excluir conta. A foto do Google aparece se existir; não há upload de foto. |
| Notificações | Só confirmações rápidas na tela (toasts). Não há central de notificações. |
| Login e banco | Supabase (Auth + Postgres), integrado ao Next.js pela biblioteca oficial `@supabase/ssr`. |
| E-mails de recuperação de senha | Supabase com SMTP do Resend. O e-mail padrão do Supabase só envia para a equipe do projeto. |
| Listas antigas do navegador | No primeiro login em cada navegador, são levadas para a conta e depois apagadas do navegador. |

## 3. Telas e fluxos

### 3.1 Barra superior
- **Sem login:** botão **Entrar**, estilo secundário, ao lado da busca.
- **Com login:** um avatar redondo com a foto do Google ou, sem foto, a inicial do nome sobre um fundo cinza. Ao clicar, abre um menu com:
  - "Olá, <primeiro nome>"
  - Minha lista
  - Minha conta
  - Sair
- **No celular:** as mesmas opções ficam no menu recolhível. Sem login, aparece "Entrar"; com login, aparecem o nome, "Minha conta" e "Sair".

### 3.2 Páginas de conta
Todas seguem o visual escuro da Fase 1: um cartão centralizado (`bg-superficie`) sobre um fundo com mosaico de pôsteres esmaecido. Os pôsteres vêm de "Em alta hoje"; se a chamada falhar, o fundo é liso.

1. **Entrar** — `/entrar`
   - Botão **Continuar com Google**, a divisória "ou", os campos e-mail e senha, o link "Esqueci minha senha" e o botão **Entrar**.
   - Rodapé do cartão: "Não tem conta? Criar conta".
2. **Criar conta** — `/cadastro`
   - Botão **Continuar com Google**, a divisória "ou", os campos nome, e-mail e senha (mínimo de 8 caracteres) e o botão **Criar conta**.
   - Rodapé do cartão: "Já tem conta? Entrar".
   - A pessoa entra logada imediatamente.
3. **Esqueci minha senha** — `/recuperar-senha`
   - Campo de e-mail e botão **Enviar link**.
   - A resposta é sempre a mesma: "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha." Assim não se revela quem tem cadastro.
4. **Nova senha** — `/redefinir-senha`
   - É a página aberta pelo link do e-mail.
   - Campos nova senha e confirmar senha, e botão **Salvar nova senha**.
   - Ao salvar, leva para Início com o aviso "Senha alterada".
   - Link inválido ou expirado: "Este link expirou. Peça um novo." e um botão para `/recuperar-senha`.
5. **Minha conta** — `/conta` (exige login; sem login, redireciona para `/entrar?voltar=/conta`)
   - **Nome:** campo editável e botão **Salvar**.
   - **E-mail:** só leitura.
   - **Senha:** campos nova senha e confirmar, e botão **Trocar senha**. Uma conta que só entra com Google vê "Você entra com o Google" em vez desses campos.
   - Botão **Sair**.
   - **Zona de perigo — Excluir conta:** o texto explica que a conta e as listas serão apagadas para sempre. Para confirmar, a pessoa digita `EXCLUIR` e clica em **Excluir minha conta**. Depois, volta para Início com o aviso "Sua conta foi excluída".

Quem já está logado e abre `/entrar` ou `/cadastro` é redirecionado para Início.

### 3.3 Favoritar ou salvar sem login
- O botão Favoritar/Salvar abre uma janela: "Entre para salvar seus filmes", com os botões **Entrar** e **Criar conta** e um **X** para fechar. Fecha também com Esc ou clique fora.
- Ao escolher Entrar ou Criar conta, o site guarda a **ação pendente** (o tipo de lista, o resumo do filme e a página atual) no `sessionStorage`, na chave `cineteca:acao-pendente`, e leva a pessoa para `/entrar?voltar=<página atual>` ou `/cadastro?voltar=<página atual>`.
- Depois do login ou do cadastro, inclusive pelo Google, a pessoa volta para `voltar`. O site executa a ação pendente, mostra o toast de confirmação e apaga a ação pendente.
- `voltar` só aceita caminhos internos (que começam com `/` e não com `//`). Qualquer outro valor vira `/`.

### 3.4 Minha lista
- **Sem login:** mostra o convite "Entre para ver seus favoritos e filmes salvos", com os botões **Entrar** e **Criar conta** (`voltar=/minha-lista`).
- **Com login:** igual à Fase 1, com os dados da conta.

### 3.5 Toasts (confirmações rápidas)
- Aparecem na parte de baixo, no centro, empilhados, e somem em 3 s. Ficam em `role="status"`, para leitores de tela.
- Textos:
  - `"<Título>" adicionado aos favoritos`
  - `"<Título>" removido dos favoritos`
  - `"<Título>" adicionado aos salvos`
  - `"<Título>" removido dos salvos`
  - `Não foi possível salvar. Tente de novo.`
  - `Senha alterada`
  - `Nome atualizado`
  - `Sua conta foi excluída`
  - `Trouxemos <N> filme(s) que você tinha salvo neste navegador`

### 3.6 Listas antigas do navegador
Depois do login, se a chave `cineteca:listas:v1` do `localStorage` tiver filmes:
- o site os adiciona à conta, ignorando os que já estão lá;
- apaga a chave;
- mostra o toast "Trouxemos N filme(s)...".

Se a importação falhar, a chave é mantida e o site tenta de novo no próximo carregamento.

## 4. Dados (Supabase)

### 4.1 Tabelas
```sql
-- Nome de exibição de cada conta.
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 80),
  criado_em timestamptz not null default now()
);

-- Um filme numa lista de uma pessoa.
create table public.filmes_lista (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('favoritos', 'salvos')),
  filme_id integer not null check (filme_id > 0),
  titulo text not null,
  poster_url text,
  ano text,
  nota numeric(3, 1),
  criado_em timestamptz not null default now(),
  primary key (usuario_id, tipo, filme_id)
);
```
- Um gatilho em `auth.users`, disparado depois do insert, cria o perfil. O nome vem de `raw_user_meta_data->>'nome'`, que é o cadastro com e-mail, ou de `full_name`/`name`, que é o Google. Se nenhum existir, o nome fica vazio.
- **RLS (segurança por linha)** está ligada nas duas tabelas:
  - `perfis`: cada pessoa lê e atualiza só a própria linha (`id = auth.uid()`).
  - `filmes_lista`: cada pessoa lê, insere e apaga só as próprias linhas (`usuario_id = auth.uid()`).
  - Não há política de update em `filmes_lista`. Um filme é adicionado ou removido, nunca editado.
- Excluir a conta remove `auth.users`, e o `on delete cascade` apaga o perfil e as listas.
- O SQL fica versionado em `supabase/migrations/`. Ele é aplicado colando o conteúdo no SQL Editor do Supabase, nos dois projetos.

### 4.2 Projetos Supabase
- `cineteca`: produção. Usado pelo site na Vercel e no `npm run dev` local.
- `cineteca-testes`: usado só pelos testes automáticos.

### 4.3 Variáveis de ambiente
| Variável | Onde | Pública? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | Sim (endereço do projeto) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel + `.env.local` | Sim (as regras de RLS protegem os dados) |
| `SUPABASE_SECRET_KEY` | Vercel + `.env.local` | **Não.** Só no servidor; usada apenas para excluir contas. |
| `NEXT_PUBLIC_SITE_URL` | Vercel + `.env.local` | Sim. Endereço do site, usado nos links de e-mail e no retorno do Google. |

Os testes usam as mesmas variáveis com os valores de `cineteca-testes`, num arquivo `.env.test.local`, que fica fora do git.

## 5. Arquitetura (código)

```
proxy.ts                     renova a sessão do Supabase a cada requisição
lib/supabase/servidor.ts     cliente Supabase para Server Components e Server Actions (cookies)
lib/supabase/navegador.ts    cliente Supabase para o navegador
lib/supabase/admin.ts        cliente com a chave secreta (server-only), só para excluir conta
lib/auth/validacao.ts        validação de nome, e-mail, senha e caminho de retorno (funções puras)
lib/auth/acoes.ts            Server Actions: entrar, cadastrar, sair, recuperarSenha, redefinirSenha,
                             atualizarNome, trocarSenha, excluirConta
lib/auth/sessao.ts           obterUsuario() no servidor: { id, nome, email, fotoUrl, soGoogle } | null
lib/lista/supabase.ts        criarListaSupabase(cliente, usuarioId): ListaStore
lib/lista/importacao.ts      importa as listas antigas do localStorage para uma ListaStore
lib/lista/acao-pendente.ts   guarda, lê e limpa a ação pendente (sessionStorage)
app/auth/callback/route.ts   troca o código do Google ou do e-mail por uma sessão e redireciona para `voltar`
app/(conta)/entrar, cadastro, recuperar-senha, redefinir-senha, conta   páginas
components/SessaoProvider    disponibiliza o usuário logado ao site (vem do servidor pelo layout)
components/AvisosProvider    toasts (useAvisos().mostrar(texto))
components/JanelaLogin       janela "Entre para salvar seus filmes"
components/MenuUsuario       avatar + menu da barra superior
```

- `ListasProvider` passa a:
  - usar `criarListaSupabase` quando há usuário;
  - não ter lista quando não há usuário. Nesse caso, `alternar` abre a `JanelaLogin`.
- `alternar` continua otimista: atualiza a tela na hora e **espera** a gravação. Se ela falhar, desfaz a mudança na tela e mostra o toast de erro. Cliques repetidos no mesmo filme enquanto uma gravação está em andamento são ignorados.
- Mudanças de sessão (login, logout, outra aba) recarregam as listas. Cada aparelho busca as listas ao carregar a página; não há atualização ao vivo entre aparelhos.
- `lib/lista/local.ts` fica só para a importação (§3.6).
- O `proxy.ts` só renova a sessão. A proteção de `/conta` é feita na própria página.
- O endereço de retorno do Google e do e-mail de recuperação é `<NEXT_PUBLIC_SITE_URL>/auth/callback?voltar=...`.

## 6. Erros

| Situação | Mensagem |
|---|---|
| Login com dados errados | "E-mail ou senha incorretos" |
| Cadastro com e-mail já usado | "Já existe uma conta com esse e-mail" |
| Senha curta | "A senha precisa ter pelo menos 8 caracteres" |
| Senhas diferentes (nova senha) | "As senhas não são iguais" |
| E-mail inválido | "Digite um e-mail válido" |
| Nome vazio no cadastro | "Digite seu nome" |
| Muitas tentativas (limite do Supabase) | "Muitas tentativas. Espere um pouco e tente de novo." |
| Supabase fora do ar ou sem rede | "Não foi possível conectar. Tente em instantes." |
| Falha ao salvar ou remover filme | Desfaz na tela + toast "Não foi possível salvar. Tente de novo." |
| Login com Google cancelado ou com erro | Volta para `/entrar` com "Não foi possível entrar com o Google." |
| Link de recuperação inválido ou expirado | "Este link expirou. Peça um novo." |
| Excluir conta sem digitar EXCLUIR | O botão fica desabilitado |

Os erros inesperados do Supabase são registrados no log do servidor com o prefixo `[CineTeca]`, sem senhas nem tokens.

## 7. Testes

- **Unitários (Vitest):**
  - validações (§6);
  - validação do caminho `voltar` (só caminhos internos);
  - `criarListaSupabase`, com um cliente Supabase simulado;
  - importação das listas antigas (sem duplicar, apaga a chave só depois de dar certo);
  - ação pendente (guardar, ler, limpar, dados corrompidos);
  - mensagens de erro a partir dos códigos do Supabase.
- **Ponta a ponta (Playwright), contra o projeto `cineteca-testes`:**
  - Cada teste cria um usuário com um e-mail único (`teste+<aleatório>@cineteca.test`) e o apaga no fim, usando a chave secreta do projeto de testes.
  - O TMDB continua simulado, como na Fase 1.
  - Fluxos cobertos:
    - favoritar sem login → janela → criar conta → volta com o filme salvo;
    - sair e entrar de novo → a lista continua lá;
    - outro navegador (novo contexto) → mesma lista;
    - importar listas antigas do navegador;
    - senha errada → mensagem;
    - e-mail já cadastrado → mensagem;
    - mudar nome → aparece na barra;
    - trocar senha → entrar com a nova;
    - excluir conta → não consegue mais entrar;
    - `/conta` sem login → vai para `/entrar`;
    - Minha lista sem login → convite.
  - Os testes rodam em desktop e celular.
- **Conferência manual com o dono**, no fim: "Continuar com Google" e o e-mail de "Esqueci minha senha" chegando pelo Resend.

## 8. Configuração externa (feita pelo dono, com guia passo a passo)

1. Criar os projetos `cineteca` e `cineteca-testes` no Supabase e aplicar o SQL nos dois.
2. Em cada projeto, em Authentication:
   - deixar "Confirm email" desligado;
   - configurar Site URL e Redirect URLs: produção e `http://localhost:3000` para `cineteca`; `http://localhost:3100` para `cineteca-testes`.
3. Criar a credencial OAuth no Google Cloud e ligar o provedor Google no projeto `cineteca`.
4. Criar uma conta no Resend, verificar um domínio de envio e configurar o SMTP no projeto `cineteca`. Sem domínio próprio, o Resend só envia para o e-mail do dono. Nesse caso, a recuperação de senha para o público fica pendente até haver um domínio.
5. Colocar as variáveis (§4.3) na Vercel e no `.env.local`, e as de testes no `.env.test.local`.

## 9. Fora do escopo da Fase 2

Central de notificações e avisos de disponibilidade; upload de foto de perfil; confirmação de e-mail no cadastro; outros provedores de login (Apple, Facebook); listas públicas ou compartilhadas; avaliações e comentários; atualização em tempo real entre aparelhos abertos ao mesmo tempo; área administrativa.
