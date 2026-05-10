@echo off
REM Complaint Management System - Startup Script for Windows

echo ================================
echo Complaint Management System
echo ================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Starting Backend Server...
echo ================================
echo.

cd backend

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt >nul 2>&1

REM Update configuration
echo.
echo NOTE: Please update your Supabase credentials in app.py before running!
echo.
echo Starting Flask server on http://localhost:5000
echo.

REM Run the Flask app
python app.py

pause
