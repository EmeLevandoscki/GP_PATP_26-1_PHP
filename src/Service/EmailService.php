<?php
namespace App\Service;
use App\Config\EmailConfig;
use PHPMailer\PHPMailer\PHPMailer;

final class EmailService
{
    public static function mensagem(array $config, string $recipient, string $link): PHPMailer
    {
        $config = EmailConfig::validar($config);
        $mail = new PHPMailer(true);
        $mail->CharSet = PHPMailer::CHARSET_UTF8;
        $mail->SMTPDebug = 0;
        if ($config['transport'] === 'smtp') {
            $mail->isSMTP();
            $mail->Host = $config['host'];
            $mail->Port = (int) $config['port'];
            $mail->SMTPAuth = true;
            $mail->Username = $config['username'];
            $mail->Password = $config['password'];
            $mail->SMTPSecure = $config['encryption'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Timeout = 15;
            // Mantém a validação de certificados TLS ativada.
        } else { $mail->isMail(); }
        $mail->setFrom($config['from'], 'IDEAU Eventos');
        $mail->addAddress($recipient);
        $mail->Subject = 'Consulte sua inscrição — IDEAU Eventos';
        $mail->Body = "Olá!\n\nUse o link abaixo para consultar suas inscrições na IDEAU Eventos:\n\n$link\n\nO link é pessoal, pode ser usado uma vez e expira em 20 minutos.\nVocê poderá consultar a inscrição, baixar o comprovante ou cancelar.\n\nSe não solicitou esta mensagem, basta ignorá-la.\n";
        return $mail;
    }
}
