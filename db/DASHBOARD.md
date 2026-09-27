# Dashboard gerencial — instalação e conferência

## Instalação local e Hostinger

A migração `db/dashboard_cancelamentos.sql` já foi executada no banco local. Na Hostinger, execute esse arquivo no phpMyAdmin do banco usado pelo projeto. É aditivo e pode ser repetido: cria somente `dashboard_cancelamentos`; não altera nem exclui registros existentes.

Depois envie, mantendo as pastas:

- `src/Service/DashboardService.php` e `src/Service/CancelamentoEstatistica.php` (novos).
- `src/Service/PublicacaoService.php` e `src/Service/ComprovanteService.php` (alterados).
- `src/Controller/PublicacaoController.php` (alterado).
- `ideau_eventos/dashboard.html`, `ideau_eventos/eventos.html`, `ideau_eventos/assets/js/app.js`, `ideau_eventos/assets/js/theme.js`, `ideau_eventos/assets/js/dashboard-charts.js` e `ideau_eventos/assets/css/dashboard-charts.css` (alterados).

Não há nova dependência Composer, pacote JavaScript, serviço externo ou tarefa agendada. Gráficos usam SVG, HTML e CSS nativos. Não precisa enviar a pasta `tests` à hospedagem. Faça uma atualização completa dos arquivos relacionados e recarregue o navegador; o HTML possui versões novas dos assets.

Sem executar o SQL, inscrições e cancelamentos continuam funcionando. Os indicadores de cancelamentos mostram indisponibilidade, em vez de um zero inventado. Cancelamentos ocorridos antes da instalação **não são recuperáveis**: a aplicação antiga apagava esses registros. O histórico guarda evento, origem, público e datas, sem nomes, CPF, contato ou protocolo. A inclusão no histórico e a exclusão da inscrição acontecem na mesma transação.

## Arquitetura e compatibilidade

A rota autenticada `PublicacaoController.php?action=dashboard` entrega metadados e agregados do banco. Eventos modernos são limitados ao organizador da sessão; eventos legados mantêm o acesso administrativo compartilhado que já existia. O dashboard não usa dados de demonstração nem busca os cadastros completos dos participantes ou imagens de capa. Listagens e relatórios das demais páginas mantêm seus carregamentos anteriores.

A consulta junta inscrições modernas e legadas sem duplicar linhas por atividade. No legado, inscrições são associadas ao evento pai de `atividades`. Esquemas antigos sem `instituicoes`/`id_instituicao` continuam funcionando; nesses casos a instituição é “Não informada”. O público legado usa `publico_alvo` quando disponível; sem ele, inscrições vinculadas a responsável são escolares, e as demais ficam “Não informado”. Não se presume que todos os desconhecidos sejam faculdade.

O estado dos eventos modernos reutiliza `PublicacaoService::estado`: publicação automática pelo horário, encerramento somente por limite explícito ou retirada manual. Eventos antigos com status 1 permanecem atuais, independentemente da data passada. Rascunhos não expiram automaticamente.

São consultas em quantidade fixa, com agregações por evento/dia/público no MySQL. Não há consulta por card ou participante. Dias anteriores ao intervalo do gráfico são consolidados em um grupo. O histórico possui índice por origem/evento/data. O painel atualiza a cada minuto enquanto a aba está visível; uma resposta antiga não sobrescreve filtros mais novos.

## Significado dos filtros

- **Período** considera quando a inscrição original foi feita, no horário de Brasília. “Hoje” e “últimos 7/30 dias” incluem o dia atual. Personalizado inclui ambas as datas e aceita até 366 dias. O padrão é todo o período.
- **Evento, instituição, público e situação** são combinados. Clique em Aplicar filtros; Limpar restaura a visão geral.
- Com um período selecionado, a lista de eventos contém os eventos com inscrições ativas ou canceladas conhecidas naquele intervalo. Sem período, eventos sem inscrições também aparecem.
- O filtro de público seleciona as inscrições; eventos declarados para esse público podem aparecer sem inscrições quando não há período. Dados desconhecidos têm uma opção própria.
- **Ocupação e vagas** são a situação atual dos eventos selecionados, com todos os seus inscritos ativos, mesmo que tenham sido inscritos fora do período ou pertençam a outro público. Essa distinção é indicada na tela, porque uma inscrição antiga continua ocupando vaga.
- O gráfico temporal mostra os últimos 30 dias quando o filtro é “Todo o período”. Nos demais casos mostra o intervalo selecionado, incluindo os dias sem inscrições.

## Como conferir cada indicador

| Indicador | Cálculo e conferência |
| --- | --- |
| Eventos atuais | Eventos selecionados ainda não encerrados: publicados, agendados e rascunhos. Compare com Atuais no gerenciamento, sem outros filtros. |
| Encerrados | Retirados manualmente ou por limite explícito. Compare com Histórico. |
| Inscrições ativas | Contagem de linhas existentes em inscrições, respeitando período/público/evento. Sem filtros, compare com os relatórios dos eventos. Cada inscrição conta uma vez; não é contagem de pessoas únicas. |
| Canceladas | Linhas do novo histórico, filtradas pela data da inscrição original. Faça uma inscrição de teste e cancele: ativas diminui 1 e canceladas aumenta 1. Não representa o histórico anterior à atualização. |
| Instituições com inscrições | Instituições identificadas com pelo menos uma inscrição ativa nos filtros. “Não informada” aparece no gráfico, mas não conta como instituição identificada. |
| Ocupação média atual | Média simples de `(ativas atuais ÷ vagas) × 100` por evento limitado selecionado, incluindo eventos encerrados e rascunhos. Ilimitados são excluídos; sem evento limitado, aparece “—”. |
| Vagas disponíveis | Soma de `máximo(vagas − ativas atuais, 0)` somente dos eventos publicados limitados com inscrições abertas. Não soma vagas de rascunhos, encerrados, agendados ou ilimitados. |
| Eventos sem limite | Eventos selecionados com vagas ilimitadas. No legado, se alguma atividade é ilimitada/sem quantidade positiva, o evento não recebe percentual finito. Caso todas sejam limitadas, somam-se as vagas das atividades. |
| Eventos cadastrados | Total de eventos correspondentes aos filtros. |
| Publicados | Eventos efetivamente disponíveis ao público no momento da consulta. |

