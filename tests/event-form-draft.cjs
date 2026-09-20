const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../ideau_eventos/assets/js/app.js'), 'utf8');
const start = source.indexOf('  function initEventFormDraft(');
assert.ok(start >= 0);
const implementation = source.slice(start, source.indexOf('\n  }', start) + 4);
const storage = new Map();
let rejectCover = false;

function openForm(search = '') {
  const fields = Object.fromEntries([
    ['eventId', 'hidden', 'server-id'], ['eventTitle', 'text', 'Título do servidor'],
    ['eventInstitution', 'select-one', ''], ['eventAudience', 'select-one', ''],
    ['eventSummary', 'textarea', ''], ['eventDescription', 'textarea', ''],
    ['eventCover', 'hidden', ''], ['eventCoverFile', 'file', ''],
    ['eventPublicationMode', 'hidden', 'published'], ['eventPublishAt', 'datetime-local', ''],
    ['eventEndAt', 'datetime-local', ''],
    ['fieldEmail', 'checkbox', 'on']
  ].map(([id, type, value]) => [id, { id, type, value, checked: true }]));
  const events = {};
  const lifecycle = {};
  const notices = [];
  const selected = { value: 'published' };
  const form = {
    querySelectorAll: () => Object.values(fields),
    querySelector: () => selected,
    addEventListener: (name, handler) => { events[name] = handler; }
  };
  const context = {
    URLSearchParams,
    window: {
      location: { pathname: '/ideau_eventos/evento-form.html', search },
      addEventListener: (name, handler) => { lifecycle[name] = handler; }
    },
    document: { getElementById: id => id === 'eventForm' ? form : fields[id] },
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => {
        if (rejectCover && key.endsWith(':cover')) throw new Error('Quota exceeded');
        storage.set(key, value);
      },
      removeItem: key => storage.delete(key)
    },
    getValue: id => fields[id].value,
    setValue: (id, value) => { fields[id].value = value; },
    showToast: message => notices.push(message),
    syncEventInstitution: () => {
      fields.eventAudience.value = fields.eventInstitution.value === 'faculdade-ideau' ? 'graduacao' : '';
      fields.fieldEmail.checked = true;
    },
    toggleAudienceFieldGroups: () => {},
    togglePublicationFields: () => {
      selected.value = fields.eventPublicationMode.value;
      fields.eventPublishAt.disabled = selected.value !== 'automatic';
    },
    showEventCoverPreview: source => { fields.eventCoverFile.required = !source; }
  };
  vm.createContext(context);
  vm.runInContext(implementation, context);
  const controller = context.initEventFormDraft();
  return { fields, events, lifecycle, selected, notices, controller };
}

const form = openForm();
form.fields.eventTitle.value = '  Evento ainda em edição  ';
form.fields.eventInstitution.value = 'faculdade-ideau';
form.fields.eventDescription.value = 'Primeira linha\nSegunda linha';
form.fields.fieldEmail.checked = false;
form.fields.eventCover.value = 'data:image/png;base64,teste';
form.selected.value = 'automatic';
form.fields.eventPublishAt.value = '2099-12-30T10:00';
form.fields.eventEndAt.value = '2099-12-31T18:00';
form.events.input();

const refreshed = openForm();
assert.equal(refreshed.fields.eventTitle.value, form.fields.eventTitle.value);
assert.equal(refreshed.fields.eventDescription.value, form.fields.eventDescription.value);
assert.equal(refreshed.fields.eventSummary.value, '');
assert.equal(refreshed.fields.eventAudience.value, 'graduacao');
assert.equal(refreshed.fields.fieldEmail.checked, false, 'Restaurar instituição não deve substituir escolhas pessoais.');
assert.equal(refreshed.fields.eventId.value, 'server-id');
assert.equal(refreshed.fields.eventCover.value, form.fields.eventCover.value);
assert.equal(refreshed.fields.eventCoverFile.value, '', 'O navegador não permite restaurar um input de arquivo.');
assert.equal(refreshed.fields.eventCoverFile.required, false);
assert.equal(refreshed.selected.value, 'automatic');
assert.equal(refreshed.fields.eventPublishAt.disabled, false);
assert.equal(refreshed.fields.eventPublishAt.value, '2099-12-30T10:00');
assert.equal(refreshed.fields.eventEndAt.value, '2099-12-31T18:00');

const edit = openForm('?id=evt-outro');
assert.equal(edit.fields.eventTitle.value, 'Título do servidor');
edit.fields.eventTitle.value = 'Outro evento';
edit.events.change();
refreshed.controller.clear();
refreshed.lifecycle.pagehide();
refreshed.events.input();
assert.equal(openForm().fields.eventTitle.value, 'Título do servidor', 'Salvar com sucesso deve limpar a cópia, inclusive ao sair da página.');
assert.equal(openForm('?id=evt-outro').fields.eventTitle.value, 'Outro evento');

rejectCover = true;
const limited = openForm();
limited.fields.eventTitle.value = 'Preservar texto mesmo sem espaço para a capa';
limited.fields.eventCover.value = 'data:image/png;base64,grande';
limited.events.input();
limited.events.change();
assert.equal(limited.notices.length, 1);
assert.equal(openForm().fields.eventTitle.value, limited.fields.eventTitle.value);
rejectCover = false;
limited.fields.eventCover.value = 'data:image/png;base64,menor';
limited.events.change();
rejectCover = true;
limited.fields.eventCover.value = 'data:image/png;base64,grande';
limited.events.change();
rejectCover = false;
limited.fields.eventCover.value = 'data:image/png;base64,menor';
limited.events.change();
assert.equal(openForm().fields.eventCover.value, limited.fields.eventCover.value, 'Deve voltar a guardar a capa após uma falha.');
storage.clear();
storage.set('ideauEventos.eventForm.v1:/ideau_eventos/evento-form.html:new', '{inválido');
const corrupted = openForm();
assert.equal(corrupted.fields.eventTitle.value, 'Título do servidor');
corrupted.events.input();
assert.doesNotThrow(() => openForm());
console.log('OK: recuperação após atualizar, capa, agendamento, escolhas, isolamento, limpeza e falhas de armazenamento.');
