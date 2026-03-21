@echo off
REM RAG Comparison Test Runner - Windows
REM Test script để so sánh GraphRAG vs Traditional RAG

setlocal enabledelayedexpansion

CD /D "%~dp0"
echo.
echo ===============================================================================
echo      RAG COMPARISON TEST RUNNER
echo      Platform: Windows
echo ===============================================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

echo [OK] Python found
python --version

REM Navigate to api directory
cd api
if not exist test_rag_comparison.py (
    echo [ERROR] Test script not found. Please run from project root.
    pause
    exit /b 1
)

:menu
echo.
echo ===============================================================================
echo CHOOSE TEST MODE:
echo ===============================================================================
echo 1. Quick Test (5 samples) - Rapid validation
echo 2. Standard Test (10 samples) - Recommended
echo 3. Full Test (all samples) - Comprehensive evaluation
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Running QUICK TEST...
    echo.
    python test_rag_quick.py
    goto finish
)

if "%choice%"=="2" (
    echo.
    echo Running STANDARD TEST (10 samples)...
    echo (This will modify test_rag_comparison.py temporarily)
    echo.
    
    REM Create temporary script with num_samples=10
    for /f "tokens=*" %%a in (test_rag_comparison.py) do (
        set "line=%%a"
        setlocal enabledelayedexpansion
        if "!line:num_samples: None!" neq "!line!" (
            echo !line:num_samples: None=num_samples: 10!
        ) else (
            echo !line!
        )
        endlocal
    ) > test_rag_comparison_temp.py
    
    python test_rag_comparison_temp.py
    del test_rag_comparison_temp.py
    goto finish
)

if "%choice%"=="3" (
    echo.
    echo Running FULL TEST (all samples)...
    echo This may take several minutes...
    echo.
    python test_rag_comparison.py
    goto finish
)

if "%choice%"=="4" (
    goto exit_script
)

echo Invalid choice. Please try again.
goto menu

:finish
echo.
echo ===============================================================================
echo TEST COMPLETED
echo Results saved to: rag_test_results\
echo ===============================================================================
echo.
pause
goto menu

:exit_script
echo.
echo Exiting...
exit /b 0
