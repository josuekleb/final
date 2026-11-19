CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('cliente', 'loja')),
  nome TEXT NOT NULL CHECK (length(nome) BETWEEN 2 AND 160),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  senha_hash TEXT NOT NULL,
  telefone TEXT,
  bio TEXT,
  documento TEXT UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  email_verificado_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo);

CREATE TABLE IF NOT EXISTS negocios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Serviços',
  descricao TEXT,
  endereco TEXT,
  telefone TEXT,
  publicado INTEGER NOT NULL DEFAULT 0 CHECK (publicado IN (0, 1)),
  vitrine_json TEXT NOT NULL CHECK (json_valid(vitrine_json)),
  rascunho_json TEXT NOT NULL CHECK (json_valid(rascunho_json)),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_negocio_publicado ON negocios(publicado);

CREATE TABLE IF NOT EXISTS servicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco REAL NOT NULL DEFAULT 0 CHECK (preco >= 0),
  duracao_minutos INTEGER NOT NULL DEFAULT 30 CHECK (duracao_minutos > 0),
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  UNIQUE (negocio_id, nome),
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_servicos_negocio ON servicos(negocio_id, ativo);

CREATE TABLE IF NOT EXISTS horarios_funcionamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id INTEGER NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  abre TEXT,
  fecha TEXT,
  intervalo_inicio TEXT,
  intervalo_fim TEXT,
  fechado INTEGER NOT NULL DEFAULT 0 CHECK (fechado IN (0, 1)),
  UNIQUE (negocio_id, dia_semana),
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER,
  cliente_nome TEXT,
  cliente_email TEXT,
  cliente_telefone TEXT,
  negocio_id INTEGER NOT NULL,
  servico_id INTEGER NOT NULL,
  servico_nome TEXT NOT NULL,
  profissional_nome TEXT NOT NULL DEFAULT 'Equipe do estabelecimento',
  preco_final REAL NOT NULL,
  inicio TEXT NOT NULL,
  fim TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmado'
    CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido')),
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (fim > inicio),
  FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE RESTRICT,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_agenda_cliente ON agendamentos(cliente_id, inicio);
CREATE INDEX IF NOT EXISTS idx_agenda_negocio ON agendamentos(negocio_id, inicio);
CREATE INDEX IF NOT EXISTS idx_agenda_profissional
  ON agendamentos(negocio_id, profissional_nome, inicio);

CREATE TABLE IF NOT EXISTS respostas_agendamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agendamento_id INTEGER NOT NULL,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_respostas_agendamento
  ON respostas_agendamento(agendamento_id);

CREATE TABLE IF NOT EXISTS mensagens_suporte (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  assunto TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'em_atendimento', 'resolvida')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_suporte_status_data
  ON mensagens_suporte(status, criado_em);

CREATE TABLE IF NOT EXISTS tokens_recuperacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expira_em INTEGER NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_token_usuario
  ON tokens_recuperacao(usuario_id, expira_em);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  action TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 65535),
  PRIMARY KEY (action, client_hash)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_window
  ON api_rate_limits(window_started_at);
