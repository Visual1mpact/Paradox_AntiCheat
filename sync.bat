@echo off
setlocal ENABLEDELAYEDEXPANSION

set PACK_NAME=paradox
set PACK_DIR=.

set PREVIEW_DIR=C:\Users\%USERNAME%\AppData\Local\Packages\Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe\LocalState\games\com.mojang
set RELEASE_DIR=C:\Users\%USERNAME%\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang
set COPY_DEST=development_behavior_packs

set target=default
if "%1" NEQ "" (
    if "%1" == "release" ( set target=release )
    if "%1" == "r" ( set target=release )
    if "%1" == "preview" ( set target=preview )
    if "%1" == "p" ( set target=preview )
)
if "%target%" == "default" set target=release

set TPATH="%RELEASE_DIR%\%COPY_DEST%\%PACK_NAME%"
if "%target%" == "preview" set TPATH="%PREVIEW_DIR%\%COPY_DEST%\%PACK_NAME%"

:loop
cls

if exist %TPATH% (
    echo Destination folder already exists, recreating...
    rd /s /q %TPATH%
    md %TPATH%
) else (
    echo Destination folder not found, creating a new one...
    md %TPATH%
)

echo Copying to %TPATH%
xcopy /e /c /i /q /y /EXCLUDE:.distignore %PACK_DIR% %TPATH%

echo Sync ^(%target%^) completed
choice /n /c yn /m "Redo? [YN] "
if %errorlevel% == 1 goto loop
if %errorlevel% == 2 goto loopend

:loopend
exit /b
