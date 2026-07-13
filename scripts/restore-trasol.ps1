<#
.SYNOPSIS
    Fully automatic: restore Trasol.bak (SQL Server 2017) onto your existing
    SQL Server 2014 instance, via a temporary LocalDB staging engine.

.DESCRIPTION
    SQL Server cannot restore a newer backup on an older engine. So we:
      1. Detect your installed SQL Server instances (target = your 2014).
      2. Install SQL Server 2019 LocalDB if no 2017+ engine is present.
      3. Install the SqlServer PowerShell module if missing (user scope).
      4. Install SqlPackage.exe locally (no admin) if missing.
      5. Restore Trasol.bak into LocalDB as a temporary staging database.
      6. Export that staging DB to a .bacpac (version-agnostic format).
      7. Import the .bacpac into your 2014 instance as "Trasol".
      8. Drop the staging database.

    Caveat: if Trasol uses SQL 2017-only features (temporal tables, graph,
    JSON-as-type, etc.) the BACPAC export will refuse and tell you which
    feature. For a normal barcode-style DB this isn't expected.

.PARAMETER TargetInstance
    Force your final destination instance. Default: auto-pick the OLDEST
    detected instance that's >= 2014 (i.e., your 2014).

.PARAMETER SqlUser / SqlPassword
    Optional. SQL auth credentials for the TARGET 2014 instance only.
    LocalDB always uses Windows auth.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\scripts\restore-trasol.ps1
#>

[CmdletBinding()]
param(
    [string]$TargetInstance = "",
    [string]$BakPath        = "",
    [string]$DbName         = "Trasol",
    [string]$SqlUser        = "",
    [string]$SqlPassword    = "",
    [switch]$KeepStaging
)

# Auto-locate Trasol.bak: explicit param > script folder > parent of script > current dir
if (-not $BakPath) {
    $candidates = @(
        (Join-Path $PSScriptRoot "Trasol.bak"),
        (Join-Path (Split-Path -Parent $PSScriptRoot) "Trasol.bak"),
        (Join-Path (Get-Location) "Trasol.bak")
    )
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) { $BakPath = $c; break }
    }
    if (-not $BakPath) { $BakPath = $candidates[1] }  # for the error message below
}

$ErrorActionPreference = "Stop"
$ProgressPreference     = "SilentlyContinue"   # faster downloads

function Info($m) { Write-Host $m -ForegroundColor Cyan }
function Ok($m)   { Write-Host $m -ForegroundColor Green }
function Warn($m) { Write-Host $m -ForegroundColor Yellow }
function Fail($m) { Write-Host $m -ForegroundColor Red; exit 1 }

$WorkRoot = Join-Path $env:LOCALAPPDATA "TrasolMigrate"
New-Item -ItemType Directory -Path $WorkRoot -Force | Out-Null

if (-not (Test-Path -LiteralPath $BakPath)) { Fail "Backup file not found: $BakPath" }
$BakFull = (Resolve-Path -LiteralPath $BakPath).Path
Info "Backup file: $BakFull"
Info "Work folder: $WorkRoot"

