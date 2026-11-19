# Agendly P4 - Cloudflare Pages

## Requisitos

- Uma conta Cloudflare e um repositorio Git conectado ao Pages (ou deploy pela Wrangler CLI). Pages Functions precisam ser publicadas junto com o codigo; o envio manual de uma pasta pela interface do Pages nao publica a API.
- Um banco Cloudflare D1 vinculado ao projeto.
- HTTPS ativo no dominio.
- Um segredo `SESSION_SECRET` com pelo menos 32 caracteres, configurado no painel da Cloudflare, nunca no repositorio.
- Para recuperacao por e-mail, uma conta de envio transacional (Resend) e um remetente verificado.

Nao e necessario instalar XAMPP, PHP, Apache ou MySQL para publicar essa versao.

## Publicar o projeto

1. Envie o conteudo da pasta `p4` para um repositorio Git e conecte o repositorio em **Workers & Pages > Create > Pages > Connect to Git**.
2. Configure a raiz do projeto como `p4` (se estiver dentro de um repositorio maior). Como nao ha etapa de build, deixe o comando de build vazio e use `.` como diretorio de saida.
3. Crie um banco D1, por exemplo `agendly-prod`.
4. No console SQL do D1, execute o conteudo de `migrations/0001_init.sql`. Isso cria as tabelas vazias; nao importa contas ou dados de demonstracao.
5. No projeto Pages, abra **Settings > Functions > D1 database bindings**. Adicione a vinculacao `DB` para producao. Se usar deploys de preview, crie outro banco D1 para testes e vincule-o como `DB` no ambiente de preview; nao compartilhe o banco de producao com previews.
6. Em **Settings > Variables and Secrets**, crie para producao (e configure valores separados no preview, se usado):
   - `SESSION_SECRET`: segredo aleatorio com no minimo 32 caracteres. Marque como secret.
   - `RESEND_API_KEY`: chave de API do Resend, como secret (necessaria somente para recuperacao de senha por e-mail).
   - `AGENDLY_MAIL_FROM`: remetente aprovado no Resend, por exemplo `Agendly <no-reply@seudominio.com>` (necessario para recuperacao de senha).
7. Salve e publique novamente para que Functions recebam os bindings e variaveis.
8. Acesse o dominio HTTPS e crie uma conta de cliente e uma conta de negocio pelos formularios separados.
9. Em **Settings > Runtime > Fail open / closed**, escolha **Fail closed** para evitar que paginas estaticas sejam servidas sem as verificacoes do middleware caso o limite de Pages Functions seja atingido.

O arquivo `_routes.json` envia as requisicoes das paginas e da API pelas Pages Functions, mas exclui CSS, JavaScript e imagens da execucao do middleware. Arquivos PHP, SQL, texto, configuracao e documentacao sao bloqueados pelo middleware.

## Banco e contas

Cada novo banco D1 comeca vazio. Contas MySQL antigas nao sao migradas automaticamente; cadastre novamente as contas. Os hashes de senha do backend PHP legado nao sao aceitos pelo novo backend D1. Antes de remover qualquer banco antigo, exporte os dados que precisam ser preservados e planeje uma migracao revisada; nunca publique dumps ou credenciais.

As contas de demonstracao em `contas-demo.txt` e os seeds SQL sao apenas locais. Nao os importe para producao.

## Recuperacao de senha

O envio de e-mail so funciona depois de configurar `RESEND_API_KEY`, `AGENDLY_MAIL_FROM` e verificar o dominio/remetente no Resend. Sem essas variaveis, o sistema nao expoe se o e-mail existe e registra no log que o envio precisa ser configurado; o link nao sera enviado.

## Limites e operacao

- Pagamentos nao estao integrados.
- Configure equipe, servicos, expediente, intervalos e datas de fechamento no editor da vitrine. O expediente e compartilhado pela equipe e os horarios sao validados novamente no servidor no momento da reserva.
- O login, cadastro e recuperacao de senha tem limites de tentativas por endereco de rede; monitore respostas HTTP 429 e os logs do Pages.
- Revise termos, privacidade, retencao de dados e solicitacoes de exclusao com responsavel juridico.
- Configure alertas, rotina de exportacao/backups do D1 e teste restauracao.
- O binding do D1 e `DB`; o segredo de sessao e `SESSION_SECRET`. Ausencia de qualquer configuracao necessaria impede o uso seguro das rotas autenticadas.

`api/` ainda contem o backend PHP legado como referencia para instalacoes antigas. Essa implementacao nao e executada no Cloudflare Pages e seus arquivos sao bloqueados para acesso publico. A API ativa desta publicacao esta em `functions/api.js`.
