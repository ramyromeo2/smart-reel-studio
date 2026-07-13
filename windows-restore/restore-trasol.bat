@echo off
REM ================================================================
REM Fully automatic: restore Trasol.bak (SQL 2017) onto your local
REM SQL Server 2014 instance. Just double-click this file.
REM
REM First run will:
REM   - install the SqlServer PowerShell module (no admin)
REM   - install SQL Server LocalDB ~57MB MSI (one UAC prompt)
REM   - download SqlPackage ~150MB into %LOCALAPPDATA%\TrasolMigrate
REM Later runs reuse all of the above and just do the restore.
REM ================================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore-trasol.ps1"
echo.
pause
