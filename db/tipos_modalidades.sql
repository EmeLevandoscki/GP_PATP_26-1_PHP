-- Opcional: explicita os padrões já aplicados pela leitura de eventos antigos.
-- Requer eventos_publicacoes existente. Não cria tabelas nem altera inscrições.
-- JSON_INSERT preserva valores existentes; a execução pode ser repetida.
START TRANSACTION;
UPDATE eventos_publicacoes
SET dados = JSON_INSERT(dados, '$.eventKind', '', '$.modality', 'presencial'),
    atualizado_em = atualizado_em
WHERE JSON_CONTAINS_PATH(dados, 'all', '$.eventKind', '$.modality') = 0;
COMMIT;
