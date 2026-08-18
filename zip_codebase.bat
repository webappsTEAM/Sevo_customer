@echo off
setlocal
echo ======================================================
echo Packaging Codebase into ZIP Archive
echo ======================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3 or add it to your system PATH.
    pause
    exit /b 1
)

python "%~dp0zip_codebase.py" %*

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Codebase zipped successfully!
) else (
    echo.
    echo [ERROR] Zipping failed with error code %ERRORLEVEL%.
)

endlocal
