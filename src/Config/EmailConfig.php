<?php
namespace App\Config;

final class EmailConfig
{
    public static function carregar(): array
    {
        $path = __DIR__ . '/email.local.php';
        $local = is_file($path) ? require $path : [];
        if (!is_array($local)) $local = [];
        $mapping = ['environment'=>'IDEAU_ENV','public_url'=>'IDEAU_PUBLIC_URL','transport'=>'IDEAU_MAIL_TRANSPORT',
            'from'=>'IDEAU_MAIL_FROM','host'=>'IDEAU_SMTP_HOST','port'=>'IDEAU_SMTP_PORT',
            'encryption'=>'IDEAU_SMTP_ENCRYPTION','username'=>'IDEAU_SMTP_USERNAME','password'=>'IDEAU_SMTP_PASSWORD'];
        $config = array_replace(['environment'=>'production','public_url'=>'','transport'=>'smtp','from'=>'',
            'host'=>'smtp.hostinger.com','port'=>465,'encryption'=>'ssl','username'=>'','password'=>''], $local);
        foreach ($mapping as $key=>$env) {
            $value = getenv($env);
            if ($value !== false) $config[$key] = $value;
        }
        return self::validar($config);
    }

    public static function validar(array $config): array
    {
        $fail = static function (): never { throw new \RuntimeException('O envio de e-mail ainda não está configurado. Entre em contato com o organizador.'); };
        $url = rtrim((string) ($config['public_url'] ?? ''), '/');
        $parts = parse_url($url);
        if (!$parts || !filter_var($url, FILTER_VALIDATE_URL) || isset($parts['query']) || isset($parts['fragment'])
            || isset($parts['user']) || isset($parts['pass'])) $fail();
        $local = ($config['environment'] ?? '') === 'local' && in_array(strtolower($parts['host'] ?? ''), ['localhost','127.0.0.1','[::1]'], true);
        if (($parts['scheme'] ?? '') !== 'https' && !(($parts['scheme'] ?? '') === 'http' && $local)) $fail();
        $from = trim((string) ($config['from'] ?? ''));
        if (!filter_var($from, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $from)) $fail();
        if (!in_array($config['transport'] ?? '', ['smtp','mail'], true)) $fail();
        if ($config['transport'] === 'smtp') {
            if (!filter_var($config['username'] ?? '', FILTER_VALIDATE_EMAIL) || empty($config['password'])
                || !is_string($config['password']) || !preg_match('/^[a-zA-Z0-9.-]+$/D', $config['host'] ?? '')
                || !in_array($config['encryption'] ?? '', ['ssl','tls'], true)
                || !filter_var($config['port'] ?? 0, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>65535]])) $fail();
        }
        $config['public_url'] = $url; $config['from'] = $from;
        return $config;
    }
}
