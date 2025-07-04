@echo off
setlocal enabledelayedexpansion

REM Pull latest code from master
set UPDATED=0
git pull origin master > pull_result.txt
findstr /C:"Already up to date." pull_result.txt >nul
if %errorlevel%==0 (
    echo No updates found. The app is already up to date.
    del pull_result.txt
    goto :end
) else (
    set UPDATED=1
    echo Updates found. Checking dependencies...
)
del pull_result.txt

REM Check backend dependencies
cd backend
set BACKEND_UPDATE=0
git diff --name-only HEAD@{1} HEAD | findstr /I "package.json package-lock.json" >nul
if %errorlevel%==0 (
    echo Backend dependencies changed. Running npm install in backend...
    npm install
    set BACKEND_UPDATE=1
) else (
    echo No backend dependency changes.
)
cd ..

REM Check frontend dependencies
cd frontend
set FRONTEND_UPDATE=0
git diff --name-only HEAD@{1} HEAD | findstr /I "package.json package-lock.json" >nul
if %errorlevel%==0 (
    echo Frontend dependencies changed. Running npm install in frontend...
    npm install
    set FRONTEND_UPDATE=1
) else (
    echo No frontend dependency changes.
)
cd ..

if %UPDATED%==1 (
    echo Update completed successfully.
    if %BACKEND_UPDATE%==1 echo Backend dependencies updated.
    if %FRONTEND_UPDATE%==1 echo Frontend dependencies updated.
) else (
    echo No updates were applied.
)

:end
pause 