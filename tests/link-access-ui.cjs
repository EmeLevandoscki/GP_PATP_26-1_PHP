const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../ideau_eventos/assets/js/app.js'), 'utf8');
const elements = {};
for (const id of ['eventRecipientMode', 'eventAccessMode', 'eventLinkAccessOptions', 'eventCourseAccessOptions', 'eventTargetCourseGroup', 'eventTargetCourse', 'fieldCpf', 'fieldCourse', 'fieldCommunity']) {
  elements[id] = {value: '', checked: false, disabled: false, required: false, hidden: false,
    setCustomValidity(message) { this.message = message; }};
}
const recipientOptions = ['anyone', 'course', 'manual'].map(value => ({value}));
const accessOptions = ['public', 'link'].map(value => ({value}));
let audience = 'graduacao';
const context = {
  getValue: id => elements[id].value,
  setValue: (id, value) => { elements[id].value = value; },
  getFormAudience: () => audience,
  toggleAudienceFieldGroups: () => {},
  document: {
    getElementById: id => elements[id],
    querySelectorAll: selector => selector.includes('recipientMode') ? recipientOptions : accessOptions
  }
};
vm.createContext(context);
const start = source.indexOf('  function toggleEventAccess()');
vm.runInContext(source.slice(start, source.indexOf('  function currentAccessToken()', start)), context);
elements.eventAccessMode.value = 'link';
elements.eventRecipientMode.value = 'course';
context.toggleEventAccess();
assert.equal(elements.eventTargetCourse.required, true);
assert.equal(elements.eventTargetCourseGroup.hidden, false);
assert.equal(elements.fieldCourse.checked, true);
elements.eventTargetCourse.setCustomValidity('Preencha este campo.');
elements.eventRecipientMode.value = 'anyone';
context.toggleEventAccess();
assert.equal(elements.eventCourseAccessOptions.hidden, false);
assert.equal(elements.eventTargetCourseGroup.hidden, true);
assert.equal(elements.eventTargetCourse.required, false);
assert.equal(elements.eventTargetCourse.disabled, true);
assert.equal(elements.eventTargetCourse.message, '');
assert.equal(elements.fieldCourse.checked, false);
assert.deepEqual(recipientOptions.filter(option => option.checked).map(option => option.value), ['anyone']);
assert.ok(recipientOptions.every(option => !option.disabled));
elements.eventRecipientMode.value = 'manual';
context.toggleEventAccess();
assert.equal(elements.eventTargetCourse.required, true);
assert.equal(elements.fieldCourse.checked, true);
elements.eventRecipientMode.value = 'selected';
context.toggleEventAccess();
assert.equal(elements.eventRecipientMode.value, 'manual');
elements.eventAccessMode.value = 'public';
context.toggleEventAccess();
assert.equal(elements.eventLinkAccessOptions.hidden, true);
assert.equal(elements.eventTargetCourse.required, false);
elements.eventAccessMode.value = 'link';
audience = 'escola';
context.toggleEventAccess();
assert.equal(elements.eventCourseAccessOptions.hidden, true);
assert.equal(elements.eventTargetCourse.required, false);
console.log('OK: qualquer pessoa com link dispensa curso; curso, aprovacao manual, eventos antigos e escola preservados.');
