@echo off
setlocal
pushd "%~dp0.."
if not exist ".venv" (
  echo Tworzenie wirtualnego srodowiska...
  python -m venv .venv || exit /b 1
)
call ".venv\Scripts\activate.bat"
pip install -r backend\requirements.txt || exit /b 1
echo.
echo Backend uzywa teraz "DB" w plikach JSON: backend\data\*.json
echo (bez SQLite/Postgres). Dane zostaja w repo.
echo.
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
echo.
echo Backend zakonczyl dzialanie.
pause
popd

