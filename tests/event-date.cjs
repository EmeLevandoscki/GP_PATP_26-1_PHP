const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../ideau_eventos/assets/js/app.js'), 'utf8');
const implementation = source.slice(source.indexOf('  function updateEventScheduleConstraints()'), source.indexOf('  function validateEventForm('));
const field = value => ({ value, validity: { badInput: false }, setCustomValidity(message) { this.message = message; } });
const date = field('');
const time = field('18:00');
let original = [];
const context = {
  document: { getElementById: id => id === 'eventDate' ? date : time },
  getEvents: () => original,
  getValue: id => id === 'eventId' ? 'evt-test' : 'published',
  Intl, Date
};
vm.createContext(context);
vm.runInContext(implementation, context);
for (const value of ['322323-01-01', '10000-01-01', '0000-01-01', '2099-02-29', '2099-04-31', '2099-13-01', '2099-1-01']) {
  date.value = value;
  context.updateEventScheduleConstraints();
  assert.match(date.message, /data válida/, value);
}
for (const value of ['2099-12-31', '2100-02-28', '2104-02-29']) {
  date.value = value;
  context.updateEventScheduleConstraints();
  assert.equal(date.message, '', value);
}
date.value = '';
date.validity.badInput = true;
context.updateEventScheduleConstraints();
assert.match(date.message, /data válida/);
date.validity.badInput = false;
date.value = '2000-01-01';
context.updateEventScheduleConstraints();
assert.match(date.message, /a partir de hoje/);
original = [{id: 'evt-test', date: date.value, time: time.value, publicationMode: 'published'}];
context.updateEventScheduleConstraints();
assert.equal(date.message, '', 'Editar os dados de um evento antigo deve preservar sua data.');
assert.equal(date.min, '');
console.log('OK: ano de quatro dígitos, calendário, entrada incompleta, data passada e edição de evento antigo.');
