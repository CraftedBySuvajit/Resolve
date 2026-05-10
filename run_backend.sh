#!/bin/bash

# Complaint Management System - Startup Script for Mac/Linux

echo "================================"
echo "Complaint Management System"
echo "================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed"
    exit 1
fi

echo "Starting Backend Server..."
echo "================================"
echo ""

cd backend

# Check if virtual environment exists
if [ ! -d venv ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt > /dev/null 2>&1

# Update configuration
echo ""
echo "NOTE: Please update your Supabase credentials in app.py before running!"
echo ""
echo "Starting Flask server on http://localhost:5000"
echo ""

# Run the Flask app
python3 app.py
