# E-mail da Hostinger no computador local e na hospedagem

O projeto envia por SMTP com PHPMailer. O mesmo e-mail da Hostinger pode ser usado no computador local e no site hospedado. Não é preciso instalar um servidor de e-mail no Windows.

## Testar no computador

O arquivo `src/Config/email.local.php` já foi criado com os campos vazios e está ignorado pelo Git. Abra-o no editor e preencha:

- `public_url`: o endereço exato usado para abrir a **raiz do projeto**, sem `index.php` e sem `/ideau_eventos`. Exemplos: `http://localhost:8000` ou `http://localhost/GP_PATP_26-1_PHP`.
- `from`: o e-mail completo da caixa que você criou na Hostinger.
- `username`: o mesmo e-mail completo.
- `password`: a senha dessa caixa de e-mail (não a senha do hPanel). Preencha diretamente no arquivo, sem enviar a senha por mensagens.

Mantenha `environment` como `local`. Os valores sugeridos para **Hostinger Email** são `smtp.hostinger.com`, porta `465`, criptografia `ssl`. Se o painel da sua conta indicar outro servidor (por exemplo, uma caixa Titan), use os dados mostrados nele. STARTTLS também é suportado com `encryption` igual a `tls` e porta `587`.

Referência: [configuração oficial Hostinger](https://www.hostinger.com/br/support/1575756-como-encontrar-os-detalhes-de-configuracao-de-e-mail-no-hpanel-hostinger/).

Depois:

1. Abra o site local e escolha **Consultar minha inscrição**.
2. Informe o e-mail do participante usado em uma inscrição e clique em **Receber link por e-mail**. O remetente SMTP é a caixa da Hostinger; o destinatário pode ser Gmail ou outro serviço.
3. Abra a mensagem e copie o link para outro navegador **no mesmo computador**, mantendo o servidor local ligado.
4. Confirme o acesso para ver a inscrição e baixar o comprovante.

`localhost` aponta para o aparelho onde o link é aberto. Um link local não abre o seu computador quando clicado no celular ou em outro computador. Para testar entre aparelhos, use uma URL HTTPS de teste acessível a eles e a configure em `public_url`. A aplicação permite HTTP somente para localhost/127.0.0.1/::1 com `environment=local`.

Sem e-mail/senha válidos, o envio não está ativo. Autenticação, entrega e eventual liberação da porta pelo provedor só podem ser confirmadas com um envio real. Os testes automatizados não enviam mensagens.

## Publicar na Hostinger

1. Execute `composer install --no-dev` para instalar as dependências. Envie também a pasta `vendor` se a hospedagem não executar Composer.
2. Execute `db/consulta_inscricao.sql` no banco da hospedagem. As tabelas já foram criadas no banco local sem alterar inscrições.
3. Crie `src/Config/email.local.php` na hospedagem usando `src/Config/email.example.php` como modelo. Configure `environment` como `production` e `public_url` como a URL HTTPS real do site.
4. Preencha a caixa remetente e os dados SMTP. Não publique o arquivo com a senha no Git. O fato de ser ignorado pelo Git não impede cópias manuais; cada ambiente precisa da própria URL.
5. Confira um envio e abra o link fora da sessão original.

Também é possível configurar via ambiente: `IDEAU_ENV`, `IDEAU_PUBLIC_URL`, `IDEAU_MAIL_FROM`, `IDEAU_MAIL_TRANSPORT`, `IDEAU_SMTP_HOST`, `IDEAU_SMTP_PORT`, `IDEAU_SMTP_ENCRYPTION`, `IDEAU_SMTP_USERNAME` e `IDEAU_SMTP_PASSWORD`. Variáveis definidas têm prioridade sobre o arquivo, inclusive quando vazias. O transporte padrão é `smtp`; `mail` continua disponível para hospedagens que já tenham o transporte PHP configurado.

## Se não enviar

- Confira os dados da caixa e o servidor exibido no hPanel; confirme que consegue entrar no webmail.
- Verifique conexão de saída na porta SMTP, pasta de spam e as configurações de domínio exigidas pelo provedor.
- No Windows, confirme que o PHP possui OpenSSL e certificados de CA atualizados. Não desative a validação TLS para contornar erro de certificado.
- Após repetidas tentativas, aguarde 15 minutos por causa do limite de envio.

## Consulta e proteção

O link expira em 20 minutos e pode ser confirmado uma vez. A abertura inicial não consome o acesso, evitando consumo por leitores automáticos de e-mail. A consulta confirmada fica disponível por 30 minutos na sessão.

A consulta inclui inscrições ainda ativas em eventos encerrados; canceladas não aparecem. Responsáveis veem os educandos vinculados ao e-mail. Inscrições sem e-mail precisam de atendimento do organizador.

Há limites de três envios por e-mail e dez por IP a cada 15 minutos, CSRF e tokens armazenados somente por hash. O retorno do SMTP indica aceitação pelo servidor, não garantia de entrega na caixa de entrada.

## Testes sem envio real

- `php tests/email-config.php`
- `php tests/consulta-inscricao.php`
- `node tests/consulta-inscricao-http.cjs`
