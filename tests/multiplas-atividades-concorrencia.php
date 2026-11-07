<?php
// Tabelas descartáveis com prefixo aleatório; nunca escreve nas tabelas da aplicação.
require __DIR__ . '/../vendor/autoload.php';
use App\Config\DatabaseConfig;
use App\Service\PublicacaoService;
use App\Service\AtividadeService;
use App\Service\ComprovanteService;

final class ActivityTestPDO extends PDO {
    public const TABLES = ['eventos_publicacoes_atividade_inscricoes','eventos_publicacoes_atividades','eventos_publicacoes_inscricoes','eventos_publicacoes','dashboard_cancelamentos'];
    public function __construct(private string $prefix) {
        if (!preg_match('/^ita_[a-f0-9]{16}_$/D',$prefix)) throw new RuntimeException('Prefixo de teste inválido.');
        $c=DatabaseConfig::carregar();
        parent::__construct('mysql:host='.$c['host'].';port='.$c['port'].';dbname='.$c['database'].';charset=utf8mb4',$c['username'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    }
    private function rewrite(string $sql): string {
        $sql=preg_replace_callback('/\b('.implode('|',self::TABLES).')\b/',fn($m)=>$this->prefix.$m[0],$sql);
        return preg_replace_callback('/CONSTRAINT `?(\w+)`?/',fn($m)=>'CONSTRAINT `'.$this->prefix.$m[1].'`',$sql);
    }
    public function prepare(string $query, array $options=[]): PDOStatement|false { return parent::prepare($this->rewrite($query),$options); }
    public function query(string $query, ?int $fetchMode=null, mixed ...$args): PDOStatement|false { return $fetchMode===null ? parent::query($this->rewrite($query)) : parent::query($this->rewrite($query),$fetchMode,...$args); }
    public function exec(string $statement): int|false { return parent::exec($this->rewrite($statement)); }
}
function connection(string $database): PDO {
    $c=DatabaseConfig::carregar();
    return new PDO('mysql:host='.$c['host'].';port='.$c['port'].';dbname='.$database.';charset=utf8mb4',$c['username'],$c['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
}
function verify(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
if (($argv[1]??'')==='worker') {
    $prefix=$argv[2]??'';
    $db=new ActivityTestPDO($prefix);
    try {
        (new PublicacaoService($db))->inscrever(['eventId'=>$argv[3],'activityIds'=>[$argv[4]],'name'=>'Concorrente '.$argv[5]]);
        echo 'success';
    } catch (InvalidArgumentException $error) { echo 'full'; }
    exit;
}
$config=DatabaseConfig::carregar();
$source=connection($config['database']);
$prefix='ita_'.bin2hex(random_bytes(8)).'_';
$processes=[];
try {
    $db=new ActivityTestPDO($prefix);
    foreach (['eventos_publicacoes','eventos_publicacoes_inscricoes'] as $table) {
        $ddl=$source->query('SHOW CREATE TABLE '.$table)->fetch(PDO::FETCH_ASSOC)['Create Table'];
        $db->exec($ddl);
    }
    $migration=file_get_contents(__DIR__.'/../db/multiplas_atividades.sql');
    $db->exec($migration); $db->exec($migration);
    $service=new PublicacaoService($db);
    $event=$service->salvar(['title'=>'Concorrência isolada','institution'=>'faculdade-ideau','category'=>'Teste','audience'=>'graduacao','date'=>'2099-12-31','time'=>'18:00','location'=>'Sala','publicationMode'=>'published','eventType'=>'multiple','seats'=>-1,'fields'=>[],
        'cover'=>'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'activities'=>[['name'=>'Última vaga','type'=>'palestra','startAt'=>'2099-12-31T18:00','endAt'=>'2099-12-31T19:00','seats'=>1,'hours'=>1]]], 'teste');
    $activity=$event['activities'][0]['id'];
    $db->beginTransaction();
    $lock=$db->prepare('SELECT id FROM eventos_publicacoes WHERE id = ? FOR UPDATE'); $lock->execute([$event['id']]);
    foreach ([1,2] as $n) {
        $pipes=[];
        $process=proc_open([PHP_BINARY,__FILE__,'worker',$prefix,$event['id'],$activity,(string)$n],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes,null,null,['bypass_shell'=>true]);
        if (!is_resource($process)) throw new RuntimeException('Falha ao iniciar concorrente.');
        fclose($pipes[0]); $processes[]=[$process,$pipes];
    }
    usleep(300000); $db->commit();
    $outcomes=[];
    foreach ($processes as [$process,$pipes]) {
        $outcomes[]=stream_get_contents($pipes[1]); $err=stream_get_contents($pipes[2]);
        fclose($pipes[1]);fclose($pipes[2]); verify(proc_close($process)===0 && $err==='', 'Falha em processo concorrente: '.$err);
    }
    $processes=[];
    sort($outcomes); verify($outcomes===['full','success'],'Somente um concorrente deve conseguir a última vaga.');
    verify((int)$db->query('SELECT COUNT(*) FROM eventos_publicacoes_inscricoes')->fetchColumn()===1,'Não pode sobrar inscrição de transação recusada.');
    verify((int)$db->query('SELECT COUNT(*) FROM eventos_publicacoes_atividade_inscricoes')->fetchColumn()===1,'Uma vaga, uma inscrição.');
    try { $db->exec("INSERT INTO eventos_publicacoes_atividade_inscricoes (id_atividade, id_inscricao, protocolo) VALUES ('inexistente',NULL,'teste')"); throw new RuntimeException('FK não aplicada.'); } catch (PDOException $e) { verify($e->getCode()==='23000','Esperada violação de FK.'); }
    $id=$db->query('SELECT id FROM eventos_publicacoes_inscricoes')->fetchColumn();
    try { $db->prepare('INSERT INTO eventos_publicacoes_atividade_inscricoes (id_atividade,id_inscricao,protocolo) VALUES (?,?,?)')->execute([$activity,$id,$id]); throw new RuntimeException('Unicidade não aplicada.'); } catch (PDOException $e) { verify($e->getCode()==='23000','Esperada violação de unicidade.'); }
    $receipt=['protocol'=>$id,'eventId'=>$event['id']];
    $_SESSION['registration_receipts']['teste']=$receipt;
    ComprovanteService::cancelar($db,'teste');
    $history=$db->query('SELECT id_inscricao, cancelado_em, presente FROM eventos_publicacoes_atividade_inscricoes')->fetch(PDO::FETCH_ASSOC);
    verify($history['id_inscricao']===null && $history['cancelado_em']!==null && $history['presente']===null,'Cancelamento preserva histórico e presença desconhecida.');
    verify((new AtividadeService($db))->listar($event['id'])[0]['remaining']===1,'Cancelamento principal libera a vaga.');
    $service->excluir($event['id'],'teste');
    verify((int)$db->query('SELECT COUNT(*) FROM eventos_publicacoes_atividades')->fetchColumn()===0,'Exclusão mantém comportamento existente e remove atividades.');
    echo "OK: migração reexecutável, FKs, unicidade, dois processos disputando última vaga, rollback e cancelamento principal.\n";
} finally {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    foreach ($processes as [$process,$pipes]) { if(is_resource($process)) { proc_terminate($process); proc_close($process); } }
    if (isset($db)) foreach(ActivityTestPDO::TABLES as $table) $db->exec('DROP TABLE IF EXISTS '.$table);
}
