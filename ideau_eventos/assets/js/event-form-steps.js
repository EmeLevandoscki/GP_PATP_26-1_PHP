// Navegação do cadastro sem recriar os campos nem perder o preenchimento.
window.initEventFormSteps = function (form, { validate, showErrors, saveDraft }) {
  const steps = [...form.querySelectorAll('[data-event-step]')];
  const state = document.getElementById('eventFormStep');
  const progress = [...document.querySelectorAll('#eventFormProgress li')];
  const status = document.getElementById('eventStepStatus');
  const previous = document.getElementById('eventStepBack');
  const next = document.getElementById('eventStepNext');
  const submit = form.querySelector('button[type="submit"]');
  const summary = document.getElementById('eventFormErrors');
  let current = Math.max(0, Math.min(steps.length - 1, Number.parseInt(state.value, 10) || 0));
  let busy = false;

  function show(index, focus = true) {
    current = index;
    state.value = String(index);
    form.dispatchEvent(new Event('event-step-change'));
    summary.hidden = true;
    summary.replaceChildren();
    form.querySelectorAll('.field-error').forEach(error => error.remove());
    form.querySelectorAll('[aria-invalid]').forEach(field => {
      field.removeAttribute('aria-invalid');
      const descriptions = (field.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== field.id + 'Error');
      if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' '));
      else field.removeAttribute('aria-describedby');
    });
    steps.forEach((step, i) => {
      step.hidden = i !== current;
      if (i === current) progress[i].setAttribute('aria-current', 'step');
      else progress[i].removeAttribute('aria-current');
      progress[i].classList.toggle('is-complete', i < current);
    });
    const heading = steps[current].querySelector('h2');
    status.textContent = 'Etapa ' + (current + 1) + ' de ' + steps.length + ' · ' + heading.textContent;
    previous.disabled = busy || current === 0;
    next.disabled = busy;
    next.hidden = current === steps.length - 1;
    submit.hidden = !next.hidden;
    submit.disabled = busy;
    if (focus) {
      heading.focus({preventScroll: true});
      document.getElementById('eventFormProgress').scrollIntoView({block: 'start', behavior: 'instant'});
    }
    saveDraft();
  }

  function advance() {
    if (busy || current === steps.length - 1) return;
    if (!validate(steps[current])) {
      showErrors();
      return;
    }
    show(current + 1);
  }

  previous.addEventListener('click', () => {
    if (!busy && current > 0) show(current - 1);
  });
  next.addEventListener('click', advance);
  // Um preenchimento recuperado não pode pular uma etapa que ficou inválida.
  for (let i = 0; i < current; i++) {
    if (!validate(steps[i])) { current = i; break; }
  }
  show(current, false);
  return {
    next: advance,
    isLast: () => current === steps.length - 1,
    currentSection: () => steps[current],
    revealField(field) {
      const index = steps.indexOf(field?.closest('[data-event-step]'));
      if (index >= 0 && index !== current) show(index, false);
    },
    showFirstInvalid() {
      const invalid = [...form.querySelectorAll('input, select, textarea')].find(field => field.willValidate && !field.validity.valid);
      this.revealField(invalid);
    },
    setBusy(value) {
      busy = value;
      previous.disabled = busy || current === 0;
      next.disabled = busy;
      submit.disabled = busy;
      form.setAttribute('aria-busy', String(busy));
    }
  };
};
