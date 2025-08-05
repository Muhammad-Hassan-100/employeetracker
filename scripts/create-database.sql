-- Employee Tracker Database Schema
-- This script creates the necessary tables for the Employee Tracker application

-- Users table (for both admins and employees)
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee') NOT NULL,
    department VARCHAR(255),
    position VARCHAR(255),
    shift_id VARCHAR(255),
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Shifts table
CREATE TABLE shifts (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE attendance (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    is_late BOOLEAN DEFAULT FALSE,
    is_early BOOLEAN DEFAULT FALSE,
    late_reason TEXT,
    early_reason TEXT,
    hours_worked DECIMAL(4,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date)
);

-- Insert default shifts
INSERT INTO shifts (id, name, start_time, end_time, description) VALUES
('shift_1', 'Morning Shift', '09:00:00', '17:00:00', 'Standard morning shift'),
('shift_2', 'Evening Shift', '14:00:00', '22:00:00', 'Afternoon to evening shift'),
('shift_3', 'Night Shift', '22:00:00', '06:00:00', 'Night shift'),
('shift_4', 'Flexible Hours', '00:00:00', '23:59:59', 'Flexible working hours');

-- Insert default admin user
INSERT INTO users (id, name, email, password, role, department, position) VALUES
('admin_1', 'Admin User', 'admin@company.com', 'admin123', 'admin', 'Management', 'System Administrator');

-- Insert sample employee
INSERT INTO users (id, name, email, password, role, department, position, shift_id) VALUES
('emp_1', 'John Employee', 'employee@company.com', 'emp123', 'employee', 'IT', 'Software Developer', 'shift_1');
