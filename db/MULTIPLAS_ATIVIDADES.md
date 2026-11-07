# Eventos com múltiplas atividades

## Estrutura analisada

O cadastro atual é `ideau_eventos/evento-form.php`, controlado por `assets/js/app.js`. A API `PublicacaoController.php` usa `PublicacaoService.php`, com eventos e inscrições nas tabelas `eventos_publicacoes` e `eventos_publicacoes_inscricoes`. Os dados configuráveis continuam em JSON. O projeto também contém as tabelas legadas `eventos`, `atividades`, `inscricoes` e `usuarios`, atendidas por `EventoService.php`; esse fluxo foi preservado.

O acesso por e-mail existente confirma o titular em `ConsultaInscricaoService` e autoriza o comprovante na sessão. A página `comprovante.php` continua sendo o destino para consultar, baixar PDF e cancelar a inscrição. O painel já exporta relatórios em Excel e PDF; o filtro por atividade foi integrado a essas exportações.

## Atualização de desenvolvimento e produção

1. Selecione o banco correto e mantenha o backup habitual.
2. Execute **`db/multiplas_atividades.sql`** nesse banco antes de disponibilizar o novo código. O mesmo arquivo atende desenvolvimento e produção; não contém `USE`, exclusão ou atualização de dados anteriores e pode ser reexecutado.
3. Disponibilize os arquivos PHP, JS, CSS e HTML alterados juntos. Os HTMLs e `index.php` atualizam a versão de `app.js` para evitar mistura de versões em cache.
4. Faça a conferência visual e o teste de aceitação descritos abaixo no ambiente de homologação.

Para instalação nova, `db/criar_db.sql` já inclui a estrutura. Não execute o script completo de criação sobre um banco existente.

A migração foi executada nos testes com tabelas isoladas e FKs reais. **Não foi aplicada às tabelas de uso normal do desenvolvimento nem à produção.** As tabelas existentes devem usar InnoDB e a mesma collation `utf8mb4` adotada pelo banco para seus identificadores, como nos scripts originais.

## Dados e regras

- `eventType` no JSON do evento aceita `simple` ou `multiple`; a ausência significa evento simples. Eventos antigos não precisam ser regravados.
- `eventos_publicacoes_atividades` vincula cada atividade ao evento, com dados validados de nome, descrição, tipo, início/fim, local, responsável, vagas e carga horária. Exclusão de atividade sem inscrições ativas é lógica, preservando o histórico.
- `eventos_publicacoes_atividade_inscricoes` vincula atividades à inscrição principal. Há unicidade por inscrição/atividade, índices para ocupação, data de cancelamento e campos `presente` e `presenca_em`. Presença nula significa **ainda não registrada**. Não foi criada leitura de QR Code.
- Uma inscrição principal pode ter várias atividades. Pedidos aguardando aprovação reservam vagas. Os limites do evento principal continuam funcionando independentemente das vagas por atividade.
- Todas as alterações de vagas bloqueiam primeiro a linha do evento com `SELECT ... FOR UPDATE`. Inscrição principal e escolhas são gravadas na mesma transação. A contagem de ocupação considera vínculos ativos com inscrição existente.
- Atividades sobrepostas são recusadas, com identificação do conflito na interface e no servidor. Uma atividade pode começar exatamente quando outra termina. Datas das atividades usam o horário de Brasília; cancelamentos são registrados em UTC.
- Reenvio da inscrição mantém o protocolo existente e não altera as escolhas. Outra sessão deve confirmar acesso pelo e-mail, conforme a proteção já existente. O participante consulta as atividades e cancela individualmente pelo comprovante autorizado, sem login.
- Cancelar uma atividade libera só sua vaga e mantém a inscrição principal, inclusive quando todas as atividades foram canceladas. O cancelamento principal cancela todos os vínculos, preserva seu protocolo histórico e libera as vagas. A exclusão definitiva do evento mantém a regra existente de remover seus dados associados.
- Somente o organizador proprietário pode gerenciar as atividades. POSTs usam a autenticação e CSRF existentes; os comprovantes usam sua sessão autorizada e CSRF próprio.
- O tipo do evento não muda enquanto houver inscrições. Não é permitido reduzir vagas abaixo da ocupação nem mudar horários/excluir atividades com inscrições ativas. Isso evita invalidar escolhas já confirmadas. Demais informações podem ser editadas.
- Cada evento múltiplo aceita até 100 atividades. Vagas são inteiras entre 1 e 1.000.000, carga horária entre 0 e 10.000, início anterior ao término e programação dentro do período do evento quando houver encerramento definido.

