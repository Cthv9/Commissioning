# Crea il pacchetto MSIX per il Microsoft Store a partire dalla build Tauri
# (da eseguire dopo `npm run tauri:build`, su Windows con il Windows SDK).
#
# Produce in -OutDir:
#   *-store.msix  non firmato: lo firma il Microsoft Store al caricamento
#   *-test.msix   firmato con un certificato di test, per provarlo in locale
#   *-test.cer    il certificato da considerare attendibile per installare il test
param(
  [string]$IdentityName = 'PortaleCommissioning',
  [string]$Publisher = 'CN=PortaleCommissioningTest',
  [string]$PublisherDisplayName = 'Portale Commissioning',
  [string]$DisplayName = 'Portale Commissioning',
  [string]$OutDir = 'msix-out'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Find-SdkTool([string]$name) {
  $tool = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\$name" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $tool) { throw "$name non trovato: serve il Windows 10/11 SDK." }
  return $tool.FullName
}

# Versione a 4 cifre con l'ultima a 0, come richiesto dallo Store.
$pkgVersion = (Get-Content package.json -Raw | ConvertFrom-Json).version
$core = ($pkgVersion -split '[-+]')[0]
$parts = $core.Split('.')
if ($parts.Count -ne 3) { throw "Versione non valida in package.json: $pkgVersion" }
$version = "$core.0"

# Eseguibile della shell Tauri (il nome dipende dalla versione della CLI).
$releaseDir = 'src-tauri\target\release'
$exe = @('portale-commissioning.exe', 'Portale Commissioning.exe') |
  ForEach-Object { Join-Path $releaseDir $_ } | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) { throw "Eseguibile Tauri non trovato in ${releaseDir}: eseguire prima npm run tauri:build." }

$staging = Join-Path $OutDir 'staging'
Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $staging, (Join-Path $staging 'Assets') | Out-Null

$exeName = 'PortaleCommissioning.exe'
Copy-Item $exe (Join-Path $staging $exeName)

# Stesse risorse (e stessa disposizione) dell'installer NSIS.
$resources = (Get-Content 'src-tauri\tauri.prod.conf.json' -Raw | ConvertFrom-Json).bundle.resources
foreach ($prop in $resources.PSObject.Properties) {
  $src = Join-Path 'src-tauri' $prop.Name
  if (-not (Test-Path $src)) { throw "Risorsa mancante: $src" }
  $dest = Join-Path $staging $prop.Value
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
  Copy-Item $src $dest
}

foreach ($icon in 'StoreLogo.png', 'Square44x44Logo.png', 'Square150x150Logo.png') {
  Copy-Item (Join-Path 'src-tauri\icons' $icon) (Join-Path $staging "Assets\$icon")
}

function Escape-Xml([string]$s) { [System.Security.SecurityElement]::Escape($s) }

$manifest = Get-Content 'packaging\msix\AppxManifest.xml.template' -Raw
$manifest = $manifest.Replace('{{IDENTITY_NAME}}', (Escape-Xml $IdentityName))
$manifest = $manifest.Replace('{{PUBLISHER}}', (Escape-Xml $Publisher))
$manifest = $manifest.Replace('{{PUBLISHER_DISPLAY_NAME}}', (Escape-Xml $PublisherDisplayName))
$manifest = $manifest.Replace('{{DISPLAY_NAME}}', (Escape-Xml $DisplayName))
$manifest = $manifest.Replace('{{VERSION}}', $version)
$manifest = $manifest.Replace('{{EXECUTABLE}}', $exeName)
if ($manifest -match '\{\{[A-Z_]+\}\}') { throw "Segnaposto non sostituito nel manifest: $($Matches[0])" }
$null = [xml]$manifest
Set-Content -Path (Join-Path $staging 'AppxManifest.xml') -Value $manifest -Encoding UTF8

$makeappx = Find-SdkTool 'makeappx.exe'
$signtool = Find-SdkTool 'signtool.exe'

$base = "PortaleCommissioning_${version}_x64"
$storeMsix = Join-Path $OutDir "$base-store.msix"
$testMsix = Join-Path $OutDir "$base-test.msix"

& $makeappx pack /o /d $staging /p $storeMsix
if ($LASTEXITCODE -ne 0) { throw "makeappx pack fallito ($LASTEXITCODE)" }

# Copia di test firmata con un certificato autogenerato con lo stesso Publisher
# del manifest (requisito di Windows per installare un MSIX).
Copy-Item $storeMsix $testMsix
$cert = New-SelfSignedCertificate -Type Custom -Subject $Publisher -KeyUsage DigitalSignature `
  -FriendlyName 'Portale Commissioning - certificato di test MSIX' `
  -CertStoreLocation 'Cert:\CurrentUser\My' `
  -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3', '2.5.29.19={text}')
$pfxPassword = [guid]::NewGuid().ToString()
$pfx = Join-Path $OutDir 'test-signing.pfx'
Export-PfxCertificate -Cert $cert -FilePath $pfx -Password (ConvertTo-SecureString $pfxPassword -AsPlainText -Force) | Out-Null
Export-Certificate -Cert $cert -FilePath (Join-Path $OutDir "$base-test.cer") | Out-Null

& $signtool sign /fd SHA256 /f $pfx /p $pfxPassword $testMsix
if ($LASTEXITCODE -ne 0) { throw "signtool sign fallito ($LASTEXITCODE)" }

Remove-Item $pfx -Force
Remove-Item $staging -Recurse -Force
Get-ChildItem $OutDir | ForEach-Object { Write-Host "Creato: $($_.FullName)" }