Exemplo de conferência: um evento com 10 vagas e 3 inscrições ativas deve indicar 30% de ocupação e 7 disponíveis, se publicado. Um segundo evento ilimitado não entra na média. Uma pessoa inscrita em dois eventos gera duas inscrições. Eventos ou instituições desconhecidas não são atribuídos a outros cadastros para completar os números.

## Como conferir cada gráfico

| Gráfico | Conferência |
| --- | --- |
| Evolução | Ativas + canceladas conhecidas pela data original de inscrição, agrupadas por dia. Passe o mouse pelos pontos ou abra “Ver dados por dia”; zeros são dias sem registros. Cancelamentos antigos excluídos não podem aparecer nesta série. |
| Mais inscritos | Top 5 eventos por inscrições ativas filtradas, em ordem decrescente. Clique no nome para abrir o relatório correspondente. O relatório abre sua listagem própria; filtros do dashboard não são transferidos automaticamente. |
| Por instituição | Soma das ativas de cada instituição, do maior para o menor. Inclui grupo “Não informada” quando necessário. |
| Escola e faculdade | Ativas de cada público, com quantidades e percentuais sobre o total. Público desconhecido aparece separado. |
| Ativas e canceladas | Quantidade e percentual de cada situação sobre ativas + canceladas conhecidas, no mesmo período original de inscrição. |
| Ocupação | Por evento: total atual de ativos, vagas e percentual. Ilimitados mostram “Sem limite”. A barra termina em 100%, mas o número preserva eventual sobrelotação maior que 100%. |
| Situação dos eventos | Quantidades e percentuais publicados/agendados/rascunhos/encerrados, preservando o gráfico anterior. |

A tabela mostra todos os eventos selecionados, do cadastro mais recente ao mais antigo, com ações para relatório e gerenciamento. Eventos recentes e últimas inscrições continuam disponíveis, sem nomes de participantes. O histórico pode ser aberto diretamente pelo atalho.

## Roteiro de teste

1. Sem filtros, some as linhas da tabela: ativas e canceladas devem bater com os cards e as respectivas roscas. A soma das barras de instituições e dos públicos deve bater com ativas. Top 5 pode mostrar menos que o total.
2. Selecione um evento: confira seu relatório, vagas e status. Use um limitado e outro ilimitado. Confira também um rascunho, um agendado e um encerrado.
3. Teste Hoje, 7 dias, 30 dias e um intervalo personalizado. Combine com evento, instituição, público e histórico. Confira que a lista e os gráficos mudam juntos; vagas/ocupação permanecem atuais, como explicado acima.
4. Use um período sem inscrições: o painel deve mostrar zeros e mensagens de ausência de dados. Datas invertidas ou inválidas devem ser recusadas. Limpar deve restaurar o resumo geral.
5. Crie uma inscrição de teste, anote o total e cancele pelo comprovante. Confira ativas −1, canceladas +1, vaga liberada e relatório sem o cancelado. Uma reinscrição posterior é um novo registro.
6. Compare eventos novos e legados. No esquema antigo sem instituições, não espere que o sistema descubra o vínculo: aparecerá “Não informada”.
7. No celular, confira filtros, cards, rolagem da tabela e gráfico temporal, navegação horizontal do menu, atalhos e abertura dos relatórios. Confira temas claro e escuro.
8. Sem login, a API deve retornar HTTP 401. O JSON não deve conter nomes de participantes, CPF, e-mail, telefone ou capas.

### Testes automatizados

- `php tests/dashboard.php`: banco com tabelas temporárias; métricas, filtros, estados, ordenação, privacidade, isolamento de organizadores, duas versões do esquema legado, limites de data em Brasília, cancelamento idempotente e rollback em falha da auditoria.
- `node tests/dashboard-http.cjs`: sessão obrigatória, resposta sem cache, filtros inválidos e estado vazio pela API real.
- `php tests/publicacao.php`: publicação, agendamento, limite, encerramento, deduplicação, comprovantes e cancelamento modernos.
- `php tests/comprovante-legado.php`: inscrição/cancelamento antigo e preservação de responsáveis/irmãos.
- `node tests/comprovante-http.cjs`: comprovante/PDF, sessão e CSRF do cancelamento.
- `node tests/eventos-browser.cjs`: Chrome/Edge, painel no desktop/celular, filtros, estados vazios e regressão de formulários, relatórios, PDF/Excel e consulta por e-mail. Usa resposta simulada **somente no teste de interface**; o SQL real é validado pelo teste PHP.

Os testes que cancelam inscrições passaram a criar também uma tabela temporária para auditoria, evitando gravar dados fictícios no histórico real.

Arquivos de testes novos: `tests/dashboard.php`, `tests/dashboard-temporary.php`, `tests/dashboard-http.cjs`. Alterados: `tests/publicacao.php`, `tests/comprovante-legado.php`, `tests/comprovante-http.cjs`, `tests/eventos-browser.cjs`. Documentação nova: este arquivo; registro das mudanças em `documentacao.md`.
