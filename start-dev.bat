@echo off
title Smart Parking System - Development Environment

echo.
echo ======================================
echo    🚗 SMART PARKING SYSTEM 🚗
echo ======================================
echo.
echo Starting development environment...
echo.

echo [1/2] Building and starting C++ backend server...
cd backend

:: Kill any existing server processes
taskkill /F /IM parking_server.exe 2>nul

:: Build the server
echo Building backend server...
g++ -std=c++11 -Wall -Wextra server.cpp ParkingSlot.cpp PriorityQueue.cpp VehicleLookup.cpp -o parking_server.exe -lws2_32

if errorlevel 1 (
    echo ❌ Failed to build backend. Make sure you have MinGW-w64 installed.
    echo.
    echo Install MinGW-w64: https://www.mingw-w64.org/downloads/
    echo Or use MSYS2: https://www.msys2.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Backend built successfully!
echo Starting backend server...
start "Backend Server" cmd /k "echo 🚗 Smart Parking Backend Server && echo Running on http://localhost:8080 && echo Press Ctrl+C to stop && parking_server.exe"

cd ..

echo.
echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo [2/2] Starting React frontend...
cd frontend

if not exist node_modules (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies. Make sure you have Node.js installed.
        echo.
        echo Install Node.js: https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
)

echo ✅ Dependencies ready!
echo Starting frontend server...
start "Frontend Server" cmd /k "echo 🎨 Smart Parking Frontend && echo Running on http://localhost:3000 && echo Press Ctrl+C to stop && npm start"

cd ..

echo.
echo ======================================
echo   🎉 DEVELOPMENT ENVIRONMENT READY! 🎉
echo ======================================
echo.
echo 🔧 Backend API: http://localhost:8080
echo 🎨 Frontend UI: http://localhost:3000
echo.
echo The frontend will automatically open in your browser.
echo Both servers are running in separate command windows.
echo.
echo 📋 Available Operations:
echo   • Add Vehicle - Park vehicles in nearest available slot
echo   • Remove Vehicle - Remove vehicles from parking
echo   • Lookup Vehicle - Find where a vehicle is parked
echo   • Parking Status - View all parking slots
echo   • Billing - Calculate parking fees
echo.
echo 🛑 To stop the servers:
echo   Close the command windows or press Ctrl+C in each
echo.
echo Happy coding! 🚀
echo.
pause
