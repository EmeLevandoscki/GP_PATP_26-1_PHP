<?php
namespace App\Service;

final class OrganizerAccess
{
    public static function config(): array
    {
        $file = __DIR__ . '/../Config/organizer.local.php';
        $config = is_file($file) ? require $file : [];
        return ['email' => getenv('IDEAU_ORGANIZER_EMAIL') ?: ($config['email'] ?? 'organizador@ideau.edu.br'),
            'password_hash' => getenv('IDEAU_ORGANIZER_PASSWORD_HASH') ?: ($config['password_hash'] ?? '')];
    }

    /** Contador compartilhado entre sessões, protegido contra requisições simultâneas. */
    public static function attempt(string $ip): bool
    {
        $file = sys_get_temp_dir() . '/ideau-login-' . hash('sha256', dirname(__DIR__, 2)) . '.json';
        $handle = fopen($file, 'c+');
        if (!$handle) throw new \RuntimeException('Login indisponível.');
        try {
            if (!flock($handle, LOCK_EX)) throw new \RuntimeException('Login indisponível.');
            $raw = stream_get_contents($handle);
            $entries = $raw === '' ? [] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            $now = time();
            $entries = array_filter($entries, static fn ($item) => $item['until'] > $now);
            $keys = [hash('sha256', $ip) => 10, 'account' => 50];
            foreach ($keys as $key => $limit) {
                if (($entries[$key]['count'] ?? 0) >= $limit) return false;
            }
            foreach ($keys as $key => $limit) {
                $entries[$key] ??= ['count' => 0, 'until' => $now + 900];
                $entries[$key]['count']++;
            }
            $json = json_encode($entries, JSON_THROW_ON_ERROR);
            rewind($handle);
            if (!ftruncate($handle, 0) || fwrite($handle, $json) !== strlen($json) || !fflush($handle)) {
                throw new \RuntimeException('Login indisponível.');
            }
            return true;
        } finally { flock($handle, LOCK_UN); fclose($handle); }
    }
}
