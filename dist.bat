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

set ZIPNAME="Paradox-AntiCheat-v%ver%.zip"
set PACKNAME="Paradox-AntiCheat-v%ver%.mcpack"

cls

if exist %SCRIPT_DIR% rd /s /q %SCRIPT_DIR%
md %SCRIPT_DIR%

rem ----------------------------------------------------------------------------------------------------

echo Compiling script
cmd /c tsc -p %TSCFG_DIR%
if %errorlevel% NEQ 0 (
    choice /n /c yn /m "An error occured while compiling. Continue anyway? [YN] "
    if !errorlevel! == 2 exit /b
)

rem ----------------------------------------------------------------------------------------------------

echo Cloning to %TEMPPATH% ^(temporary^)
if exist %TPATH% rd /s /q md %TEMPPATH%
md %TEMPPATH%
xcopy /e /c /i /q /y /EXCLUDE:.distignore %PACK_DIR% %TEMPPATH%

rem ----------------------------------------------------------------------------------------------------

echo Zipping

set 7-ZipILoc=null
set WinRARILoc=null

rem what in the world is this script
for /f "tokens=1-2 delims=/" %%a in ('powershell Get-ChildItem HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\* ^^^| %% { Get-ItemProperty $_.PsPath } ^^^| Where-Object PSChildName -Match \"^(7-Zip|WinRAR).*\" ^^^| %% { ^^^( ^^^( [regex]^'^^^^.*?^^^(?^^^= ^^^|$^^^)^' ^^^).Matches^^^($_.DisplayName^^^) ^^^| %% { $_.Value } ^^^) + ^'/^' + $_.InstallLocation }') do set %%aILoc=%%b
if "%errorlevel%" NEQ "0" (
    echo There's an error.
    pause 1>nul
    exit /b
)

set 7zILoc=!7-ZipILoc!

if !7zILoc! == null (
    if "%WinRARILoc%" == null (
        echo Zipping ^(Using powershell Compress-Archive^)
        if exist %ZIPNAME% del %ZIPNAME%
        cmd /c powershell Compress-Archive -Path \"%TEMPPATH%\*\" -DestinationPath \"Paradox-AntiCheat-v%ver%.zip\" -Force
    ) else (
        echo Zipping ^(Using WinRAR^)
        echo.%WinRARILoc%
        
        setlocal
        cd /d "%TEMPPATH%\*"
        "%WinRARILoc%\WinRAR.exe" a -afzip -r %ZIPNAME%
        endlocal
        move "%TEMPPATH%\%ZIPNAME%" .
    )
) else (
    echo Zipping ^(Using 7-Zip^)
    echo.!7zILoc!
    
    setlocal
    cd /d "%TEMPPATH%\*"
    "!7zILoc!\7z.exe" a -tzip %ZIPNAME% 
    endlocal
    move "%TEMPPATH%\%ZIPNAME%" .
)

rem ----------------------------------------------------------------------------------------------------

echo Renaming
if exist %PACKNAME% del %PACKNAME%
ren %ZIPNAME% %PACKNAME%

echo Removing temporary folder...
rd /s /q %TEMPPATH%

echo Finished.
pause 1>nul
