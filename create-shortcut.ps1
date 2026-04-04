$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = $ws.CreateShortcut("$desktop\OEES Sync.lnk")
$shortcut.TargetPath = "D:\0000000000000A-OEES_SYSTEM\OEES\START-SYNC.bat"
$shortcut.IconLocation = "shell32.dll,77"
$shortcut.Description = "OEES Git Auto-Sync"
$shortcut.Save()
Write-Host "Shortcut created on desktop"
