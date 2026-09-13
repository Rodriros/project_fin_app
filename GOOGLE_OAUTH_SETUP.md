# 🔑 Guia Completo: Configuração do Google OAuth 2.0 (FinRod APP v1.0)

Este guia explica passo a passo como criar e configurar suas credenciais do **Google OAuth 2.0 (Google Identity Services)** para rodar o FinRod APP em desenvolvimento local e publicar em produção.

---

## 📋 Passo 1: Acessar o Google Cloud Console
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Faça login com sua conta Google.
3. No topo da página, clique no seletor de projetos e crie um **Novo Projeto** (ex: `FinRod APP Production` ou `FinRod APP Dev`).

---

## 🛡️ Passo 2: Configurar a Tela de Consentimento OAuth (OAuth Consent Screen)
1. No menu lateral esquerdo, vá em **APIs e Serviços** > **Tela de permissão OAuth** (ou *OAuth consent screen*).
2. Selecione o tipo de usuário:
   - Escolha **Externo** (*External*) para permitir que qualquer pessoa crie conta no seu App.
   - Clique em **Criar**.
3. Preencha as informações básicas do aplicativo:
   - **Nome do App**: `FinRod APP` (ou o nome comercial da sua marca).
   - **Email de suporte do usuário**: Seu email de contato.
   - **Logotipo do App**: (Opcional) Faça upload do logo do FinRod APP (o ícone do trevo).
   - **Domínio do aplicativo**: Em produção, preencha a URL do seu domínio.
   - **Email do desenvolvedor**: Seu email.
4. Clique em **Salvar e Continuar**.
5. Na etapa **Escopos** (*Scopes*), clique em **Adicionar ou remover escopos** e selecione:
   - `.../auth/userinfo.email` (Ver seu endereço de email principal)
   - `.../auth/userinfo.profile` (Ver suas informações pessoais)
   - `openid` (Associar você aos seus dados pessoais no Google)
6. Clique em **Salvar e Continuar**.
7. Na etapa **Usuários de teste** (*Test Users*):
   - Enquanto o app estiver em modo *Testing* no Google Console, adicione seu email e os emails que vão testar o app.
8. Clique em **Salvar e Continuar**.

---

## ⚡ Passo 3: Criar as Credenciais do Cliente Web (OAuth Client ID)
1. No menu lateral esquerdo, clique em **Credenciais** (*Credentials*).
2. Clique no botão **+ Criar Credenciais** (*+ Create Credentials*) no topo e selecione **ID do cliente OAuth** (*OAuth client ID*).
3. Em **Tipo de aplicativo** (*Application type*), selecione: **Aplicativo da Web** (*Web application*).
4. Nome: `FinRod APP Web Client`.
5. Em **Origens JavaScript autorizadas** (*Authorized JavaScript origins*), adicione:
   - Para desenvolvimento local:
     - `http://localhost:5173`
     - `http://localhost:3000` (se aplicável)
     - `http://127.0.0.1:5173`
   - Para produção:
     - `https://seu-dominio-de-producao.com`
6. Em **URIs de redirecionamento autorizados** (*Authorized redirect URIs*):
   - Adicione: `http://localhost:5173` e `https://seu-dominio-de-producao.com`
7. Clique em **Criar**.
8. Uma janela será exibida com seu **ID do Cliente** (ex: `123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com`).

---

## ⚙️ Passo 4: Configurar as Variáveis de Ambiente no Projeto

### 1. No Frontend (`frontend/.env`):
Abra o arquivo `frontend/.env` e adicione o seu Client ID:
```env
VITE_API_URL="http://localhost:3333/api"
VITE_GOOGLE_CLIENT_ID="SEU_CLIENT_ID_AQUI.apps.googleusercontent.com"
```

### 2. No Backend (`.env` na raiz do projeto):
Abra o arquivo `.env` e adicione o mesmo Client ID e sua chave secreta JWT:
```env
PORT=3333
DATABASE_URL="file:./dev.db"
JWT_SECRET="sua_chave_secreta_jwt_longa_e_segura"
GOOGLE_CLIENT_ID="SEU_CLIENT_ID_AQUI.apps.googleusercontent.com"
```

---

## 🚀 Passo 5: Reiniciar e Testar
1. Reinicie os servidores backend e frontend:
   ```bash
   # Terminal 1 - Backend
   npm run dev

   # Terminal 2 - Frontend
   npm run dev:frontend
   ```
2. Abra `http://localhost:5173/login` ou `http://localhost:5173/register`.
3. O botão oficial do Google estará renderizado e ativo. Ao clicar, a autenticação será feita com segurança criptográfica de ponta a ponta!

---

## 💡 Dica para Produção / Comercialização
- No Google Cloud Console, quando for lançar publicamente para seus clientes, mude o status do aplicativo de **Teste** para **Em Produção** na tela de consentimento.
- Certifique-se de usar `HTTPS` no seu domínio de produção, pois o Google Identity Services exige protocolo seguro em domínios públicos (em `localhost` o HTTP é permitido).
