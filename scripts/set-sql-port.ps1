<#
.SYNOPSIS
    Configure a local SQL Server instance to listen on a fixed TCP port
    (default 4001). Enables the TCP/IP protocol, sets the static port,
    clears dynamic ports, restarts the service, and opens the Windows
    Firewall for inbound connections on that port.

    Needs admin - the script auto-elevates via UAC if you double-click it.

.PARAMETER Port
    TCP port to listen on. Default: 4001.

.PARAMETER InstanceName
    Local SQL Server instance to configure. Default: auto-detect; if more
    than one is installed, you'll be asked which one.

.EXAMPLE
    .\set-sql-port.ps1
    .\set-sql-port.ps1 -Port 4001 -InstanceName SQLEXPRESS
#>

[CmdletBinding()]
param(
    [int]   $Port         = 4001,
    [string]$InstanceName = ""
)

$ErrorActionPreference = "Stop"

function Info($m) { Write-Host $m -ForegroundColor Cyan }
function Ok($m)   { Write-Host $m -ForegroundColor Green }
function Warn($m) { Write-Host $m -ForegroundColor Yellow }
function Fail($m) { Write-Host $m -ForegroundColor Red; Read-Host "Press Enter to close"; exit 1 }

# Auto-elevate
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Info "Re-launching elevated (UAC prompt incoming)..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "powershell.exe"
    $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Port $Port -InstanceName `"$InstanceName`""
    $psi.Verb = "runas"
    try { [System.Diagnostics.Process]::Start($psi) | Out-Null } catch { Fail "User cancelled the UAC prompt." }
    exit 0
}

# Find SQL Server instances via services
$svcs = Get-Service | Where-Object { $_.Name -like 'MSSQL$*' -or $_.Name -eq 'MSSQLSERVER' }
if (-not $svcs) { Fail "No SQL Server services found on this machine." }

$choices = @()
foreach ($s in $svcs) {
    $instName = if ($s.Name -eq 'MSSQLSERVER') { 'MSSQLSERVER' } else { $s.Name -replace '^MSSQL\$','' }
    $choices += [PSCustomObject]@{ Service = $s.Name; Instance = $instName }
}

if ($InstanceName) {
    $picked = $choices | Where-Object { $_.Instance -ieq $InstanceName } | Select-Object -First 1
    if (-not $picked) { Fail "Instance '$InstanceName' not found. Available: $((($choices | ForEach-Object Instance) -join ', '))" }
} else {
    if ($choices.Count -eq 1) {
        $picked = $choices[0]
    } else {
        Write-Host "Multiple instances found:" -ForegroundColor Yellow
        for ($i = 0; $i -lt $choices.Count; $i++) { Write-Host "  [$i] $($choices[$i].Instance)" }
        $idx = Read-Host "Which one to configure? [0]"
        if (-not $idx) { $idx = 0 }
        $picked = $choices[[int]$idx]
    }
}
$service  = $picked.Service
$instance = $picked.Instance
Info "Configuring instance: $instance (service: $service)"

# Find the registry key for the instance.
# SQL Server stores instance name -> registry suffix in HKLM\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL
$instMapKey = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL"
if (-not (Test-Path $instMapKey)) {
    # 32-bit on 64-bit Windows
    $instMapKey = "HKLM:\SOFTWARE\Wow6432Node\Microsoft\Microsoft SQL Server\Instance Names\SQL"
}
$regSuffix = (Get-ItemProperty -Path $instMapKey -ErrorAction SilentlyContinue).$instance
if (-not $regSuffix) { Fail "Could not find registry key for instance '$instance' under $instMapKey" }

$tcpKey      = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$regSuffix\MSSQLServer\SuperSocketNetLib\Tcp"
$tcpIpAllKey = Join-Path $tcpKey "IPAll"
if (-not (Test-Path $tcpKey)) { Fail "TCP/IP registry key not found: $tcpKey" }

# 1. Enable TCP/IP
Info "Enabling TCP/IP..."
Set-ItemProperty -Path $tcpKey -Name "Enabled" -Value 1 -Type DWord

# 2. Set static port on IPAll
Info "Setting static port $Port (clearing dynamic ports)..."
Set-ItemProperty -Path $tcpIpAllKey -Name "TcpDynamicPorts" -Value ""       -Type String
Set-ItemProperty -Path $tcpIpAllKey -Name "TcpPort"         -Value "$Port"  -Type String

# Also clear dynamic port on any per-IP entries and set the static port
$ipSubKeys = Get-ChildItem -Path $tcpKey | Where-Object { $_.PSChildName -match '^IP\d+$' }
foreach ($ipKey in $ipSubKeys) {
    try {
        Set-ItemProperty -Path $ipKey.PSPath -Name "TcpDynamicPorts" -Value ""       -Type String -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $ipKey.PSPath -Name "TcpPort"         -Value "$Port"  -Type String -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $ipKey.PSPath -Name "Enabled"         -Value 1        -Type DWord  -ErrorAction SilentlyContinue
    } catch {}
}

# 3. Restart the SQL Server service
Info "Restarting SQL Server service '$service' ..."
Restart-Service -Name $service -Force
Start-Sleep -Seconds 3
$svc = Get-Service -Name $service
if ($svc.Status -ne 'Running') {
    Fail "Service '$service' didn't come back up after restart. Check the SQL Server error log."
}
Ok "Service running."

# 4. Open Windows Firewall
$ruleName = "SQL Server ($instance) TCP $Port"
Info "Opening Windows Firewall: '$ruleName' (TCP inbound $Port) ..."
try {
    Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
    Ok "Firewall rule created."
} catch {
    Warn "Could not create firewall rule automatically: $($_.Exception.Message)"
    Warn "Open it manually with:  netsh advfirewall firewall add rule name=`"$ruleName`" dir=in action=allow protocol=TCP localport=$Port"
}

# 5. Sanity check - SQL Server should be listening on the new port
Start-Sleep -Seconds 2
$listening = (netstat -an | Select-String ":$Port\s+.*LISTENING")
if ($listening) {
    Ok "SQL Server is listening on TCP $Port."
} else {
    Warn "Couldn't confirm listening on $Port via netstat (might just need another second). Try:  netstat -an | findstr :$Port"
}

Write-Host ""
Ok "DONE."
Write-Host "Connect to this SQL Server from any tool / app:" -ForegroundColor Gray
Write-Host "  Server (TCP):  localhost,$Port" -ForegroundColor Gray
Write-Host "  Server (LAN):  <this-pc-name-or-ip>,$Port" -ForegroundColor Gray
Write-Host "  Instance only: .\$instance  (works locally too, via shared memory)" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to close"
