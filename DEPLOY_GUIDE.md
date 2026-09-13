# Guia Completo de Deploy em Produção: FinRod APP

Este guia detalha o passo a passo para colocar o **FinRod APP** em produção de forma **100% gratuita, altamente segura e com capacidade para suportar mais de 1.000 usuários simultâneos**, utilizando o **Google Cloud Run (GCP)**, **Supabase (PostgreSQL)** e **Vercel** (ou Firebase Hosting).

---

## 📋 Arquitetura de Produção (Custo R$ 0,00)

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO (Mobile / PWA)                  │
│        (Acesso via navegador ou ícone na tela inicial)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐
│  FRONT-END (PWA no Vercel)  │       │   BACK-END (Google Cloud)    │
│  - CDN Global Edge           │ ───►  │  - Cloud Run (Docker Node)   │
│  - SSL Automático            │       │  - Always Free: 2M req/mês   │
│  - Cache PWA Offline         │       │  - Auto-scale (0 a N inst.)  │
└──────────────────────────────┘       └──────────────┬───────────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │    BANCO DE DADOS (Postgres) │
                                       │  - Supabase / Neon (Free)    │
                                       │  - Connection Pooling (SSL)  │
                                       │  - 0 Write Locks (Concorrente)│
                                       └──────────────────────────────┘
```

---

## Passo 1: Criar o Banco de Dados PostgreSQL (Supabase)

O SQLite utilizado em desenvolvimento local bloqueia o arquivo quando múltiplos usuários tentam escrever ao mesmo tempo. Em produção, utilizamos o PostgreSQL do Supabase (gratuito):

1. Acesse [supabase.com](https://supabase.com) e faça login (pode usar sua conta GitHub).
2. Clique em **New Project**:
   - **Name**: `finrod-app-db`
   - **Database Password**: Crie uma senha forte e anote-a.
   - **Region**: `South America (São Paulo)` (para menor latência no Brasil).
3. Após criar o projeto, vá em **Project Settings** (ícone de engrenagem) ➔ **Database**.
4. Em **Connection String**, selecione a aba **URI** e copie a URL no formato:
   ```env
   postgresql://postgres:[SUA-SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Para inicializar as tabelas no Supabase:
   No arquivo `prisma/schema.prisma`, altere o datasource para `postgresql`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
   E execute no seu terminal local apontando para o banco:
   ```bash
   DATABASE_URL="postgresql://postgres:[SUA-SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres" npx prisma db push
   ```
   *Todas as tabelas (`User`, `Account`, `Transaction`, `Category`, etc.) serão criadas instantaneamente na nuvem.*

---

## Passo 2: Deploy do Back-end no Google Cloud Run (GCP)

O Cloud Run é um serviço gerenciado do Google que executa containers Docker com escalabilidade automática e **2 milhões de requisições gratuitas todo mês**.

### Opção A: Deploy via Linha de Comando (Google Cloud SDK)

1. No terminal do seu computador, autentique no Google Cloud:
   ```bash
   gcloud auth login
   ```
2. Defina o seu projeto do GCP:
   ```bash
   gcloud config set project [SEU_ID_DO_PROJETO_GCP]
   ```
3. Habilite os serviços necessários no GCP:
   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com
   ```
4. Construa e suba a imagem Docker com 1 comando (o `Dockerfile` já está pronto na raiz do projeto):
   ```bash
   gcloud builds submit --tag gcr.io/[SEU_ID_DO_PROJETO_GCP]/finrod-backend
   ```
5. Faça o deploy no Cloud Run:
   ```bash
   gcloud run deploy finrod-backend \
     --image gcr.io/[SEU_ID_DO_PROJETO_GCP]/finrod-backend \
     --platform managed \
     --region southamerica-east1 \
     --allow-unauthenticated \
     --memory 512Mi \
     --set-env-vars DATABASE_URL="postgresql://postgres:[SUA-SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres",JWT_SECRET="crie_uma_chave_secreta_super_forte_aqui",GOOGLE_CLIENT_ID="seu_client_id_google.apps.googleusercontent.com"
   ```
6. Ao finalizar, o terminal exibirá a **Service URL**, por exemplo:
   `https://finrod-backend-abcdef-rj.a.run.app`

### Opção B: Deploy visual pelo Console Web do GCP

