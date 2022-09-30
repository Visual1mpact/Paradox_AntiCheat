@echo off
setlocal ENABLEDELAYEDEXPANSION

set PACK_NAME=paradox
set PACK_DIR=.

set SCRIPT_DIR=scripts
set TSCFG_DIR=tsconfig.json

set ver=null
if "%1" NEQ "" set ver=%1
if "%ver%" NEQ "null" goto loopverend

:loopver
set /p "ver=Version? "
if "%ver%" == "null" goto loopver
:loopverend

set TEMPPATH="%temp%\%PACK_NAME%_temp"

cls

if exist %SCRIPT_DIR% rd /s /q %SCRIPT_DIR%
md %SCRIPT_DIR%

echo Compiling script
cmd /c tsc -p %TSCFG_DIR%
if %errorlevel% NEQ 0 (
    choice /n /c yn /m "An error occured while compiling. Continue anyway? [YN] "
    if !errorlevel! == 2 exit /b
)

echo Cloning to %TEMPPATH% ^(temporary^)
if exist %TPATH% rd /s /q md %TEMPPATH%
md %TEMPPATH%
xcopy /e /c /i /q /y /EXCLUDE:.distignore %PACK_DIR% %TEMPPATH%

echo Zipping
if exist "Paradox-AntiCheat-v%ver%.zip" del "Paradox-AntiCheat-v%ver%.zip"
cmd /c powershell Compress-Archive -Path \"%TEMPPATH%\*\" -DestinationPath \"Paradox-AntiCheat-v%ver%.zip\" -Force

echo Renaming
if exist "Paradox-AntiCheat-v%ver%.mcpack" del "Paradox-AntiCheat-v%ver%.mcpack"
ren "Paradox-AntiCheat-v%ver%.zip" "Paradox-AntiCheat-v%ver%.mcpack"

echo Removing temporary folder...
rd /s /q %TEMPPATH%

echo Finished.
pause 1>nul
