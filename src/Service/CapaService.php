<?php
namespace App\Service;

use PDO;

/** Capas sob demanda; nenhuma migração altera os eventos ou suas inscrições. */
final class CapaService
{
    public function __construct(private PDO $db, private ?string $cacheDirectory = null) {}

    public static function url(string $id, string $hash, string $token = '', int $width = 640): string
    {
        $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
        $base = preg_match('~^(.*)/src/Controller/[^/]+\.php$~D', $script, $match) ? $match[1] : '';
        $query = ['id' => $id, 'v' => $hash, 'w' => $width];
        if ($token !== '') $query['accessToken'] = $token;
        return $base . '/src/Controller/CapaController.php?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }

    public static function referenciaValida(string $value, string $id, string $original): bool
    {
        // Nunca busca uma URL recebida do cliente nem aceita a capa de outro evento.
        return hash_equals(self::url($id, hash('sha256', $original)), $value);
    }

    public static function resumir(array $event): array
    {
        if (is_string($event['cover'] ?? null) && str_starts_with($event['cover'], 'data:image/')) {
            $event['cover'] = self::url($event['id'], hash('sha256', $event['cover']));
        }
        return $event;
    }

    public function obter(string $id, string $token = '', ?string $owner = null, int $width = 640, string $etag = ''): array
    {
        $missing = ['status' => 404, 'headers' => ['Cache-Control' => 'no-store'], 'body' => ''];
        if (!preg_match('/^evt-[a-z0-9-]{1,96}$/D', $id) || !in_array($width, [640, 1280], true)) return $missing;
        $stmt = $this->db->prepare('SELECT organizador, modo, publicar_em, dados FROM eventos_publicacoes WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return $missing;
        $event = (new PublicacaoService($this->db))->estado(json_decode($row['dados'], true, 512, JSON_THROW_ON_ERROR), $row['modo'], $row['publicar_em']);
        $access = ($event['accessMode'] ?? 'public') === 'public'
            || (preg_match('/^[a-f0-9]{64}$/D', $token) && is_string($event['accessToken'] ?? null) && hash_equals($event['accessToken'], $token));
        if ($owner !== $row['organizador'] && !($event['published'] && ($event['listed'] || $access))) return $missing;
        $cover = $event['cover'] ?? null;
        if (!is_string($cover) || !str_starts_with($cover, 'data:image/')) return $missing;
        $coverHash = hash('sha256', $cover);

        $directory = $this->cacheDirectory ?? __DIR__ . '/../Cache/capas';
        $key = 'v1-' . $coverHash . '-' . $width;
        $cache = $directory . '/' . $key . '.webp';
        $body = is_file($cache) ? @file_get_contents($cache) : false;
        $mime = 'image/webp';
        $variant = 'webp';
        if ($body === false) {
            if (!preg_match('#^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$#D', $cover, $match)) return $missing;
            $original = base64_decode($match[2], true);
            $info = $original !== false ? @getimagesizefromstring($original) : false;
            if (!$info || !in_array($info['mime'], ['image/png','image/jpeg','image/webp'], true)) return $missing;
            $optimized = self::reduzir($original, $info, $width);
            if ($optimized !== null && strlen($optimized) < strlen($original)) {
                $body = $optimized;
                if ((is_dir($directory) || @mkdir($directory, 0750, true)) && is_writable($directory)) {
                    $temporary = @tempnam($directory, '.capa-');
                    if ($temporary !== false) {
                        if (@file_put_contents($temporary, $body) === strlen($body)) @rename($temporary, $cache);
                        if (is_file($temporary)) @unlink($temporary);
                    }
                }
            } else {
                $body = $original; $mime = $info['mime']; $variant = 'original';
            }
        }
        $currentEtag = '"' . $key . '-' . $variant . '"';
        $headers = ['Content-Type' => $mime, 'ETag' => $currentEtag,
            // Revalida a autorização antes de reutilizar imagens privadas ou encerradas.
            'Cache-Control' => 'private, max-age=0, must-revalidate', 'X-Content-Type-Options' => 'nosniff'];
        if (in_array($currentEtag, array_map('trim', explode(',', $etag)), true)) return ['status' => 304, 'headers' => $headers, 'body' => ''];
        $headers['Content-Length'] = (string) strlen($body);
        return ['status' => 200, 'headers' => $headers, 'body' => $body];
    }

    private static function reduzir(string $bytes, array $info, int $width): ?string
    {
        if (!function_exists('imagecreatefromstring') || !function_exists('imagewebp')
            || $info[0] < 1 || $info[1] < 1 || $info[0] * $info[1] > 8000000) return null;
        $source = @imagecreatefromstring($bytes);
        if (!$source) return null;
        $scale = min(1, $width / max($info[0], $info[1]));
        $target = imagecreatetruecolor(max(1, (int) round($info[0] * $scale)), max(1, (int) round($info[1] * $scale)));
        imagealphablending($target, false);
        imagesavealpha($target, true);
        imagefill($target, 0, 0, imagecolorallocatealpha($target, 0, 0, 0, 127));
        imagecopyresampled($target, $source, 0, 0, 0, 0, imagesx($target), imagesy($target), $info[0], $info[1]);
        ob_start();
        try { $ok = imagewebp($target, null, 80); $result = ob_get_contents(); }
        finally { ob_end_clean(); }
        return $ok && is_string($result) ? $result : null;
    }
}
