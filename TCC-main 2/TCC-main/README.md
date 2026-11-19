# Agendly - Frontend Prototype

Projeto de interface simples para protótipo de login/cadastro de clientes e negócios.

Estrutura do projeto

- `index.html` — Página inicial (escolha de login)
- `cliente.html` — Tela de login do cliente
- `cadastro.html` — Tela de cadastro (CPF/CNPJ)
- `dashboard.html` — Página de exemplo pós-login
- `css/styles.css` — Estilos principais organizados por seções
- `js/app.js` — Script principal com funções documentadas
- `img/` — Imagens e assets

Como usar

1. Abra `login.html` em um navegador moderno ou inicie um servidor local.
2. O login e o cadastro são demonstrações client-side; não existe autenticação de servidor.

Modo de desenvolvimento local

- Nas páginas HTML, o arquivo `js/dev-mode.js` exibe um controle de modo apenas em `file://`, `localhost`, `127.0.0.1` ou `::1`.
- Clique em **Entrar como desenvolvedor** para abrir a área do cliente sem preencher o login. A escolha dura somente até fechar a aba.
- Clique em **Voltar ao modo cliente** para limpar o modo e retornar à tela de login normal.
- Para desativar o recurso, defina `DEV_MODE_ENABLED` como `false` em `js/dev-mode.js` ou remova as inclusões desse arquivo nas páginas HTML.
- Esse atalho é somente para prototipagem local: não oferece segurança e não deve ser usado em produção ou como substituto de autenticação no servidor.

Notas de organização

- HTMLs possuem comentários de topo e landmarks (role/aria-labelledby) para facilitar leitura e acessibilidade.
- `js/app.js` foi refatorado em funções: `initPasswordToggle`, `initRegisterForm`, `initLoginForm`.
- `css/styles.css` contém um cabeçalho com a estrutura do arquivo por seções.

Contribuições

Sinta-se livre para melhorar validações (ex.: máscaras para CPF/CNPJ), internacionalização, e integrar um backend real.
