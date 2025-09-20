<#!
.SYNOPSIS
  Exportiert Inhalte aller JSON-Dateien aus einem Wurzelverzeichnis (inkl. Unterordner) in eine einzelne Markdown-Datei.

.PARAMETER Root
  Wurzelverzeichnis mit den JSON-Dateien (Standard: ./data)

.PARAMETER OutFile
  Pfad zur Ausgabedatei (Standard: ./export.json.snippets.md)

.PARAMETER UseRelativePathInHeading
  Nutzt den relativen Pfad (statt nur Dateiname) in der "##"-Überschrift.

.PARAMETER SortBy
  Sortierreihenfolge: Name | Path | LastWriteTime (Standard: Path)

.EXAMPLE
  .\Export-JsonToMd.ps1 -Root .\data -OutFile .\all-json.md -UseRelativePathInHeading
#>
param(
  [string]$Root = ".\data",
  [string]$OutFile = ".\export.json.snippets.md",
  [switch]$UseRelativePathInHeading,
  [ValidateSet("Name","Path","LastWriteTime")]
  [string]$SortBy = "Path"
)

# Sicherstellen, dass das Root-Verzeichnis existiert
if (-not (Test-Path -LiteralPath $Root)) {
  throw "Root-Verzeichnis nicht gefunden: $Root"
}

# Alle JSON-Dateien rekursiv einsammeln
$files = Get-ChildItem -LiteralPath $Root -Recurse -File -Filter *.json -ErrorAction Stop

# Falls keine Dateien vorhanden sind, leere MD erzeugen und beenden
if (-not $files) {
  "# JSON Export ($Root)" | Set-Content -LiteralPath $OutFile -Encoding utf8
  return
}

# Sortierung anwenden
switch ($SortBy) {
  "Name"         { $files = $files | Sort-Object Name }
  "Path"         { $files = $files | Sort-Object FullName }
  "LastWriteTime"{ $files = $files | Sort-Object LastWriteTime }
}

# Ausgabeverzeichnis anlegen (falls nötig)
$null = New-Item -ItemType Directory -Path (Split-Path -Parent $OutFile) -Force -ErrorAction SilentlyContinue

# Kopf der MD-Datei schreiben
$rootResolved = (Resolve-Path $Root).Path
$timestamp    = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"# JSON Export ($rootResolved) - $timestamp" | Set-Content -LiteralPath $OutFile -Encoding utf8

$counter = 0
$total   = $files.Count

# Code-Fence sicher als drei Backticks erzeugen (verhindert versehentliches Escaping)
$bt    = [char]0x60              # Backtick-Zeichen
$fence = ([string]$bt) * 3       # ```

foreach ($f in $files) {
  $counter++

  # Überschrift: Dateiname oder relativer Pfad
  if ($UseRelativePathInHeading) {
    $full = (Resolve-Path -LiteralPath $f.FullName).Path
    if ($full.StartsWith($rootResolved, [System.StringComparison]::OrdinalIgnoreCase)) {
      $rel = $full.Substring($rootResolved.Length)
      # Führende Separatoren robust entfernen
      $heading = $rel -replace '^[\\/]+' , ''
    } else {
      $heading = $f.Name
    }
    if ([string]::IsNullOrWhiteSpace($heading)) { $heading = $f.Name }
  } else {
    $heading = $f.Name
  }

  # Datei roh einlesen (bewahrt Originalformatierung)
  $content = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8

  # Abschnitt als sauber zusammengefügte Zeilen (vermeidet Here-String Eigenheiten)
  $lines = @(
    ''
    "## $heading"
    ''
    ($fence + 'json')
    $content
    $fence
    ''
  )
  $section = $lines -join [Environment]::NewLine

  # Anhängen
  Add-Content -LiteralPath $OutFile -Value $section -Encoding utf8

  # Fortschritt
  $pct = [int](($counter / [double]$total) * 100)
  Write-Progress -Activity "Exporting JSON to MD" -Status "$counter / $($total): $heading" -PercentComplete $pct
}

Write-Host "Fertig. Ausgabe: $OutFile" -ForegroundColor Green
