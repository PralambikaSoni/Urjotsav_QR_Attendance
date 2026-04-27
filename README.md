# Urjotsav QR Attendance System

![License](https://img.shields.io/badge/License-MIT-green.svg)
![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-Modern-teal.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-yellow.svg)

## 📌 What is this?
The **Urjotsav QR Attendance System** is a robust, enterprise-grade, cryptographically secure event attendance tracker meticulously engineered for large-scale college fests. It intelligently replaces outdated paper-based attendance ledgers with an asynchronous, fully digitized platform that utilizes dynamically rotating QR-Codes to definitively map event participation metrics in real-time.

## ⚙️ How does it work?
The ecosystem utilizes a three-tier Role-Based Access Control (RBAC) architecture securely backed by JSON Web Tokens (JWT):

1. **Admin Portal**: 
   - A global command center aggregating system-wide analytics, visually plotting participation demographic distributions using dynamic `Chart.js` components, and monitoring system-critical security Audit Logs natively.

2. **Faculty (Coordinator) Portal**: 
   - Event coordinators log in to "Mark Events." 
   - The Faculty host explicitly launches a **Master Console QR** on a projector. This QR code securely rotates dynamically every exactly 60 seconds natively backed by FastAPI JWT encryption mathematically guaranteeing students cannot screenshot and share attendance links falsely! 
   - Coordinators can securely formally lock in Event Winners directly to the SQLite databases.

3. **Student Portal**:
   - Students register and open the integrated **Web-Hardware QR Scanner** utilizing their native smartphone cameras. 
   - Instantly scans the projector and logs "Present", displaying attendance ratios and global KPI progression identically in real-time.

---

## 🛠️ System Requirements

To officially host and run this system locally on your own machine, you need:
- **Python 3.9+** natively installed.
- Modern Web Browser (Google Chrome, Edge, Safari).
- Included Python Libraries (managed simply via `pip`):
  - `fastapi`
  - `uvicorn`
  - `sqlalchemy`
  - `python-jose[cryptography]`
  - `passlib[bcrypt]`
  - `pydantic`

---

## 🚀 How to setup and run locally

### 1. Clone the Repository
```bash
git clone https://github.com/PralambikaSoni/Urjotsav_QR_Attendance.git
cd Urjotsav_QR_Attendance
```

### 2. Initialize the Backend
Navigate explicitly to the `backend/` directory, establish a secure Python Virtual Environment natively, and install the underlying dependencies:

```bash
cd backend

# Create an isolated environment natively 
python -m venv venv

# Activate Environment (Windows)
.\venv\Scripts\activate

# Install strictly exact dependencies 
pip install -r requirements.txt
```

### 3. Generate Database and Seed Dummy Data
To configure SQLite schemas correctly safely populated with mock Faculty/Student accounts natively:
```bash
python seed.py
```

### 4. Boot the Uvicorn Local Server
This structurally spins up the live asynchronous API explicitly over port `8000`:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Access the Platform
Navigate dynamically directly to the `frontend/` files statically, or natively just open your web browser to:
[http://localhost:8000/login.html](http://localhost:8000/login.html)

**Initial Testing Credentials:**
- **Admin**: `admin` / `adminpass`
- **Faculty**: `faculty1` / `facpass`
- **Student**: Registered dynamically using the `Don't have an account?` terminal route!
