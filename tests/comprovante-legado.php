<?php
// Somente tabelas temporárias; nenhuma inscrição real é alterada.
require __DIR__ . '/../vendor/autoload.php';
use App\Config\Conexao;
use App\Service\EventoService;
$db = Conexao::getConexao();
foreach (['eventos', 'atividades', 'usuarios', 'inscricoes', 'usuarios_responsaveis', 'turmas', 'usuarios_turmas'] as $table) {
    $ddl = $db->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_NUM)[1];
    $ddl = preg_replace('/^CREATE TABLE/', 'CREATE TEMPORARY TABLE', $ddl);
    $ddl = preg_replace('/,?\n\s*CONSTRAINT[^\n]+/', '', $ddl);
    $db->exec($ddl);
}
function ensureReceipt(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
$db->exec("INSERT INTO eventos (id, titulo, descricao, data_inicio, data_fim, id_categoria, id_status, id_usuario, id_endereco) VALUES (987, 'Evento de teste', '', '2099-12-31 10:00:00', '2099-12-31 18:00:00', 1, 1, 1, 1)");
$db->exec("INSERT INTO atividades (id,id_evento,nome,descricao,local_atv,data_ini,data_fim) VALUES (986,987,'Atividade teste','','Auditório','2099-12-31 10:00:00','2099-12-31 18:00:00')");
$db->exec("INSERT INTO turmas (id,id_curso,nome) VALUES (985,1,'Turma teste')");
$service = new EventoService();
$data = ['event_id' => '986', 'audience' => 'escola', 'responsible_cpf' => '12345678901',
    'responsible_name' => 'Responsável fictício', 'email' => 'teste@example.invalid', 'name' => 'Aluno fictício',
    'phone' => '', 'relationship' => 'Pai', 'student_class' => 'Turma teste'];
$first = $service->realizarInscricao($data);
$again = $service->realizarInscricao(array_replace($data, ['student_class' => 'Outra turma']));
ensureReceipt(!$first['alreadyRegistered'] && $again['alreadyRegistered'], 'Repetição deve recuperar comprovante.');
ensureReceipt($first['receiptUrl'] === $again['receiptUrl'], 'Protocolo deve ser o mesmo.');
ensureReceipt((int) $db->query('SELECT COUNT(*) FROM inscricoes')->fetchColumn() === 1, 'Não pode duplicar.');
ensureReceipt((int) $db->query('SELECT COUNT(*) FROM usuarios')->fetchColumn() === 2, 'Não pode duplicar pessoas.');
$other = $service->realizarInscricao(array_replace($data, ['name' => 'Irmão fictício']));
ensureReceipt(!$other['alreadyRegistered'] && $other['receiptUrl'] !== $first['receiptUrl'], 'Irmãos devem receber comprovantes diferentes.');
ensureReceipt((int) $db->query('SELECT COUNT(*) FROM inscricoes')->fetchColumn() === 2, 'Dois irmãos, duas inscrições.');
echo "OK: inscrição antiga, comprovante, repetição sem alterar turma e irmãos independentes.\n";

$receiptId = substr($first['receiptUrl'], strpos($first['receiptUrl'], '=') + 1);
$original = $_SESSION['registration_receipts'][$receiptId];
\App\Service\ComprovanteService::cancelar($db, $receiptId);
ensureReceipt(!\App\Service\ComprovanteService::ativa($db, $original), 'Comprovante cancelado não pode permanecer válido.');
ensureReceipt((int) $db->query('SELECT COUNT(*) FROM inscricoes')->fetchColumn() === 1, 'Cancelar somente a inscrição escolhida.');
ensureReceipt((int) $db->query('SELECT COUNT(*) FROM usuarios')->fetchColumn() === 3, 'Cancelar não deve excluir usuários e responsáveis.');
$new = $service->realizarInscricao($data);
ensureReceipt(!$new['alreadyRegistered'] && $new['receiptUrl'] !== $first['receiptUrl'], 'Pode inscrever novamente com outro protocolo.');
echo "OK: cancelamento legado, irmão preservado, usuários preservados e reinscrição.\n";
