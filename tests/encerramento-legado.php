<?php
// Todas as escritas usam tabelas temporárias, sem alterar os eventos reais.
require __DIR__ . '/../vendor/autoload.php';

use App\Config\Conexao;
use App\Service\EventoService;

function checkLegacy(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
function closedRegistration(callable $operation): void {
    try { $operation(); } catch (InvalidArgumentException) { return; }
    throw new RuntimeException('Inscrição em evento encerrado foi aceita.');
}

$db = Conexao::getConexao();
$db->exec('CREATE TEMPORARY TABLE eventos (id INT PRIMARY KEY, titulo TEXT, descricao TEXT, valor INT, data_inicio DATETIME,
    data_fim DATETIME, foto_path TEXT, destaque INT, id_categoria INT, id_endereco INT, id_status INT, atualizado_em DATETIME)');
$db->exec('CREATE TEMPORARY TABLE status (id INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(255))');
$db->exec('CREATE TEMPORARY TABLE categorias (id INT PRIMARY KEY, nome TEXT)');
$db->exec('CREATE TEMPORARY TABLE enderecos (id INT PRIMARY KEY, nome_local TEXT, cidade TEXT, estado TEXT)');
$db->exec('CREATE TEMPORARY TABLE atividades (id INT PRIMARY KEY, id_evento INT, data_fim DATETIME)');
$db->exec('CREATE TEMPORARY TABLE inscricoes (id INT PRIMARY KEY, id_atividade INT)');
$db->exec("INSERT INTO status VALUES (1, 'Inscrições Abertas')");
$db->exec("INSERT INTO eventos VALUES
    (1, 'Futuro', '', 0, '2099-12-30 12:00:00', '2099-12-31 18:00:00', '', 0, NULL, NULL, 1, NULL),
    (2, 'Passado', '', 0, '2000-01-01 12:00:00', '2000-01-01 18:00:00', '', 0, NULL, NULL, 1, NULL)");
$db->exec("INSERT INTO atividades VALUES (10, 1, '2099-12-31 18:00:00'), (20, 2, '2000-01-01 18:00:00')");
$db->exec('ALTER TABLE eventos ADD criado_em TIMESTAMP NULL');
$db->exec('INSERT INTO inscricoes VALUES (1, 10), (2, 20)');
$service = new EventoService();
checkLegacy(count($service->listarEventos()) === 2, 'Data antiga não deve retirar do ar um evento sem encerramento configurado.');
checkLegacy(count($service->listarEventos(true)) === 2, 'Histórico deve preservar eventos antigos.');
checkLegacy($service->retornaQtdAtivos() === '2', 'Contagem pública deve incluir o evento antigo que continua no ar.');
checkLegacy($service->retornaDetalhesEvento(2) !== null, 'Evento antigo deve continuar acessível até retirada manual.');
checkLegacy(!$service->listarEventos(true)[1]->closed && $service->listarEventos(true)[1]->effectiveEndAt === null, 'Evento antigo deve estar em Atuais e sem contagem regressiva.');
$service->encerrarEvento(2);
closedRegistration(fn () => $service->realizarInscricao(['event_id' => 20, 'audience' => 'escola']));
$service->encerrarEvento(1);
$service->encerrarEvento(1);
checkLegacy($service->listarEventos() === [], 'Encerramento manual deve tirar o evento do ar.');
checkLegacy($service->retornaQtdAtivos() === '0', 'Contagem deve atualizar após encerramento manual.');
$history = $service->listarEventos(true);
checkLegacy($history[0]->closeReason === 'manual', 'Histórico deve indicar retirada manual.');
checkLegacy($history[1]->closeReason === 'manual', 'Histórico só deve incluir o antigo após a retirada manual.');
checkLegacy($history[0]->data_fim === '2099-12-31 18:00:00', 'Retirar do ar não deve alterar a data original do evento.');
checkLegacy((int) $history[0]->inscritos === 1, 'Inscritos devem continuar contabilizados.');
checkLegacy((int) $db->query('SELECT COUNT(*) FROM inscricoes')->fetchColumn() === 2, 'Nenhuma inscrição pode ser removida.');
closedRegistration(fn () => $service->realizarInscricao(['event_id' => 10, 'audience' => 'escola']));
echo "OK: histórico legado, retirada manual, bloqueio de links e inscrições, datas originais e inscritos preservados.\n";
