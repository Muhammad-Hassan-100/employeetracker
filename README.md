# Employee Tracker System

A comprehensive employee management and attendance tracking system built with Next.js, TypeScript, and MongoDB.

## Features

### 🏠 Landing Page
- Modern, responsive design
- Clear navigation to login system
- Feature showcase

### 🔐 Authentication
- Role-based login (Admin/Employee)
- Secure password hashing with bcrypt
- Session management

### 👥 Employee Features
- **Attendance Management**: Clock in/out with real-time validation
- **Late/Early Tracking**: Automatic detection with reason forms
- **Personal History**: Complete attendance records with filtering
- **Work Schedule**: Clear display of shift timings

### 👨‍💼 Admin Features
- **Employee Management**: Register new employees with shift assignment
- **Shift Management**: Create, edit, delete work shifts
- **Employee Directory**: View all employees with search functionality
- **Full CRUD Operations**: Complete control over all data

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
\`\`\`bash
git clone <repository-url>
cd employee-tracker
\`\`\`

2. **Install dependencies**
\`\`\`bash
npm install
\`\`\`

3. **Set up environment variables**
Create a `.env.local` file in the root directory:
\`\`\`env
MONGODB_URI=mongodb://localhost:27017/employee_tracker
JWT_SECRET=your-super-secret-jwt-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 🗄️ Database Setup

#### Option 1: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service:
\`\`\`bash
mongod
\`\`\`
3. Use the connection string: `mongodb://localhost:27017/employee_tracker`

#### Option 2: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string from Atlas dashboard
4. Replace in `.env.local`:
\`\`\`env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/employee_tracker?retryWrites=true&w=majority
\`\`\`

#### Option 3: Docker MongoDB
\`\`\`bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
\`\`\`

### 🏃‍♂️ Running the Application

1. **Start development server**
\`\`\`bash
npm run dev
\`\`\`

2. **Open browser**
Navigate to `http://localhost:3000`

3. **Login with demo credentials**
- **Admin**: admin@company.com / admin123
- **Employee**: employee@company.com / emp123

## 📁 Project Structure

\`\`\`
employee-tracker/
├── app/
│   ├── dashboard/
│   │   ├── attendance/page.tsx
│   │   ├── history/page.tsx
│   │   ├── employees/page.tsx
│   │   ├── shifts/page.tsx
│   │   ├── employee-list/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── employees/
│   │   ├── attendance/
│   │   └── shifts/
│   ├── login/page.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn components)
│   ├── app-sidebar.tsx
│   ├── attendance-tab.tsx
│   ├── employee-management.tsx
│   └── ...
├── lib/
│   ├── mongodb.ts
│   └── models/
└── scripts/
    └── create-database.sql
\`\`\`

## 🔧 Configuration

### MongoDB Collections
The application uses these collections:
- `users` - Employee and admin data
- `attendance` - Daily attendance records
- `shifts` - Work shift definitions

### Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NEXT_PUBLIC_APP_URL` - Application URL

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms
The application can be deployed to any platform supporting Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🛠️ Development

### Adding New Features
1. Create new API routes in `app/api/`
2. Add new pages in `app/dashboard/`
3. Update sidebar navigation in `components/app-sidebar.tsx`
4. Add new components in `components/`

### Database Operations
Use the MongoDB helper functions in `lib/mongodb.ts`:
\`\`\`typescript
import { getDatabase } from '@/lib/mongodb'

const db = await getDatabase()
const collection = db.collection('users')
\`\`\`

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Employees
- `GET /api/employees` - Get all employees
- `POST /api/employees/create` - Create new employee
- `DELETE /api/employees/[id]` - Delete employee
- `PUT /api/employees/[id]/status` - Update employee status

### Attendance
- `POST /api/attendance/checkin` - Clock in
- `POST /api/attendance/checkout` - Clock out
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/history` - Get attendance history

### Shifts
- `GET /api/shifts` - Get all shifts
- `POST /api/shifts/create` - Create new shift
- `PUT /api/shifts/[id]` - Update shift
- `DELETE /api/shifts/[id]` - Delete shift

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.
