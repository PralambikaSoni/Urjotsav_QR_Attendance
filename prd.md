# Product Requirements Document (PRD): QR-Based Attendance System

## 1. Project Overview
A secure, web-based attendance management system designed for a college fest ("Urjotsav"). The system utilizes dynamic, time-sensitive QR codes to track and verify student attendance across multiple events, preventing proxy attendance and ensuring accurate analytics.

## 2. Target Audience & Roles
- **Admin**: Oversees the entire fest, manages users (students and faculty), and monitors global statistics.
- **Faculty**: Manages specific events, generates dynamic QR codes, and monitors attendance for their assigned events.
- **Student**: Attendees who register, view their personal dashboard, and mark attendance by scanning event QR codes.

## 3. Features & Requirements

### 3.1 Admin Role
- **Dashboard**: Global analytics including total registrations, overall attendance stats, and event-wise participation metrics.
- **User Management**: Create, update, or remove Students and Faculty accounts. Assign Faculty to specific events.
- **Audit Logs**: View logs of system activities (e.g., login times, QR generation, system modifications).
- **QR Generation**: Generate QR codes natively (similar to faculty, potentially for overarching fest attendance or specific events).

### 3.2 Faculty Role
- **Authentication**: Secure login using credentials provisioned by the Admin.
- **Event Management**: Create and manage parameters of their specific events.
- **Dynamic QR Generation**: Generate event-specific QR codes. The QR code must update automatically every 60 seconds on the screen.
- **Attendance View**: Real-time tabular view of student attendance records for their managed events (read-only).

### 3.3 Student Role
- **Registration**: Open sign-up capturing Full Name, Enrollment Number, Branch, Year, Section, and potentially Event selection.
- **Dashboard**: View personal attendance history, total attendance percentage, and enrolled/upcoming events. Must be fully responsive and work seamlessly on mobile phones.
- **QR Scanner**: In-browser camera web scanner to scan Faculty-generated dynamic QR codes and securely mark attendance, optimized for mobile camera usage.

### 3.4 Core Technical Requirements
- **QR Security & Expiry**: QR payloads contain a secure JWT signed by the backend, embedding the `event_id` and an expiration claim (`exp`) set to 60 seconds.
- **Spoofing Prevention**: Time-bound tokens ensure that a photograph of the QR code cannot be shared on messaging apps and used by absentees. 
- **Duplicate Prevention**: Both frontend UI and database constraints will prevent a single `student_id` from marking attendance twice for the same `event_id`.
- **Role-Based Access Control (RBAC)**: Distinct permissions and JWT claims tailored for Admin, Faculty, and Student routes.

## 4. Tech Stack Specification
- **Backend Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy (with Alembic for migrations)
- **Frontend Framework**: React.js (suggesting Vite + Tailwind CSS for modern aesthetics)
- **Authentication**: JWT (JSON Web Tokens) with Passlib for password hashing
- **QR Generation**: Python `qrcode` library / Frontend-side continuous generation using backend-provided secure tokens.
- **QR Web Scanner**: `html5-qrcode` or `react-qr-reader` in the React frontend.

## 5. Potential Project Architecture

```text
Attendance_urjotsav/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/          # FastAPI Route handlers (auth, users, events, attendance)
│   │   ├── core/         # Settings, JWT logic, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic validation schemas
│   │   └── crud/         # Database operations
│   ├── requirements.txt
│   └── alembic.ini       # DB migrations config
└── frontend/
    ├── src/
    │   ├── components/   # Reusable UI parts (Navbar, Sidebar, WebScanner)
    │   ├── pages/        # AdminDashboard, FacultyDashboard, StudentDashboard
    │   ├── services/     # API service calls
    │   ├── context/      # Authentication context
    │   └── assets/       # Images, styles
    ├── package.json
    └── index.html
```
