<?php
namespace App\Service;

/** Comprovantes só ficam acessíveis na sessão que confirmou os dados da inscrição. */
final class ComprovanteService
{
    public static function ativa(\PDO $db, array $receipt): bool
    {
        $legacy = str_starts_with($receipt['protocol'], 'IDEAU-');
        $stmt = $db->prepare($legacy
            ? 'SELECT 1 FROM inscricoes WHERE id = ? AND id_atividade = ?'
            : 'SELECT 1 FROM eventos_publicacoes_inscricoes WHERE id = ? AND id_evento = ?');
        $stmt->execute([$legacy ? substr($receipt['protocol'], 6) : $receipt['protocol'], $receipt['eventId']]);
        return (bool) $stmt->fetchColumn();
    }

    public static function cancelar(\PDO $db, string $receiptId): void
    {
        // O destino vem exclusivamente do comprovante autorizado na sessão.
        $receipt = $_SESSION['registration_receipts'][$receiptId] ?? null;
        if (!$receipt) throw new \InvalidArgumentException('Comprovante indisponível nesta sessão.');
        $legacy = str_starts_with($receipt['protocol'], 'IDEAU-');
        $db->beginTransaction();
        try {
            $lock = $db->prepare($legacy
                ? 'SELECT e.id FROM eventos e JOIN atividades a ON a.id_evento = e.id WHERE a.id = ? FOR UPDATE'
                : 'SELECT id FROM eventos_publicacoes WHERE id = ? FOR UPDATE');
            $lock->execute([$receipt['eventId']]);
            $stmt = $db->prepare($legacy
                ? 'DELETE FROM inscricoes WHERE id = ? AND id_atividade = ?'
                : 'DELETE FROM eventos_publicacoes_inscricoes WHERE id = ? AND id_evento = ?');
            $stmt->execute([$legacy ? substr($receipt['protocol'], 6) : $receipt['protocol'], $receipt['eventId']]);
            $db->commit();
            unset($_SESSION['registration_receipts'][$receiptId]);
            $_SESSION['cancelled_receipts'][$receiptId] = true;
        } catch (\Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            throw $error;
        }
    }

    public static function resposta(array $receipt, bool $existing = false): array
    {
        $key = hash('sha256', $receipt['protocol']);
        $_SESSION['registration_receipts'][$key] = $receipt;
        return ['success' => true, 'alreadyRegistered' => $existing,
            'message' => $existing ? 'Você já está inscrito. Aqui está seu comprovante.' : 'Inscrição confirmada!',
            'receiptUrl' => 'comprovante.php?id=' . $key];
    }

