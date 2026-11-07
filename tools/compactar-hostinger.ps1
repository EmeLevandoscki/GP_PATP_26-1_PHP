param([Parameter(Mandatory = $true)][string]$PackagePath)
$ErrorActionPreference = 'Stop'
$package = (Resolve-Path -LiteralPath $PackagePath).Path
$allowed = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../publicacao')).Path
if (-not $package.StartsWith($allowed + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'O pacote precisa estar dentro de publicacao.'
}
$stage = Join-Path $package 'arquivos-site'
$zipPath = Join-Path $package '01-site.zip'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in Get-ChildItem -LiteralPath $stage -File -Recurse -Force) {
        $relative = $file.FullName.Substring($stage.Length + 1).Replace('\', '/')
        [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $relative, [IO.Compression.CompressionLevel]::Optimal)
    }
} finally { $archive.Dispose() }
$inputSql = [IO.File]::OpenRead((Join-Path $package '02-banco-com-dados.sql'))
$outputGzip = [IO.File]::Open((Join-Path $package '02-banco-com-dados.sql.gz'), [IO.FileMode]::CreateNew)
$gzip = New-Object IO.Compression.GZipStream($outputGzip, [IO.Compression.CompressionLevel]::Optimal)
try { $inputSql.CopyTo($gzip) } finally { $gzip.Dispose(); $outputGzip.Dispose(); $inputSql.Dispose() }

# Confere os bytes do ZIP e a presença dos arquivos ocultos necessários ao servidor.
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $required = @('index.php', '.htaccess', '.user.ini', 'src/Config/.htaccess', 'uploads/.htaccess',
        'src/Config/email.local.php', 'src/Config/database.local.php', 'src/Config/organizer.local.php',
        'vendor/autoload.php', 'participantes/index.php', 'organizador/index.php',
        'ideau_eventos/assets/data/event-types.json', 'ideau_eventos/consultar-inscricao.php')
    foreach ($name in $required) { if (-not $archive.GetEntry($name)) { throw "Arquivo ausente: $name" } }
    foreach ($entry in $archive.Entries) {
        if ($entry.FullName -match '(^|/)(\.git|\.vscode|tests|publicacao|db|tools)/|\.(sql|log|zip)$') {
            throw "Arquivo inesperado no site: $($entry.FullName)"
        }
        $stream = $entry.Open()
        $sha = [Security.Cryptography.SHA256]::Create()
        try { $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '') }
        finally { $sha.Dispose(); $stream.Dispose() }
        $sourceHash = (Get-FileHash -LiteralPath (Join-Path $stage $entry.FullName) -Algorithm SHA256).Hash
        if ($hash -ne $sourceHash) { throw "Conteudo divergente no ZIP: $($entry.FullName)" }
    }
    $count = $archive.Entries.Count
} finally { $archive.Dispose() }
$compressed = [IO.File]::OpenRead((Join-Path $package '02-banco-com-dados.sql.gz'))
$decoder = New-Object IO.Compression.GZipStream($compressed, [IO.Compression.CompressionMode]::Decompress)
$sha = [Security.Cryptography.SHA256]::Create()
try { $hash = [BitConverter]::ToString($sha.ComputeHash($decoder)).Replace('-', '') }
finally { $sha.Dispose(); $decoder.Dispose(); $compressed.Dispose() }
if ($hash -ne (Get-FileHash -LiteralPath (Join-Path $package '02-banco-com-dados.sql') -Algorithm SHA256).Hash) {
    throw 'Conteudo divergente no GZip.'
}
$utf8 = New-Object Text.UTF8Encoding($false)
[IO.File]::AppendAllText((Join-Path $package 'VERIFICACAO.txt'), "OK: ZIP com $count arquivos verificados por SHA256, incluindo .htaccess e .user.ini.`nOK: GZip confere com o SQL verificado.`n", $utf8)
$hashes = foreach ($name in @('01-site.zip', '02-banco-com-dados.sql.gz')) {
    (Get-FileHash -LiteralPath (Join-Path $package $name) -Algorithm SHA256).Hash.ToLowerInvariant() + '  ' + $name
}
[IO.File]::WriteAllLines((Join-Path $package 'SHA256SUMS.txt'), $hashes, $utf8)
Write-Output "OK: ZIP com $count arquivos e banco GZip prontos."
