# Estrutura do Agendly P4

`p4` e a versao oficial do Agendly. A publicacao principal usa Cloudflare Pages Functions e D1.

## Rotas e acesso

- `index.html`: descoberta de negocios e servicos publicados.
- `cliente/`: agenda, perfil, vitrine publica, suporte e documentos do cliente.
- `loja/`: editor da vitrine, agenda, perfil e notificacoes do estabelecimento.
- `functions/_middleware.js`: valida sessao e tipo de conta nas paginas, e bloqueia arquivos internos.
- `functions/api.js`: autenticacao, perfil, vitrines, disponibilidade, reservas e suporte.
- `functions/_auth.js`: cookie de sessao assinado e protecao CSRF.
- `migrations/0001_init.sql`: tabelas e indices usados pelo D1.
- `api/`: backend PHP legado, nao usado nem publicado como API no Cloudflare Pages.

## JavaScript do navegador

- `js/app.js`: formularios de entrada e cadastro, validacoes e calendario do cliente.
- `js/p4-interactions.js`: navegacao autenticada, pesquisa, agenda, filtros, notificacoes, perfil e feedback.
- `js/business-store-editor.js`: edicao, rascunho e publicacao da vitrine do negocio, incluindo equipe e expediente.
- `js/business-storefront.js`: leitura e renderizacao de vitrines e listagens.
- `js/appointment-actions.js`: detalhes, recibo, cancelamento, remarcacao e novo agendamento.
- `js/dev-mode.js`: controles auxiliares de ambiente local; nao substitui a sessao do servidor.
- `js/service-profiles.js`: compatibilidade com telas antigas de demonstracao.

## Dados e publicacao

- `migrations/0001_init.sql`: esquema D1 usado pelo Pages Functions.
- `banco de dados/agendly_schema.sql`, `banco de dados/migracao_profissionais.sql` e `banco de dados/agendly_demo_seed.sql`: arquivos MySQL legados, nao importar no D1.
- `_routes.json`: direciona paginas e API pelo middleware e exclui recursos estaticos.
- `DEPLOYMENT.md`: publicacao, configuracao D1, segredos, e-mail e limites operacionais.

O D1 novo inicia vazio e requer o cadastro de novas contas. O Pages middleware protege as telas; a API valida sessao, CSRF, permissoes e disponibilidade antes de alterar dados.
