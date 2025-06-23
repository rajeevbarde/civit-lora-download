@echo off

REM Start backend server in a new window
start "Backend Server" cmd /k "cd /d %~dp0backend && npm install && npm start"

REM Start frontend server in a new window
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

exit 