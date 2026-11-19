-- Agendly P4 — esquema inicial MySQL/MariaDB (InnoDB, utf8mb4).
-- Execute uma vez no phpMyAdmin ou no cliente MySQL do XAMPP.
CREATE DATABASE IF NOT EXISTS agendly_p4 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agendly_p4;

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo ENUM('cliente','loja') NOT NULL,
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(30) NULL,
  bio TEXT NULL,
  documento VARCHAR(20) NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  email_verificado_em DATETIME NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uk_usuarios_email (email),
  UNIQUE KEY uk_usuarios_documento (documento), KEY idx_usuarios_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS negocios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(160) NOT NULL,
  categoria VARCHAR(100) NOT NULL DEFAULT 'Serviços',
  descricao VARCHAR(500) NULL,
  endereco VARCHAR(255) NULL,
  telefone VARCHAR(30) NULL,
  publicado TINYINT(1) NOT NULL DEFAULT 0,
  vitrine_json LONGTEXT NOT NULL,
  rascunho_json LONGTEXT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uk_negocio_usuario (usuario_id), KEY idx_negocio_publicado (publicado),
  CONSTRAINT fk_negocio_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT chk_vitrine_json CHECK (JSON_VALID(vitrine_json))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  negocio_id BIGINT UNSIGNED NOT NULL,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracao_minutos SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id), UNIQUE KEY uk_servico_nome (negocio_id, nome), KEY idx_servicos_negocio (negocio_id, ativo),
  CONSTRAINT fk_servicos_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE,
  CONSTRAINT chk_servico_preco CHECK (preco >= 0), CONSTRAINT chk_servico_duracao CHECK (duracao_minutos > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS horarios_funcionamento (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  negocio_id BIGINT UNSIGNED NOT NULL,
  dia_semana TINYINT UNSIGNED NOT NULL COMMENT '0=domingo ... 6=sábado',
  abre TIME NULL,
  fecha TIME NULL,
  intervalo_inicio TIME NULL,
  intervalo_fim TIME NULL,
  fechado TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id), UNIQUE KEY uk_horario_dia (negocio_id, dia_semana),
  CONSTRAINT fk_horario_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE,
  CONSTRAINT chk_horario_dia CHECK (dia_semana <= 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agendamentos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id BIGINT UNSIGNED NULL,
  cliente_nome VARCHAR(160) NULL,
  cliente_email VARCHAR(190) NULL,
  cliente_telefone VARCHAR(30) NULL,
  negocio_id BIGINT UNSIGNED NOT NULL,
  servico_id BIGINT UNSIGNED NOT NULL,
  servico_nome VARCHAR(120) NOT NULL,
  profissional_nome VARCHAR(160) NOT NULL DEFAULT 'Equipe do estabelecimento',
  preco_final DECIMAL(10,2) NOT NULL,
  inicio DATETIME NOT NULL,
  fim DATETIME NOT NULL,
  status ENUM('pendente','confirmado','cancelado','concluido') NOT NULL DEFAULT 'confirmado',
  observacoes TEXT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_agenda_cliente (cliente_id, inicio), KEY idx_agenda_negocio (negocio_id, inicio),
  KEY idx_agenda_profissional (negocio_id, profissional_nome, inicio),
  CONSTRAINT fk_agenda_cliente FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_agenda_negocio FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_agenda_servico FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT,
  CONSTRAINT chk_agenda_periodo CHECK (fim > inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS respostas_agendamento (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agendamento_id BIGINT UNSIGNED NOT NULL,
  pergunta VARCHAR(255) NOT NULL,
  resposta TEXT NOT NULL,
  PRIMARY KEY (id), KEY idx_respostas_agendamento (agendamento_id),
  CONSTRAINT fk_respostas_agendamento FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensagens_suporte (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NULL,
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  assunto VARCHAR(160) NOT NULL,
  mensagem TEXT NOT NULL,
  status ENUM('aberta','em_atendimento','resolvida') NOT NULL DEFAULT 'aberta',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_suporte_status_data (status, criado_em),
  CONSTRAINT fk_suporte_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tokens_recuperacao (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expira_em DATETIME NOT NULL,
  usado_em DATETIME NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uk_token_recuperacao (token_hash), KEY idx_token_usuario (usuario_id, expira_em),
  CONSTRAINT fk_token_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_rate_limits (
  action VARCHAR(32) NOT NULL,
  client_hash CHAR(64) NOT NULL,
  window_started_at DATETIME NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (action, client_hash),
  KEY idx_api_rate_window (window_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
