@echo off
title PulseGuard PC Monitor (Amministratore)
cd /d "%~dp0"

:: Avvio rapido con privilegi completi
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
exit /b
