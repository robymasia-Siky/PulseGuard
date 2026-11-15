@echo off
title PulseGuard PC Monitor
cd /d "%~dp0"

:: Avvia PulseGuard direttamente in modo pulito e immediato
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
exit /b