    public static function pdf(array $receipt): string
    {
        $logo = file_get_contents(__DIR__ . '/../../ideau_eventos/assets/img/logo-ideau-pdf.jpg');
        [$logoWidth, $logoHeight] = getimagesizefromstring($logo);
        $text = static function (string $value, float $x, float $y, int $size = 11, bool $bold = false, string $color = '0.14 0.18 0.15'): string {
            $value = iconv('UTF-8', 'Windows-1252//TRANSLIT', preg_replace('/[\r\n\t]+/', ' ', $value));
            $value = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $value);
            $font = $bold ? 'F2' : 'F1';
            return "$color rg BT /$font $size Tf 1 0 0 1 $x $y Tm ($value) Tj ET\n";
        };
        // Conservative character widths keep long names and unbroken protocols inside the frame.
        $wrap = static function (string $value, int $size, int $width): array {
            $value = preg_replace('/\s+/u', ' ', trim($value));
            $lines = []; $line = ''; $used = 0;
            foreach (preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY) as $char) {
                $unit = str_contains('MW@%mw', $char) ? 1.0 : (str_contains(' ilI.,:;!|', $char) ? 0.3 : (mb_strtoupper($char) === $char ? 0.78 : 0.6));
                if ($used + $unit * $size > $width && $line !== '') {
                    $space = mb_strrpos($line, ' ');
                    if ($space !== false && $space > mb_strlen($line) / 2) {
                        $lines[] = mb_substr($line, 0, $space);
                        $line = mb_substr($line, $space + 1);
                        $used = mb_strlen($line) * $size * 0.78;
                    } else { $lines[] = $line; $line = ''; $used = 0; }
                }
                $line .= $char; $used += $unit * $size;
            }
            if ($line !== '' || !$lines) $lines[] = trim($line);
            return $lines;
        };
        $frame = static function () use ($text): string {
            $stream = "1 1 1 rg 0 0 595 842 re f\n";
            // Geometric border, inspired by institutional printed documents.
            $stream .= "0.91 0.94 0.91 rg\n";
            for ($x = 13; $x < 580; $x += 19) {
                $stream .= "$x 13 13 13 re f $x 816 13 13 re f\n";
            }
            for ($y = 32; $y < 810; $y += 19) {
                $stream .= "13 $y 13 13 re f 569 $y 13 13 re f\n";
            }
            $stream .= "0.12 0.34 0.20 RG 0.9 w 35 35 525 772 re S\n";
            $stream .= "0.79 0.84 0.79 RG 0.4 w 40 40 515 762 re S\n";
            $stream .= "q 72 0 0 70 261.5 708 cm /Logo Do Q\n";
            $stream .= $text('IDEAU EVENTOS', 248, 692, 12, true, '0.12 0.34 0.20');
            $stream .= $text('COMPROVANTE DE INSCRIÇÃO', 174, 651, 16, true);
            $stream .= "0.12 0.34 0.20 RG 1.4 w 263 636 m 332 636 l S\n";
            $stream .= "0.95 0.97 0.95 rg 76 586 443 30 re f\n";
            $stream .= $text('INSCRIÇÃO CONFIRMADA', 234, 597, 10, true, '0.12 0.34 0.20');
            return $stream;
        };
        $pages = []; $stream = $frame(); $y = 553;
        $fields = ['name' => 'PARTICIPANTE', 'eventTitle' => 'EVENTO', 'date' => 'DATA DO EVENTO',
            'time' => 'HORÁRIO', 'location' => 'LOCAL', 'registeredAt' => 'DATA DA INSCRIÇÃO'];
        foreach ($fields as $field => $label) {
            $lines = $wrap((string) $receipt[$field], 12, 430);
            if ($y < 240) { $pages[] = $stream; $stream = $frame(); $y = 553; }
            $stream .= $text($label, 78, $y, 8, true, '0.35 0.43 0.37');
            $y -= 20;
            foreach ($lines as $line) {
                if ($y < 200) { $pages[] = $stream; $stream = $frame(); $y = 553; }
                $stream .= $text($line, 78, $y, 12, $field === 'name');
                $y -= 17;
            }
            $y -= 17;
        }
        $pages[] = $stream;
        foreach ($pages as $index => &$page) {
            $page .= "0.79 0.84 0.79 RG 0.5 w 78 176 m 517 176 l S\n";
            $page .= $text('Este documento comprova a inscrição no evento.', 78, 158, 10, true);
            $page .= $text('Não substitui o certificado de presença ou de participação.', 78, 142, 10);
            $page .= $text('PROTOCOLO DA INSCRIÇÃO', 78, 111, 8, true, '0.35 0.43 0.37');
            $protocolY = 96;
            foreach ($wrap((string) $receipt['protocol'], 9, 430) as $line) {
                $page .= $text($line, 78, $protocolY, 9); $protocolY -= 12;
            }
            $page .= $text('IDEAU Eventos  |  Comprovante digital', 78, 57, 8, false, '0.35 0.43 0.37');
            $page .= $text(($index + 1) . ' / ' . count($pages), 492, 57, 8);
        }
        unset($page);
        $objects = ['<< /Type /Catalog /Pages 2 0 R >>', '',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
            "<< /Type /XObject /Subtype /Image /Width $logoWidth /Height $logoHeight /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " . strlen($logo) . ">>\nstream\n" . $logo . "\nendstream"];
        $kids = [];
        foreach ($pages as $page) {
            $id = count($objects) + 1; $content = $id + 1; $kids[] = "$id 0 R";
            $objects[] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Logo 5 0 R >> >> /Contents $content 0 R >>";
            $objects[] = '<< /Length ' . strlen($page) . ">>\nstream\n$page\nendstream";
        }
        $objects[1] = '<< /Type /Pages /Kids [' . implode(' ', $kids) . '] /Count ' . count($pages) . ' >>';
        $pdf = "%PDF-1.4\n"; $offsets = [];
        foreach ($objects as $index => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1) . " 0 obj\n$object\nendobj\n";
        }
        $xref = strlen($pdf); $count = count($objects) + 1;
        $pdf .= "xref\n0 $count\n0000000000 65535 f \n";
        foreach ($offsets as $offset) $pdf .= sprintf("%010d 00000 n \n", $offset);
        return $pdf . "trailer\n<< /Size $count /Root 1 0 R >>\nstartxref\n$xref\n%%EOF\n";
    }

    public static function data(string $value): string
    {
        if (!$value) return 'Não informado';
        try {
            return (new \DateTimeImmutable($value, new \DateTimeZone('America/Sao_Paulo')))
                ->setTimezone(new \DateTimeZone('America/Sao_Paulo'))->format('d/m/Y H:i');
        } catch (\Exception) { return $value; }
    }
}
