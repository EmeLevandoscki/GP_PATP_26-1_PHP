# Tipos, modalidades e programação — IDEAU Eventos

Implementação local de 25/10/2026. Esta etapa amplia a configuração dos eventos existentes; não cria outro login ou uma tabela por tipo.

## Funcionamento

- 56 tipos distribuídos em cinco grupos, mais Outro / Personalizado. O catálogo é compartilhado entre PHP e JavaScript.
- `eventKind` identifica o tipo acadêmico; `eventType` continua sendo `simple` ou `multiple`, independentemente do tipo. A categoria de divulgação existente continua editável.
- Presencial: local, sala/auditório e endereço. Online: plataforma, link HTTPS e instruções privadas. Híbrido: ambos, com escolha opcional da forma de participação na inscrição.
- Campos opcionais conforme o perfil: palestrante, instrutor, carga horária, materiais, visita técnica, programação, regras, áreas temáticas, expositores, convites, agenda e voluntários.
- Cronograma com até 100 encontros ordenados, sem sobreposição. Uma inscrição abrange todos os encontros. Para escolhas independentes, horários paralelos e vagas separadas, usar múltiplas atividades.
- Atividades aceitam os mesmos tipos do catálogo. Continuam com vagas próprias, seleção, bloqueio de conflitos, cancelamento e controle transacional existentes.
- Eventos científicos podem habilitar apresentadores; feiras, expositores; eventos comunitários, voluntários. Esses papéis identificam a inscrição, não criam contas de participantes.
- Cadastro mantém quatro etapas: informações principais; programação e atividades; inscrições; acesso e publicação. Campos dinâmicos são recuperados pelo rascunho existente da aba.
- Listagem pública filtra por tipo, modalidade, instituição, intervalo de datas e inscrições abertas/lotadas/encerradas. O intervalo considera encontros e atividades. Eventos antigos sem classificação aparecem como tipo não informado e modalidade presencial.
- Relatórios e exportações incluem forma de participação e papel quando aplicáveis. A estrutura de indicadores do dashboard permanece a mesma.

## Banco de dados e compatibilidade

Nenhuma nova tabela ou coluna é necessária nesta etapa. São reutilizados:

| Tabela / JSON | Campos novos |
| --- | --- |
| `eventos_publicacoes.dados` | `eventKind`, `customEventKind`, `eventKindCategory`, `modality`, `delivery`, `specific`, `meetings`, `registrationOptions` |
| `eventos_publicacoes_inscricoes.dados` | `participationMode`, `eventRole` |
| `eventos_publicacoes_atividades.dados` | Catálogo ampliado em `type`; `customType` opcional |

`eventKindLabel` e `modalityLabel` são derivados pelo servidor. Eventos anteriores continuam legíveis sem migração. Edições que omitem a nova configuração preservam os valores anteriores; inscrições antigas e links pessoais continuam válidos.

O script **opcional** [tipos_modalidades.sql](tipos_modalidades.sql) explicita apenas os padrões ausentes `eventKind: ""` e `modality: "presencial"`. É transacional, reexecutável, preserva os valores existentes e não altera inscrições nem o horário de atualização. Foi executado duas vezes em tabelas temporárias nos testes. **Não foi aplicado às tabelas reais.**

Instalações que ainda não possuem múltiplas atividades precisam da migração anterior descrita em [MULTIPLAS_ATIVIDADES.md](MULTIPLAS_ATIVIDADES.md). Publicar o catálogo JSON junto dos arquivos PHP/JS/CSS; o formulário impede salvar se não conseguir carregar o catálogo.

## Segurança e regras

- Autenticação PHP, sessões, guardas de páginas, autorização por organizador e CSRF existentes são reutilizados.
- A API pública sempre remove o link e as instruções online, inclusive quando o visitante possui o link privado de divulgação.
- Apenas o comprovante autorizado na sessão de um inscrito aprovado com participação online/híbrida apresenta o acesso online. Inscritos presenciais, pendentes, removidos ou cancelados não recebem esse acesso.
- O comprovante relê a configuração atual: atualizações do link pelo organizador aparecem sem reemitir a inscrição. O PDF não incorpora o link privado.
- O servidor valida tipos, modalidade, tamanhos, URL HTTPS sem credenciais embutidas, papéis permitidos, datas, carga horária e cronograma. Texto público é escapado na apresentação.
- Não é possível trocar modalidade ou habilitar/desabilitar a escolha híbrida enquanto houver inscritos; é possível atualizar plataforma, URL e orientações.
- Cancelar uma inscrição remove o acesso no sistema, mas não invalida uma URL que o participante tenha copiado. A plataforma de transmissão controla o acesso externo.
- Vagas continuam globais ao evento e por atividade; não há cotas separadas para presencial/online nem para papéis.
- Descrição, programação, endereço e campos específicos são públicos. Links privados devem ser preenchidos no campo próprio de acesso online.