## Arquivos principais

| Arquivos | Alteração |
| --- | --- |
| `src/Service/AtividadeService.php` | Validação, persistência, ocupação, vínculos e cancelamentos |
| `src/Service/PublicacaoService.php` | Integração de cadastro, listagem, inscrições e remoção |
| `src/Controller/PublicacaoController.php` | Ação autenticada de cancelamento individual |
| `src/Service/ComprovanteService.php`, `ideau_eventos/comprovante.php` | Consulta atualizada, PDF com atividades e cancelamento pelo link pessoal |
| `ideau_eventos/assets/js/activities.js`, `assets/css/activities.css` | Editor dinâmico, programação, seleção, conflitos, resumos e controles do painel |
| `ideau_eventos/assets/js/app.js` | Formulários, recuperação do rascunho, inscrições, filtros e exportações |
| `ideau_eventos/evento-form.php`, `evento.html`, `inscricao.html`, `inscritos.php`, `relatorios.php` | Campos e carregamento dos recursos |
| Demais HTMLs do painel e `index.php` | Carregamento/versionamento do JS compartilhado |
| `db/multiplas_atividades.sql`, `db/criar_db.sql` | Migração aditiva e instalação nova |
| `tests/multiplas-atividades*.php`, `tests/multiplas-atividades-ui.cjs` | Regras, concorrência real, FKs e lógica da interface |
| `tests/eventos-browser.cjs` | Cenários adicionais no navegador para atividades |
| `tests/comprovante-http.cjs`, `tests/security-http.cjs` | Cancelamento individual por HTTP, proteção CSRF e isolamento de sessão |
| `tests/publicacao-ui.cjs` | Correção do mock de `validity.badInput` para executar a regressão de datas |

## Verificações

Executados com sucesso:

- `php tests/multiplas-atividades.php`: regressão de publicação/eventos simples; três atividades; um participante em duas atividades e outro em uma; vagas independentes; duplicidade; conflitos; consulta por e-mail/comprovante; PDF; cancelamento individual; autorização; edição e exclusão; presença inicialmente desconhecida.
- `php tests/multiplas-atividades-concorrencia.php`: duas conexões/processos disputando a última vaga, sem ultrapassagem ou inscrição parcial; migração reexecutável; FKs e unicidade reais; cancelamento principal e histórico. Usa exclusivamente tabelas com prefixo aleatório `ita_<hex>_`, removidas no `finally`. Não requer criação de banco nem grava nas tabelas da aplicação.
- `node tests/multiplas-atividades-ui.cjs`: lógica de seleção, conflitos, horários adjacentes, vaga esgotada, escape HTML e cancelamentos. É um teste com DOM simulado, não uma validação visual.
- Regressões PHP: `publicacao.php`, `revisao-inscricoes.php`, `consulta-inscricao.php`, `private-events.php`, `exclusao-eventos.php`, `encerramento-legado.php`, `comprovante-legado.php`, `dashboard.php`, `security.php`, `validacao-dados.php`.
- Regressões JS: `event-form-draft.cjs`, `event-date.cjs`, `publicacao-ui.cjs`, `link-access-ui.cjs`.
- HTTP: `node tests/comprovante-http.cjs`, `node tests/security-http.cjs` e `node tests/consulta-inscricao-http.cjs`. Confirmam renderização/PDF com atividades, CSRF, acesso por sessão, confirmação obrigatória, recusa de atividade forjada, cancelamento individual efetivamente persistido durante a requisição e preservação da inscrição principal. O controlador do organizador recusa acesso anônimo, CSRF inválido e dados incompletos; a autorização por proprietário é coberta nos testes dos serviços. Os fixtures usam tabelas temporárias, sem alterar inscrições reais.
- Sintaxe dos PHPs alterados, `node --check` dos scripts e `git diff --check`.

Ainda precisam ser concluídos:

- `node tests/eventos-browser.cjs`: tentado com Chrome e Edge, ambos sem resposta em `Page.enable`, antes dos cenários. O teste já inclui programação, seleção, conflito, recuperação do editor, responsividade, filtro e cancelamento de atividades; não foi possível confirmar sua execução nem obter validação visual.
- Conferência manual em computador/celular do cadastro e das exportações Excel/PDF por atividade.
- Fluxo completo no navegador em homologação, desde recebimento do e-mail até consulta/cancelamento da atividade e exportação do organizador. Os componentes foram exercitados por HTTP e nos serviços; a validação visual ponta a ponta permanece pendente.
- Aplicação da migração e teste de aceitação no ambiente de produção.
