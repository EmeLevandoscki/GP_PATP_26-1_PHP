<?php
// Gera um arquivo de importação destrutiva, sem executar SQL no banco real.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$release = realpath($argv[1] ?? '');
$base = realpath(__DIR__ . '/../publicacao');
if (!$release || !$base || !str_starts_with($release, $base . DIRECTORY_SEPARATOR)) throw new RuntimeException('Pacote inválido.');
$summary = json_decode(file_get_contents($release . '/resumo-exportacao.json'), true, 512, JSON_THROW_ON_ERROR);
$drops = '';
foreach (array_reverse(array_keys($summary['rows'])) as $table) {
    if (!preg_match('/^[A-Za-z0-9_]+$/D', $table)) throw new RuntimeException('Nome inválido.');
    $drops .= 'DROP TABLE IF EXISTS `' . $table . "`;\n";
}
$input = fopen($release . '/02-banco-com-dados.sql', 'rb');
$output = fopen($release . '/SUBSTITUIR-BANCO.sql', 'xb');
if (!$input || !$output) throw new RuntimeException('Não foi possível abrir os arquivos.');
$write = static function (string $text) use ($output): void {
    if (fwrite($output, $text) !== strlen($text)) throw new RuntimeException('Falha de gravação.');
};
$inserted = false;
try {
    $write("-- SUBSTITUI OS DADOS ATUAIS DO SITE PELA EXPORTACAO LOCAL.\n");
    $write("-- Selecione o banco do site no phpMyAdmin. Exporte uma copia antes de importar.\n");
    $write("-- Remove e recria somente as tabelas listadas abaixo, incluindo eventos e inscricoes.\n");
    while (($line = fgets($input)) !== false) {
        if (str_starts_with($line, '--')) continue;
        $write($line);
        if (str_starts_with($line, 'SET SQL_MODE = ') && !$inserted) {
            $write("\n-- FOREIGN_KEY_CHECKS ja foi desativado pelo cabecalho.\n" . $drops . "\n");
            $inserted = true;
        }
    }
    if (!$inserted) throw new RuntimeException('Cabeçalho SQL inesperado.');
} finally { fclose($input); fclose($output); }
echo "Arquivo de substituicao preparado.\n";
