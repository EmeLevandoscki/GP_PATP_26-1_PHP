<?php
// Diagnostico temporario, somente leitura e exclusivo da sessao do organizador.
require_once __DIR__ . '/../src/Config/runtime.php';
require_once __DIR__ . '/../vendor/autoload.php';

\App\Service\RequestSecurity::session();
\App\Service\RequestSecurity::organizer();
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    \App\Service\RequestSecurity::deny('Use uma consulta GET.', 405);
}
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');

function diagnosticoErro(Throwable $error): string
{
    // Nao exibir getMessage(): erros do MySQL podem conter dados de acesso.
    if ($error instanceof PDOException) {
        $number = (int) ($error->errorInfo[1] ?? 0);
        $state = (string) ($error->errorInfo[0] ?? $error->getCode());
        $messages = [
            1044 => 'O usuario MySQL nao tem permissao para acessar esse banco. Vincule o usuario ao banco no painel.',
            1045 => 'O MySQL recusou o acesso. Confira usuario, senha e permissoes no painel da Hostinger.',
            1049 => 'O nome do banco configurado nao existe nesse servidor.',
            1054 => 'Falta uma coluna exigida pelo site. E necessario conferir a estrutura da tabela.',
            1142 => 'O usuario MySQL nao tem permissao para consultar esta tabela.',
            1146 => 'Uma tabela exigida pelo site nao existe no banco configurado.',
            2002 => 'Nao foi possivel conectar ao MySQL. Confira host, porta e disponibilidade do servidor.',
            2005 => 'O endereco do servidor MySQL nao foi encontrado. Confira o host.',
            2006 => 'A conexao com o MySQL foi interrompida.',
        ];
        $safeState = preg_match('/^[A-Z0-9]{5}$/D', $state) ? $state : 'indisponivel';
        return ($messages[$number] ?? 'Falha na consulta ao banco; confira o log privado do servidor.')
            . ' [SQLSTATE ' . $safeState . '; MySQL ' . $number . ']';
    }
    if ($error instanceof ParseError) return 'Erro de sintaxe PHP. Confira aspas, virgulas e ponto e virgula no arquivo de configuracao.';
    if ($error instanceof JsonException) return 'Existe um registro com dados JSON invalidos.';
    return 'Falha interna (' . get_class($error) . '). Confira o log privado do servidor.';
}

echo "DIAGNOSTICO IDEAU EVENTOS — v1\n";
echo "Somente leitura. Nenhuma senha ou registro de participante sera exibido.\n\n";
echo 'PHP: ' . PHP_VERSION . "\n";
echo 'Extensao pdo_mysql: ' . (extension_loaded('pdo_mysql') ? 'OK' : 'AUSENTE — habilite na configuracao PHP') . "\n";
echo 'Arquivo src/Config/database.local.php: ' . (is_file(__DIR__ . '/../src/Config/database.local.php') ? 'existe' : 'ausente') . "\n";
$overrides = [];
foreach (['HOST', 'PORT', 'NAME', 'USER', 'PASSWORD'] as $key) {
    if (getenv('IDEAU_DB_' . $key) !== false) $overrides[] = 'IDEAU_DB_' . $key;
}
echo 'Variaveis que substituem o arquivo: ' . ($overrides ? implode(', ', $overrides) : 'nenhuma') . "\n";

try {
    $config = \App\Config\DatabaseConfig::carregar();
    echo "Configuracao: formato valido\n";
    echo 'Banco configurado corresponde a u923253664_bd_dev: ' . ($config['database'] === 'u923253664_bd_dev' ? 'SIM' : 'NAO — confira o nome do banco no arquivo e nas variaveis') . "\n";
    unset($config);
} catch (Throwable $error) {
    echo 'Configuracao: FALHOU — ' . ($error instanceof ParseError ? diagnosticoErro($error) : 'Confira se o arquivo retorna host, port, database, username e password preenchidos corretamente.') . "\n";
    exit;
}
if (!extension_loaded('pdo_mysql')) exit;
try {
    $db = \App\Config\Conexao::getConexao();
    $db->query('SELECT 1');
    echo "Conexao MySQL: OK\n\n";
} catch (Throwable $error) {
    echo 'Conexao MySQL: FALHOU — ' . diagnosticoErro($error) . "\n";
    exit;
}

foreach (['eventos_publicacoes', 'eventos_publicacoes_inscricoes', 'inscricao_acessos', 'inscricao_acesso_limites', 'dashboard_cancelamentos', 'eventos', 'categorias', 'enderecos', 'atividades', 'inscricoes'] as $table) {
    try {
        // Identificadores constantes; nao aceitam parametros da requisicao.
        $db->query('SELECT 1 FROM `' . $table . '` LIMIT 0');
        echo 'Tabela ' . $table . ": OK\n";
    } catch (Throwable $error) {
        echo 'Tabela ' . $table . ': FALHOU — ' . diagnosticoErro($error) . "\n";
    }
}
foreach (['Publicacoes' => fn () => (new \App\Service\PublicacaoService($db))->listar($_SESSION['publication_organizer']),
    'Eventos antigos' => fn () => (new \App\Service\EventoService())->listarEventos(true)] as $name => $query) {
    try {
        $query();
        echo $name . ": consulta OK\n";
    } catch (Throwable $error) {
        echo $name . ': FALHOU — ' . diagnosticoErro($error) . "\n";
    }
}
echo "\nEnvie o resultado deste diagnostico para identificar a correcao.\n";
