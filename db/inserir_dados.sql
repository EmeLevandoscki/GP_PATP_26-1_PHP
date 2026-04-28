INSERT INTO usuarios 
(nome, sobrenome, email, telefone, cpf, data_nascimento, senha, cargo, foto_path)
VALUES
(
    'João',
    'Silva',
    'joao.silva@email.com',
    '54999990001',
    '123.456.789-00',
    '1995-03-15',
    'joao',
    'admin',
    '/uploads/usuarios/joao.jpg'
),
(
    'Maria',
    'Oliveira',
    'maria.oliveira@email.com',
    '54999990002',
    '987.654.321-00',
    '1998-07-22',
    'maria',
    'organizador',
    '/uploads/usuarios/maria.jpg'
),
(
    'Carlos',
    'Souza',
    'carlos.souza@email.com',
    '54999990003',
    '111.222.333-44',
    '1990-11-05',
    'carlos',
    'cliente',
    '/uploads/usuarios/carlos.jpg'
);
-- Categorias
INSERT INTO categorias (id, nome) VALUES
(1, 'Show', 🎵),
(2, 'Palestra', 🎓),
(3, 'Workshop', 🎨);

-- STATUS
INSERT INTO status (id, nome) VALUES
(1, 'Ativo'),
(2, 'Cancelado'),
(3, 'Finalizado');

-- ENDEREÇOS
INSERT INTO enderecos (id, logradouro, tipo_logradouro, complemento, numero, cidade, estado, ponto_referencia) VALUES
(1, 'Campus Erechim', 'Brasil', 'Rua', 'Sala 101', '123', 'Erechim', 'RS', 'Próximo ao mercado'),
(2, 'Campus Passo Fundo', 'Sete de Setembro', 'Avenida', 'Auditório', '456', 'Passo Fundo', 'RS', 'Em frente à praça'),
(3, 'Coisa e Tal Eventos', 'Independência', 'Rua', 'Centro de Eventos', '789', 'Porto Alegre', 'RS', 'Ao lado do shopping');

-- EVENTOS
INSERT INTO eventos 
(titulo, descricao, valor, data_inicio, data_fim, foto_path, id_categoria, id_status, id_usuario, id_endereco)
VALUES
(
    'Show de Rock',
    'Uma noite com bandas locais de rock',
    50.00,
    '2026-05-10 20:00:00',
    '2026-05-10 23:30:00',
    '',
    1,
    1,
    1,
    1,
    true
),
(
    'Palestra sobre Tecnologia',
    'Tendências de desenvolvimento em 2026',
    0.00,
    '2026-06-15 19:00:00',
    '2026-06-15 21:00:00',
    '/uploads/palestra.jpg',
    2,
    1,
    1,
    2,
    false
),
(
    'Workshop de PHP',
    'Aprenda PHP moderno com boas práticas',
    120.00,
    '2026-07-20 14:00:00',
    '2026-07-20 18:00:00',
    '/uploads/workshop_php.jpg',
    3,
    1,
    1,
    3,
    false
);