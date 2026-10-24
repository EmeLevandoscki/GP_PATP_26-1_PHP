const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../ideau_eventos/assets/js/app.js'), 'utf8');
const start = source.indexOf('  async function handleAdminEventActions(');
const code = source.slice(start, source.indexOf('  function populateEventForm()', start));
async function scenario({confirm = true, failure = false, refreshFailure = false, disabled = false} = {}) {
  const calls = [], notices = [];
  const button = {dataset: {deleteEvent: 'evt-test'}, disabled};
  const context = {
    serverEvents: [{id: 'evt-test', title: 'exemplo', closed: true}], legacyEvents: [{id: '1', title: 'Outro'}],
    getEvents: () => context.serverEvents.concat(context.legacyEvents),
    confirm: message => { calls.push(['confirm', message]); return confirm; },
    publicationRequest: async (action, data) => { calls.push([action, data.id]); if (failure) throw new Error('Servidor indisponivel'); },
    loadServerEvents: async () => { calls.push(['reload']); if (refreshFailure) throw new Error('Consulta indisponivel'); },
    renderAdminEventsTable: async () => { calls.push(['render']); },
    showToast: text => notices.push(text)
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  await context.handleAdminEventActions({target: {closest: selector => selector === '[data-delete-event]' ? button : null}});
  return {context, calls, notices, button};
}
(async () => {
  const cancelled = await scenario({confirm: false});
  assert.equal(cancelled.calls.length, 1);
  assert.equal(cancelled.context.serverEvents.length, 1);
  const failed = await scenario({failure: true});
  assert.equal(failed.context.serverEvents.length, 1);
  assert.equal(failed.button.disabled, false);
  assert.deepEqual(failed.notices, ['Servidor indisponivel']);
  const deleted = await scenario();
  assert.match(deleted.calls[0][1], /exemplo.*inscrições.*relatórios.*não pode ser desfeita/s);
  assert.deepEqual(deleted.calls[1], ['delete', 'evt-test']);
  assert.equal(deleted.context.serverEvents.length, 0);
  assert.equal(deleted.context.legacyEvents.length, 1);
  assert.match(deleted.notices[0], /excluído definitivamente/);
  const stale = await scenario({refreshFailure: true});
  assert.equal(stale.context.serverEvents.length, 0);
  assert.match(stale.notices[0], /Evento excluído.*Atualize/);
  assert.equal((await scenario({disabled: true})).calls.length, 0);
  console.log('OK: confirmacao, cancelamento, falha de API, exclusao persistente, recarga e clique repetido.');
})().catch(error => { console.error(error); process.exitCode = 1; });
