# Preparação para testes públicos na Hostinger

## Navegação entre site público e painel

A página inicial agora consulta `$_SESSION['publication_organizer']` usando `RequestSecurity::session()`. Somente uma sessão autenticada recebe, no HTML enviado pelo PHP, o link **Painel do Organizador**. O menu público continua sem link para login. O painel possui **Visualizar site**, que abre a página inicial mantendo a sessão.

As seis páginas administrativas atuais foram convertidas de `.html` para `.php`: `dashboard`, `eventos`, `evento-form`, `inscritos`, `relatorios` e `configuracoes`. O layout foi mantido. Cada entrada chama `RequestSecurity::organizerPage()` antes de enviar conteúdo. As oito páginas antigas de organizador em `src/View` receberam a mesma proteção. As APIs mantêm suas verificações de autenticação e CSRF.

O novo `assets/js/organizer-navigation.js` consulta `PublicacaoController.php?action=organizer-status`, sem acessar o banco. Login/logout notificam outras abas por BroadcastChannel e evento de armazenamento; essas mensagens apenas provocam nova verificação no servidor, sem conceder acesso. A página também revalida ao voltar do cache, ganhar foco e a cada 30 segundos quando visível. Links são ocultados após logout, e uma resposta antiga não pode reexibi-los. Rascunhos do formulário continuam usando sua chave anterior para sobreviver à troca de extensão.

Ao publicar esta alteração, envie os novos PHPs, JS/CSS e o `.htaccess` atualizado; **remova as antigas cópias HTML administrativas**, que não validam sessão. O `.htaccess` encaminha os endereços antigos para os novos PHPs, preservando a query string. Em servidores sem Apache/LiteSpeed e `mod_rewrite`, configure aliases equivalentes ou use diretamente as novas URLs `.php`. A proteção dos novos PHPs funciona independentemente desses aliases. Esta mudança de navegação não requer migração de banco de dados.

Testes executados: `tests/organizer-navigation-http.cjs` verifica login PHP real, menus por sessão, acesso anônimo/autenticado às 14 páginas, APIs protegidas, navegação sem novo login, logout, invalidação dos cookies anteriores e instalação em subpasta. `tests/organizer-navigation-ui.cjs` verifica sincronização entre abas, resposta atrasada, mensagens locais sem autoridade e retorno pelo cache com DOM simulado. Também passaram regressões de CSRF, comprovante, consulta por e-mail e recuperação de rascunhos. A confirmação visual em navegador e os redirecionamentos no Apache de produção ainda precisam de homologação; o teste de navegador local não respondeu ao comando `Page.enable`.

Estas correções precisam ser enviadas ao servidor. A revisão local não verifica a configuração atual da Hostinger nem garante ausência de outras falhas.

## Senha do organizador

O login não aceita mais a senha de demonstração. Sem configuração, ele responde 503 e permanece fechado. Sessões já abertas continuam válidas até encerrarem; encerre-as antes do teste.

No PowerShell, na pasta do projeto, execute (a senha digitada fica oculta):

```powershell
$organizerSecret = Read-Host 'Nova senha exclusiva (mínimo 12 caracteres)' -AsSecureString
$organizerPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($organizerSecret)
try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($organizerPointer) | php tools/configurar-organizador.php
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($organizerPointer)
    Remove-Variable organizerSecret, organizerPointer
}
```

Use uma senha longa com caracteres ASCII para evitar diferenças de codificação entre versões do PowerShell. Não envie a senha por chat. O arquivo gerado contém somente o hash e está ignorado pelo Git. Envie `src/Config/organizer.local.php` para o mesmo caminho na Hostinger, junto com `src/Config/.htaccess`. Preserve o e-mail atual: os eventos são vinculados a ele.

Alternativa de configuração: variáveis de ambiente `IDEAU_ORGANIZER_EMAIL` e `IDEAU_ORGANIZER_PASSWORD_HASH`. A antiga variável com senha em texto puro não é mais usada.

O PHP precisa poder gravar no diretório temporário do servidor. O login limita a 10 tentativas por IP e 50 no total a cada 15 minutos, incluindo tentativas válidas. Cookies são HttpOnly, SameSite=Lax e Secure quando o PHP recebe HTTPS. Verifique no navegador que o cookie aparece como Secure na Hostinger; configurações de proxy precisam informar HTTPS corretamente.

## Arquivos e infraestrutura

- Envie os arquivos alterados de `src/Controller`, `src/Service`, as páginas `ideau_eventos/comprovante.php` e `consultar-inscricao.php`, `assets/js/app.js` e as páginas HTML com sua versão atualizada.
- Envie o `.htaccess` da raiz: bloqueia diretórios internos, SQL, logs e cópias de segurança no Apache/LiteSpeed, além de impedir listagem de diretórios. Se houver regras próprias no servidor, combine as regras preservando-as.
- Mantenha HTTPS e o redirecionamento HTTP → HTTPS ativos no painel da Hostinger.
- Configure e teste o envio de e-mail da consulta de inscrição conforme a documentação já existente. Recuperar comprovantes em outro navegador depende do acesso ao e-mail cadastrado. Sem e-mail na inscrição, contate o organizador; CPF não concede acesso.
- Não publique dados reais de teste, backups ou arquivos de configuração fora dos diretórios protegidos.

## Validação no servidor

1. Em janela anônima, `src/Controller/EventoController.php?action=inscricoes_evento&id=1` e o controlador de usuários devem responder 401, sem dados pessoais.
2. Acessar `src/Config/organizer.local.php`, `db/dashboard_cancelamentos.sql` e `.git/config` deve dar 403/404.
3. Login com a nova senha deve funcionar. Senha errada deve falhar; requisições sem token de sessão devem dar 403.
4. Faça uma inscrição fictícia. Na mesma sessão, o comprovante deve abrir. Em outra janela anônima, repetir o CPF deve encaminhar à consulta por e-mail, sem liberar comprovante ou cancelamento.
5. Confirme pelo e-mail e teste a consulta e o cancelamento da inscrição fictícia.
6. Teste os links privados e a aprovação manual. Remova somente os dados fictícios ao concluir.

## Limites desta alteração

As rotas antigas de usuários agora são administrativas; a antiga página de cadastro/login em `src/View/Front/html/login.html` não é o acesso público usado pelo painel atual. Use o acesso do organizador atual.

A seleção de curso continua sendo declaratória; aprovação manual permite conferência pelo organizador. Essas medidas não comprovam matrícula em um sistema acadêmico. Não foram acrescentados CAPTCHA ou limites para envio de inscrições nesta alteração.

Não há migração SQL nova para estas correções.
