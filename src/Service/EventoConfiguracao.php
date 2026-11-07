<?php
namespace App\Service;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

/** Catálogo compartilhado com a interface; complementa o JSON existente do evento. */
final class EventoConfiguracao
{
    public static function catalogo(): array
    {
        static $catalog;
        return $catalog ??= json_decode(file_get_contents(__DIR__ . '/../../ideau_eventos/assets/data/event-types.json'), true, 512, JSON_THROW_ON_ERROR);
    }

    public static function tipos(): array
    {
        $types = [];
        foreach (self::catalogo()['categories'] as $category) foreach ($category['types'] as [$id, $label, $profile]) {
            $types[$id] = ['label'=>$label, 'profile'=>$profile, 'category'=>$category['id']];
        }
        $types['outro'] = ['label'=>'Outro / Personalizado', 'profile'=>'general', 'category'=>'outros'];
        return $types;
    }

    public static function texto(mixed $value, string $label, int $max = 255): string
    {
        if (!is_string($value) || mb_strlen($value) > $max || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value)) throw new InvalidArgumentException('Informe um texto válido para ' . $label . ' (até ' . $max . ' caracteres).');
        return trim($value);
    }

    public static function data(mixed $value, string $label): string
    {
        $date = is_string($value) ? DateTimeImmutable::createFromFormat('!Y-m-d\TH:i', $value, new DateTimeZone('America/Sao_Paulo')) : false;
        if (!$date || $date->format('Y-m-d\TH:i') !== $value || substr($value, 0, 4) === '0000') throw new InvalidArgumentException('Data e horário inválidos: ' . $label . '.');
        return $value;
    }

    private static function objeto(mixed $value, string $label): array
    {
        if (!is_array($value) || ($value !== [] && array_is_list($value))) throw new InvalidArgumentException('Configuração inválida: ' . $label . '.');
        return $value;
    }

    public static function validar(array $event, array $previous = []): array
    {
        $types = self::tipos();
        $kind = $event['eventKind'] ?? $previous['eventKind'] ?? '';
        if (!is_string($kind) || ($kind !== '' && !isset($types[$kind]))) throw new InvalidArgumentException('Selecione um tipo de evento válido.');
        if ($kind === '' && !$previous && array_key_exists('eventKind', $event)) throw new InvalidArgumentException('Selecione o tipo do novo evento.');
        $custom = self::texto($event['customEventKind'] ?? $previous['customEventKind'] ?? '', 'tipo personalizado', 100);
        if ($kind === 'outro' && $custom === '') throw new InvalidArgumentException('Informe o tipo personalizado do evento.');
        $event['eventKind'] = $kind;
        $event['customEventKind'] = $kind === 'outro' ? $custom : '';
        $event['eventKindCategory'] = $types[$kind]['category'] ?? '';
        $profile = $types[$kind]['profile'] ?? 'general';
        $event['modality'] = $event['modality'] ?? $previous['modality'] ?? 'presencial';
        if (!in_array($event['modality'], ['presencial','online','hibrido'], true)) throw new InvalidArgumentException('Selecione uma modalidade válida.');
        $input = self::objeto($event['delivery'] ?? $previous['delivery'] ?? [], 'modalidade');
        $delivery = [];
        foreach (['room'=>255,'address'=>1000,'platform'=>150,'accessUrl'=>2048,'instructions'=>8000] as $key=>$max) $delivery[$key] = self::texto($input[$key] ?? '', $key, $max);
        if ($delivery['accessUrl'] !== '' && (!filter_var($delivery['accessUrl'], FILTER_VALIDATE_URL) || strtolower((string) parse_url($delivery['accessUrl'], PHP_URL_SCHEME)) !== 'https' || parse_url($delivery['accessUrl'], PHP_URL_USER) !== null || parse_url($delivery['accessUrl'], PHP_URL_PASS) !== null)) throw new InvalidArgumentException('Use um link HTTPS válido para o acesso online, sem usuário ou senha na URL.');
        $choice = $input['allowChoice'] ?? false;
        if (!is_bool($choice)) throw new InvalidArgumentException('Informe se o participante pode escolher a modalidade.');
        $delivery['allowChoice'] = $event['modality'] === 'hibrido' && $choice;
        if ($event['modality'] !== 'presencial' && $delivery['platform'] === '') throw new InvalidArgumentException('Informe a plataforma do evento online ou híbrido.');
        if ($event['modality'] === 'presencial') {
            $delivery['platform'] = $delivery['accessUrl'] = $delivery['instructions'] = '';
        }
        if ($event['modality'] === 'online') {
            $delivery['room'] = $delivery['address'] = '';
            $event['location'] = 'Online — ' . $delivery['platform'];
            $event['city'] = '';
        } else {
            $event['location'] = self::texto($event['location'] ?? '', 'local');
            if ($event['location'] === '') throw new InvalidArgumentException('Informe o local do evento presencial ou híbrido.');
        }
        $event['delivery'] = $delivery;
        $specific = self::objeto($event['specific'] ?? $previous['specific'] ?? [], 'campos específicos');
        $event['specific'] = [];
        foreach (self::catalogo()['profiles'][$profile]['fields'] as [$key,$label,$type]) {
            $value = $specific[$key] ?? '';
            if ($type === 'number') {
                if ($value !== '' && (!is_numeric($value) || !is_finite((float)$value) || $value < 0 || $value > 10000)) throw new InvalidArgumentException('Carga horária inválida.');
                $event['specific'][$key] = $value === '' ? '' : (float)$value;
            } elseif ($type === 'datetime-local') {
                $event['specific'][$key] = $value === '' ? '' : self::data($value, $label);
            } else $event['specific'][$key] = self::texto($value, $label, $type === 'textarea' ? 8000 : 255);
        }
        if (!empty($event['specific']['departureAt']) && !empty($event['specific']['returnAt']) && $event['specific']['returnAt'] <= $event['specific']['departureAt']) throw new InvalidArgumentException('O retorno deve ser posterior à saída da visita técnica.');
        $meetings = $event['meetings'] ?? $previous['meetings'] ?? [];
        if (!is_array($meetings) || !array_is_list($meetings) || count($meetings) > 100) throw new InvalidArgumentException('Informe até 100 encontros no cronograma.');
        $event['meetings'] = [];
        foreach ($meetings as $meeting) {
            $meeting = self::objeto($meeting, 'encontro');
            $m = ['title'=>self::texto($meeting['title'] ?? '', 'título do encontro', 200),
                'startAt'=>self::data($meeting['startAt'] ?? null, 'início do encontro'), 'endAt'=>self::data($meeting['endAt'] ?? null, 'término do encontro'),
                'location'=>self::texto($meeting['location'] ?? '', 'local do encontro')];
            if ($m['title'] === '' || $m['endAt'] <= $m['startAt']) throw new InvalidArgumentException('Informe título e término posterior ao início do encontro.');
            if ($m['startAt'] < $event['date'].'T'.$event['time']) throw new InvalidArgumentException('O encontro não pode começar antes do evento.');
            if (!empty($event['endAt']) && new DateTimeImmutable($m['endAt'], new DateTimeZone('America/Sao_Paulo')) > new DateTimeImmutable($event['endAt'])) throw new InvalidArgumentException('O encontro deve terminar antes da retirada do evento do ar.');
            foreach ($event['meetings'] as $other) if ($m['startAt'] < $other['endAt'] && $other['startAt'] < $m['endAt']) throw new InvalidArgumentException('Há encontros com horários sobrepostos no cronograma. Para programações paralelas, use múltiplas atividades.');
            $event['meetings'][] = $m;
        }
        usort($event['meetings'], fn($a,$b)=>strcmp($a['startAt'],$b['startAt']));
        $options = self::objeto($event['registrationOptions'] ?? $previous['registrationOptions'] ?? [], 'participação');
        $event['registrationOptions'] = [];
        foreach (['allowPresenter'=>'scientific','allowExhibitor'=>'fair','allowVolunteer'=>'community'] as $key=>$allowedProfile) {
            $flag = $options[$key] ?? false;
            if (!is_bool($flag)) throw new InvalidArgumentException('Opção de participação inválida.');
            $event['registrationOptions'][$key] = $profile === $allowedProfile && $flag;
        }
        return self::rotulos($event);
    }

    public static function rotulos(array $event): array
    {
        $kind = $event['eventKind'] ?? '';
        $event['eventKindLabel'] = $kind === 'outro' ? ($event['customEventKind'] ?? 'Outro') : (self::tipos()[$kind]['label'] ?? 'Não informado');
        $event['modality'] ??= 'presencial';
        $event['modalityLabel'] = ['presencial'=>'Presencial','online'=>'Online','hibrido'=>'Híbrido'][$event['modality']] ?? 'Presencial';
        return $event;
    }

    public static function publico(array $event): array
    {
        $event = self::rotulos($event);
        // Mesmo o portador do link de divulgação privado ainda precisa se inscrever.
        unset($event['delivery']['accessUrl'], $event['delivery']['instructions']);
        return $event;
    }

    public static function inscricao(array $registration, array $event): array
    {
        $mode = $event['modality'] ?? 'presencial';
        $selected = $registration['participationMode'] ?? '';
        if ($mode === 'hibrido' && ($event['delivery']['allowChoice'] ?? false)) {
            if (!in_array($selected, ['presencial','online'], true)) throw new InvalidArgumentException('Escolha a forma de participação: presencial ou online.');
        } else $selected = $mode;
        $allowed = ['participante'];
        foreach (['allowPresenter'=>'apresentador','allowExhibitor'=>'expositor','allowVolunteer'=>'voluntario'] as $key=>$role) if ($event['registrationOptions'][$key] ?? false) $allowed[] = $role;
        $role = $registration['eventRole'] ?? 'participante';
        if (!in_array($role, $allowed, true)) throw new InvalidArgumentException('Escolha uma forma de participação disponível neste evento.');
        $registration['participationMode'] = $selected;
        $registration['eventRole'] = $role;
        unset($registration['delivery'], $registration['onlineAccess']);
        return $registration;
    }

    public static function comprovante(array $receipt, array $registration, array $event): array
    {
        unset($receipt['onlineAccess']);
        $receipt['participationMode'] = $registration['participationMode'] ?? $event['modality'] ?? 'presencial';
        $receipt['eventRole'] = $registration['eventRole'] ?? 'participante';
        $receipt['eventKindLabel'] = self::rotulos($event)['eventKindLabel'];
        if (($receipt['reviewStatus'] ?? 'approved') === 'approved' && in_array($receipt['participationMode'], ['online','hibrido'], true) && in_array($event['modality'] ?? '', ['online','hibrido'], true)) {
            $receipt['onlineAccess'] = ['platform'=>$event['delivery']['platform'] ?? '', 'url'=>$event['delivery']['accessUrl'] ?? '', 'instructions'=>$event['delivery']['instructions'] ?? ''];
        }
        return $receipt;
    }
}
