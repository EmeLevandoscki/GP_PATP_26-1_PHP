(() => {
  const form = document.getElementById('eventForm');
  if (!form) return;
  const tips = {
    eventTitle: 'Use um nome claro. Ele será exibido na divulgação e no comprovante de inscrição.',
    eventKind: 'Escolha o formato, como palestra, curso ou visita. Isso define os campos complementares da próxima etapa.',
    eventCustomKind: 'Informe o formato do evento quando nenhuma opção da lista se aplicar.',
    eventModality: 'Presencial exige um local; online exige uma plataforma. Híbrido combina as duas formas de participação.',
    eventType: 'No evento simples, a inscrição é única. Com múltiplas atividades, o participante escolhe atividades com horários e vagas próprios.',
    eventInstitution: 'Escolha quem organiza o evento. Na escola, a inscrição identifica o responsável e o educando; na faculdade, o participante.',
    eventCategory: 'Agrupe o evento por assunto para facilitar a divulgação. Você pode escolher uma sugestão ou digitar outra categoria.',
    eventAudience: 'Descreva para quem é o evento. Exemplo: alunos de Direito, famílias ou comunidade externa.',
    eventDate: 'Informe a data de início. Para vários encontros, detalhe as outras datas na próxima etapa.',
    eventTime: 'Informe o horário de início usando o horário de Brasília.',
    eventCity: 'Informe a cidade onde acontecerá a participação presencial.',
    eventLocation: 'Informe um local que o participante consiga identificar, como o campus ou auditório.',
    eventRoom: 'Detalhe a sala, bloco ou auditório para facilitar a chegada.',
    eventAddress: 'Informe rua, número e outras referências úteis para chegar ao local.',
    eventPlatform: 'Informe o serviço usado na transmissão, como Google Meet, Zoom ou Teams.',
    eventOnlineUrl: 'Cole o link completo, começando com https://. Ele aparece no comprovante dos inscritos aprovados que participam online.',
    eventOnlineInstructions: 'Explique como entrar na transmissão. Estas orientações são privadas; evite colocar links privados na descrição pública.',
    eventParticipationChoice: 'Em eventos híbridos, permite que o participante escolha presencial ou online ao se inscrever.',
    eventCoverFile: 'Escolha uma imagem PNG, JPG ou WEBP de até 2 MB. Ela será usada na divulgação do evento.',
    eventSummary: 'Escreva uma apresentação curta para os cards. Deixe os detalhes para a descrição completa.',
    eventDescription: 'Explique a proposta, a programação e as regras. Este texto é público; não inclua senhas ou links reservados.',
    eventSeats: 'Limita o total de inscrições no evento. Deixe vazio para não limitar. Em eventos com atividades, configure também as vagas de cada uma.',
    eventRegistrationEndAt: 'Fecha novas inscrições nesse momento, mas mantém o evento no site. Use o horário do seu dispositivo; uma data passada fecha as inscrições imediatamente.',
    eventExtraFields: 'Adicione uma pergunta por linha. Para exigir resposta, escreva |required no final. Exemplo: Matrícula|required.',
    eventListed: 'Mostra a divulgação do evento privado na página pública. A inscrição continua exigindo o link de acesso.',
    eventTargetCourse: 'Escolha ou digite o curso permitido. O participante deverá informar esse curso na inscrição.',
    eventPublishAt: 'Define quando o evento será publicado automaticamente. Use a data e o horário do seu dispositivo.',
    eventEndAt: 'Retira o evento do ar automaticamente. Para apenas fechar inscrições e manter a divulgação, use o prazo da etapa Inscrições.',
    eventAllowPresenter: 'Permite identificar a inscrição como apresentador. O sistema ainda não gerencia submissão de trabalhos.',
    eventAllowExhibitor: 'Permite identificar a inscrição como expositor.',
    eventAllowVolunteer: 'Permite identificar a inscrição como voluntário.',
    fieldCpf: 'Inclui o CPF no formulário de inscrição.',
    fieldEmail: 'Inclui o e-mail na inscrição. Ele é usado na consulta da inscrição por link pessoal.',
    fieldPhone: 'Inclui um telefone de contato no formulário.',
    fieldNotes: 'Permite que o participante escreva observações ao se inscrever.',
    fieldCourse: 'Inclui a escolha do curso no formulário de inscrição.',
    fieldCommunity: 'Permite indicar participação como comunidade externa.',
    fieldResponsibleCPF: 'Solicita o CPF de quem faz a inscrição do educando.',
    fieldResponsibleName: 'Identifica o responsável pela inscrição do educando. Este campo é obrigatório.',
    fieldRelationship: 'Pergunta a relação do responsável com o educando, como mãe, pai ou tutor.',
    fieldStudentName: 'Identifica o educando que participará do evento. Este campo é obrigatório.',
    fieldStudentClass: 'Solicita a turma do educando.'
  };
  const specificTips = {
    responsible: 'Informe quem responde por esta programação.', speaker: 'Informe o nome do palestrante ou responsável pela apresentação.',
    instructor: 'Informe quem conduzirá o curso ou oficina.', topic: 'Descreva o assunto principal da apresentação.',
    hours: 'Informe a duração em horas. Exemplo: 1,5 para uma hora e meia. Este campo não emite certificados automaticamente.',
    prerequisites: 'Descreva conhecimentos ou condições necessárias para participar.', materials: 'Liste o que o participante precisa levar ou preparar.',
    schedule: 'Detalhe horários e orientações. Este texto é informativo e não cria reservas individuais.',
    program: 'Descreva a sequência da programação. Para inscrições separadas, use múltiplas atividades.',
    guidance: 'Inclua orientações públicas para ajudar o participante a se preparar.',
    organization: 'Informe o nome da empresa ou instituição que receberá a visita.',
    departureLocation: 'Indique o ponto de encontro para a saída.', destination: 'Informe o destino da visita.',
    departureAt: 'Informe a data e o horário de saída em Brasília.', returnAt: 'Informe a previsão de retorno em horário de Brasília.',
    documents: 'Liste os documentos que o participante deverá apresentar ou levar.', transport: 'Explique como será o deslocamento e o que está incluído.',
    rules: 'Explique as regras de participação. O sistema ainda não calcula resultados ou classificação.',
    categories: 'Descreva as categorias da competição. A inscrição permanece individual.', stages: 'Liste as etapas e seus prazos.',
    areas: 'Liste os temas ou áreas de pesquisa do evento.', exhibitors: 'Divulgue apenas nomes de expositores que autorizaram a divulgação.',
    booths: 'Indique onde ficam os estandes para orientar os visitantes.', invitations: 'Explique as regras dos convites. Não há controle separado de acompanhantes.',
    agenda: 'Liste os assuntos da reunião. Este campo não agenda atendimentos individuais.', volunteers: 'Explique as funções e orientações para os voluntários.'
  };
  const activityTips = {
    name: 'Dê um nome para o participante identificar esta atividade.', type: 'Escolha o formato desta atividade.',
    customType: 'Preencha se o tipo escolhido for Outro / Personalizado.',
    startAt: 'Informe o início da atividade em horário de Brasília.', endAt: 'Informe o término, depois do início. Participantes não podem escolher atividades com horários sobrepostos.',
    location: 'Informe onde esta atividade acontecerá.', speaker: specificTips.speaker,
    seats: 'Limite de participantes desta atividade. Informe pelo menos uma vaga.', hours: specificTips.hours,
    description: 'Explique o conteúdo e as orientações desta atividade. O texto será público.'
  };
  const meetingTips = {
    title: 'Identifique este encontro. Uma única inscrição no evento abrange todos os encontros.',
    startAt: 'Informe o início deste encontro em horário de Brasília.',
    endAt: 'Informe o término deste encontro, depois do início, em horário de Brasília.',
    location: 'Informe o local ou o nome da plataforma. Não coloque links privados aqui.'
  };
  const popup = document.createElement('div');
  popup.id = 'eventFieldHelp'; popup.className = 'event-help-popover'; popup.hidden = true;
  popup.setAttribute('role', 'region');
  document.body.append(popup);
  const content = new WeakMap();
  let active = null, sequence = 0;
  function close() {
    active?.setAttribute('aria-expanded', 'false');
    active = null; popup.hidden = true;
  }
  function addHelp(heading, text) {
    if (!heading || heading.querySelector('.event-help-trigger')) return;
    // A link with button semantics keeps the existing input label valid and clickable.
    const trigger = document.createElement('a');
    trigger.href = '#eventFieldHelp'; trigger.className = 'event-help-trigger';
    trigger.id = `eventHelpTrigger${++sequence}`;
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-label', `Ajuda: ${heading.textContent.trim().replace(/\s*\*$/, '')}`);
    trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', popup.id);
    trigger.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 9v5"/><circle cx="10" cy="6" r=".8" fill="currentColor" stroke="none"/></svg>';
    content.set(trigger, text); heading.append(trigger);
  }
  function enhance() {
    form.querySelectorAll('label.form-field, label.check-card').forEach(label => {
      const control = label.querySelector('input:not([type="hidden"]), select, textarea');
      if (!control) return;
      const text = tips[control.id] || specificTips[control.dataset.specific] ||
        activityTips[control.dataset.field] || meetingTips[control.dataset.meetingField];
      if (text) addHelp(label.querySelector(':scope > span'), text);
    });
    const groupTips = {
      accessMode: 'Público permite inscrições de qualquer visitante. Privado exige o link de acesso que você compartilha depois de publicar.',
      recipientMode: 'Escolha entre acesso livre pelo link, declaração de curso ou aprovação manual. Na aprovação manual, confira cada inscrição em Relatórios/Inscritos.',
      publicationMode: 'Publicar agora disponibiliza ao salvar. Publicar manualmente depois aguarda sua ação; agendar usa uma data; rascunho guarda para continuar editando.'
    };
    for (const [name, text] of Object.entries(groupTips)) {
      addHelp(form.querySelector(`input[name="${name}"]`)?.closest('fieldset')?.querySelector('legend'), text);
    }
    if (active && (!active.isConnected || !active.getClientRects().length)) close();
  }
  form.addEventListener('click', event => {
    const trigger = event.target.closest('.event-help-trigger');
    if (!trigger) return;
    event.preventDefault(); event.stopPropagation();
    if (active === trigger) { close(); return; }
    close(); active = trigger; active.setAttribute('aria-expanded', 'true');
    popup.textContent = content.get(trigger); popup.setAttribute('aria-labelledby', trigger.id);
    popup.hidden = false;
    const box = trigger.getBoundingClientRect(), width = popup.offsetWidth, height = popup.offsetHeight;
    popup.style.left = `${Math.max(12, Math.min(box.left, innerWidth - width - 12))}px`;
    const top = box.bottom + 8 + height <= innerHeight - 12 ? box.bottom + 8 : box.top - height - 8;
    popup.style.top = `${Math.max(12, Math.min(top, innerHeight - height - 12))}px`;
  });
  form.addEventListener('keydown', event => {
    if (event.key === ' ' && event.target.matches('.event-help-trigger')) {
      event.preventDefault(); event.target.click();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) { const trigger = active; close(); trigger.focus(); }
  });
  document.addEventListener('click', event => { if (!popup.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (active && event.target !== active && !popup.contains(event.target)) close(); });
  document.addEventListener('scroll', event => { if (!popup.contains(event.target)) close(); }, true);
  window.addEventListener('resize', close);
  enhance();
  // Covers type-specific fields, new activities/meetings and wizard step changes.
  new MutationObserver(enhance).observe(form, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden']});
})();
