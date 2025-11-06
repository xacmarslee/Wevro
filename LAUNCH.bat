@echo off
cd /d "%~dp0"
title Wevro Development Server
color 0B
cls
echo.
echo ================================================
echo           Wevro Development Server
echo ================================================
echo.
echo Starting server...
echo.
echo Server will run on: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.
echo ================================================
echo.

npx tsx server/index.ts

echo.
echo.
echo ================================================
echo Server stopped
echo ================================================
echo.
pause

