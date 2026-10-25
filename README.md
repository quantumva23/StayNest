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
| **Authentication** | Supabase Auth + JWT Verification | Managed user identities with server-authoritative roles |
| **Payments** | Razorpay / Sandbox Mock Provider | Server orders, HMAC SHA256 signature verification, idempotent webhooks |
| **Testing** | Vitest, Supertest | Booking concurrency, date overlaps, pricing calculations |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **NPM**: v9+
- **PostgreSQL**: Local instance, or free cloud database from [Supabase](https://supabase.com) or [Neon](https://neon.tech)

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/quantumva23/StayNest.git
cd StayNest
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` in the root (and optionally inside `server/`):
```bash
cp .env.example .env
```

Ensure `DATABASE_URL` is set to your PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/staynest?schema=public"
JWT_SECRET="dev-jwt-secret-min-32-chars-long-staynest-booking-platform"
```

### 4. Database Setup & Seeding
Run Prisma migrations and seed the database with demo accounts, amenities, properties, and rooms:
```bash
# Generate Prisma Client
npm --workspace=server run prisma:generate

# Deploy migrations / push schema
npx --workspace=server prisma db push

# Seed rich demo properties and accounts
npm --workspace=server run prisma:seed
```

### 5. Start Development Servers
Start both backend API (port 4000) and frontend client (port 5173):
```bash
# In Terminal 1 (API Server):
npm run dev:server

# In Terminal 2 (React Client):
npm run dev:client
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

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
- Create a project on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
- Copy the transaction connection pooling URI to `DATABASE_URL`.
- Run `npx --workspace=server prisma migrate deploy` and `npm --workspace=server run prisma:seed`.

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
