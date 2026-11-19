# Agendly P4

Agendly e uma plataforma de descoberta e agendamento de servicos, com fluxos distintos para clientes e negocios.

## Publicacao

O projeto pode ser publicado na **Vercel** usando a API serverless adaptada e o banco gratuito Turso. Consulte [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) para configurar as variaveis e executar a migracao.

Tambem existe o guia antigo para **Cloudflare Pages e D1** em [DEPLOYMENT.md](./DEPLOYMENT.md).

## Telas e arquivos principais

- `index.html`: entrada e descoberta de negocios.
- `cliente/`: cadastro, login, servicos, vitrines, agendamento, agenda, perfil, suporte e documentos legais.
- `loja/`: cadastro e login do negocio, editor da vitrine, agenda, perfil e notificacoes.
- `functions/api.js`: autenticacao, perfil, vitrines, disponibilidade, reservas e suporte.
- `functions/_middleware.js`: protecao de paginas, verificacao de conta e bloqueio de arquivos internos.
- `functions/_auth.js`: sessoes assinadas e cookie HttpOnly.
- `migrations/0001_init.sql`: esquema SQLite para Cloudflare D1.
- `api/`: backend PHP legado, nao executado pela publicacao Cloudflare Pages.
- `banco de dados/`: esquema e seeds MySQL antigos, apenas para referencia ou ambiente legado.

O cadastro de cliente solicita nome, CPF, e-mail, telefone e senha. O cadastro de negocio solicita nome, CNPJ, e-mail, telefone e senha. Senhas novas sao armazenadas com PBKDF2; os dados de conta sao persistidos no D1. O projeto tambem valida expediente, intervalos, fechamentos e conflitos de agendamento no servidor.

## Limites atuais

Pagamentos nao estao integrados. Recuperacao de senha exige configurar um provedor de e-mail transacional, conforme o guia de publicacao. O banco D1 novo comeca sem contas: os usuarios precisam se cadastrar novamente; hashes do backend PHP antigo nao sao compativeis.
