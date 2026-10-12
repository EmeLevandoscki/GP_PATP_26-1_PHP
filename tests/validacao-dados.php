<?php
require __DIR__ . '/../vendor/autoload.php';
use App\Service\ValidacaoDados;

$checks = 0;
function expectValidation(bool $ok): void {
    global $checks;
    if (!$ok) throw new RuntimeException('Validação retornou resultado inesperado.');
    $checks++;
}
foreach (['52998224725', '12345678909', '98765432100', '529.982.247-25'] as $cpf) {
    expectValidation(ValidacaoDados::cpf($cpf, true) === str_replace(['.', '-'], '', $cpf));
}
foreach (['00000000000', '11111111111', '52998224724', '52998224735', '123',
    'abc52998224725', '52998224725abc', [], 52998224725, true, null, ''] as $cpf) {
    try { ValidacaoDados::cpf($cpf, true); }
    catch (InvalidArgumentException) { expectValidation(true); continue; }
    throw new RuntimeException('CPF inválido aceito.');
}
foreach ([null, '', '  '] as $value) {
    expectValidation(ValidacaoDados::cpf($value) === '');
    expectValidation(ValidacaoDados::email($value) === '');
}
expectValidation(ValidacaoDados::email(' audit@example.invalid ', true) === 'audit@example.invalid');
foreach (['invalid', "audit@example.invalid\r\n", "audit@example.invalid\0", [], true,
    str_repeat('a', 255) . '@example.invalid', null, ''] as $email) {
    try { ValidacaoDados::email($email, true); }
    catch (InvalidArgumentException) { expectValidation(true); continue; }
    throw new RuntimeException('E-mail inválido aceito.');
}
echo "OK: $checks verificações de CPF/e-mail, máscara, dígitos, tipos e campos opcionais.\n";