# ============================================================
# 1. SqlServer PowerShell module (the modern one, NOT legacy SQLPS)
# ============================================================
# Force TLS 1.2 - older Windows PowerShell defaults break PSGallery.
try {
    [Net.ServicePointManager]::SecurityProtocol = `
        [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch {}

$haveSqlServerModule = $null -ne (Get-Module -ListAvailable -Name SqlServer | Select-Object -First 1)
if (-not $haveSqlServerModule) {
    Info "Installing SqlServer PowerShell module (user scope, no admin)..."
    try {
        if (-not (Get-PackageProvider -Name NuGet -ErrorAction SilentlyContinue)) {
            Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 `
                -Force -Scope CurrentUser -Confirm:$false | Out-Null
        }
        Set-PSRepository -Name PSGallery -InstallationPolicy Trusted -ErrorAction SilentlyContinue
        Install-Module -Name SqlServer -Scope CurrentUser `
            -Force -AllowClobber -SkipPublisherCheck -Confirm:$false -ErrorAction Stop
    } catch {
        Fail @"
Could not install the SqlServer PowerShell module:
  $_
Try once manually in a new PowerShell window:
  Install-Module -Name SqlServer -Scope CurrentUser -Force -AllowClobber
"@
    }
}
# Unload the legacy SQLPS module if SQL Server 2014 auto-loaded it -
# its Invoke-Sqlcmd ignores -TrustServerCertificate and confuses us.
if (Get-Module -Name SQLPS -ErrorAction SilentlyContinue) {
    Remove-Module SQLPS -Force -ErrorAction SilentlyContinue
}
Import-Module SqlServer -ErrorAction Stop -DisableNameChecking

# Build credential for target (SQL auth) if supplied
$targetCred = $null
if ($SqlUser -and $SqlPassword) {
    $sec        = ConvertTo-SecureString $SqlPassword -AsPlainText -Force
    $targetCred = New-Object System.Management.Automation.PSCredential ($SqlUser, $sec)
}

$script:InvokeSqlcmdSupportsEncrypt = $null
function Invoke-Sql {
    param(
        [Parameter(Mandatory)] [string]$Server,
        [Parameter(Mandatory)] [string]$Query,
        [string]$Database = "master",
        [switch]$UseTargetCred
    )
    $params = @{
        ServerInstance         = $Server
        Database               = $Database
        Query                  = $Query
        TrustServerCertificate = $true
        ConnectionTimeout      = 15
        ErrorAction            = 'Stop'
    }
    # SqlServer module v22+ defaults Encrypt=Mandatory which breaks
    # SQL Server 2014 (no TLS cert by default). Force Optional.
    if ($null -eq $script:InvokeSqlcmdSupportsEncrypt) {
        $script:InvokeSqlcmdSupportsEncrypt = (Get-Command Invoke-Sqlcmd).Parameters.ContainsKey('Encrypt')
    }
    if ($script:InvokeSqlcmdSupportsEncrypt) { $params.Encrypt = 'Optional' }
    if ($UseTargetCred -and $targetCred) { $params.Credential = $targetCred }
    return Invoke-Sqlcmd @params
}

# ============================================================
# 2. Detect installed SQL Server instances
# ============================================================
function Get-LocalSqlInstances {
    $names = New-Object System.Collections.Generic.List[string]
    try {
        $svc = Get-Service -ErrorAction SilentlyContinue |
               Where-Object { $_.Name -like 'MSSQL$*' -or $_.Name -eq 'MSSQLSERVER' }
        foreach ($s in $svc) {
            if ($s.Status -ne 'Running') { try { Start-Service $s.Name -ErrorAction SilentlyContinue } catch {} }
            if ($s.Name -eq 'MSSQLSERVER') { $names.Add('.') }
            else { $names.Add('.\' + ($s.Name -replace '^MSSQL\$','')) }
        }
    } catch {}
    return ($names | Select-Object -Unique)
}

Info "Detecting installed SQL Server instances..."
$instances = if ($TargetInstance) { ,@($TargetInstance) } else { Get-LocalSqlInstances }
if (-not $instances -or $instances.Count -eq 0) {
    Fail "No installed SQL Server instances were detected. Set -TargetInstance manually if you have one."
}

$reachable = @()
$lastError  = $null
foreach ($srv in $instances) {
    try {
        # ProductMajorVersion only exists on SQL 2015+; parse from ProductVersion instead.
        $row = Invoke-Sql -Server $srv -UseTargetCred -Query @"
SELECT
    CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(64))  AS ProductVersion,
    CAST(SERVERPROPERTY('Edition')        AS nvarchar(128)) AS Edition
"@
        $verStr = "$($row.ProductVersion)"
        $maj = 0
        if ($verStr -match '^(\d+)\.') { $maj = [int]$Matches[1] }
        $reachable += [PSCustomObject]@{ Server = $srv; Major = $maj; Version = $verStr; Edition = "$($row.Edition)" }
        Write-Host ("  {0,-32} v{1,-14} {2}" -f $srv, $verStr, $row.Edition) -ForegroundColor Gray
    } catch {
        $lastError = $_.Exception.Message
        Write-Host ("  {0,-32} (not reachable)" -f $srv) -ForegroundColor DarkGray
        Write-Host ("      reason: {0}" -f $lastError) -ForegroundColor DarkGray
    }
}

# Target = oldest reachable >= 2014 (i.e., the 2014 the user mentioned)
$targetRow = $reachable | Where-Object { $_.Major -ge 12 } | Sort-Object Major | Select-Object -First 1
if (-not $targetRow) {
    $hint = @"
No reachable SQL Server >= 2014 was found.
Last connection error: $lastError

Things to check on this laptop:
  - Is the SQL Server service actually running?
      Get-Service | Where-Object { `$_.Name -like 'MSSQL*' }
  - Try connecting manually:
      sqlcmd -S .\SQLEXPRESS -E -Q "SELECT @@VERSION"
  - If the instance name isn't '.\SQLEXPRESS', re-run with the correct one:
      .\restore-trasol.bat                    (and edit .bat first), or
      powershell -ExecutionPolicy Bypass -File .\restore-trasol.ps1 -TargetInstance "YOUR\INSTANCE"
