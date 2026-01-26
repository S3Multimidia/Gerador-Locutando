
# ⚡ Guia de Configuração SUPABASE (Banco de Dados + Storage)

Este projeto está configurado para usar Supabase como backend persistente (BD PostgreSQL e Storage S3).
Isso resolve o problema de perda de dados ao rodar na Vercel.

## 1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie uma conta/projeto.
2. Anote a senha do banco de dados (Database Password) que você criar.

## 2. Obter Connection String (BD)
1. No topo da tela do Dashboard, clique no botão cinza **"Connect"** (perto do nome do projeto).
2. Na janela que abrir, clique na aba **"URI"**.
3. Copie a string. Ela se parece com:
   `postgresql://postgres.yajcdvpvqrligodakfgg:[SENHA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
4. **Importante:** Substitua `[YOUR-PASSWORD]` pela senha que você criou no passo 1. Se esqueceu, vá em Settings -> Database -> Reset Password.
5. Cole essa linha no seu `.env` em `DATABASE_URL`.

## 3. Configurar Storage (Arquivos)
1. No dashboard, vá em **Storage** (ícone de pasta).
2. Clique em **New Bucket**.
3. Nomeie como `media` (ou outro nome, mas lembre-se dele).
4. Deixe como **Public Bucket** (importante para que as imagens/audios sejam acessíveis).
5. Salve.

## 4. Obter Chaves de Acesso S3
1. Vá em **Project Settings** > **Storage**.
2. Em **S3 Access Keys**, clique em **Generate New Key**.
3. Copie `Access Key ID` e `Secret Access Key`.
4. Copie também o `Endpoint URL` (ex: `https://<seu-projeto>.supabase.co/storage/v1/s3`).

## 5. Configurar Variáveis de Ambiente (.env)
Adicione estas variáveis no seu arquivo `.env` (local) e nas **Configurações da Vercel**:

```ini
# Ativa modo S3
USE_S3=True

# Banco de Dados
DATABASE_URL="postgresql://postgres....."

# Configuração Storage S3
SUPABASE_ACCESS_KEY_ID="sua_access_key_id"
SUPABASE_SECRET_ACCESS_KEY="sua_secret_access_key"
SUPABASE_STORAGE_BUCKET_NAME="media"
SUPABASE_S3_ENDPOINT_URL="https://seu-projeto.supabase.co/storage/v1/s3"
```

## 6. Migrar o Banco de Dados
Ao conectar no novo banco (Supabase) pela primeira vez, ele estará vazio. Você precisa rodar as migrações:

**Opção A (Local rodando contra Supabase):**
Se configurar o `.env` local com as chaves do Supabase e rodar:
`python manage.py migrate`
Ele criará as tabelas no Supabase.

**Opção B (Via Vercel Build):**
Geralmente o comando de build da Vercel para Django inclui `python manage.py migrate`.

## 7. Criar Superusuário (Admin)
Após migrar, crie seu admin no banco novo:
`python manage.py createsuperuser`
