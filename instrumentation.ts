export function register() {
  if (!process.env.TMDB_READ_TOKEN) {
    console.error(
      '[CineTeca] TMDB_READ_TOKEN não está configurado. Crie o arquivo .env.local (veja .env.local.example) ou configure a variável na Vercel.',
    )
  }
}
