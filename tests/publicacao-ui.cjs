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
for (const name of ['toLocalDateTime', 'togglePublicationFields', 'eventIsClosed', 'countdownLabel', 'publicationLabel', 'updateEventScheduleConstraints', 'validateEventForm']) {
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

for (const id of ['eventDate','eventTime','eventId']) elements[id]={value:'',min:'',validationMessage:'',setCustomValidity(message){this.validationMessage=message}};
let clock=Date.parse('2026-10-01T15:30:45Z');
context.Date=class extends Date { static now(){return clock;} };
context.getEvents=()=>[];
elements.eventPublicationMode.value='published';
elements.eventDate.value='2026-09-30';elements.eventTime.value='18:00';
context.updateEventScheduleConstraints();
assert.ok(elements.eventDate.validationMessage);
assert.equal(elements.eventDate.min,'2026-10-01');
elements.eventDate.value='2026-10-01';elements.eventTime.value='12:30';
context.updateEventScheduleConstraints();
assert.ok(elements.eventTime.validationMessage);assert.equal(elements.eventTime.min,'12:31');
elements.eventTime.value='12:31';context.updateEventScheduleConstraints();
assert.equal(elements.eventTime.validationMessage,'');
elements.eventDate.value='2026-10-02';elements.eventTime.value='00:00';context.updateEventScheduleConstraints();
assert.equal(elements.eventDate.validationMessage,'');assert.equal(elements.eventTime.min,'');
clock=Date.parse('2026-10-02T02:59:50Z');
elements.eventDate.value='2026-10-01';elements.eventTime.value='23:59';context.updateEventScheduleConstraints();
assert.equal(elements.eventDate.min,'2026-10-02');assert.ok(elements.eventDate.validationMessage);
elements.eventDate.value='2026-10-02';elements.eventTime.value='00:00';context.updateEventScheduleConstraints();
assert.equal(elements.eventDate.validationMessage,'');assert.equal(elements.eventTime.validationMessage,'');
clock=Date.parse('2026-10-02T03:00:01Z');context.updateEventScheduleConstraints();
assert.ok(elements.eventTime.validationMessage,'Revalidar após a virada bloqueia horário vencido.');
context.getEvents=()=>[{id:'evt-old',date:'2000-01-01',time:'12:00',publicationMode:'draft'}];
elements.eventId.value='evt-old';elements.eventDate.value='2000-01-01';elements.eventTime.value='12:00';elements.eventPublicationMode.value='draft';
context.updateEventScheduleConstraints();assert.equal(elements.eventDate.min,'');assert.equal(elements.eventDate.validationMessage,'');
elements.eventPublicationMode.value='published';context.updateEventScheduleConstraints();assert.ok(elements.eventDate.validationMessage);
console.log('OK: calendário e horário, fuso de Brasília, virada do dia, revalidação e edição sem reagendar.');
