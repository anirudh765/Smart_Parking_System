# 🚗 Smart Parking System - Setup Guide

Welcome to the Smart Parking System! This guide will help you set up and run the complete application with both backend and frontend.

## 📋 Prerequisites

Before you start, make sure you have the following installed:

### For Backend (C++)
- **MinGW-w64** or **MSYS2** with GCC compiler
- **Git** (optional, for version control)

### For Frontend (React)
- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

## 🔧 Installation Instructions

### Option 1: Install MinGW-w64 (Recommended)
1. Visit: https://www.mingw-w64.org/downloads/
2. Download and install the latest version
3. Add MinGW-w64 bin directory to your PATH environment variable

### Option 2: Install MSYS2 (Alternative)
1. Visit: https://www.msys2.org/
2. Download and install MSYS2
3. Open MSYS2 terminal and run:
   ```bash
   pacman -S mingw-w64-x86_64-gcc
   ```

### Node.js Installation
1. Visit: https://nodejs.org/
2. Download the LTS version
3. Install with default settings
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

## 🚀 Quick Start

### Method 1: Automated Setup (Easiest)
1. Double-click `start-dev.bat`
2. Wait for both servers to start
3. Your browser will automatically open to http://localhost:3000

### Method 2: Manual Setup

#### Start Backend
```bash
cd backend
g++ -std=c++11 server.cpp ParkingSlot.cpp PriorityQueue.cpp VehicleLookup.cpp -o parking_server.exe -lws2_32
parking_server.exe
```

#### Start Frontend (in new terminal)
```bash
cd frontend
npm install
npm start
```

## 🌐 Application URLs

- **Frontend (React)**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **API Documentation**: See backend/README.md

## 📱 How to Use

### 1. Add Vehicle 🚙
- Select vehicle type (Car, Bike, Truck, Electric)
- Enter vehicle ID (e.g., "ABC123")
- Click "Park Vehicle"
- System assigns nearest available slot

### 2. Remove Vehicle 🅿️
- Select vehicle type
- Enter vehicle ID to remove
- Click "Remove Vehicle"
- Slot becomes available for others

### 3. Lookup Vehicle 🔍
- Enter vehicle ID
- Click "Search Vehicle"
- View current parking location

### 4. Check Status 📊
- View all parking slots
- See availability in real-time
- Color-coded display (Green: Available, Red: Occupied)

### 5. Calculate Bill 💵
- Select vehicle type
- Enter vehicle ID
- View current parking charges
- Rates shown for each vehicle type

## 🎯 System Features

### Backend Features
- **REST API**: Clean HTTP endpoints
- **Priority Queue**: Nearest slot allocation
- **Hash Map**: O(1) vehicle lookup
- **Real-time Billing**: Time-based fare calculation
- **Multi-vehicle Support**: Cars, Bikes, Trucks, Electric

### Frontend Features
- **Responsive Design**: Works on all devices
- **Modern UI**: Gradient backgrounds, smooth animations
- **Toast Notifications**: Success/error feedback
- **Form Validation**: Input validation and error handling
- **Real-time Updates**: Live parking status

### Parking Configuration
| Vehicle Type | Slots | Rate/sec | Range |
|-------------|-------|----------|-------|
| Car 🚗 | 3 | ₹1.0 | 1-3 |
| Bike 🏍️ | 3 | ₹0.5 | 11-13 |
| Truck 🚛 | 3 | ₹2.0 | 21-23 |
| Electric ⚡ | 3 | ₹1.5 | 31-33 |

## 🧪 Testing the API

### Using PowerShell
```powershell
# Add a vehicle
Invoke-WebRequest -Uri "http://localhost:8080/api/vehicles" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"type":"CAR","vehicleId":"TEST123"}'

# Lookup a vehicle
Invoke-WebRequest -Uri "http://localhost:8080/api/vehicles/TEST123" -Method GET

# Remove a vehicle
Invoke-WebRequest -Uri "http://localhost:8080/api/vehicles" -Method DELETE -Headers @{"Content-Type"="application/json"} -Body '{"type":"CAR","vehicleId":"TEST123"}'
```

### Using curl (if available)
```bash
# Add a vehicle
curl -X POST http://localhost:8080/api/vehicles -H "Content-Type: application/json" -d '{"type":"CAR","vehicleId":"TEST123"}'

# Lookup a vehicle
curl http://localhost:8080/api/vehicles/TEST123

# Calculate bill
curl -X POST http://localhost:8080/api/bill -H "Content-Type: application/json" -d '{"type":"CAR","vehicleId":"TEST123"}'
```

## 🐛 Troubleshooting

### Backend Issues

**"g++ is not recognized"**
- Install MinGW-w64 or MSYS2
- Add compiler to PATH environment variable
- Restart command prompt

**"Bind failed" or "Port already in use"**
- Stop existing server: `taskkill /F /IM parking_server.exe`
- Try again

**Compilation errors**
- Make sure all .cpp and .h files are in backend folder
- Check for missing dependencies

### Frontend Issues

**"npm is not recognized"**
- Install Node.js from https://nodejs.org/
- Restart command prompt

**"ENOENT: no such file or directory"**
- Make sure you're in the frontend directory
- Run `npm install` first

**Port 3000 already in use**
- Choose a different port when prompted
- Or stop other React apps

### General Issues

**CORS errors in browser**
- Make sure backend server is running
- Check that backend has CORS headers enabled
- Refresh the page

**Connection refused**
- Verify both servers are running
- Check firewall settings
- Try restarting both servers

## 📂 Project Structure

```
smart-parking-system/
├── backend/                 # C++ REST API Server
│   ├── server.cpp          # Main HTTP server
│   ├── ParkingSlot.cpp/h   # Parking slot management
│   ├── PriorityQueue.cpp/h # Priority queue implementation
│   ├── VehicleLookup.cpp/h # Vehicle tracking
│   ├── build.bat           # Build script
│   └── README.md           # Backend documentation
├── frontend/               # React Web Application
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # React components
│   │   └── services/      # API services
│   ├── package.json       # Dependencies
│   └── README.md          # Frontend documentation
├── start-dev.bat          # Development startup script
└── README.md              # Main documentation
```

## 🔧 Development Tips

### Backend Development
- Modify server.cpp for new API endpoints
- Add new vehicle types in ParkingSlot.h
- Adjust parking rates in ParkingSlot class
- Use debug prints for troubleshooting

### Frontend Development
- Components are in `src/components/`
- API calls are in `src/services/api.js`
- Styling is in `App.css`
- Add new features by creating new components

### Building for Production

#### Backend
```bash
cd backend
g++ -std=c++11 -O2 -DNDEBUG server.cpp ParkingSlot.cpp PriorityQueue.cpp VehicleLookup.cpp -o parking_server.exe -lws2_32
```

#### Frontend
```bash
cd frontend
npm run build
# Deploy the 'build' folder to your web server
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you encounter any issues:

1. Check this setup guide
2. Review the troubleshooting section
3. Check individual README files in backend/frontend folders
4. Ensure all prerequisites are installed
5. Try restarting both servers

## 🎉 Success!

Once everything is running, you should see:
- Backend server console showing "Server running on http://localhost:8080"
- Frontend automatically opens in your browser
- Beautiful parking management interface
- All features working correctly

Happy parking! 🚗✨