"@
    Fail $hint
}
$target = $targetRow.Server
Ok "Target (final destination): $target  (v$($targetRow.Version) $($targetRow.Edition))"

# Staging = any reachable >= 2017 if present; else LocalDB (installed below)
$stagingRow = $reachable | Where-Object { $_.Major -ge 14 } | Sort-Object Major -Descending | Select-Object -First 1
$stagingInstance = if ($stagingRow) { $stagingRow.Server } else { $null }

# ============================================================
# 3. Install LocalDB if no SQL 2017+ engine present
# ============================================================
function Get-SqlLocalDbExe {
    $cmd = Get-Command sqllocaldb.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $patterns = @(
        "${env:ProgramFiles}\Microsoft SQL Server\*\Tools\Binn\SqlLocalDB.exe",
        "${env:ProgramFiles(x86)}\Microsoft SQL Server\*\Tools\Binn\SqlLocalDB.exe"
    )
    foreach ($p in $patterns) {
        $hit = Get-ChildItem -Path $p -ErrorAction SilentlyContinue |
               Sort-Object FullName -Descending | Select-Object -First 1
        if ($hit) { return $hit.FullName }
    }
    return $null
}

function Get-LocalDbInstalledMajors {
    param([string]$Exe)
    if (-not $Exe) { return @() }
    $majors = @()
    foreach ($line in (& $Exe versions)) {
        if ("$line" -match '\((\d+)\.\d+') { $majors += [int]$Matches[1] }
    }
    return ($majors | Sort-Object -Unique)
}

