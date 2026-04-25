# Peer Bridge – NUST Peer Mentorship Platform

A full-stack web platform connecting NUST juniors with verified seniors for mentorship, career guidance, and shared resources.

---

## Project Structure

```
WebTech_Project/
├── database/
│   └── schema.sql          ← Run this first in MySQL
├── backend/
│   ├── server.js           ← Express entry point
│   ├── package.json
│   ├── .env.example        ← Copy to .env and fill in
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── posts.js
│   │   ├── users.js
│   │   ├── messages.js
│   │   ├── resources.js
│   │   ├── events.js
│   │   └── admin.js
│   └── scripts/seed.js     ← Run once to fix password hashes
└── frontend/
    ├── index.html          ← Landing + OTP login
    ├── feed.html           ← Main post feed
    ├── mentors.html        ← Mentor directory
    ├── profile.html        ← User profile
    ├── resources.html      ← Resource library
    ├── events.html         ← Events calendar
    ├── messages.html       ← Messaging
    ├── admin.html          ← Admin dashboard
    ├── css/shared.css
    └── js/api.js
```

---

## Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- MySQL (v8+)
- A NUST email address *(or any @nust.edu.pk / @student.nust.edu.pk address)*

### 2. Database Setup
Open MySQL and run:
```sql
SOURCE path/to/WebTech_Project/database/schema.sql;
```

### 3. Backend Setup
```bash
cd backend
copy .env.example .env      # Windows
# Edit .env — set your MySQL password and a JWT secret

npm install
node scripts/seed.js        # Fix password hashes (run once)
npm run dev                 # Start with nodemon
# or: npm start
```

### 4. Open the App
Visit **http://localhost:3000**

---

## Default Accounts (all passwords: `Test@123`)

| Email | Role |
|-------|------|
| admin@nust.edu.pk | Admin |
| hassan.ali@nust.edu.pk | Lead Mentor |
| minahil.raza@nust.edu.pk | Mentor |
| areeba.noor@nust.edu.pk | Lead Mentor |
| zara.khan@student.nust.edu.pk | Sophomore (student) |

**Note:** In development mode the OTP is printed in the server console and returned in the API response — no email server needed for testing.

---

## Features

| Feature | Description |
|---------|-------------|
| NUST Email Auth | OTP-based signup/login, email domain validation |
| Post Feed | Create posts in 4 categories, like, bookmark, reply |
| Mentor Directory | Browse/search mentors, connect, rate |
| Resource Library | Upload/download files (PDFs, ZIPs, etc.) |
| Events Calendar | Create and browse upcoming events |
| Messaging | Real-time-style 1:1 chat (polling) |
| User Profiles | Edit profile, view posts, rate mentors |
| Admin Panel | Manage users, roles, posts; view stats |

---

## Technologies

- **Frontend:** HTML, CSS, JavaScript (React via CDN + Babel)
- **Backend:** Node.js, Express.js
- **Database:** MySQL (mysql2)
- **Auth:** JWT + bcryptjs
- **File uploads:** Multer
