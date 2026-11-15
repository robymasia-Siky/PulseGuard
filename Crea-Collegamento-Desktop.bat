@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "Crea-Collegamento-Desktop.ps1"
