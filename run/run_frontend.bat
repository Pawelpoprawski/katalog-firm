@echo off
setlocal
pushd "%~dp0.."
cd frontend
if not exist "node_modules" (
  echo Instalacja zaleznosci frontendu...
  npm install || exit /b 1
)
echo.
echo Frontend uruchamia sie na http://localhost:3000
echo Backend powinien dzialac na http://localhost:8000
echo.
npm run dev
popd

