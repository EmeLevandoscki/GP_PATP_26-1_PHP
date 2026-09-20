const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ideau-receipt-'));
const router = path.join(temp, 'router.php');
fs.writeFileSync(router, `<?php
require getenv('RECEIPT_TEST_ROOT') . '/vendor/autoload.php';
$db = App\\Config\\Conexao::getConexao();
$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes (id VARCHAR(100) PRIMARY KEY)');
$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes_inscricoes (id VARCHAR(100) PRIMARY KEY, id_evento VARCHAR(100))');
$db->exec("INSERT INTO eventos_publicacoes VALUES ('evt-test')");
$db->exec("INSERT INTO eventos_publicacoes_inscricoes VALUES ('reg-test','evt-test')");

if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/fixture') {
    session_start();
    $result = App\\Service\\ComprovanteService::resposta(['protocol'=>'reg-test', 'eventId'=>'evt-test',
        'name'=>'Teste <script>alert(1)</script>', 'eventTitle'=>'Evento de teste', 'date'=>'31/12/2099',
        'time'=>'18:00', 'location'=>'Auditório', 'registeredAt'=>'20/09/2026 12:00']);
    header('Content-Type: application/json'); echo json_encode($result); return;
}
require getenv('RECEIPT_TEST_ROOT') . '/ideau_eventos/comprovante.php';
`);
(async () => {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn('php', ['-S', `127.0.0.1:${port}`, router], {
    cwd: root, env: { ...process.env, RECEIPT_TEST_ROOT: root }, stdio: 'ignore', windowsHide: true
  });
  const origin = `http://127.0.0.1:${port}`;
  try {
    let response;
    for (let i = 0; i < 50; i++) {
      try { response = await fetch(origin + '/fixture'); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(response, 'Servidor PHP deve iniciar.');
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const result = await response.json();
    const url = origin + '/' + result.receiptUrl;
    for (let i = 0; i < 2; i++) {
      const page = await fetch(url, { headers: { Cookie: cookie } });
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.match(html, /Baixar comprovante em PDF/);
      assert.match(html, /&lt;script&gt;/);
      assert.doesNotMatch(html, /<script>alert/);
    }
    const download = await fetch(url + '&download=1', { headers: { Cookie: cookie } });
    assert.equal(download.headers.get('content-type'), 'application/pdf');
    assert.match(download.headers.get('content-disposition'), /attachment/);
    const pdf = Buffer.from(await download.arrayBuffer());
    assert.equal(pdf.subarray(0, 8).toString(), '%PDF-1.4');
    const text = pdf.toString('latin1');
    assert.match(text, /\/Subtype \/Image/, 'Logo deve estar incorporada ao PDF.');
    assert.match(text, /Helvetica-Bold/, 'Títulos devem ter hierarquia visual.');
    assert.ok(text.includes(Buffer.from('COMPROVANTE DE INSCRIÇÃO', 'latin1').toString('latin1')), 'Título deve manter acentos.');
    const xref = Number(text.match(/startxref\n(\d+)/)[1]);
    assert.equal(text.slice(xref, xref + 4), 'xref');
    const receiptPage = await (await fetch(url, { headers: { Cookie: cookie } })).text();
    assert.match(receiptPage, /Cancelar minha inscrição/);
    const csrf = receiptPage.match(/name="csrf" value="([a-f0-9]+)"/)[1];
    const post = (body, authenticated = true) => fetch(url, { method: 'POST', redirect: 'manual', headers: {
      ...(authenticated ? { Cookie: cookie } : {}), 'Content-Type': 'application/x-www-form-urlencoded'
    }, body: new URLSearchParams(body) });
    assert.equal((await post({ csrf: 'invalid', confirm_cancel: '1' })).status, 403);
    assert.equal((await post({ csrf })).status, 422, 'Cancelamento exige confirmação.');
    assert.equal((await post({ csrf, confirm_cancel: '1' }, false)).status, 403, 'Outra sessão não pode cancelar.');
    assert.equal((await post({ csrf, confirm_cancel: '1' })).status, 303);
    const cancelled = await (await fetch(url, { headers: { Cookie: cookie } })).text();
    assert.match(cancelled, /Inscrição cancelada/);
    assert.doesNotMatch(cancelled, /Baixar comprovante em PDF/);
    const cancelledDownload = await fetch(url + '&download=1', { headers: { Cookie: cookie } });
    assert.notEqual(cancelledDownload.headers.get('content-type'), 'application/pdf');
    assert.equal((await fetch(url)).status, 404, 'Outra sessão não pode acessar o comprovante.');
    assert.equal((await fetch(url + '&download=1')).status, 404, 'Outra sessão não pode baixar o PDF.');
    assert.equal((await fetch(origin + '/comprovante.php?id=invalid', { headers: { Cookie: cookie } })).status, 404);
    console.log('OK: comprovante após atualizar, PDF com download e estrutura válida, escape HTML e isolamento de sessão.');
  } finally {
    child.kill();
    await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve));
    assert.ok(temp.startsWith(path.join(os.tmpdir(), 'ideau-receipt-')));
    fs.rmSync(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