if (-not $stagingInstance) {
    Info "No SQL Server 2017+ engine found. Setting up SQL Server LocalDB as a temporary staging engine."

    $localdbExe       = Get-SqlLocalDbExe
    $installedMajors  = Get-LocalDbInstalledMajors -Exe $localdbExe
    $has2017Plus      = ($installedMajors | Where-Object { $_ -ge 14 }).Count -gt 0

    if (-not $localdbExe -or -not $has2017Plus) {
        if ($installedMajors.Count -gt 0) {
            Info ("Existing LocalDB versions detected: " + (($installedMajors | ForEach-Object { "$_.x" }) -join ", ") + " - none are >= 14 (SQL 2017). Installing 2019 LocalDB alongside.")
        }

        $candidateUrls = @(
            "https://download.microsoft.com/download/7/c/1/7c14e92e-bdcb-4f89-b7cf-93543e7112d1/SqlLocalDB.msi",
            "https://download.microsoft.com/download/3/8/d/38de7036-2433-4207-8eae-06e247e17b25/SqlLocalDB.msi"
        )
        $msi = Join-Path $WorkRoot "SqlLocalDB.msi"
        $downloaded = $false
        foreach ($url in $candidateUrls) {
            try {
                if (Test-Path $msi) { Remove-Item $msi -Force -ErrorAction SilentlyContinue }
                Info "Downloading SqlLocalDB.msi from $url ..."
                Invoke-WebRequest -Uri $url -OutFile $msi -UseBasicParsing -ErrorAction Stop
                $size = (Get-Item $msi).Length
                $header = Get-Content -Path $msi -Encoding Byte -TotalCount 4 -ErrorAction SilentlyContinue
                $isMsi = ($header.Count -ge 4 -and $header[0] -eq 0xD0 -and $header[1] -eq 0xCF -and $header[2] -eq 0x11 -and $header[3] -eq 0xE0)
                if ($size -lt 10MB) {
                    Warn ("  -> got only {0:N1} MB - probably an error page, trying next URL" -f ($size/1MB))
                    continue
                }
                if (-not $isMsi) {
                    Warn "  -> file is not an MSI (wrong magic bytes), trying next URL"
                    continue
                }
                Ok ("  -> downloaded {0:N1} MB, valid MSI" -f ($size/1MB))
                $downloaded = $true
                break
            } catch {
                Warn "  -> download failed: $($_.Exception.Message)"
            }
        }
        if (-not $downloaded) {
            Fail @"
Could not download a valid SqlLocalDB.msi automatically. Manual install:
  1. Open https://www.microsoft.com/sql-server/sql-server-downloads
  2. Under 'Express', click 'Download now' (gives SQL2019-SSEI-Expr.exe).
  3. Run that .exe, choose 'Download Media' -> 'LocalDB' -> save SqlLocalDB.msi.
  4. Double-click SqlLocalDB.msi and install.
  5. Re-run restore-trasol.bat.
"@
        }

        Info "Installing LocalDB (you'll see ONE UAC prompt - click Yes)..."
        $p = Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qb IACCEPTSQLLOCALDBLICENSETERMS=YES" -Wait -PassThru
        if ($p.ExitCode -ne 0) { Fail "LocalDB installer returned exit code $($p.ExitCode)." }
        $localdbExe = Get-SqlLocalDbExe
        if (-not $localdbExe) { Fail "LocalDB installed but SqlLocalDB.exe not found. Open a new terminal and re-run." }
        $installedMajors = Get-LocalDbInstalledMajors -Exe $localdbExe
        Ok ("LocalDB installed. Versions now available: " + (($installedMajors | ForEach-Object { "$_.x" }) -join ", "))
    }

    $newestMajor = ($installedMajors | Sort-Object -Descending | Select-Object -First 1)
    if (-not $newestMajor -or $newestMajor -lt 14) {
        Fail "LocalDB version >= 2017 is required after install but wasn't found. Reboot and re-run."
    }
    $localdbVersion = "$newestMajor.0"

    # Dedicated staging instance, forced to the newest installed LocalDB version.
    $stageInstanceName = "TrasolStage"
    $existingInfo = (& $localdbExe info) -join "`n"
    $needCreate   = $true
    if ($existingInfo -match ('(?m)^' + [regex]::Escape($stageInstanceName) + '\s*$')) {
        # exists - check version
        $thisVer = 0
        foreach ($line in (& $localdbExe info $stageInstanceName)) {
            if ("$line" -match '^Version:\s*(\d+)\.') { $thisVer = [int]$Matches[1]; break }
        }
        if ($thisVer -ge 14) {
            $needCreate = $false
        } else {
            Info ("Existing '$stageInstanceName' is v$thisVer - recreating with v$newestMajor...")
            & $localdbExe stop   $stageInstanceName -k 2>&1 | Out-Null
            & $localdbExe delete $stageInstanceName       2>&1 | Out-Null
        }
    }
    if ($needCreate) {
        Info "Creating LocalDB instance '$stageInstanceName' (version $localdbVersion)..."
        $createOut = & $localdbExe create $stageInstanceName $localdbVersion 2>&1
        if ($LASTEXITCODE -ne 0) { Fail "sqllocaldb create failed: $createOut" }
    }
    & $localdbExe start $stageInstanceName 2>&1 | Out-Null
    $stagingInstance = "(localdb)\$stageInstanceName"

    try {
        $row = Invoke-Sql -Server $stagingInstance -Query "SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(64)) AS v"
        Ok "Staging engine ready: $stagingInstance  (v$($row.v))"
    } catch {
        Fail "Could not connect to LocalDB instance '$stageInstanceName' after create: $_"
    }
} else {
    Ok "Using existing SQL Server 2017+ engine for staging: $stagingInstance"
}

