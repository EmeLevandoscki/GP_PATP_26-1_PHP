-- Tabela usuarios
CREATE TABLE usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255),
    sobrenome VARCHAR(255),
    email VARCHAR(255),
    telefone VARCHAR(255),
    cpf VARCHAR(11),
    data_nascimento DATE,
    senha VARCHAR(255),
    cargo VARCHAR(255),
    foto_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela categorias
CREATE TABLE categorias (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255),
    icone VARCHAR(10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela status
CREATE TABLE status (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela enderecos
CREATE TABLE enderecos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome_local VARCHAR(255),
    logradouro VARCHAR(255),
    tipo_logradouro VARCHAR(255),
    complemento VARCHAR(255),
    numero VARCHAR(255),
    cidade VARCHAR(255),
    estado VARCHAR(255),
    ponto_referencia TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela eventos
CREATE TABLE eventos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) DEFAULT 0.00,
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME NOT NULL,
    foto_path VARCHAR(255) DEFAULT '',
    id_categoria INT UNSIGNED NOT NULL,
    id_status INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    id_endereco INT UNSIGNED NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT NULL,
    destaque boolean DEFAULT FALSE,

    CONSTRAINT fk_eventos_categorias FOREIGN KEY (id_categoria) REFERENCES categorias(id),
    CONSTRAINT fk_eventos_status FOREIGN KEY (id_status) REFERENCES status(id),
    CONSTRAINT fk_eventos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    CONSTRAINT fk_eventos_endereco FOREIGN KEY (id_endereco) REFERENCES enderecos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE atividades (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_evento INT UNSIGNED NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    local_atv VARCHAR(255) NOT NULL,
    data_ini DATETIME NOT NULL,
    data_fim DATETIME NOT NULL,
    vagas INT DEFAULT 0,
    carga_horaria INT DEFAULT 0,

    CONSTRAINT fk_atividades_evento FOREIGN KEY (id_evento) REFERENCES eventos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inscricoes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_atividade INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    id_responsavel INT UNSIGNED,
    inscrito_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inscricoes_atividade FOREIGN KEY (id_atividade) REFERENCES atividades(id),
    CONSTRAINT fk_inscricoes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    CONSTRAINT fk_inscricoes_usuario_responsavel FOREIGN KEY (id_responsavel) REFERENCES usuarios(id),

    UNIQUE KEY uq_atividade_usuario (id_atividade, id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE usuarios_responsaveis (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_responsavel INT UNSIGNED NOT NULL,
    id_dependente INT UNSIGNED NOT NULL,

    parentesco VARCHAR(50),

    CONSTRAINT fk_resp_usuario
        FOREIGN KEY (id_responsavel)
        REFERENCES usuarios(id),

    CONSTRAINT fk_dep_usuario
        FOREIGN KEY (id_dependente)
        REFERENCES usuarios(id),

    UNIQUE KEY uq_responsavel_dependente (
        id_responsavel,
        id_dependente
    )
);

CREATE TABLE cursos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL
);

CREATE TABLE turmas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_curso INT UNSIGNED NOT NULL,

    nome VARCHAR(100) NOT NULL,
    periodo VARCHAR(50),

    CONSTRAINT fk_turmas_curso
        FOREIGN KEY (id_curso)
        REFERENCES cursos(id)
);

CREATE TABLE usuarios_turmas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT UNSIGNED NOT NULL,
    id_turma INT UNSIGNED NOT NULL,

    data_entrada DATE DEFAULT NULL,
    data_saida DATE DEFAULT NULL,

    ativo BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_usuario_turma_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id),

    CONSTRAINT fk_usuario_turma_turma
        FOREIGN KEY (id_turma)
        REFERENCES turmas(id)
);