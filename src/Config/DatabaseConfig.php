<?php
namespace App\Config;

final class DatabaseConfig
{
    public static function carregar(): array
    {
        $file = __DIR__ . '/database.local.php';
        $local = is_file($file) ? require $file : [];
        $config = array_replace(['host' => 'localhost', 'port' => 3306,
            'database' => '', 'username' => '', 'password' => ''], is_array($local) ? $local : []);
        foreach (['host' => 'IDEAU_DB_HOST', 'port' => 'IDEAU_DB_PORT', 'database' => 'IDEAU_DB_NAME',
            'username' => 'IDEAU_DB_USER', 'password' => 'IDEAU_DB_PASSWORD'] as $key => $env) {
            $value = getenv($env);
            if ($value !== false) $config[$key] = $value;
        }
        return self::validar($config);
    }

    public static function validar(array $config): array
    {
        $fail = static function (): never {
            throw new \RuntimeException('O banco de dados precisa ser configurado no servidor.');
        };
        foreach (['host', 'database', 'username', 'password'] as $key) {
            if (!is_string($config[$key] ?? null) || $config[$key] === '' || str_contains($config[$key], "\0")) $fail();
        }
        // Impede a injeção de parâmetros adicionais na DSN.
        if (!preg_match('/^[a-zA-Z0-9.\-:\[\]]+$/D', $config['host'])
            || !preg_match('/^[a-zA-Z0-9_-]+$/D', $config['database'])
            || !filter_var($config['port'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 65535]])) $fail();
        $config['port'] = (int) $config['port'];
        return $config;
    }
}
