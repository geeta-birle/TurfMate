![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)

# TurfMate ⚽

Full-stack turf booking and player-pooling platform inspired by the BlaBlaCar concept. TurfMate allows users to book sports turfs, host public matches, join nearby games, split costs among players, and manage bookings in real time.

---

# 🌟 Features

## Backend
- Node.js + Express + PostgreSQL
- JWT authentication with bcrypt
- RESTful API architecture
- Razorpay payment integration
- Wallet-based transaction system
- Socket.IO real-time communication
- Multer image uploads
- Secure middleware and validations
- Role-based authentication
- Email notification support

## Frontend
- React + Vite architecture
- Tailwind CSS responsive UI
- React Router navigation
- Axios API integration
- Zustand state management
- Recharts analytics support
- Mobile-friendly design
- Modern dashboard interface
- Real-time match updates
- Interactive booking flow

## Core Features
✅ User authentication (signup/login)

✅ Turf booking system

✅ Public match hosting

✅ Join nearby matches

✅ Player pooling system

✅ Split payment support

✅ Wallet and refund system

✅ Match cancellation handling

✅ Turf owner dashboard

✅ Admin controls

✅ Real-time match updates

✅ Secure payment workflow

---

# 📋 Requirements

- Node.js 18+
- PostgreSQL
- npm or yarn
- Razorpay account (optional)

---

# 🚀 Quick Start

## 1. Clone Repository

```bash
git clone https://github.com/geeta-birle/TurfMate.git
cd TurfMate/proj_fol
```

---

# 2. Backend Setup

```bash
cd server
npm install
```

Create `.env` file:

```bash
cp .env.example .env
```

Start backend:

```bash
npm run dev
```

Backend runs on:

```txt
http://localhost:5000
```

---

# 3. Frontend Setup

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend runs on:

```txt
http://localhost:5173
```

---

# 🔐 Environment Variables

## Backend `.env`

```env
PORT=5000

DATABASE_URL=your_postgresql_database_url

JWT_SECRET=your_jwt_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

CLIENT_URL=http://localhost:5173
```

---

## Frontend `.env`

```env
VITE_API_URL=http://localhost:5000
VITE_RAZORPAY_KEY=your_razorpay_public_key
```

---

# 📁 Project Structure

```txt
TurfMate/
└── proj_fol/
    ├── client/                    # React frontend
    │   ├── src/
    │   ├── public/
    │   ├── package.json
    │   └── vite.config.js
    │
    ├── server/                    # Express backend
    │   ├── controllers/
    │   ├── routes/
    │   ├── middleware/
    │   ├── models/
    │   ├── database/
    │   ├── services/
    │   ├── socket/
    │   └── package.json
    │
    └── PAYMENT_SYSTEM_FIXES.md
```

---

# 🔌 API Features

## Authentication
- User signup
- User login
- JWT authorization
- Protected routes

## Turf Management
- Add turf
- View turfs
- Book slots
- Manage availability

## Match System
- Create public match
- Join existing match
- Match player tracking
- Auto slot updates

## Wallet & Payments
- Wallet balance handling
- Split payment logic
- Refund support
- Payment history tracking

---

# 🗄️ Database Modules

## Main Tables

- users
- turfs
- turf_images
- slots
- bookings
- matches
- match_players
- payments
- wallets
- reviews

---

# 💳 Payment Workflow

When a player joins a match:

1. Wallet balance is verified
2. Payment amount is deducted
3. Match host receives payment
4. Transaction record is created
5. Player is added to the match

---

# 🎨 Frontend Technologies

| Feature | Technology |
|---|---|
| Framework | React + Vite |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Routing | React Router |
| Charts | Recharts |
| HTTP Client | Axios |
| Realtime | Socket.IO Client |

---

# ⚙️ Backend Technologies

| Feature | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| Authentication | JWT |
| Payments | Razorpay |
| File Uploads | Multer |
| Security | Helmet + bcrypt |
| Realtime | Socket.IO |

---

# 🔐 Security Features

✅ JWT Authentication

✅ Password hashing with bcrypt

✅ Protected API routes

✅ Input validation

✅ Secure environment variables

✅ CORS protection

✅ Secure payment handling

✅ Role-based access control

---

# 🚢 Deployment

## Recommended Hosting

### Frontend
- Vercel
- Netlify

### Backend
- Render
- Railway
- AWS EC2

### Database
- Supabase PostgreSQL
- Neon PostgreSQL

### Payments
- Razorpay

---

# 🐛 Troubleshooting

## Backend not starting

- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Ensure correct port configuration

---

## Frontend not connecting to backend

- Verify backend runs on port 5000
- Check VITE_API_URL
- Verify CORS settings

---

## Payment issues

- Check Razorpay keys
- Verify wallet balance logic
- Confirm payment gateway setup

---

# 🎯 Future Enhancements

- AI-based player matchmaking
- Skill-level balancing
- Real-time chat system
- Live map integration
- Push notifications
- Mobile app version
- Rating and trust system
- Tournament management
- QR-based turf entry
- AI-generated balanced teams

---

# 📊 Project Highlights

- Full-stack production-style architecture
- Real-world sports booking workflow
- BlaBlaCar-inspired player pooling system
- Secure payment and refund handling
- Real-time multiplayer coordination
- Startup-ready scalable structure

---

# 📜 License

Licensed under the Apache License 2.0.

Copyright 2026 Geeta Birle

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this project except in compliance with the License.

You may obtain a copy of the License at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

See the License for the specific language governing permissions and
limitations under the License.

---

# 🤝 Contributing

Contributions, issues, and feature suggestions are welcome.

Feel free to fork the repository and create pull requests.

---

# 👩‍💻 Author

**Geeta Birle**

GitHub: https://github.com/geeta-birle

---

Built with ❤️ for sports communities and local players.
