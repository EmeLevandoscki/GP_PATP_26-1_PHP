# Dados de demonstração dos gráficos

`preencher_graficos_demonstracao.php` adiciona dados fictícios à conta do organizador configurada no sistema. Usa as tabelas e o serviço de indicadores existentes, sem alterar o código dos gráficos.

| Evento (todos com “Demonstração” no título) | Estado | Vagas | Ativas | Canceladas |
| --- | --- | ---: | ---: | ---: |
| Carreiras e inovação | Publicado | 80 | 58 | 6 |
| Oficina de ciências na escola | Publicado | 40 | 32 | 3 |
| Encontro de famílias | Publicado | 60 | 39 | 4 |
| Webinar de educação e tecnologia | Publicado | Sem limite | 85 | 5 |
| Jornada de pesquisa concluída | Encerrado | 45 | 35 | 3 |
| Seminário de sustentabilidade | Agendado | 100 | 0 | 0 |
| Feira de projetos escolares | Rascunho | 30 | 0 | 0 |

São 249 inscrições ativas e 21 cancelamentos, distribuídos nos 30 dias anteriores à execução, incluindo o dia atual. A jornada encerrada tem datas anteriores ao encerramento. As datas de criação do evento, do cadastro em JSON e da linha no banco são coerentes. Os participantes têm nomes explicitamente fictícios e e-mails `@example.invalid`, sem CPF ou telefone. Os cancelamentos são somente históricos estatísticos, sem ocupar vagas.

Na raiz do projeto:

```sh
php db/preencher_graficos_demonstracao.php
php db/preencher_graficos_demonstracao.php --check
php db/preencher_graficos_demonstracao.php --apply
```

Sem argumentos, apenas consulta os indicadores. `--check` cria e valida os exemplos numa transação e desfaz tudo. `--apply` persiste os dados após validar os indicadores. Requer a tabela já fornecida em `db/dashboard_cancelamentos.sql`.

Os IDs usam o prefixo `evt-demo-graficos-`. Uma nova execução preserva integralmente os eventos desse conjunto que já existem, inclusive alterações e exclusões de inscrições feitas pelo usuário. Nenhum registro anterior é sobrescrito. Os exemplos publicados aparecem na página pública e todos entram nos relatórios e indicadores normais; os totais do painel incluem também os dados anteriores. Não há envio de e-mail.

Abra `http://localhost:8000/ideau_eventos/dashboard.php` autenticado como organizador. Use “Todos os períodos” para comparar também os rascunhos e agendados, ou “Últimos 30 dias” para acompanhar as inscrições. Os exemplos não mudam de data a cada execução e, com o tempo, deixam naturalmente os filtros de períodos recentes.
