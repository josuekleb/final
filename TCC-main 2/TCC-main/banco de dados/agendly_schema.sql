CREATE DATABASE IF NOT EXISTS agendly CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agendly;

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    telefone VARCHAR(20) NULL,
    cpf VARCHAR(14) NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uk_clientes_email (email),
    UNIQUE KEY uk_clientes_cpf (cpf),
    CHECK (email LIKE '%@%'),
    CHECK (CHAR_LENGTH(senha_hash) >= 64)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de negócios / estabelecimentos
CREATE TABLE IF NOT EXISTS negocios (
    id INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(160) NOT NULL,
    email VARCHAR(180) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    telefone VARCHAR(20) NULL,
    cnpj VARCHAR(18) NULL,
    categoria VARCHAR(80) NULL,
    status ENUM('ativo', 'inativo', 'pendente') NOT NULL DEFAULT 'ativo',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_negocios_email (email),
    UNIQUE KEY uk_negocios_cnpj (cnpj),
    CHECK (email LIKE '%@%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela para serviços prestados
CREATE TABLE IF NOT EXISTS servicos (
    id INT NOT NULL AUTO_INCREMENT,
    negocio_id INT NOT NULL,
    nome VARCHAR(120) NOT NULL,
    descricao TEXT NULL,
    preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    duracao_minutos INT NOT NULL DEFAULT 30,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_servicos_negocio (negocio_id),
    CONSTRAINT fk_servicos_negocio
        FOREIGN KEY (negocio_id) REFERENCES negocios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
    id INT NOT NULL AUTO_INCREMENT,
    cliente_id INT NOT NULL,
    negocio_id INT NOT NULL,
    servico_id INT NOT NULL,
    data_agendamento DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    status ENUM('pendente', 'confirmado', 'cancelado', 'concluido') NOT NULL DEFAULT 'pendente',
    observacoes TEXT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_agendamentos_cliente (cliente_id),
    KEY idx_agendamentos_negocio (negocio_id),
    KEY idx_agendamentos_servico (servico_id),
    CONSTRAINT fk_agendamentos_cliente
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_agendamentos_negocio
        FOREIGN KEY (negocio_id) REFERENCES negocios(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_agendamentos_servico
        FOREIGN KEY (servico_id) REFERENCES servicos(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exemplo de insert para teste inicial (senha deve ser armazenada em hash, não em texto puro)
-- INSERT INTO clientes (nome, email, senha_hash, salt, telefone, cpf)
-- VALUES ('João da Silva', 'joao@email.com', 'hash_pbkdf2_aqui', 'salt_aleatorio_aqui', '11999999999', '123.456.789-09');
