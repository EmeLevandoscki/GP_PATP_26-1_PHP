const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../ideau_eventos/assets/js/app.js'), 'utf8');
const elements = {};
const publicationOptions = ['published', 'scheduled', 'automatic', 'draft'].map(value => ({ value, checked: false }));
for (const id of ['eventPublicationMode', 'eventPublishAt', 'eventPublishAtGroup', 'eventPublicationHint', 'eventCoverFile', 'eventEndAt']) {
  elements[id] = { value: '', validationMessage: '', setCustomValidity(message) { this.validationMessage = message; } };
}
elements.eventForm = {
  querySelectorAll: () => elements.eventPublishAt.required ? [elements.eventPublishAt] : [],
  checkValidity: () => !elements.eventPublishAt.validationMessage && !elements.eventEndAt.validationMessage
};
const context = {
  document: {
    getElementById: id => elements[id],
    querySelectorAll: selector => selector === 'input[name="publicationMode"]' ? publicationOptions : []
  },
  getValue: id => id === 'eventCover' ? 'capa-existente' : elements[id]?.value || '',
  setText: (id, text) => { elements[id].textContent = text; }
};
vm.createContext(context);
for (const name of ['toLocalDateTime', 'togglePublicationFields', 'eventIsClosed', 'countdownLabel', 'publicationLabel', 'validateEventForm']) {
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start >= 0);
  vm.runInContext(source.slice(start, source.indexOf('\n  }', start) + 4), context);
}
function select(mode) {
  elements.eventPublicationMode.value = mode;
  context.togglePublicationFields();
  assert.deepEqual(publicationOptions.filter(option => option.checked).map(option => option.value), [mode]);
}
select('scheduled');
assert.equal(elements.eventPublishAtGroup.hidden, true);
assert.equal(elements.eventPublishAt.required, false);
assert.equal(context.validateEventForm(), true);
assert.equal(context.publicationLabel({ publicationMode: 'scheduled', published: false }), 'Agendado — manual');
select('automatic');
assert.equal(elements.eventPublishAtGroup.hidden, false);
assert.equal(elements.eventPublishAt.required, true);
assert.equal(context.validateEventForm(), false);
elements.eventPublishAt.value = '2000-01-01T10:00';
assert.equal(context.validateEventForm(), false);
elements.eventPublishAt.value = '2099-12-30T10:00';
assert.equal(context.validateEventForm(), true);
assert.equal(context.toLocalDateTime(new Date('2099-12-30T10:00').toISOString()), '2099-12-30T10:00');
select('draft');
assert.equal(elements.eventPublishAt.disabled, true);
assert.equal(context.validateEventForm(), true);
select('published');
assert.equal(elements.eventPublishAt.required, false);
assert.equal(context.publicationLabel({ publicationMode: 'automatic', published: true }), 'Publicado');
console.log('OK: opções de publicação, campos condicionais, horário futuro, conversão de fuso e status.');
elements.eventEndAt.value = '2000-01-01T12:00';
assert.equal(context.validateEventForm(), false);
elements.eventEndAt.value = '2099-12-29T12:00';
assert.equal(context.validateEventForm(), true);
select('automatic');
assert.equal(context.validateEventForm(), false, 'O limite deve ser posterior à publicação automática.');
elements.eventEndAt.value = '2099-12-31T12:00';
assert.equal(context.validateEventForm(), true);
assert.equal(context.publicationLabel({ published: true, closed: true }), 'Encerrado');
assert.equal(context.eventIsClosed({ published: true, effectiveEndAt: new Date(Date.now() - 1000).toISOString() }), true);
assert.equal(context.eventIsClosed({ publicationMode: 'draft', effectiveEndAt: '2000-01-01T12:00:00Z' }), false);
assert.equal(context.countdownLabel('2000-01-01T12:00:00Z'), 'Prazo encerrado');
assert.match(context.countdownLabel(new Date(Date.now() + 90061000).toISOString()), /^Encerra em 1d 01:01:0[01]$/);
console.log('OK: limite futuro, ordem de datas, histórico e contagem regressiva.');
