require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');

// Models
const User = require('../models/User');
const ParkingSlot = require('../models/ParkingSlot');
const PricingRule = require('../models/PricingRule');

// Seed data
const users = [
  {
    name: 'Admin User',
    email: 'admin@smartparking.com',
    password: 'admin123',
    role: 'admin',
    phone: '9876543210',
    membershipType: 'platinum'
  },
  {
    name: 'Operator User',
    email: 'operator@smartparking.com',
    password: 'operator123',
    role: 'operator',
    phone: '9876543211',
    membershipType: 'gold'
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'user123',
    role: 'user',
    phone: '9876543212',
    membershipType: 'silver'
  }
];

// Generate parking slots
const generateSlots = () => {
  const slots = [];
  const types = ['car', 'bike', 'truck', 'electric'];
  const zones = ['A', 'B', 'C', 'D'];
  const baseRates = { car: 60, bike: 30, truck: 100, electric: 80 };

  let slotNumber = 1;

  types.forEach((type, typeIndex) => {
    for (let floor = 1; floor <= 2; floor++) {
      for (let i = 0; i < 10; i++) {
        const zone = zones[Math.floor(i / 3) % 4];
        const distanceToGate = (floor - 1) * 20 + i * 2 + 1;
        
        slots.push({
          slotNumber: slotNumber,
          slotCode: `${type.charAt(0).toUpperCase()}${floor}${zone}${String(i + 1).padStart(2, '0')}`,
          type,
          floor,
          zone,
          distanceToGate,
          status: 'available',
          isHandicapped: i === 0,
          isVIP: i === 9,
          hasCharger: type === 'electric',
          isCovered: floor === 1,
          baseRate: baseRates[type]
        });
        
        slotNumber++;
      }
    }
  });

  return slots;
};

// Pricing rules
const pricingRules = [
  {
    name: 'Standard Car Rate',
    description: 'Standard pricing for car parking',
    vehicleType: 'car',
    baseRatePerHour: 60,
    peakHourEnabled: true,
    peakHours: [
      { startHour: 8, endHour: 10 },
      { startHour: 17, endHour: 20 }
    ],
    peakHourMultiplier: 1.5,
    weekendPricingEnabled: true,
    weekendMultiplier: 1.2,
    minimumCharge: 30,
    maximumDailyCharge: 500,
    isActive: true
  },
  {
    name: 'Standard Bike Rate',
    description: 'Standard pricing for bike parking',
    vehicleType: 'bike',
    baseRatePerHour: 30,
    peakHourEnabled: true,
    peakHours: [
      { startHour: 8, endHour: 10 },
      { startHour: 17, endHour: 20 }
    ],
    peakHourMultiplier: 1.5,
    weekendPricingEnabled: false,
    minimumCharge: 15,
    maximumDailyCharge: 200,
    isActive: true
  },
  {
    name: 'Standard Truck Rate',
    description: 'Standard pricing for truck parking',
    vehicleType: 'truck',
    baseRatePerHour: 100,
    peakHourEnabled: true,
    peakHours: [
      { startHour: 8, endHour: 10 },
      { startHour: 17, endHour: 20 }
    ],
    peakHourMultiplier: 1.5,
    weekendPricingEnabled: true,
    weekendMultiplier: 1.3,
    minimumCharge: 50,
    maximumDailyCharge: 800,
    isActive: true
  },
  {
    name: 'Electric Vehicle Rate',
    description: 'Pricing for electric vehicles with charging',
    vehicleType: 'electric',
    baseRatePerHour: 80,
    peakHourEnabled: true,
    peakHours: [
      { startHour: 8, endHour: 10 },
      { startHour: 17, endHour: 20 }
    ],
    peakHourMultiplier: 1.3,
    weekendPricingEnabled: false,
    chargerMultiplier: 1.3,
    minimumCharge: 40,
    maximumDailyCharge: 600,
    isActive: true
  }
];

// Import data
const importData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany();
    await ParkingSlot.deleteMany();
    await PricingRule.deleteMany();

    console.log('Data cleared...');

    // Create users
    await User.create(users);
    console.log('Users created...');

    // Create slots
    const slots = generateSlots();
    await ParkingSlot.create(slots);
    console.log(`${slots.length} parking slots created...`);

    // Create pricing rules
    await PricingRule.create(pricingRules);
    console.log('Pricing rules created...');

    console.log('\n✅ Data imported successfully!\n');
    console.log('Default Login Credentials:');
    console.log('==========================');
    console.log('Admin:    admin@smartparking.com / admin123');
    console.log('Operator: operator@smartparking.com / operator123');
    console.log('User:     john@example.com / user123');
    console.log('');

    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await connectDB();

    await User.deleteMany();
    await ParkingSlot.deleteMany();
    await PricingRule.deleteMany();

    console.log('Data destroyed...');
    process.exit();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Run based on argument
if (process.argv[2] === '-d') {
  deleteData();
} else {
  importData();
}
