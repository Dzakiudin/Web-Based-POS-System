@echo off
title POS System Pro Max - Cloud Mode
echo ========================================================
echo   ⚡ POS System Pro Max - Local to Cloud Publisher
echo ========================================================
echo.
echo [1/2] Menjalankan server kasir lokal di port 5000...
start "POS System Server" pos-system.exe

timeout /t 2 >nul

echo [2/2] Membuka Cloudflare Tunnel ke Internet publik...
echo.
echo ========================================================
echo   PANDUAN PENGGUNAAN MULTI-DEVICE (HP & PC):
echo   1. Tunggu sampai muncul URL "https://xxxx.trycloudflare.com" di bawah.
echo   2. Di HP Android: Buka aplikasi POS System.
echo   3. Pada halaman Login, tap tombol "Atur Server / Cloud".
echo   4. Masukkan URL tersebut (atau scan QR code) lalu tap "Simpan".
echo   5. HP dan PC sekarang otomatis tersambung realtime!
echo ========================================================
echo.

where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    if not exist cloudflared.exe (
        echo [INFO] Mendownload cloudflared.exe portabel otomatis...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    )
    cloudflared.exe tunnel --url http://localhost:5000
) else (
    cloudflared tunnel --url http://localhost:5000
)

pause
