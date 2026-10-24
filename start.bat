@echo off
chcp 65001 >nul
set ROOT=%~dp0
if not exist "%ROOT%backend\venv\Scripts\activate.bat" (echo Сначала запустите setup.bat & pause & exit /b 1)
if not exist "%ROOT%frontend\node_modules" (echo Сначала запустите setup.bat & pause & exit /b 1)

echo Запускаю бэкенд и фронтенд в двух окнах. Чтобы остановить - закройте эти окна.
start "SWIPET backend :8000" /D "%ROOT%backend" cmd /k "call venv\Scripts\activate.bat && uvicorn main:app --reload"
start "SWIPET frontend :5173" /D "%ROOT%frontend" cmd /k "npm run dev"
timeout /t 6 /nobreak >nul
start "" http://localhost:5173
