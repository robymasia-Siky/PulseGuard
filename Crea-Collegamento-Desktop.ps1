$wscript = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "PulseGuard PC Monitor.lnk"
$batPath = Join-Path $PSScriptRoot "Avvia-PulseGuard.bat"
$electronExe = Join-Path $PSScriptRoot "node_modules\electron\dist\electron.exe"

$shortcut = $wscript.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $batPath
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = "PulseGuard PC Monitor - Telemetria Hardware"
$shortcut.IconLocation = "$electronExe,0"
$shortcut.WindowStyle = 7 # Minimized launch of bat, launches Electron GUI
$shortcut.Save()

Write-Host "Collegamento creato con successo sul Desktop: $shortcutPath" -ForegroundColor Green
