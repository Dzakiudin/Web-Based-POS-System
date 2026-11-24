@echo off
cd /d "%~dp0"
setlocal enabledelayedexpansion
title TOKO AZNUN - POS System Server ^& Cloud Tunnel
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

:: 3. Jalankan Cloud Tunnel Permanen (Ngrok Static Domain)
echo [3/3] Menghubungkan Server Toko ke Internet Publik...
echo ======================================================================
echo   Akses HP Kasir / Internet : https://earthquaking-jen-faunlike.ngrok-free.dev
echo   Akses PC Toko (Lokal)     : http://localhost:5000
echo ======================================================================
echo.

:: Buka browser lokal otomatis
start "" http://localhost:5000

where ngrok >nul 2>nul
if %errorlevel% equ 0 (
    echo [STATUS] Tunnel Cloud aktif permanen. Jangan tutup jendela ini saat toko buka.
    echo.
    ngrok http --url=https://earthquaking-jen-faunlike.ngrok-free.dev 127.0.0.1:5000
) else (
    echo [INFO] Menjalankan via Cloudflare Tunnel...
    if exist "cloudflared.exe" (
        cloudflared.exe tunnel --url http://localhost:5000
    ) else (
        where cloudflared >nul 2>nul
        if %errorlevel% equ 0 (
            cloudflared tunnel --url http://localhost:5000
        ) else (
            echo [PERINGATAN] ngrok maupun cloudflared tidak ditemukan.
            pause
        )
    )
)

pause
