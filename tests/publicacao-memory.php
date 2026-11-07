<?php
// Regressão da lista vazia/HTTP 500 com várias capas grandes.
// Executar: php -d memory_limit=128M tests/publicacao-memory.php
require __DIR__ . '/../vendor/autoload.php';

use App\Config\Conexao;
use App\Service\PublicacaoService;

$db=Conexao::getConexao();
// Tabelas temporárias não modificam eventos nem inscrições existentes.
$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes (id VARCHAR(100) PRIMARY KEY, organizador VARCHAR(255), modo VARCHAR(20), publicar_em DATETIME, dados JSON, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
$db->exec('CREATE TEMPORARY TABLE eventos_publicacoes_inscricoes (id VARCHAR(100) PRIMARY KEY, id_evento VARCHAR(100))');
$cover='data:image/png;base64,'.base64_encode(file_get_contents(__DIR__.'/../uploads/foto_generica_1.png'));
$insert=$db->prepare('INSERT INTO eventos_publicacoes (id,organizador,modo,dados) VALUES (?, ?, ?, ?)');
for ($i=0;$i<16;$i++) {
    $insert->execute(['evt-memory-'.$i,'memory-test','published',json_encode([
        'id'=>'evt-memory-'.$i,'title'=>'Evento '.$i,'date'=>'2099-12-31','time'=>'19:00',
        'institution'=>'faculdade-ideau','institutionType'=>'faculdade','seats'=>80,'cover'=>$cover,
    ],JSON_THROW_ON_ERROR)]);
}
$service=new PublicacaoService($db);
foreach ([null,'memory-test'] as $owner) {
    $events=$service->listar($owner);
    if (count($events)!==16 || !str_contains($events[0]['cover'], '/CapaController.php?')
        || strlen(json_encode($events)) > 100000) throw new RuntimeException('Lista incompleta ou capas embutidas na resposta.');
    unset($events);
}
// Exercita também a serialização real do controller, descartando a saída por blocos.
\App\Service\RequestSecurity::session();
$_SESSION['publication_organizer']='memory-test';
$_SERVER['REQUEST_METHOD']='GET';
$_GET=['action'=>'events','scope'=>'admin'];
$bytes=0; $first=''; $last='';
ob_start(function ($chunk) use (&$bytes,&$first,&$last) {
    if ($chunk!=='') { $first=$first?:$chunk[0]; $last=substr($chunk,-1); }
    $bytes+=strlen($chunk);
    return '';
},4096);
register_shutdown_function(function () use (&$bytes,&$first,&$last,$cover) {
    ob_end_flush();
    if ($bytes>100000 || $bytes<100 || $first!=='[' || $last!==']' || http_response_code()!==200) {
        fwrite(STDERR,json_encode(['bytes'=>$bytes,'first'=>$first,'last'=>$last,'status'=>http_response_code()])."\nFALHA: resposta incompleta.\n"); exit(1);
    }
    echo "OK: listas pública e administrativa com 16 capas grandes no banco; resposta menor que 100 KB e execução dentro de 128 MB.\n";
});
require __DIR__.'/../src/Controller/PublicacaoController.php';
