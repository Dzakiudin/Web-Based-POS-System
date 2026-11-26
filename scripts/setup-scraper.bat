@echo off
title Setup Scrapling Deep Barcode Engine - POS System Pro Max
cd /d "%~dp0.."

echo ============================================================
echo   Setup Scrapling Deep Barcode Lookup Engine (D4Vinci/Scrapling)
echo ============================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python 3.10+ belum terpasang di PC ini.
    echo Unduh dari https://www.python.org/downloads/ lalu centang "Add Python to PATH".
    pause
    exit /b 1
)

if not exist ".venv-scraper\Scripts\python.exe" (
    echo [1/3] Membuat virtual environment Python (.venv-scraper)...
    python -m venv .venv-scraper
)

echo [2/3] Menginstal D4Vinci/Scrapling beserta fetchers...
".venv-scraper\Scripts\python.exe" -m pip install --upgrade pip
".venv-scraper\Scripts\python.exe" -m pip install "scrapling[fetchers] @ git+https://github.com/D4Vinci/Scrapling.git"

echo [3/3] Memverifikasi instalasi Scrapling...
".venv-scraper\Scripts\python.exe" -c "from scrapling.fetchers import Fetcher; print('[OK] Scrapling siap digunakan!')"

echo.
pause
