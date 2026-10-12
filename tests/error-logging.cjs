const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ideau-error-log-'));
const publicDir = path.join(temp, 'public');
const logFile = path.join(temp, 'php-error.log');
fs.mkdirSync(publicDir);
const router = path.join(publicDir, 'router.php');
fs.writeFileSync(router, `<?php
require getenv('ERROR_TEST_ROOT').'/src/Config/runtime.php';
if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/fatal') {
    function failWithPrivateArgument($password) { throw new RuntimeException('fatal-test-marker'); }
    failWithPrivateArgument('private-argument-must-not-appear');
}
trigger_error('warning-test-marker', E_USER_WARNING);
echo 'Resposta pública';
`);

(async () => {
    let child;
    try {
        const probe = net.createServer();
        await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
        const port = probe.address().port;
        await new Promise(resolve => probe.close(resolve));
        // Começa com configurações inseguras para verificar a proteção em runtime.
        child = spawn('php', ['-d', 'display_errors=1', '-d', 'display_startup_errors=1',
            '-d', 'log_errors=0', '-d', 'zend.exception_ignore_args=0', '-d', 'error_log=' + logFile,
            '-S', '127.0.0.1:' + port, '-t', publicDir, router], {
            cwd: root, env: { ...process.env, ERROR_TEST_ROOT: root }, stdio: 'ignore', windowsHide: true,
        });
        let response;
        for (let i = 0; i < 50; i++) {
            try { response = await fetch('http://127.0.0.1:' + port + '/warning'); break; }
            catch { await new Promise(resolve => setTimeout(resolve, 100)); }
        }
        assert.ok(response, 'Servidor de teste iniciou');
        assert.equal(response.status, 200);
        assert.equal(await response.text(), 'Resposta pública');
        const fatal = await fetch('http://127.0.0.1:' + port + '/fatal');
        assert.equal(fatal.status, 500);
        assert.doesNotMatch(await fatal.text(), /fatal-test-marker|private-argument|Stack trace|router\.php/);
        const logged = fs.readFileSync(logFile, 'utf8');
        assert.match(logged, /warning-test-marker/);
        assert.match(logged, /fatal-test-marker/);
        assert.doesNotMatch(logged, /private-argument-must-not-appear/);

        // Carrega o INI real antes da compilação: bootstrap não pode ocultar erro de sintaxe próprio.
        const parseLog = path.join(temp, 'parse-error.log');
        const parse = spawnSync('php', ['-c', path.join(root, '.user.ini'), '-d', 'error_log=' + parseLog,
            '-r', 'function invalid_syntax( {'], { encoding: 'utf8', windowsHide: true });
        assert.notEqual(parse.status, 0);
        assert.equal(parse.stdout, '');
        assert.doesNotMatch(parse.stderr, /Parse error|syntax error/i);
        assert.match(fs.readFileSync(parseLog, 'utf8'), /syntax error/i);

        const fallback = spawnSync('php', ['-d', 'error_log=', '-r',
            "require 'src/Config/runtime.php'; echo ini_get('error_log');"], {
            cwd: root, encoding: 'utf8', windowsHide: true,
        });
        assert.equal(fallback.status, 0);
        assert.equal(fallback.stdout, 'syslog');
        console.log('OK: warnings e falhas fatais ocultos por HTTP, log fora da pasta pública, argumentos privados omitidos, erro de sintaxe protegido pelo INI e destino syslog padrão.');
    } finally {
        if (child && child.exitCode === null) {
            child.kill();
            await new Promise(resolve => child.once('exit', resolve));
        }
        assert.equal(path.dirname(temp), os.tmpdir());
        assert.ok(path.basename(temp).startsWith('ideau-error-log-'));
        fs.rmSync(temp, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
