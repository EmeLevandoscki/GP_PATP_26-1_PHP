-- Executar no banco selecionado, em desenvolvimento e produção, antes do novo código.
-- Aditivo e reexecutável. Eventos sem eventType no JSON continuam simples.
CREATE TABLE IF NOT EXISTS eventos_publicacoes_atividades (
    id VARCHAR(100) PRIMARY KEY,
    id_evento VARCHAR(100) NOT NULL,
    dados JSON NOT NULL,
    excluida_em DATETIME NULL,
    INDEX idx_atividade_evento (id_evento, excluida_em),
    CONSTRAINT fk_publicacao_atividade_evento FOREIGN KEY (id_evento)
        REFERENCES eventos_publicacoes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventos_publicacoes_atividade_inscricoes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_atividade VARCHAR(100) NOT NULL,
    id_inscricao VARCHAR(100) NULL,
    protocolo VARCHAR(100) NOT NULL,
    inscrito_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelado_em DATETIME NULL,
    presente BOOLEAN NULL DEFAULT NULL,
    presenca_em DATETIME NULL,
    UNIQUE KEY uq_publicacao_atividade_inscricao (id_inscricao, id_atividade),
    INDEX idx_atividade_vagas (id_atividade, cancelado_em, id_inscricao),
    CONSTRAINT fk_publicacao_ai_atividade FOREIGN KEY (id_atividade)
        REFERENCES eventos_publicacoes_atividades(id) ON DELETE CASCADE,
    CONSTRAINT fk_publicacao_ai_inscricao FOREIGN KEY (id_inscricao)
        REFERENCES eventos_publicacoes_inscricoes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
