-- Recuperação de inscrições por e-mail. Não altera inscrições existentes.
CREATE TABLE IF NOT EXISTS inscricao_acessos (
    token_hash CHAR(64) PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    expira_em BIGINT NOT NULL,
    INDEX idx_acesso_expiracao (expira_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS inscricao_acesso_limites (
    chave CHAR(64) PRIMARY KEY,
    tentativas INT NOT NULL DEFAULT 0,
    expira_em BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
