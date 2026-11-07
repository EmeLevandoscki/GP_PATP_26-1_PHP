const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const activities = [
  {id:'a',name:'Palestra <script>alert(1)</script>',startAt:'2099-12-31T18:00',endAt:'2099-12-31T19:00',remaining:1,seats:1,hours:1},
  {id:'b',name:'Oficina',startAt:'2099-12-31T19:00',endAt:'2099-12-31T20:00',remaining:1,seats:1,hours:1},
  {id:'c',name:'Conflito',startAt:'2099-12-31T18:30',endAt:'2099-12-31T19:30',remaining:0,seats:1,hours:1}
];
let selection = [];
const nodes = {activitySelectionSummary:{},activityConflict:{}};
const first = {setCustomValidity(value) { this.message = value; }};
const submit = {};
const form = {addEventListener(_,callback) { this.change = callback; },querySelector(selector) { return selector.includes('submit') ? submit : first; }};
const context = {window:{},document:{getElementById(id) { return id === 'registrationForm' ? form : nodes[id]; }},FormData:class { getAll() { return selection; } }};
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/../ideau_eventos/assets/js/activities.js','utf8'),context);
const ui=context.window.ActivityUI;
assert.equal(ui.program({eventType:'simple'}),'');
const event={eventType:'multiple',activities};
const html=ui.program(event,true);
assert.ok(html.includes('&lt;script&gt;') && !html.includes('<script>'));
assert.match(html,/value="c" disabled/);
ui.selection(event);
assert.equal(submit.disabled,true);
selection=['a','c'];form.change();
assert.equal(submit.disabled,true);
assert.match(nodes.activityConflict.textContent,/conflito/);
selection=['a','b'];form.change();
assert.equal(submit.disabled,false);
assert.equal(first.message,'');
assert.ok(nodes.activitySelectionSummary.textContent.includes('Oficina'));
assert.equal(ui.active({activities:[{id:'a',cancelledAt:null},{id:'b',cancelledAt:'2099-01-01'}]}).length,1);
assert.ok(!ui.participant({id:'reg',eventId:'evt',activities:[{id:'a',name:'<img>',cancelledAt:'2099-01-01'}]}).includes('data-cancel-activity'));
console.log('OK: eventos simples, escape HTML, atividade lotada, seleção obrigatória, horários adjacentes, conflito e cancelamentos.');
