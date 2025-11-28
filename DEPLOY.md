# Guia de Publicação (Deploy)

Este guia explica como colocar o **Gerador Locutando** online e configurar seu domínio próprio.

## Recomendação: Vercel

Recomendamos usar a **Vercel** pois é gratuita para projetos pessoais, extremamente rápida e feita pelos criadores das tecnologias que usamos.

### Passo 1: Preparação
1. Certifique-se de que seu projeto está salvo no **GitHub**.
2. Tenha sua chave da API do Google (Gemini) em mãos.

### Passo 2: Publicando na Vercel
1. Crie uma conta em [vercel.com](https://vercel.com).
2. Clique em **"Add New..."** -> **"Project"**.
3. Selecione seu repositório do GitHub (Gerador-Locutando).
4. Na tela de configuração ("Configure Project"):
   - **Framework Preset:** Vite (deve detectar automaticamente).
   - **Root Directory:** `./` (padrão).
   - **Environment Variables:**
     - Clique para expandir.
     - Adicione uma nova variável:
       - **Name:** `GEMINI_API_KEY`
       - **Value:** (Cole sua chave API aqui - a mesma que está no seu arquivo .env)
5. Clique em **"Deploy"**.

Aguarde alguns instantes. Quando terminar, você verá uma tela com fogos de artifício e o link do seu site (ex: `gerador-locutando.vercel.app`).

### Passo 3: Configurando Domínio Próprio
1. No painel do seu projeto na Vercel, vá em **Settings** -> **Domains**.
2. Digite seu domínio (ex: `seusite.com.br`) e clique em **Add**.
3. A Vercel vai mostrar configurações de DNS que você precisa fazer onde comprou o domínio (Registro.br, GoDaddy, etc.).
   - Geralmente é criar uma entrada **A** apontando para `76.76.21.21` ou um **CNAME** para `cname.vercel-dns.com`.
4. Siga as instruções da tela. A propagação pode levar de alguns minutos a algumas horas.

---

## Alternativa: Netlify

O processo é muito similar no [Netlify](https://www.netlify.com):
1. "Add new site" -> "Import an existing project".
2. Conecte ao GitHub.
3. Em "Build settings", o comando é `npm run build` e o diretório é `dist`.
4. Em "Advanced build settings" ou "Environment variables", adicione a `GEMINI_API_KEY`.
