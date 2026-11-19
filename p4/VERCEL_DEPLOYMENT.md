# Agendly P4 - Publicação na Vercel

## 1. Banco gratuito Turso

1. Crie uma conta no Turso: https://turso.tech/
2. Instale o CLI ou use o painel do Turso.
3. Crie o banco e obtenha `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`.
4. Instale as dependências:

   npm install

5. Configure as variáveis no terminal e execute:

   TURSO_DATABASE_URL="libsql://seu-banco.turso.io" TURSO_AUTH_TOKEN="seu-token" npm run setup:database

No Windows PowerShell, use `$env:TURSO_DATABASE_URL="..."` e `$env:TURSO_AUTH_TOKEN="..."` antes do comando.

## 2. Publicar na Vercel

1. Envie o projeto para o GitHub.
2. Na Vercel, importe o repositório.
3. Configure a raiz do projeto como `p4`.
4. Em **Settings > Environment Variables**, adicione:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `SESSION_SECRET` com pelo menos 32 caracteres
   - `RESEND_API_KEY` (opcional, recuperação por e-mail)
   - `AGENDLY_MAIL_FROM` (opcional, remetente Resend)
5. Faça o deploy.

A API fica disponível em `/api`, usando o adaptador Turso.

## Observação

O backend antigo em PHP/MySQL não será usado pela publicação da Vercel. Cadastros e agendamentos passarão a usar o banco Turso. As contas antigas do XAMPP não são migradas automaticamente.
