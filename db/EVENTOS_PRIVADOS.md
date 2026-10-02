# Eventos privados por link e aprovação de alunos

## Cadastro e compartilhamento

1. No cadastro, avance até **Acesso ao evento** e selecione **Privado**.
2. Para faculdade, escolha ou digite o **Curso permitido**.
3. Escolha uma das duas opções:
   - **Alunos que informarem o curso**: a inscrição é confirmada automaticamente quando a pessoa usa o link e informa o curso escolhido.
   - **Aprovar alunos manualmente**: a pessoa usa o link e informa nome, CPF e curso; a inscrição fica **Aguardando aprovação**. Não é necessário montar uma lista antes.
4. Marque **Mostrar a divulgação na página pública** se quiser divulgar o evento. Visitantes sem o link veem a divulgação, mas precisam do link para se inscrever. Desmarcado, o evento fica oculto da listagem e não abre somente pelo ID.
5. Salve e publique. Na lista de eventos, use **Copiar link** e compartilhe o endereço inteiro, incluindo o trecho #acesso=....

O link pode ser encaminhado. O curso é declarado pelo participante, sem consulta a um sistema oficial de matrícula. Na aprovação manual, cabe ao organizador conferir os dados.

## Aprovar, recusar e remover

Em **Relatórios/Inscritos**, abra o evento. O filtro permite consultar todas as inscrições, somente as pendentes ou somente as confirmadas.

- **Aprovar** confirma a inscrição e libera o comprovante. O aluno acompanha pela página de sua inscrição ou pela consulta por e-mail existente.
- **Recusar** cancela o pedido pendente e libera a vaga.
- **Remover aluno** cancela uma inscrição confirmada e invalida o comprovante. Também está disponível para os eventos que confirmam automaticamente pelo curso, incluindo eventos públicos criados no formulário atual.
- Recusa e remoção pedem confirmação com o nome do aluno. Afetam somente a inscrição naquele evento; não apagam os outros eventos ou inscrições da pessoa.
- Recusar/remover não cria uma lista de bloqueio permanente. A pessoa pode enviar uma nova inscrição se ainda tiver acesso, prazo e vaga; no modo manual, o novo pedido volta a aguardar aprovação.
- As ações são verificadas no servidor com sessão, CSRF e propriedade do evento. As inscrições do sistema legado continuam com o gerenciamento anterior.

PDF e Excel acompanham a busca e o filtro de situação. A coluna **Situação** diferencia pendentes e confirmadas nos eventos com aprovação. Botões de gerenciamento não aparecem nas exportações.

## Vagas, comprovantes e histórico

Pedidos pendentes reservam vaga. Aprovar não ocupa uma segunda vaga; recusar, remover ou cancelar libera a vaga. As contagens de inscrições ativas e a ocupação incluem os pedidos pendentes; a tela do evento separa a quantidade pendente da confirmada.

A página da inscrição consulta a situação atual no servidor. Pendentes não têm PDF de confirmação, mesmo com um link de download antigo. A consulta por e-mail também mostra a pendência. Não foi acrescentado envio automático de e-mail ao aprovar ou recusar.

Recusas e remoções usam a mesma transação e o mesmo histórico estatístico dos cancelamentos, sem dados pessoais nesse histórico. A tabela opcional é criada por db/dashboard_cancelamentos.sql, conforme db/DASHBOARD.md.

## Compatibilidade

- As opções e situações ficam no JSON existente, sem nova migração SQL.
- A antiga modalidade de lista prévia por CPF passa a exigir aprovação manual para novas inscrições. Inscrições existentes continuam confirmadas. A lista antiga deixa de ser usada e é removida do JSON quando o evento é salvo novamente.
- Mudar o modo de autorização não altera a situação das inscrições já recebidas: pendentes continuam aguardando revisão e confirmadas continuam confirmadas.
- O servidor gera e preserva o segredo do link nas edições. Tornar público remove o segredo; voltar ao privado gera um novo link.
- Segredo e listas antigas não são expostos pelas consultas públicas. O segredo é removido dos dados da inscrição antes de salvar.
- Link, curso, publicação, prazos e vagas continuam sendo conferidos no servidor. O link não antecipa agendamentos nem reabre eventos encerrados.
- Para escola, a opção privada continua restringindo pelo link; a escolha por curso/aprovação se aplica à faculdade.

## Publicação na hospedagem

Atualizar juntos os arquivos de serviço e controlador: src/Service/PublicacaoService.php, src/Service/ComprovanteService.php, src/Service/ConsultaInscricaoService.php e src/Controller/PublicacaoController.php.

Atualizar também ideau_eventos/assets/js/app.js, as páginas evento-form.html, relatorios.html, inscritos.html, evento.html, inscricao.html, eventos.html, comprovante.php e consultar-inscricao.php dentro de ideau_eventos. Manter os arquivos editable-choices.js/.css e event-form-steps.js/.css usados pelo formulário em etapas.

Validações: php tests/private-events.php, php tests/revisao-inscricoes.php, node tests/private-events-http.cjs, node tests/comprovante-http.cjs, node tests/consulta-inscricao-http.cjs e node tests/eventos-browser.cjs. Esses testes usam tabelas temporárias ou respostas simuladas.
