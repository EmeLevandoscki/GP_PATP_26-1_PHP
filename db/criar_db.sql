use ideaueventos_prod;
-- Tabela usuarios
CREATE TABLE usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255),
    sobrenome VARCHAR(255),
    email VARCHAR(255),
    telefone VARCHAR(255),
    cpf VARCHAR(255),
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
    titulo VARCHAR(255),
    descricao TEXT,
    valor DECIMAL(10,2),
    data_inicio DATETIME,
    data_fim DATETIME,
    foto_path VARCHAR(255),
    id_categoria INT UNSIGNED,
    id_status INT UNSIGNED,
    id_usuario INT UNSIGNED,
    id_endereco INT UNSIGNED,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NULL,
    destaque boolean DEFAULT false

    CONSTRAINT fk_eventos_tipo FOREIGN KEY (id_tipo) REFERENCES tipos(id),
    CONSTRAINT fk_eventos_status FOREIGN KEY (id_status) REFERENCES status(id),
    CONSTRAINT fk_eventos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    CONSTRAINT fk_eventos_endereco FOREIGN KEY (id_endereco) REFERENCES enderecos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;