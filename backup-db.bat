@echo off
setlocal enabledelayedexpansion
title Backup Database - POS System Pro Max

echo ========================================================
echo   Membuat Backup Database POS System Pro Max...
echo ========================================================

set BACKUP_DIR=%~dp0backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%%dt:~10,2%%dt:~12,2%
set BACKUP_FILE=%BACKUP_DIR%\pos_backup_%TIMESTAMP%.sql

echo Target file: %BACKUP_FILE%

REM Ambil DATABASE_URL atau gunakan kredensial default
set PGPASSWORD=291199
pg_dump -h 127.0.0.1 -p 5433 -U postgres -d pos_db -F p -f "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUKSES] Database berhasil dibackup ke:
    echo %BACKUP_FILE%
) else (
    echo.
    echo [ERROR] Backup gagal! Pastikan PostgreSQL sedang berjalan di port 5433 dan pg_dump terdaftar di PATH.
)

echo.
timeout /t 5
