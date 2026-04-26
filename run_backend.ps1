# Script khởi động Backend từ thư mục gốc
Write-Host "--- Starting Backend ---" -ForegroundColor Cyan
Set-Location "$PSScriptRoot\backend"
python main.py
Pause
