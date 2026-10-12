// Sondagem autorizada do domínio do projeto: somente GET, sem login ou gravação.
// Não imprime corpos de resposta, cookies, tokens ou credenciais.
const origin = 'https://ideaueventos.com.br';
const paths = ['/', '/.env', '/.git/config', '/.user.ini', '/db/criar_db.sql',
  '/documentacao.md', '/debug.log', '/src/Config/database.local.php',
  '/src/Service/PublicacaoService.php', '/composer.lock',
  '/src/Controller/PublicacaoController.php?action=session',
  '/src/Controller/PublicacaoController.php?action=registrations',
  '/src/Controller/PublicacaoController.php?action=events&scope=admin',
  '/src/Controller/EventoController.php?action=inscricoes_evento&id=1',
  '/src/Controller/UsuarioController.php'];
(async () => {
  for (const url of ['http://ideaueventos.com.br/', ...paths.map(p => origin + p)]) {
    try {
      // Validação TLS padrão permanece ativa; redirecionamentos não são seguidos.
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
      const body = await response.text();
      const cookie = response.headers.get('set-cookie') || '';
      const location = response.headers.get('location');
      const destination = location ? new URL(location, url) : null;
      console.log(JSON.stringify({ url, status: response.status,
        location: destination ? destination.origin + destination.pathname : null,
        contentType: response.headers.get('content-type'), bytes: Buffer.byteLength(body),
        cookie: cookie ? { secure: /;\s*secure/i.test(cookie), httpOnly: /;\s*httponly/i.test(cookie),
          sameSite: /;\s*samesite=([^;]+)/i.exec(cookie)?.[1] || null } : null,
        hsts: response.headers.get('strict-transport-security'),
        nosniff: response.headers.get('x-content-type-options'),
        internalMarkers: /CREATE TABLE|<\?php|\[core\]|DB_PASSWORD|Stack trace|PHP (?:Warning|Fatal)/i.test(body) }));
    } catch (error) {
      console.log(JSON.stringify({ url, error: error.cause?.code || error.name }));
      process.exitCode = 2;
    }
  }
})().catch(() => { console.error('Falha na sondagem, sem exibir dados internos.'); process.exitCode = 2; });
