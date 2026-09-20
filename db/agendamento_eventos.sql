-- Executar uma vez no banco existente. Preserva os eventos já cadastrados.
CREATE TABLE IF NOT EXISTS eventos_publicacoes (
    id VARCHAR(100) PRIMARY KEY,
    organizador VARCHAR(255) NOT NULL,
    modo ENUM('published', 'draft', 'scheduled', 'automatic') NOT NULL,
    publicar_em DATETIME NULL,
    dados JSON NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_publicacao (modo, publicar_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventos_publicacoes_inscricoes (
    id VARCHAR(100) PRIMARY KEY,
    id_evento VARCHAR(100) NOT NULL,
    dados JSON NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_publicacao_inscricao FOREIGN KEY (id_evento) REFERENCES eventos_publicacoes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
