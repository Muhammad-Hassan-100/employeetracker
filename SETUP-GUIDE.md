# 🚀 Employee Tracker - Complete Setup Guide

## 📋 Prerequisites

Before starting, make sure you have:
- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **Git** installed
- **MongoDB** (local or Atlas account)

## 🛠️ Step-by-Step Setup

### 1. Clone & Install

\`\`\`bash
# Clone the repository
git clone <your-repo-url>
cd employee-tracker

# Install dependencies
npm install
\`\`\`

### 2. Database Setup (Choose One Option)

#### Option A: MongoDB Atlas (Recommended - Free Cloud Database)

1. **Create Account**: Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Create Cluster**: 
   - Click "Create" → "Shared" (Free tier)
   - Choose your region
   - Click "Create Cluster"
3. **Create Database User**:
   - Go to "Database Access"
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `admin`, Password: `admin123` (or your choice)
   - Database User Privileges: "Read and write to any database"
4. **Whitelist IP**:
   - Go to "Network Access"
   - Click "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0)
5. **Get Connection String**:
   - Go to "Clusters" → Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your password

#### Option B: Local MongoDB

\`\`\`bash
# Install MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb/brew/mongodb-community

# Or manually start
mongod --config /usr/local/etc/mongod.conf
\`\`\`

#### Option C: Docker MongoDB

\`\`\`bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
\`\`\`

### 3. Environment Configuration

Create `.env.local` file in root directory:

\`\`\`env
# MongoDB Connection (Choose one)
# For Atlas:
MONGODB_URI=mongodb+srv://admin:admin123@cluster0.xxxxx.mongodb.net/employee_tracker?retryWrites=true&w=majority

# For Local:
# MONGODB_URI=mongodb://localhost:27017/employee_tracker

# Security
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 4. Initialize Database (Optional)

Create initial admin user by running this in MongoDB:

\`\`\`javascript
// Connect to your MongoDB and run:
use employee_tracker

// Create admin user
db.users.insertOne({
  name: "Admin User",
  email: "admin@company.com",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm", // admin123
  role: "admin",
  department: "Management",
  position: "System Administrator",
  joinDate: new Date(),
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
})

// Create sample employee
db.users.insertOne({
  name: "John Employee",
  email: "employee@company.com", 
  password: "$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // emp123
  role: "employee",
  department: "IT",
  position: "Software Developer",
  shiftId: "morning",
  joinDate: new Date(),
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
})
\`\`\`

### 5. Run the Application

\`\`\`bash
# Start development server
npm run dev

# Open browser
# Go to: http://localhost:3000
\`\`\`

## 🔑 Login Credentials

### Admin Login
- **Email**: admin@company.com
- **Password**: admin123
- **Role**: Admin

### Employee Login  
- **Email**: employee@company.com
- **Password**: emp123
- **Role**: Employee

## 🎯 Features by Role

### 👨‍💼 Admin Features
- ✅ Add new employees
- ✅ Manage work shifts
- ✅ View all employees
- ✅ View attendance reports
- ❌ Cannot mark attendance (Admins don't clock in/out)

### 👥 Employee Features
- ✅ Mark attendance (Clock in/out)
- ✅ Add late/early reasons
- ✅ View personal attendance history
- ❌ Cannot access admin features

## 🚨 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
\`\`\`
Error: MongoNetworkError: failed to connect to server
\`\`\`
**Solution**: 
- Check if MongoDB is running
- Verify MONGODB_URI in .env.local
- For Atlas: Check network access settings

#### 2. Environment Variables Not Loading
\`\`\`
Error: Invalid/Missing environment variable: "MONGODB_URI"
\`\`\`
**Solution**:
- Ensure `.env.local` file exists in root directory
- Restart development server after adding env vars
- Check file name is exactly `.env.local` (not `.env`)

#### 3. Login Not Working
**Solution**:
- Check if users exist in database
- Verify password hashing matches
- Check browser console for errors

#### 4. Pages Not Loading
**Solution**:
- Clear browser cache
- Check if user data exists in localStorage
- Restart development server

### 📱 Testing the App

1. **Start with Admin Login**:
   - Login as admin
   - Add a new employee
   - Create work shifts
   - View reports

2. **Test Employee Features**:
   - Logout and login as employee
   - Mark attendance
   - Add late reason if needed
   - View attendance history

## 🚀 Production Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production
\`\`\`env
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-super-secure-production-jwt-secret
NEXT_PUBLIC_APP_URL=https://your-domain.com
\`\`\`

## 📞 Support

If you encounter any issues:
1. Check this guide first
2. Look at browser console for errors
3. Check MongoDB connection
4. Verify environment variables

## 🎉 Success!

If everything is working:
- ✅ You can access http://localhost:3000
- ✅ Login page loads
- ✅ Admin can access admin features
- ✅ Employee can mark attendance
- ✅ Database operations work

You're ready to use the Employee Tracker system! 🎊
