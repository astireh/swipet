@echo off
chcp 65001 >nul
setlocal
set ROOT=%~dp0
echo.
echo ===== SWIPET: установка (один раз, 5-15 минут) =====
echo.

where python >nul 2>nul || (echo [ОШИБКА] Python не найден. Установите Python 3.11+ с python.org и галочкой "Add to PATH". & pause & exit /b 1)
where npm >nul 2>nul || (echo [ОШИБКА] Node.js не найден. Установите LTS-версию с nodejs.org и перезапустите терминал. & pause & exit /b 1)

echo [1/6] Окружение Python (backend\venv)...
cd /d "%ROOT%backend"
if not exist venv\Scripts\python.exe (
  python -m venv venv
  if errorlevel 1 goto :error
)
call venv\Scripts\activate.bat

echo [2/6] Библиотеки бэкенда (torch, transformers, fastapi...)...
python -m pip install --upgrade pip >nul
pip install torch --index-url https://download.pytorch.org/whl/cpu || goto :error
pip install -r requirements.txt || goto :error

echo [3/6] Настройки .env...
if not exist .env (
  copy .env.example .env >nul
  echo     Создан backend\.env. Впишите туда GIGACHAT_KEY, иначе объяснения будут по шаблону.
) else (
  echo     backend\.env уже есть, не трогаю.
)

echo [4/6] Фото питомцев (Unsplash)...
python download_photos.py

echo [5/6] Тестовая база, фото и векторы ruBERT (первый раз скачается модель ~1.7 ГБ)...
if exist dev.db del dev.db
if exist uploads rmdir /s /q uploads
python seed.py || goto :error
python build_vectors.py

echo [6/6] Библиотеки фронтенда (npm install)...
cd /d "%ROOT%frontend"
call npm install || goto :error

echo.
echo ===== Готово! Запуск: start.bat =====
echo Тестовые аккаунты (пароль demo1234): koshatnik@example.com - покупатель, maria@example.com - продавец
pause
exit /b 0

:error
echo.
echo [ОШИБКА] Установка остановилась. Пришлите текст выше.
pause
exit /b 1
