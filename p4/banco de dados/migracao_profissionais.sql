-- Execute uma unica vez em bancos criados antes da selecao de profissionais.
ALTER TABLE agendamentos
  ADD COLUMN profissional_nome VARCHAR(160) NOT NULL
    DEFAULT 'Equipe do estabelecimento' AFTER servico_nome,
  ADD KEY idx_agenda_profissional (negocio_id, profissional_nome, inicio);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  action VARCHAR(32) NOT NULL,
  client_hash CHAR(64) NOT NULL,
  window_started_at DATETIME NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (action, client_hash),
  KEY idx_api_rate_window (window_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