# ============================================================
# 4. Install SqlPackage locally if missing (no admin)
# ============================================================
function Get-SqlPackageVersion {
    param([string]$Exe)
    try {
        $out = & $Exe /Version 2>&1
        $verStr = ($out | Select-String -Pattern '(\d+)\.\d+\.\d+' | Select-Object -First 1)
        if ($verStr) {
            if ("$verStr" -match '(\d+)\.\d+\.\d+') { return [int]$Matches[1] }
        }
    } catch {}
    return 0
}

function Get-SqlPackagePath {
    # Always prefer the workspace-downloaded one (known to be modern).
    $local = Join-Path $WorkRoot "sqlpackage\sqlpackage.exe"
    if (Test-Path $local) { return $local }
    # Otherwise scan for an installed one, but skip versions older than 18
    # (older DAC framework releases choke on modern parameters / newer servers).
    $candidates = @()
    $cmd = Get-Command sqlpackage.exe -ErrorAction SilentlyContinue
    if ($cmd) { $candidates += $cmd.Source }
    $patterns = @(
        "${env:ProgramFiles}\Microsoft SQL Server\*\DAC\bin\sqlpackage.exe",
        "${env:ProgramFiles(x86)}\Microsoft SQL Server\*\DAC\bin\sqlpackage.exe",
        "${env:ProgramFiles}\Microsoft Visual Studio\*\*\Common7\IDE\Extensions\Microsoft\SQLDB\DAC\*\sqlpackage.exe"
    )
    foreach ($p in $patterns) {
        $hit = Get-ChildItem -Path $p -ErrorAction SilentlyContinue |
               Sort-Object FullName -Descending | Select-Object -First 1
        if ($hit) { $candidates += $hit.FullName }
    }
    foreach ($c in $candidates) {
        $v = Get-SqlPackageVersion -Exe $c
        if ($v -ge 18) { return $c }
    }
    return $null
}

$sqlpackage = Get-SqlPackagePath
if (-not $sqlpackage) {
    $zip  = Join-Path $WorkRoot "sqlpackage.zip"
    $dest = Join-Path $WorkRoot "sqlpackage"
    Info "Downloading SqlPackage (~150MB, no install needed, no admin)..."
    Invoke-WebRequest -Uri "https://aka.ms/sqlpackage-windows" -OutFile $zip -UseBasicParsing
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Info "Extracting SqlPackage..."
    Expand-Archive -Path $zip -DestinationPath $dest -Force
    $sqlpackage = Get-SqlPackagePath
    if (-not $sqlpackage) { Fail "SqlPackage download / extract failed." }
    Ok "SqlPackage ready: $sqlpackage"
} else {
    Info "Using existing SqlPackage: $sqlpackage"
}

# ============================================================
# 5. Restore Trasol.bak into staging as a temporary DB
# ============================================================
$stagingDb = "Trasol_Stage_" + ([Guid]::NewGuid().ToString("N").Substring(0,8))
Info "Restoring Trasol.bak into staging as [$stagingDb] ..."

$bakEsc   = $BakFull.Replace("'", "''")
$fileRows = Invoke-Sql -Server $stagingInstance -Query "RESTORE FILELISTONLY FROM DISK = N'$bakEsc'"

$paths = Invoke-Sql -Server $stagingInstance -Query @"
SELECT
    CONVERT(nvarchar(260), SERVERPROPERTY('InstanceDefaultDataPath')) AS DataPath,
    CONVERT(nvarchar(260), SERVERPROPERTY('InstanceDefaultLogPath'))  AS LogPath
