@echo off
echo ====================================================
echo  Subiendo cambios al repositorio de AutoSporting...
echo ====================================================
"C:\Program Files\Git\cmd\git.exe" push origin main > "%~dp0push_result.log" 2>&1
type "%~dp0push_result.log"
echo.
echo Presiona cualquier tecla para cerrar esta ventana.
pause > nul
