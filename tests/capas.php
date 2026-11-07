<?php
// Tabelas temporárias e cache isolado; não altera os eventos reais.
require __DIR__ . '/publicacao.php';
use App\Service\CapaService;

$_SERVER['SCRIPT_NAME'] = '/projeto/src/Controller/PublicacaoController.php';
$directory = sys_get_temp_dir() . '/ideau-capas-test-' . bin2hex(random_bytes(8));
mkdir($directory, 0700);
try {
    $serviceImage = new CapaService($db, $directory);
    $raw = file_get_contents(__DIR__ . '/../uploads/foto_generica_1.png');
    $fixture = array_replace($fixture, ['eventKind'=>'palestra','publicationMode'=>'published',
        'cover'=>'data:image/png;base64,'.base64_encode($raw)]);
    $event = $service->salvar($fixture, $owner);
    $list = array_column($service->listar($owner), null, 'id');
    $light = $list[$event['id']];
    check(str_starts_with($light['cover'], '/projeto/src/Controller/CapaController.php?'), 'URL deve respeitar instalação em subpasta.');
    check(strlen(json_encode($light)) < 10000, 'Metadados não devem transportar a capa embutida.');
    $edited = $service->salvar(array_replace($light, ['title'=>'Título atualizado']), $owner);
    check($edited['cover'] === $fixture['cover'], 'Editar metadados deve preservar os bytes da capa original.');
    invalid(fn () => $service->salvar(array_replace($light, ['cover'=>'https://example.invalid/image.png']), $owner));
    invalid(fn () => $service->salvar(array_replace($light, ['cover'=>str_replace('v=', 'v=0', $light['cover'])]), $owner));
    $other = $service->salvar(array_replace($fixture, ['publicationMode'=>'draft']), $owner);
    invalid(fn () => $service->salvar(array_replace($list[$event['id']], ['id'=>$other['id']]), $owner));

    $image = $serviceImage->obter($event['id']);
    check($image['status'] === 200, 'Capa pública disponível sem login.');
    check($image['headers']['Cache-Control'] === 'private, max-age=0, must-revalidate', 'Cache precisa revalidar permissões.');
    if (function_exists('imagewebp')) {
        $info = getimagesizefromstring($image['body']);
        check(max($info[0], $info[1]) <= 640 && $info['mime']==='image/webp', 'Miniatura deve ser WebP com até 640 pixels.');
        check(strlen($image['body']) < strlen($raw) / 4, 'Capa grande deve ser reduzida de forma significativa.');
    } else {
        check($image['body'] === $raw, 'Sem GD deve entregar o original, sem falhar.');
    }
    $notModified = $serviceImage->obter($event['id'], '', null, 640, $image['headers']['ETag']);
    check($notModified['status']===304 && $notModified['body']==='', 'ETag evita retransmitir a imagem.');
    check($serviceImage->obter($event['id'],'',null,1280)['status']===200, 'Capa maior disponível para detalhes.');
    check($serviceImage->obter('../Config/email.local.php')['status']===404, 'Não aceita caminho de arquivo.');
    check($serviceImage->obter($event['id'],'',null,100000)['status']===404, 'Só aceita tamanhos previstos.');

    $hidden = $service->salvar(array_replace($edited, ['accessMode'=>'link','listed'=>false,'recipientMode'=>'anyone']), $owner);
    $token = $hidden['accessToken'];
    check($serviceImage->obter($hidden['id'],'',null,640,$image['headers']['ETag'])['status']===404, 'Cache não pode burlar mudança para privado.');
    check($serviceImage->obter($hidden['id'],str_repeat('0',64))['status']===404, 'Token inválido não autoriza imagem privada.');
    check($serviceImage->obter($hidden['id'],'','outro-organizador')['status']===404, 'Outro organizador não acessa capa privada.');
    check($serviceImage->obter($hidden['id'],$token)['status']===200, 'Link válido autoriza imagem privada.');
    check($serviceImage->obter($hidden['id'],'',$owner)['status']===200, 'Organizador proprietário acessa sua capa.');
    $opened = $service->eventoPublico($hidden['id'],$token)[0];
    check(str_contains($opened['cover'],'accessToken='.$token), 'Imagem do detalhe privado mantém a autorização do link.');
    check($serviceImage->obter($other['id'])['status']===404 && $serviceImage->obter($other['id'],'',$owner)['status']===200, 'Rascunhos só permitem o proprietário.');
    $scheduled = $service->salvar(array_replace($fixture, ['publicationMode'=>'automatic','publishAt'=>'2099-12-30T12:00:00.000Z']), $owner);
    check($serviceImage->obter($scheduled['id'])['status']===404, 'Imagem não antecipa publicação agendada.');
    $listed = $service->salvar(array_replace($hidden,['listed'=>true]),$owner);
    check($serviceImage->obter($listed['id'])['status']===200, 'Capa de divulgação listada segue visível, como o card público.');
    $service->encerrar($listed['id'],$owner);
    check($serviceImage->obter($listed['id'],$token)['status']===404, 'Token não reabre capa de evento encerrado.');
    echo 'OK: capas leves, preservação na edição, subpastas, permissões, cache e ' . (function_exists('imagewebp') ? 'WebP' : 'fallback sem GD') . ".\n";
} finally {
    foreach (glob($directory . '/*') as $file) unlink($file);
    rmdir($directory);
}
