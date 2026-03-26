# 🚗 Smart Parking System

A full-stack smart parking management system with C++ backend and React frontend, featuring real-time slot allocation, vehicle tracking, and automated billing.

## 🏗️ Architecture

This project follows a client-server architecture:

- **Backend**: C++ REST API server (Port 8080)
- **Frontend**: React web application (Port 3000)
- **Communication**: RESTful APIs with JSON data exchange

```
┌─────────────────┐     HTTP/JSON     ┌─────────────────┐
│                 │ ◄────────────────► │                 │
│  React Frontend │                   │  C++ Backend    │
│  (Port 3000)    │                   │  (Port 8080)    │
│                 │                   │                 │
└─────────────────┘                   └─────────────────┘
```

## 🚀 Features

### Core Functionality
- **🚙 Vehicle Management**: Add and remove vehicles with automatic slot allocation
- **🔍 Vehicle Lookup**: Find any parked vehicle instantly
- **📊 Real-time Status**: Live parking slot availability dashboard
- **💵 Smart Billing**: Automatic fare calculation based on vehicle type and duration
- **⚡ Priority Queuing**: Nearest slot allocation using priority queue algorithms

### Vehicle Types Supported
| Type | Icon | Rate/sec | Slots |
|------|------|----------|-------|
| Car | 🚗 | ₹1.0 | 1-3 |
| Bike | 🏍️ | ₹0.5 | 11-13 |
| Truck | 🚛 | ₹2.0 | 21-23 |
| Electric | ⚡ | ₹1.5 | 31-33 |

## 📁 Project Structure

```
smart-parking-system/
├── backend/                    # C++ REST API Server
│   ├── server.cpp             # Main HTTP server with API endpoints
│   ├── ParkingSlot.cpp/.h     # Parking slot management
│   ├── PriorityQueue.cpp/.h   # Priority queue for slot allocation
│   ├── VehicleLookup.cpp/.h   # Vehicle location tracking
│   ├── Makefile               # Build configuration
│   └── README.md              # Backend documentation
├── frontend/                   # React Web Application
│   ├── public/                # Static files
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API service layer
│   │   ├── App.js             # Main application
│   │   └── App.css            # Styling
│   ├── package.json           # Dependencies
│   └── README.md              # Frontend documentation
└── README.md                  # This file
```

## 🛠️ Quick Start

### Prerequisites
- **Backend**: MinGW-w64 or Visual Studio with C++11 support
- **Frontend**: Node.js (v16+) and npm

### 1. Start the Backend Server

```bash
# Navigate to backend directory
cd backend

# Build the server
make

# Run the server
make run
# or manually: ./parking_server.exe
```

The backend server will start on `http://localhost:8080`

### 2. Start the Frontend Application

```bash
# Navigate to frontend directory  
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will start on `http://localhost:3000`

### 3. Access the Application

Open your browser and navigate to `http://localhost:3000`

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vehicles` | Add vehicle to parking |
| DELETE | `/api/vehicles` | Remove vehicle from parking |
| GET | `/api/vehicles/{id}` | Lookup vehicle location |
| GET | `/api/status` | Get parking status |
| POST | `/api/bill` | Calculate parking bill |

## 💡 Key Algorithms & Data Structures

### Backend Implementation
- **Priority Queue**: Min-heap for nearest slot allocation
- **Hash Map**: O(1) vehicle location lookup
- **Doubly Linked List**: Efficient slot management
- **Time-based Billing**: Real-time fare calculation

### Frontend Features
- **Component-based Architecture**: Modular React components
- **State Management**: React hooks for local state
- **API Integration**: Axios for HTTP requests
- **Responsive Design**: Mobile-first CSS approach

## 🎨 Screenshots

### Main Dashboard
- Clean, modern interface with gradient backgrounds
- Tab-based navigation for different operations
- Real-time toast notifications for user feedback

### Parking Status View  
- Color-coded slot availability (Green: Available, Red: Occupied)
- Statistics overview for each vehicle type
- Live refresh functionality

### Billing Interface
- Real-time fare calculation
- Rate structure display
- Detailed billing breakdown

## 🧪 Testing

### Backend Testing
```bash
cd backend
# Build and run tests
make test
```

### Frontend Testing
```bash
cd frontend
# Run React tests
npm test
```

### Manual API Testing
Use tools like Postman or curl to test API endpoints:

```bash
# Add a vehicle
curl -X POST http://localhost:8080/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{"type":"CAR","vehicleId":"ABC123"}'

# Lookup a vehicle
curl http://localhost:8080/api/vehicles/ABC123
```

## 🔧 Configuration

### Backend Configuration
- **Port**: 8080 (configurable in server.cpp)
- **CORS**: Enabled for all origins
- **Slot Configuration**: 3 slots per vehicle type

### Frontend Configuration
- **API URL**: `http://localhost:8080/api` (configurable in services/api.js)
- **Port**: 3000 (React default)

## 🚀 Deployment

### Backend Deployment
1. Compile for target platform
2. Configure firewall for port 8080
3. Set up as system service
4. Configure reverse proxy (optional)

### Frontend Deployment
1. Build production version: `npm run build`
2. Deploy to web server (nginx, Apache)
3. Configure API endpoint URLs
4. Set up SSL certificates

### Docker Deployment (Future Enhancement)
```dockerfile
# Example Dockerfile structure
FROM node:16 AS frontend-build
# ... frontend build steps

FROM gcc:latest AS backend-build  
# ... backend build steps

FROM nginx:alpine
# ... combine and serve
```

## 🔐 Security Considerations

- **Input Validation**: Server validates all input parameters
- **CORS Configuration**: Configured for development (adjust for production)
- **Rate Limiting**: Consider implementing for production
- **Authentication**: Add user authentication for production use

## 📈 Performance

### Backend Performance
- **Slot Allocation**: O(log n) using priority queue
- **Vehicle Lookup**: O(1) using hash map
- **Memory Usage**: Optimized with efficient data structures

### Frontend Performance
- **Bundle Size**: Optimized with tree shaking
- **API Calls**: Efficient error handling and loading states
- **Responsive Design**: Mobile-optimized performance

## 🛣️ Future Enhancements

### Planned Features
- [ ] **User Authentication**: Login system for operators
- [ ] **Payment Integration**: Online payment gateway
- [ ] **Mobile App**: React Native mobile application
- [ ] **Analytics Dashboard**: Usage statistics and reports
- [ ] **Reservation System**: Pre-booking parking slots
- [ ] **QR Code Integration**: QR-based vehicle entry/exit
- [ ] **Camera Integration**: License plate recognition
- [ ] **Multi-location Support**: Multiple parking facilities

### Technical Improvements
- [ ] **Database Integration**: PostgreSQL/MySQL support
- [ ] **Caching Layer**: Redis for improved performance
- [ ] **Microservices**: Split into smaller services
- [ ] **Real-time Updates**: WebSocket integration
- [ ] **Docker Support**: Containerized deployment
- [ ] **Load Balancing**: Multiple server instances
- [ ] **Monitoring**: Application performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Add tests for new functionality
5. Commit changes: `git commit -m 'Add new feature'`
6. Push to branch: `git push origin feature/new-feature`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Srujan** - Initial work and development

## 🙏 Acknowledgments

- C++ STL for efficient data structures
- React community for excellent documentation
- Modern web standards for responsive design
- Open source community for inspiration

---

**Built with ❤️ using C++ and React**
