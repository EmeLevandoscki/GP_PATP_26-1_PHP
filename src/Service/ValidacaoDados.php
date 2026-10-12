<?php
namespace App\Service;

use InvalidArgumentException;

final class ValidacaoDados
{
    public static function cpf(mixed $value, bool $required = false): string
    {
        if ($value === null || $value === '') {
            if ($required) throw new InvalidArgumentException('Informe o CPF.');
            return '';
        }
        if (!is_string($value)) throw new InvalidArgumentException('Informe um CPF válido.');
        $value = trim($value);
        if ($value === '' && !$required) return '';
        // Aceita apenas números ou a máscara convencional; não remove letras silenciosamente.
        if (!preg_match('/^(?:[0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$/D', $value)) {
            throw new InvalidArgumentException('Informe um CPF válido.');
        }
        $cpf = str_replace(['.', '-'], '', $value);
        if (preg_match('/^([0-9])\1{10}$/D', $cpf)) throw new InvalidArgumentException('Informe um CPF válido.');
        for ($digit = 9; $digit < 11; $digit++) {
            $sum = 0;
            for ($i = 0; $i < $digit; $i++) $sum += (int) $cpf[$i] * ($digit + 1 - $i);
            $check = ($sum * 10) % 11;
            if ($check === 10) $check = 0;
            if ($check !== (int) $cpf[$digit]) throw new InvalidArgumentException('Informe um CPF válido.');
        }
        return $cpf;
    }

    public static function email(mixed $value, bool $required = false): string
    {
        if ($value === null || $value === '') {
            if ($required) throw new InvalidArgumentException('Informe um e-mail válido.');
            return '';
        }
        if (!is_string($value) || preg_match('/[\r\n\x00]/', $value)) {
            throw new InvalidArgumentException('Informe um e-mail válido.');
        }
        $email = trim($value);
        if ($email === '' && !$required) return '';
        if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Informe um e-mail válido.');
        }
        return $email;
    }
}