"@
$dataDir = "$($paths.DataPath)".Trim()
$logDir  = "$($paths.LogPath)".Trim()
if (-not $dataDir) { $dataDir = Join-Path $WorkRoot "staging-data\" }
if (-not $logDir)  { $logDir  = $dataDir }
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
if (-not (Test-Path $logDir))  { New-Item -ItemType Directory -Path $logDir  -Force | Out-Null }
$dataDir = $dataDir.TrimEnd('\') + '\'
$logDir  = $logDir.TrimEnd('\')  + '\'

$moveParts = @()
foreach ($row in $fileRows) {
    $logical = "$($row.LogicalName)".Trim()
    $type    = "$($row.Type)".Trim()
    if (-not $logical) { continue }
    switch ($type) {
        'D' { $ext = 'mdf'; $target_path = "$dataDir${stagingDb}_$logical.$ext" }
        'L' { $ext = 'ldf'; $target_path = "$logDir${stagingDb}_$logical.$ext" }
        default { $ext = 'ndf'; $target_path = "$dataDir${stagingDb}_$logical.$ext" }
    }
    $moveParts += "MOVE N'$logical' TO N'$($target_path.Replace("'", "''"))'"
}
if ($moveParts.Count -eq 0) { Fail "Could not parse logical file names from backup." }

$restoreSql = "RESTORE DATABASE [$stagingDb] FROM DISK = N'$bakEsc' WITH " + ($moveParts -join ", ") + ", REPLACE, STATS = 10"
Invoke-Sql -Server $stagingInstance -Query $restoreSql | Out-Null
Ok "Restored to staging."

# ============================================================
# 6. Export staging DB to a .bacpac (version-agnostic)
# ============================================================
$bacpac = Join-Path $WorkRoot "Trasol.bacpac"
if (Test-Path $bacpac) { Remove-Item $bacpac -Force }
Info "Exporting BACPAC (this is the slow step - a minute or two)..."
$exportArgs = @(
    "/Action:Export",
    "/SourceServerName:$stagingInstance",
    "/SourceDatabaseName:$stagingDb",
    "/TargetFile:$bacpac",
    "/SourceTrustServerCertificate:True"
)
& $sqlpackage @exportArgs
if ($LASTEXITCODE -ne 0) {
    Warn "BACPAC export failed. The most common reason is that Trasol uses SQL Server 2017-only features that 2014 doesn't have. The error above lists them."
    Fail "Cannot continue."
}
Ok "BACPAC created: $bacpac"

# ============================================================
# 7. Drop existing Trasol on the 2014 target if present
# ============================================================
$exists = (Invoke-Sql -Server $target -UseTargetCred -Query "SELECT COUNT(*) AS n FROM sys.databases WHERE name = N'$DbName'").n
if ($exists -ge 1) {
    Warn "Database '$DbName' already exists on $target."
    $ans = Read-Host "Drop it and re-import from Trasol.bak? [y/N]"
    if ($ans -notmatch '^[Yy]$') {
        Info "Leaving existing database alone. Exiting (staging stays unless -KeepStaging is off)."
        if (-not $KeepStaging) {
            try { Invoke-Sql -Server $stagingInstance -Query "ALTER DATABASE [$stagingDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$stagingDb];" | Out-Null } catch {}
        }
        exit 0
    }
    Invoke-Sql -Server $target -UseTargetCred -Query "ALTER DATABASE [$DbName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$DbName];" | Out-Null
    Ok "Dropped existing '$DbName' on $target."
}

# ============================================================
# 8. Import BACPAC into the 2014 instance
# ============================================================
Info "Importing BACPAC into $target as [$DbName] (this is the second slow step)..."
$importArgs = @(
    "/Action:Import",
    "/SourceFile:$bacpac",
    "/TargetServerName:$target",
    "/TargetDatabaseName:$DbName",
    "/TargetTrustServerCertificate:True"
)
if ($targetCred) {
    $importArgs += "/TargetUser:$SqlUser"
    $importArgs += "/TargetPassword:$SqlPassword"
}
& $sqlpackage @importArgs
if ($LASTEXITCODE -ne 0) { Fail "BACPAC import failed (exit $LASTEXITCODE). See messages above." }
Ok "Imported '$DbName' into $target."

# ============================================================
# 9. Cleanup staging DB
# ============================================================
if (-not $KeepStaging) {
    Info "Cleaning up staging database..."
    try {
        Invoke-Sql -Server $stagingInstance -Query "ALTER DATABASE [$stagingDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$stagingDb];" | Out-Null
    } catch { Warn "Could not drop staging DB (you can ignore this): $_" }
}

Write-Host ""
Ok "ALL DONE."
Write-Host "Connect to your new database:" -ForegroundColor Gray
Write-Host "  Server:    $target"   -ForegroundColor Gray
Write-Host "  Database:  $DbName"   -ForegroundColor Gray
Write-Host "  Auth:      $(if ($targetCred) { 'SQL ('+$SqlUser+')' } else { 'Windows' })" -ForegroundColor Gray