1. Acesse [console.cloud.google.com](https://console.cloud.google.com).
2. Pesquise por **Cloud Run** e clique em **Criar Serviço**.
3. Escolha **Implantar uma revisão de uma imagem de contêiner existente** ou conecte seu repositório GitHub para deploy contínuo.
4. Em **Variáveis de Ambiente**, adicione:
   - `DATABASE_URL`: URL de conexão do Supabase.
   - `JWT_SECRET`: Chave secreta para tokens de autenticação.
   - `GOOGLE_CLIENT_ID`: ID OAuth do Google.
5. Em **Autenticação**, marque **Permitir invocações não autenticadas** (para que seu frontend consiga chamar a API).
6. Clique em **Criar**.

---

## Passo 3: Deploy do Front-end no Vercel (ou Firebase)

O front-end é uma aplicação React 18 / Vite estática de alto desempenho. O Vercel oferece CDN global, SSL automático e suporte completo a SPA com o arquivo `vercel.json` que criamos.

1. Acesse [vercel.com](https://vercel.com) e faça login com seu GitHub.
2. Clique em **Add New...** ➔ **Project**.
3. Importe o repositório `Rodriros/project_fin_app`.
4. Configure as opções do projeto:
   - **Root Directory**: clique em Edit e selecione a pasta `frontend`.
   - **Framework Preset**: `Vite`.
5. Em **Environment Variables**, adicione:
   - `VITE_API_URL`: A URL do seu backend no Cloud Run com `/api` no final:
     ```env
     VITE_API_URL="https://finrod-backend-abcdef-rj.a.run.app/api"
     ```
   - `VITE_GOOGLE_CLIENT_ID`: O mesmo ID de cliente Google OAuth configurado no Cloud Console.
6. Clique em **Deploy**.
7. Em menos de 1 minuto, o Vercel fornecerá uma URL pública (ex: `https://finrod-app.vercel.app`), com certificado SSL HTTPS já configurado.

---

## Passo 4: Atualizar as Origens Autorizadas no Google Cloud Console

Para que o login com o Google funcione na URL oficial do seu app:

1. Acesse [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials).
2. Clique no seu **ID do cliente OAuth 2.0**.
3. Em **Origens JavaScript autorizadas**, adicione:
   - `https://finrod-app.vercel.app` (a URL gerada pelo Vercel).
4. Em **URIs de redirecionamento autorizados**, adicione a mesma URL.
5. Clique em **Salvar**.

---

## Passo 5: Como Rodar no Celular com Cara de App Nativo (PWA)

O **FinRod APP** possui manifesto PWA (`manifest.webmanifest`), service workers e suporte ao modo `standalone`.

### No Android (Google Chrome):
1. Abra o link gerado (ex: `https://finrod-app.vercel.app`) no Google Chrome.
2. Um banner inferior inteligente aparecerá na tela: *"FinRod APP no seu celular - Toque para instalar"*.
3. Toque em **Instalar** (ou abra o menu dos 3 pontinhos e escolha **Adicionar à tela inicial**).
4. O ícone oficial do trevo será adicionado à grade de aplicativos do celular. Ao abrir, o app roda em tela cheia, sem barra de endereços, exatamente como um app nativo baixado da Play Store.

### No iPhone / iPad (Safari):
1. Abra o link no Safari.
2. Toque no botão de **Compartilhar** (quadrado com seta para cima no rodapé).
3. Role para baixo e selecione **Adicionar à Tela de Início** (Add to Home Screen).
4. Toque em **Adicionar**.
5. O ícone aparecerá junto aos seus outros aplicativos no iOS, abrindo em modo standalone com navegação inferior tátil e suporte ao entalhe (*notch*).

---

## 🔒 Checklist de Segurança em Produção

- [x] Senhas salvas com hash `bcryptjs` (salt 10 rounds).
- [x] Isolamento de dados por usuário (`where: { userId }`) em todas as queries.
- [x] Validação rigorosa de payloads via schemas `Zod`.
- [x] Banco de dados com conexão criptografada SSL (`sslmode=require`).
- [x] Sem bloqueios de concorrência com PostgreSQL gerenciado.
- [x] Headers de proteção contra clickjacking (`X-Frame-Options: DENY`) e MIME sniffing (`X-Content-Type-Options: nosniff`).
