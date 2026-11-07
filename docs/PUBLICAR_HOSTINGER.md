# Instalar IDEAU Eventos na Hostinger

Este pacote é uma cópia do site local para https://ideaueventos.com.br. Inclui as bibliotecas PHP, imagens, eventos e inscrições existentes no momento da exportação. O site local continua funcionando separadamente; alterações feitas depois não são sincronizadas.

## Arquivos que você vai usar

- **01-site.zip**: enviar e extrair na pasta do site (`public_html`). O ZIP contém `index.php`, `ideau_eventos`, `participantes`, `organizador`, `src`, `vendor` e os demais arquivos necessários, diretamente na raiz.
- **02-banco-com-dados.sql.gz**: importar pelo phpMyAdmin em um banco novo e vazio. Contém estrutura e dados compactados; não precisa descompactar nem importar outros scripts SQL. O arquivo `.sql` ao lado é uma cópia sem compressão do mesmo conteúdo; importe apenas um deles.
- **arquivos-site/**: cópia descompactada do ZIP para consulta. Não é necessário enviá-la se você já enviou o ZIP.
- **resumo-exportacao.json** e **VERIFICACAO.txt**: informações da exportação e verificações locais, para consulta.

O SQL contém dados pessoais de participantes e o ZIP contém o hash de acesso do organizador. Guarde o pacote em local privado. Não envie o SQL, este guia ou a pasta inteira do pacote para a pasta pública do site.

## 1. Escolher o site e configurar PHP

No hPanel, abra o gerenciamento do site `ideaueventos.com.br`. Use uma hospedagem para PHP/MySQL com Gerenciador de arquivos e bancos de dados; o Criador de Sites não executa este projeto PHP.

Nas configurações de PHP, escolha PHP **8.3 ou 8.4** e confira as extensões **pdo_mysql**, **mbstring** e **openssl**. O código exige pelo menos PHP 8.1. Use um banco MySQL 8 ou MariaDB com suporte a JSON. As bibliotecas já estão na pasta `vendor`; não precisa executar Composer.

Ative o certificado SSL e o redirecionamento para HTTPS no painel. A configuração de e-mail e os cookies deste pacote usam HTTPS.

Se já existir um site no domínio, faça uma cópia dos arquivos e do banco atuais antes de substituí-los. Para testar sem alterar o site existente, use um subdomínio/pasta separados e ajuste `public_url` para esse endereço.

## 2. Criar e importar o banco

1. No gerenciamento de bancos MySQL, crie um **banco novo e vazio** e um usuário com acesso a ele. Guarde nome completo do banco, usuário, senha e host mostrados no painel.
2. Abra o phpMyAdmin desse novo banco.
3. Confira o nome do banco selecionado, entre em **Importar**, escolha `02-banco-com-dados.sql.gz` e execute. Se o painel não aceitar GZip, use `02-banco-com-dados.sql`.
4. Aguarde a confirmação de sucesso. O arquivo já inclui todas as tabelas da exportação.

Não importe por cima de um banco que já tem tabelas. O SQL não exclui tabelas existentes; uma importação nesse banco pode falhar. Se a importação falhar parcialmente, use outro banco vazio para repetir e informe a mensagem de erro.

Os eventos e inscrições foram mantidos. Links temporários de consulta enviados no ambiente local e limites de tentativas não foram copiados: solicite um link novo após configurar o e-mail online.

## 3. Enviar os arquivos

1. Abra o Gerenciador de arquivos do domínio e a pasta `public_html`.
2. Envie somente `01-site.zip` e extraia seu conteúdo nessa pasta.
3. Confira que existe **`public_html/index.php`**, e não `public_html/arquivos-site/index.php` ou outra pasta intermediária.
4. Confira que `.htaccess`, `.user.ini`, `vendor/` e `src/Config/.htaccess` também foram extraídos. Pode ser necessário habilitar a visualização de arquivos ocultos.
5. Remova o ZIP da hospedagem depois da extração.

As configurações do ZIP são destinadas a uma instalação nova. Se você já tinha configurações válidas no servidor, preserve seus valores ao atualizar; o modelo do banco e a senha SMTP estão vazios.

## 4. Conectar o banco no arquivo do servidor

No Gerenciador de arquivos, edite `public_html/src/Config/database.local.php`:

```php
<?php
return [
    'host' => 'localhost', // Use o host indicado no painel.
    'port' => 3306,
    'database' => 'NOME_COMPLETO_DO_BANCO',
    'username' => 'USUARIO_COMPLETO_DO_BANCO',
    'password' => 'SENHA_DO_BANCO',
];
```

Preencha os valores reais e salve. Não use as credenciais do MySQL do computador. Preserve aspas, vírgulas e ponto e vírgula. Dentro de strings PHP com aspas simples, escreva uma aspa da senha como `\'` e uma barra invertida como `\\`.

## 5. Ativar os links de inscrição por Gmail

Edite `public_html/src/Config/email.local.php`. O pacote já traz Gmail, `environment = production` e `public_url = https://ideaueventos.com.br`. Preencha apenas `password` com a **senha de app do Google**, sem os espaços de apresentação, e salve. Não use a senha normal da conta Google nem a senha da Hostinger.

Se publicar numa subpasta ou subdomínio, troque `public_url` pela URL HTTPS exata da raiz dessa instalação, sem `/participantes`, `/organizador` ou `/index.php`. Uma URL incorreta faz o e-mail apontar para o lugar errado.

A senha de app local não foi incluída no pacote. O envio real depende de a autenticação do Gmail e a conexão SMTP da hospedagem funcionarem; só será confirmado por um teste online.

## 6. Entrar e testar

- Participante: https://ideaueventos.com.br/participantes/
- Organizador: https://ideaueventos.com.br/organizador/
- Consulta por e-mail: https://ideaueventos.com.br/ideau_eventos/consultar-inscricao.php

Use o mesmo e-mail e senha de organizador usados no computador. A configuração preserva o hash desse acesso, sem gravar a senha em texto. Ela fica em `src/Config/organizer.local.php` e já está no ZIP.

Confira, em ordem:

1. A página inicial carrega e exibe os eventos atuais.
2. O organizador consegue entrar, ver inscrições, abrir relatórios e criar um evento de teste.
3. Faça uma inscrição de teste com seu e-mail e abra o comprovante.
4. Em outra sessão/navegador, solicite o link em **Consultar minha inscrição**, abra o e-mail e confirme. O link deve começar com `https://ideaueventos.com.br/`.
5. Abra o site no celular usando a internet móvel para confirmar o acesso fora do computador.
6. O acesso direto a `/src/Config/email.local.php` deve ser negado (403); não deve mostrar o conteúdo do arquivo.

Se aparecer erro de banco, confira as credenciais e o sucesso da importação. Se aparecer erro 500, confira a versão/extensões do PHP e o registro de erros da hospedagem. Se só o e-mail falhar, confira a senha de app e o host SMTP; não desative a verificação de certificados.

## Referências

- [Envio de arquivos e banco na Hostinger](https://www.hostinger.com/support/1884234-how-to-upload-backups-at-hostinger/)
- [Importação pelo phpMyAdmin](https://www.hostinger.com/support/1884149-how-to-import-a-database-with-phpmyadmin-in-hostinger/)
- [Senhas de app do Google](https://support.google.com/accounts/answer/185833?hl=pt-br)
