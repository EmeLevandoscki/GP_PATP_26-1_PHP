<?php
// Auditoria local: somente tabelas TEMPORARY, descartadas ao encerrar a conexão.
// Exit 1 = requisito reprovado; exit 2 = não foi possível executar.
require __DIR__ . '/../vendor/autoload.php';
use App\Config\Conexao;
use App\Config\DatabaseConfig;
use App\Service\PublicacaoService;
use App\Service\UsuarioService;

$failures = 0;
function auditCheck(bool $ok, string $name): void {
    global $failures;
    echo ($ok ? 'PASSOU' : 'REPROVOU') . ': ' . $name . PHP_EOL;
    if (!$ok) $failures++;
}
function auditReject(callable $operation): bool {
    try { $operation(); return false; } catch (InvalidArgumentException) { return true; }
}
try {
    $config = DatabaseConfig::carregar();
    if (!in_array($config['host'], ['localhost', '127.0.0.1', '::1'], true)) {
        throw new RuntimeException('Teste permitido somente no banco local.');
    }
    $db = Conexao::getConexao();
    $db->exec('CREATE TEMPORARY TABLE eventos_publicacoes (id VARCHAR(100) PRIMARY KEY,
        organizador VARCHAR(255), modo VARCHAR(20), publicar_em DATETIME, dados JSON,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    $db->exec('CREATE TEMPORARY TABLE eventos_publicacoes_inscricoes (id VARCHAR(100) PRIMARY KEY,
        id_evento VARCHAR(100), dados JSON, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    $db->exec('CREATE TEMPORARY TABLE usuarios (id INT AUTO_INCREMENT PRIMARY KEY,
        nome TEXT, sobrenome TEXT, email TEXT, telefone TEXT, cpf TEXT, data_nascimento DATE,
        senha TEXT, cargo TEXT, foto_path TEXT, created_at DATETIME)');
    $service = new PublicacaoService($db);
    $png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
    $fixture = ['title' => 'Auditoria fictícia', 'institution' => 'faculdade-ideau',
        'category' => 'academico', 'audience' => 'graduacao', 'date' => '2099-12-31',
        'time' => '18:00', 'location' => 'Local de teste', 'cover' => $png, 'seats' => -1,
        'fields' => ['cpf' => true, 'email' => true], 'publicationMode' => 'published'];
    $event = $service->salvar($fixture, 'audit-owner');
    auditCheck($service->eventoPublico("' OR 1=1 -- ") === [], 'SQL Injection no identificador não retorna eventos');
    auditCheck($service->listar("' OR 1=1 -- ") === [], 'SQL Injection no organizador não retorna eventos');
    $payload = "Teste '); DROP TABLE usuarios; -- <script>audit</script>";
    $literal = $service->salvar(array_replace($fixture, ['title' => $payload]), 'audit-owner');
    auditCheck($service->eventoPublico($literal['id'])[0]['title'] === $payload
        && (int) $db->query('SELECT COUNT(*) FROM usuarios')->fetchColumn() === 0,
        'Título com SQL tratado como dado literal (escape HTML deve ocorrer na saída)');
    auditCheck(auditReject(fn () => $service->encerrar($event['id'], 'other-owner')), 'Outro organizador não encerra evento');
    foreach (['data inválida' => ['date' => '2099-02-30'], 'horário inválido' => ['time' => '25:00'],
        'vagas inválidas' => ['seats' => -2], 'SVG' => ['cover' => 'data:image/svg+xml;base64,' . base64_encode('<svg/>')],
        'PHP disfarçado de PNG' => ['cover' => 'data:image/png;base64,' . base64_encode('<?php echo 1; ?>')],
        'base64 inválido' => ['cover' => 'data:image/png;base64,%%%'],
        'imagem acima de 2 MB' => ['cover' => 'data:image/png;base64,' . base64_encode(base64_decode(explode(',', $png)[1]) . str_repeat('x', 2 * 1024 * 1024))]] as $label => $change) {
        auditCheck(auditReject(fn () => $service->salvar(array_replace($fixture, $change), 'audit-owner')), 'Recusa ' . $label);
    }
    $reg = ['eventId' => $event['id'], 'name' => 'Pessoa fictícia', 'cpf' => '52998224725', 'email' => 'audit@example.invalid'];
    auditCheck(auditReject(fn () => $service->inscrever(array_replace($reg, ['cpf' => '123']))), 'Recusa CPF com tamanho inválido');
    auditCheck(auditReject(fn () => $service->inscrever(array_replace($reg, ['email' => 'invalido']))), 'Recusa e-mail obrigatório inválido');
    auditCheck(auditReject(fn () => $service->inscrever(array_replace($reg, ['cpf' => '11111111111']))), 'Recusa CPF com dígitos verificadores inválidos');
    $optional = $service->salvar(array_replace($fixture, ['fields' => []]), 'audit-owner');
    auditCheck(auditReject(fn () => $service->inscrever(array_replace($reg, ['eventId' => $optional['id'], 'email' => 'invalido']))), 'Valida e-mail opcional quando fornecido');
    $users = new UsuarioService();
    $user = ['nome' => 'Teste fictício', 'sobrenome' => '', 'email' => 'bad-email', 'telefone' => '',
        'cpf' => 'cpf-invalido', 'cargo' => 'responsavel', 'foto_path' => '', 'senha' => 'audit-only-password'];
    $rejected = false;
    try { $id = $users->cadastrarUsuario($user); }
    catch (PDOException $error) { throw $error; } // Falha de banco não conta como validação.
    catch (Exception) { $rejected = true; }
    auditCheck($rejected, 'Cadastro legado recusa CPF/e-mail malformados');
    $user = array_replace($user, ['cpf' => '529.982.247-25', 'email' => 'audit-user@example.invalid']);
    $id = $users->cadastrarUsuario($user);
    $stmt = $db->prepare('SELECT senha FROM usuarios WHERE id = ?'); $stmt->execute([$id]);
    $hash = $stmt->fetchColumn();
    auditCheck($hash !== $user['senha'] && password_verify($user['senha'], $hash)
        && !password_verify('incorrect', $hash), 'Senha armazenada como hash e verificada corretamente');
    auditCheck($users->realizarLogin($user['email'], $user['senha'])->id == $id, 'Login legado funciona com prepares nativos');
    foreach ([['cpf' => '11111111111'], ['email' => 'invalido'], ['cpf' => []], ['email' => []]] as $change) {
        auditCheck(auditReject(fn () => $users->cadastrarUsuario(array_replace($user, $change))), 'Cadastro recusa campo inválido: ' . array_key_first($change));
        auditCheck(auditReject(fn () => $users->editarUsuario(array_replace($user, ['id' => $id], $change))), 'Edição recusa campo inválido: ' . array_key_first($change));
    }
    $legacy = new \App\Service\EventoService();
    foreach ([['responsible_cpf' => '11111111111'], ['email' => 'invalido']] as $change) {
        auditCheck(auditReject(fn () => $legacy->realizarInscricao(array_replace(
            ['responsible_cpf' => '52998224725', 'email' => 'audit@example.invalid'], $change))),
            'Inscrição legada valida dados antes de reutilizar cadastro: ' . array_key_first($change));
    }
    foreach ([['cpf' => '11111111111'], ['responsibleCpf' => '11111111111'], ['cpf' => []], ['email' => []], ['eventId' => []]] as $change) {
        auditCheck(auditReject(fn () => $service->inscrever(array_replace($reg, ['eventId' => $optional['id']], $change))),
            'Inscrição valida campo opcional/tipo: ' . array_key_first($change));
    }
    echo 'Requisitos reprovados: ' . $failures . PHP_EOL;
    exit($failures ? 1 : 0);
} catch (Throwable $error) {
    // Não imprimir mensagens de conexão ou valores privados.
    echo 'NAO EXECUTADO: ' . get_class($error) . '; code=' . $error->getCode() . PHP_EOL;
    exit(2);
}
