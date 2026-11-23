@echo off
setlocal enabledelayedexpansion
title TOKO AZNUN - POS System Server & Cloud Tunnel
color 0B

echo ======================================================================
echo           TOKO AZNUN - WEB-BASED POS SYSTEM (PRO MAX v2.1.0)
echo ======================================================================
echo.

:: 1. Cek Service PostgreSQL
echo [1/3] Memeriksa status database PostgreSQL...
net start | findstr /i "postgresql" >nul
if %errorlevel% neq 0 (
    echo [INFO] Menjalankan service PostgreSQL...
    net start postgresql-x64-16 >nul 2>&1
    net start postgresql-x64-15 >nul 2>&1
    net start postgresql >nul 2>&1
)
echo [OK] Database siap.
echo.

:: 2. Jalankan Server Kasir Lokal (pos-system.exe)
echo [2/3] Menjalankan POS System Server di port 5000...
tasklist /fi "imagename eq pos-system.exe" | findstr /i "pos-system.exe" >nul
if %errorlevel% equ 0 (
    echo [INFO] Server pos-system.exe sudah berjalan di background.
) else (
    start "POS-Server-Toko-Aznun" /min pos-system.exe
    timeout /t 2 >nul
)
echo [OK] Server lokal aktif di http://localhost:5000
echo.

:: 3. Ambil CLOUDFLARE_TUNNEL_TOKEN dari file .env jika ada
set "CF_TOKEN="
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "KEY=%%A"
        set "VAL=%%B"
        set "KEY=!KEY: =!"
        if /i "!KEY!"=="CLOUDFLARE_TUNNEL_TOKEN" (
            set "VAL=!VAL:"=!"
            set "VAL=!VAL:'=!"
            set "CF_TOKEN=!VAL!"
        )
    )
)

:: 4. Cek cloudflared
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    if not exist "cloudflared.exe" (
        echo [INFO] Mengunduh cloudflared.exe otomatis...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    )
    set "CF_CMD=cloudflared.exe"
) else (
    set "CF_CMD=cloudflared"
)

:: 5. Jalankan Tunnel
echo [3/3] Menghubungkan Domain toko-aznun.indevs.in ke Cloud...
echo ======================================================================
echo   Domain Publik : https://toko-aznun.indevs.in
echo   Akses Lokal   : http://localhost:5000
echo ======================================================================
echo.

:: Buka browser lokal
start "" http://localhost:5000

if not "!CF_TOKEN!"=="" (
    echo [STATUS] Menjalankan Named Tunnel permanen untuk toko-aznun.indevs.in...
    %CF_CMD% tunnel run --token !CF_TOKEN!
) else (
    echo [PERHATIAN] CLOUDFLARE_TUNNEL_TOKEN belum diisi di file .env.
    echo.
    set /p "INPUT_TOKEN=Masukkan Cloudflare Tunnel Token Anda (atau tekan ENTER untuk Quick Tunnel): "
    if not "!INPUT_TOKEN!"=="" (
        echo CLOUDFLARE_TUNNEL_TOKEN="!INPUT_TOKEN!" >> .env
        echo [INFO] Token tersimpan ke .env! Menjalankan tunnel permanen...
        %CF_CMD% tunnel run --token !INPUT_TOKEN!
    ) else (
        echo [INFO] Menjalankan Quick Tunnel sementara...
        %CF_CMD% tunnel --url http://localhost:5000
    )
)

pause
