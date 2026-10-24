@echo off
chcp 65001 >nul
set ROOT=%~dp0
echo Пересоздаю тестовую базу (все регистрации, лайки и чаты удалятся)...
cd /d "%ROOT%backend"
call venv\Scripts\activate.bat
if exist dev.db del dev.db
if exist uploads rmdir /s /q uploads
python seed.py
python build_vectors.py
echo Готово.
pause
