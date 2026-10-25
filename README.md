# StayNest — Full-Stack Accommodation Booking Platform

> A modern, deployable accommodation booking platform inspired by Airbnb, tailored for boutique hotels, alpine lounges, and authentic heritage guest houses.

---

## 🌟 Highlights & Key Features

- **Guest Experience**:
  - Browse and filter by destination city, check-in & check-out dates, guest count, property type, price, and amenities.
  - Interactive property detail gallery, room categories, and host profiles.
  - **Live Server Pricing Quotes**: Server computes nights, snapshotted unit rates, and transparent 10% platform fees—never trusting client totals.
  - **Concurrency-Safe 15-Minute Booking Holds**: Serialized database inventory locking prevents overbooking under concurrent requests.
  - **Payment Gateway Sandbox**: Order creation, signature verification, and idempotent webhook processing.
  - Guest reservation dashboard with status lifecycle (`PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `EXPIRED`) and cancellation policies.

- **Host Experience**:
  - Dedicated host portal for managing listings, pooled room inventory, pricing, and amenities.
  - Create new accommodations with custom image galleries and room categories.
  - View incoming reservations, guest details, and payouts.

- **Admin Console**:
  - Listing moderation queue (Approve, Reject, or Deactivate properties).
  - User account moderation (activate/deactivate users, inspect roles).
  - System-wide audit of all reservations.

- **Security & Reliability**:
  - Layered defense: Helmet HTTP headers, strict CORS, rate limiting on sensitive auth endpoints, and Zod input validation.
  - Background sweeper job automatically expires unpaid holds.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript | Fast single-page application |
| **Styling** | Tailwind CSS | Custom warm off-white (`#FAFAF7`), charcoal (`#1F2421`), olive & terracotta palette |
| **State & Data** | TanStack Query, React Router | Efficient caching, mutations, and role-guarded routing |
| **Backend** | Node.js, Express, TypeScript | REST API with modular architecture |
| **Database & ORM** | PostgreSQL, Prisma ORM | Concurrency-safe transactions, UUIDs, migrations |
| **Authentication** | Local JWT | Server-signed tokens and server-authoritative roles |
| **Payments** | Razorpay / Sandbox Mock Provider | Server orders, HMAC SHA256 signature verification, idempotent webhooks |
| **Testing** | Vitest, Supertest | Booking concurrency, date overlaps, pricing calculations |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **NPM**: v9+
- **Docker**: used to start local Postgres

### 2. Install and start
```bash
git clone https://github.com/quantumva23/StayNest.git
cd StayNest
npm install
npm start
```

`npm start` starts Postgres, applies migrations, creates the demo accounts when they are missing, and runs the API (port 4000) and the site (port 5173). Open **[http://localhost:5173](http://localhost:5173)**.

Put stay photos in `photos/`. If the database has no listings, the next start builds them from those files.

---

## 🔑 Demo Accounts (Pre-seeded)

All accounts share the password: `password123`

| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **Guest** | `guest@staynest.dev` | `password123` | Search, reserve, pay sandbox, cancel |
| **Host** | `host@staynest.dev` | `password123` | Host dashboard, create listings, view reservations |
| **Admin** | `admin@staynest.dev` | `password123` | Moderate listings, activate/deactivate users, audit |

*(Quick 1-click login buttons are also available on the `/login` screen)*

---

## 🧪 Running Automated Tests

Run the critical booking rules, inventory concurrency, and pricing test suite:
```bash
npm test
```

---

## 🚢 Deployment

### 1. Database
- Use the local Postgres database in `DATABASE_URL`.
- Put stay photos in the repo `photos/` folder. On startup the API imports tables and, if the database has no stays, builds listings from those files.

### 2. API Backend (Render / Railway)
- Root Directory: `server`
- Build Command: `npm install && npm run prisma:generate && npm run build`
- Start Command: `npm run start`
- Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`.

### 3. Frontend (Vercel)
- Root Directory: `client`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: `VITE_API_URL=https://your-api-domain.com/api/v1`.

---

## 📜 License
MIT License. Built as an academic portfolio demonstration project.
