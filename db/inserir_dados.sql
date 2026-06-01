-- INSERT INTO usuarios 
-- (nome, sobrenome, email, telefone, cpf, data_nascimento, senha, cargo, foto_path)
-- VALUES
-- (
--     'João',
--     'Silva',
--     'joao.silva@email.com',
--     '54999990001',
--     '123.456.789-00',
--     '1995-03-15',
--     'joao',
--     'admin',
--     '/uploads/usuarios/joao.jpg'
-- ),
-- (
--     'Maria',
--     'Oliveira',
--     'maria.oliveira@email.com',
--     '54999990002',
--     '987.654.321-00',
--     '1998-07-22',
--     'maria',
--     'organizador',
--     '/uploads/usuarios/maria.jpg'
-- ),
-- (
--     'Carlos',
--     'Souza',
--     'carlos.souza@email.com',
--     '54999990003',
--     '111.222.333-44',
--     '1990-11-05',
--     'carlos',
--     'cliente',
--     '/uploads/usuarios/carlos.jpg'
-- );
-- -- Categorias
-- INSERT INTO categorias (id, nome) VALUES
-- (1, 'Show', 🎵),
-- (2, 'Palestra', 🎓),
-- (3, 'Workshop', 🎨);

-- -- STATUS
-- INSERT INTO status (id, nome) VALUES
-- (1, 'Ativo'),
-- (2, 'Cancelado'),
-- (3, 'Finalizado');

-- -- ENDEREÇOS
-- INSERT INTO enderecos (id, logradouro, tipo_logradouro, complemento, numero, cidade, estado, ponto_referencia) VALUES
-- (1, 'Campus Erechim', 'Brasil', 'Rua', 'Sala 101', '123', 'Erechim', 'RS', 'Próximo ao mercado'),
-- (2, 'Campus Passo Fundo', 'Sete de Setembro', 'Avenida', 'Auditório', '456', 'Passo Fundo', 'RS', 'Em frente à praça'),
-- (3, 'Coisa e Tal Eventos', 'Independência', 'Rua', 'Centro de Eventos', '789', 'Porto Alegre', 'RS', 'Ao lado do shopping');

-- -- EVENTOS
-- INSERT INTO eventos 
-- (titulo, descricao, valor, data_inicio, data_fim, foto_path, id_categoria, id_status, id_usuario, id_endereco)
-- VALUES
-- (
--     'Show de Rock',
--     'Uma noite com bandas locais de rock',
--     50.00,
--     '2026-05-10 20:00:00',
--     '2026-05-10 23:30:00',
--     '',
--     1,
--     1,
--     1,
--     1,
--     true
-- ),
-- (
--     'Palestra sobre Tecnologia',
--     'Tendências de desenvolvimento em 2026',
--     0.00,
--     '2026-06-15 19:00:00',
--     '2026-06-15 21:00:00',
--     '/uploads/palestra.jpg',
--     2,
--     1,
--     1,
--     2,
--     false
-- ),
-- (
--     'Workshop de PHP',
--     'Aprenda PHP moderno com boas práticas',
--     120.00,
--     '2026-07-20 14:00:00',
--     '2026-07-20 18:00:00',
--     '/uploads/workshop_php.jpg',
--     3,
--     1,
--     1,
--     3,
--     false
-- );

-- Categoria
INSERT INTO categorias (nome, icone)
VALUES ('Recreativo', '🎉');

-- Status
INSERT INTO status (nome)
VALUES ('Inscrições Abertas');

-- Usuário organizador
INSERT INTO usuarios (
    nome,
    sobrenome,
    email,
    telefone,
    cpf,
    senha,
    cargo,
    foto_path
) VALUES (
    'Administrador',
    'Sistema',
    'admin@ideau.com.br',
    '',
    '00000000000',
    'ideau_ideau_ideau', -- qualquer hash
    'admin',
    ''
);

-- Endereço
INSERT INTO enderecos (
    nome_local,
    logradouro,
    tipo_logradouro,
    complemento,
    numero,
    cidade,
    estado,
    ponto_referencia
) VALUES (
    'Ideau Santa Clara',
    '',
    '',
    '',
    '',
    'Passo Fundo',
    'RS',
    ''
);

-- Evento
INSERT INTO eventos (
    titulo,
    descricao,
    valor,
    data_inicio,
    data_fim,
    foto_path,
    id_categoria,
    id_status,
    id_usuario,
    id_endereco,
    destaque
) VALUES (
    'Colônia de Férias de Inverno 2026',
    'Colônia de férias com atividades lúdicas, esportivas e culturais para crianças e adolescentes.',
    0.00,
    '2026-07-27 12:30:00',
    '2026-07-31 18:30:00',
    'https://plus.unsplash.com/premium_photo-1686920245950-58617c8a602e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    1,
    1,
    1,
    1,
    TRUE
);

-- Atividade principal do evento
INSERT INTO atividades (
    id_evento,
    nome,
    descricao,
    local_atv,
    data_ini,
    data_fim,
    vagas,
    carga_horaria
) VALUES (
    1,
    'Colônia de Férias de Inverno 2026',
    'Atividades recreativas, oficinas criativas, jogos, esportes, música e integração.',
    'Ideau Santa Clara',
    '2026-07-27 12:30:00',
    '2026-07-31 18:30:00',
    -1,
    30
);

INSERT INTO cursos (nome) VALUES
('Educação Infantil'),
('Ensino Fundamental');

INSERT INTO turmas (id_curso, nome, periodo) VALUES
(1, 'Berçário I', 'Integral'),
(1, 'Berçário II', 'Integral'),
(1, 'Maternal I', 'Integral'),
(1, 'Maternal II A', 'Integral'),
(1, 'Maternal II B', 'Integral'),
(1, 'Pré-Escola I', 'Integral'),
(1, 'Pré-Escola II', 'Integral'),
(2, '1º Ano', 'Integral'),
(2, '2º Ano', 'Integral'),
(2, '3º Ano', 'Integral');