## Arquivos desta ampliação

- `src/Service/EventoConfiguracao.php`: catálogo, validação, projeção pública, participação e acesso autorizado.
- `src/Service/PublicacaoService.php`, `AtividadeService.php`, `ComprovanteService.php`: integração com persistência, inscrições e comprovantes existentes.
- `ideau_eventos/assets/data/event-types.json`: tipos, grupos e esquemas dos campos opcionais.
- `ideau_eventos/assets/js/event-configuration.js`, `assets/css/event-configuration.css`: campos condicionais, cronograma, apresentação e filtros responsivos.
- `ideau_eventos/assets/js/app.js`, `activities.js`: formulário, listagem, inscrição e relatórios.
- `ideau_eventos/evento-form.php`, `index.php`, `ideau_eventos/comprovante.php`: cadastro, filtros e acesso online autorizado.
- Páginas modernas `evento.html`, `inscricao.html`, `login.html`, `dashboard.php`, `eventos.php`, `inscritos.php`, `relatorios.php`, `configuracoes.php`: referências aos arquivos compartilhados e versão de cache.
- `db/tipos_modalidades.sql` e este documento.
- `tests/tipos-modalidades.php`, `tipos-modalidades-ui.cjs`, `comprovante-http.cjs`, `eventos-browser.cjs`.

As proteções de sessão e as migrações de múltiplas atividades já existentes no diretório de trabalho foram preservadas.

## Validação

Executados com sucesso:

- `php tests/tipos-modalidades.php`: inclui os testes de publicação e múltiplas atividades. Criação de palestra, semana acadêmica, minicurso com encontros, visita, online, híbrido, competição e personalizado; validação inválida; privacidade pública; comprovante, consulta, cancelamento; inscrições anteriores; edição e migração repetida.
- `php tests/multiplas-atividades-concorrencia.php`: dois processos disputam a última vaga; transações, unicidade, rollback e cancelamento. Usa tabelas descartáveis com prefixo aleatório e limpeza ao terminar.
- `node tests/tipos-modalidades-ui.cjs`: catálogo em subpasta, campos condicionais, estado de rascunho, filtros combinados/datas/vagas/legados, escape, privacidade e quatro etapas.
- `node tests/publicacao-ui.cjs`, `event-form-draft.cjs`, `multiplas-atividades-ui.cjs`, `organizer-navigation-ui.cjs`.
- `node tests/organizer-navigation-http.cjs`, `security-http.cjs`, `comprovante-http.cjs`, `consulta-inscricao-http.cjs`: login, 14 páginas protegidas, navegação, logout, CSRF, isolamento de sessão, comprovante e acesso online restrito a aprovados.
- `php tests/private-events.php`, `revisao-inscricoes.php`, `dashboard.php`, `consulta-inscricao.php`; `node tests/link-access-ui.cjs`, `event-date.cjs`: regressões de acesso privado, aprovação, dashboard, consulta por e-mail e datas.

**Limitação:** `node tests/eventos-browser.cjs` foi tentado, mas o Chrome local não respondeu a `Page.enable`. O roteiro foi ampliado para testar filtros, cronograma, rascunho e páginas em 320/390/844 px nos temas claro/escuro; sua execução visual permanece pendente. As regras responsivas foram implementadas, mas não são apresentadas como visualmente aprovadas.

## Etapas futuras

Sem botões de ativação para módulos ausentes: lista de espera, equipes, acompanhantes, submissão/avaliação científica, reserva individual de horários, confirmação automática por e-mail, presença, certificados, pesquisa de satisfação e classificação de competições. Pagamentos também estão fora desta etapa. O envio existente do link pessoal por e-mail foi preservado; os testes usam envio simulado, sem disparar mensagens reais.
