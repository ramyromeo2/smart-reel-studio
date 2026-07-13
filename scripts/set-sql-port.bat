@echo off
REM Configure your SQL Server instance to listen on TCP port 4001.
REM Enables TCP/IP, sets static port 4001, restarts the service, opens firewall.
REM Auto-elevates to admin (you'll see one UAC prompt).

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0set-sql-port.ps1" -Port 4001
echo.
pause
