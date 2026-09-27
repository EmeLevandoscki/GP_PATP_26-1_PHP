-- Aditivo e idempotente. Não altera nem exclui inscrições existentes.
-- Guarda somente estatísticas dos cancelamentos feitos após esta instalação.
CREATE TABLE IF NOT EXISTS dashboard_cancelamentos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    origem ENUM('publicacao', 'legado') NOT NULL,
    id_evento VARCHAR(100) NOT NULL,
    publico VARCHAR(20) NOT NULL DEFAULT 'unknown',
    registrado_em DATETIME NOT NULL COMMENT 'UTC: data da inscrição original',
    cancelado_em DATETIME NOT NULL COMMENT 'UTC',
    INDEX idx_dashboard_evento (origem, id_evento, registrado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
