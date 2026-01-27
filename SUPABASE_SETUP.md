# Configuração do Supabase (Obrigatório)

Para corrigir o erro de login "Erro ao conectar com servidor" definitivamente, migramos a autenticação para usar o **Supabase** diretamente (igual ao seu outro projeto).

Para que funcione, você precisa configurar as chaves do seu projeto Supabase.

## Passo 1: Pegar as Chaves no Supabase
1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api).
2. Vá em **Project Settings** -> **API**.
3. Copie a **Project URL**.
4. Copie a **anon public key**.

## Passo 2: Configurar Localmente (.env)
Crie ou edite o arquivo `.env` na raiz do projeto e adicione:

```env
VITE_SUPABASE_URL=Sua_URL_Do_Supabase_Aqui
VITE_SUPABASE_ANON_KEY=Sua_Key_Anon_Aqui
```

## Passo 3: Configurar na Vercel
1. Acesse o painel do seu projeto na Vercel.
2. Vá em **Settings** -> **Environment Variables**.
3. Adicione as mesmas variáveis:
   - **Key:** `VITE_SUPABASE_URL` | **Value:** (Sua URL)
   - **Key:** `VITE_SUPABASE_ANON_KEY` | **Value:** (Sua Key)
4. **IMPORTANTE:** Vá na aba **Deployments** e clique em **Redeploy** (ou faça um novo push) para que as novas variáveis entrem em vigor.

## Passo 4: Criar Usuário
No painel do Supabase -> Authentication -> Users, certifique-se de criar o usuário com o email e senha que você deseja usar para logar.

---
**Observação:**
O sistema continuará respeitando as permissões de Admin/User baseadas no email `s3multimidia@gmail.com` (Admin), mas a senha será verificada pelo Supabase.
