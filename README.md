# TurfMate

TurfMate is a full-stack turf booking and player-pooling platform inspired by the BlaBlaCar concept. It allows users to discover turfs, host matches, join available games, manage wallet-based payments, and split costs among players.

## Project Overview

TurfMate solves a common real-world problem: many players want to play football, cricket, or other sports but do not always have a full team. With TurfMate, a user can create a match, mention how many players are needed, and other nearby users can join by paying their share.

## Features

- User registration and login
- Turf listing and booking
- Match hosting system
- Join available matches
- Wallet-based payment flow
- Refund and leave match handling
- Player payment tracking
- Turf owner and admin support
- Secure backend APIs
- Real-time support using Socket.IO
- Responsive React frontend

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Axios
- React Router
- Recharts
- Socket.IO Client

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- Razorpay
- Socket.IO
- Nodemailer
- Multer
- Helmet
- Express Validator

## Folder Structure

```txt
TurfMate/
└── proj_fol/
    ├── client/      # React frontend
    ├── server/      # Node.js backend
    └── PAYMENT_SYSTEM_FIXES.md
