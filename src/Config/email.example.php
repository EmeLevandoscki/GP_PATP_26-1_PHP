<?php
// Copie para email.local.php. Esse arquivo local é ignorado pelo Git.
// Preencha diretamente no editor; não envie a senha por mensagens.
return [
    'environment' => 'local', // Na hospedagem: production
    'public_url' => '', // URL exata da raiz do site local, sem index.php.
    // Exemplos: http://localhost:8000 ou http://localhost/GP_PATP_26-1_PHP
    // Na hospedagem: https://seu-dominio.com
    'transport' => 'smtp',
    'host' => 'smtp.hostinger.com',
    'port' => 465,
    'encryption' => 'ssl',
    'from' => '', // E-mail completo da caixa criada na Hostinger.
    'username' => '', // Normalmente o mesmo e-mail de from.
    'password' => '', // Senha DA CAIXA DE E-MAIL, não a senha de acesso ao hPanel.
];
