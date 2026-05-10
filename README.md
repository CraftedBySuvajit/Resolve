# Complaint Management System

A secure, user-centric web platform for submitting and managing complaints.

## 🚀 Features

### User Features
- **User Authentication**: Register and login required to submit complaints.
- **My Complaints**: View your own submitted complaints with status updates.
- **Universal Tracking**: View all complaints publicly in a stacked view.
- **Subject-Based Complaints**: Flexible subject field instead of fixed categories.
- **Unique Token Generation**: Complaint tokens generated in `TKN-YYYYMMDD-XXXX` format.

### Admin Features
- **Secure Admin Portal**: Dedicated login for authorized personnel.
- **Complaint Management**: View all complaints, update status, and add replies.
- **Quick Actions**: View details, Reply/Resolve, and Delete complaints.
- **Stats Dashboard**: Real-time counters for total, pending, in-progress, and resolved complaints.

---

## 🛠️ Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism UI), JavaScript (ES6).
- **Backend**: Python (Flask), Flask-CORS.
- **Database**: Supabase (PostgreSQL).

---

## ⚙️ Setup & Installation

### 1. Database Setup (Supabase)
1. Log in to your **Supabase Dashboard**.
2. Go to the **SQL Editor** and create a new query.
3. Copy the contents of `SQL_COPY_PASTE.sql` from this project and run it. This creates the `users` and `complaints` tables.

### 2. Backend Setup
1. Navigate to the `backend` directory.
2. Create a virtual environment and install dependencies (if not already done).
3. Ensure your `.env` file has the correct Supabase URL and Secret Key.
4. Run the server:
   ```bash
   python app.py
   ```
   The server will start on `http://localhost:5000`.

### 3. Frontend Setup
1. Open `frontend/index.html` directly in a browser, or serve it using a local server (e.g., Live Server in VS Code).
2. Ensure the `API_BASE_URL` in `frontend/script.js` points to your running backend (`http://localhost:5000/api`).

---

## 🔐 Credentials

### Admin Login
- **ID**: `sathiofficial`
- **Password**: `sathi/admin`

---

## 📂 Project Structure
- `frontend/`: Contains HTML, CSS, and JS files.
- `backend/`: Contains Flask application and test scripts.
- `SQL_COPY_PASTE.sql`: Database schema setup script.
- `.env`: Environment variables (Keep this private).
