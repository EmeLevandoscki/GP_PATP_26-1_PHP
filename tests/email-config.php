<?php
require __DIR__ . '/../vendor/autoload.php';
use App\Config\EmailConfig;
use App\Service\EmailService;
function verifyEmail(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); }
function invalidEmail(array $config): void { try { EmailConfig::validar($config); } catch (RuntimeException) { return; } throw new RuntimeException('Configuração insegura aceita.'); }
$config=['environment'=>'local','public_url'=>'http://localhost:8000/projeto','transport'=>'smtp','from'=>'eventos@example.invalid',
 'username'=>'eventos@example.invalid','password'=>'senha-ficticia-apenas-no-teste','host'=>'smtp.hostinger.com','port'=>465,'encryption'=>'ssl'];
verifyEmail(EmailConfig::validar($config)['public_url']===$config['public_url'],'Localhost HTTP deve funcionar em modo local.');
foreach(['http://127.0.0.1:8000','http://[::1]:8000','https://eventos.example.invalid'] as $url) EmailConfig::validar(array_replace($config,['public_url'=>$url]));
invalidEmail(array_replace($config,['environment'=>'production']));
invalidEmail(array_replace($config,['public_url'=>'http://public.example.invalid']));
invalidEmail(array_replace($config,['public_url'=>'http://localhost.evil.invalid']));
invalidEmail(array_replace($config,['public_url'=>'http://localhost:8000?x=1']));
invalidEmail(array_replace($config,['public_url'=>'https://user:pass@example.invalid']));
invalidEmail(array_replace($config,['password'=>'']));
invalidEmail(array_replace($config,['encryption'=>'none']));
invalidEmail(array_replace($config,['from'=>"test@example.invalid\r\nBcc:bad@example.invalid"]));
invalidEmail(array_replace($config,['host'=>'smtp.hostinger.com;evil.example.invalid']));
$mail=EmailService::mensagem($config,'participant@example.invalid','http://localhost:8000/ideau_eventos/consultar-inscricao.php?token=teste');
verifyEmail($mail->Mailer==='smtp' && $mail->SMTPAuth && $mail->SMTPSecure==='ssl' && $mail->Port===465,'SMTP Hostinger autenticado e criptografado.');
verifyEmail($mail->SMTPDebug===0 && $mail->SMTPOptions===[],'Não expor credenciais nem desativar verificação TLS.');
verifyEmail($mail->preSend(),'Deve gerar mensagem sem conexão externa.');
$mime=$mail->getSentMIMEMessage();
verifyEmail(!str_contains($mime,$config['password']),'Senha não deve aparecer no e-mail.');
verifyEmail(str_contains($mail->Body,'http://localhost:8000/'),'Link local deve preservar a URL configurada.');
$tls=EmailService::mensagem(array_replace($config,['port'=>587,'encryption'=>'tls']),'participant@example.invalid','https://example.invalid');
verifyEmail($tls->SMTPSecure==='tls' && $tls->Port===587,'Permitir STARTTLS configurado pelo provedor.');
echo "OK: SMTP autenticado, SSL/STARTTLS, MIME, links locais, HTTPS em produção e proteção de credenciais; nenhum e-mail enviado.\n";
