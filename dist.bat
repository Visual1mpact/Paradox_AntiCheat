@echo off
setlocal ENABLEDELAYEDEXPANSION

set PACK_NAME=paradox
set PACK_DIR=.

set ver=null
if "%1" NEQ "" set ver=%1
if "%ver%" NEQ "null" goto loopverend

:loopver
set /p "ver=Version? "
if "%ver%" == "null" goto loopver
:loopverend

set TEMPPATH="%temp%\%PACK_NAME%_temp"

cls

echo Cloning to %TEMPPATH% ^(temporary^)
if exist %TPATH% rd /s /q md %TEMPPATH%
md %TEMPPATH%
xcopy /e /c /i /q /y /EXCLUDE:.distignore %PACK_DIR% %TEMPPATH%

echo Zipping
cmd /c powershell Compress-Archive -Path \"%TEMPPATH%\" -DestinationPath \"Paradox-AntiCheat-v%ver%.zip\" -Force

echo Removing temporary folder...
rd /s /q %TEMPPATH%

echo Finished.
pause 1>nul
