# StayNest — Full-Stack Accommodation Booking Platform

[![StayNest CI/CD Pipeline](https://github.com/quantumva23/StayNest/actions/workflows/ci.yml/badge.svg)](https://github.com/quantumva23/StayNest/actions/workflows/ci.yml)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Frontend-black?logo=vercel)](https://staynest.vercel.app)
[![Render Deployment](https://img.shields.io/badge/Render-Backend%20API-46E3B7?logo=render)](https://render.com)

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

## 🔑 User Authentication & Roles

Create custom accounts using the registration screen (`/register`) with either role:
- **Guest**: Search, reserve rooms, complete checkout, view bookings, and submit reviews.
- **Host**: Manage listings, create properties, add room categories, and review reservations.

---

## 🧪 Running Automated Tests

Run the critical booking rules, inventory concurrency, and pricing test suite:
```bash
npm test
```

---

## 🚢 Production Deployment & Continuous Integration (CI/CD)

StayNest is configured for automated continuous deployment:
- **Backend API**: Hosted on **Render** (via `render.yaml` Blueprint or Web Service) with managed PostgreSQL.
- **Frontend SPA**: Hosted on **Vercel** with full SPA rewrite routing support (`vercel.json`).
- **Continuous Integration (CI)**: Managed by **GitHub Actions** (`.github/workflows/ci.yml`). Every pull request or push to `main` executes client & server builds and Vitest test suites, generating live status reports.

---

### 1. Backend Deployment (Render)

You can deploy the backend using Render's Blueprint (Infrastructure as Code) or as an individual Web Service:

#### Option A: 1-Click Render Blueprint (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Blueprint**.
2. Connect your GitHub repository: `https://github.com/quantumva23/StayNest`.
3. Render automatically reads `render.yaml` and provisions:
   - **staynest-db**: Managed PostgreSQL database.
   - **staynest-api**: Node.js Web Service running the API.
4. Set the `FRONTEND_URL` environment variable to your Vercel URL (e.g. `https://staynest.vercel.app`).
5. Click **Apply**. Render will automatically run `npm run prisma:generate`, compile TypeScript, apply `prisma migrate deploy`, and start the service with a `/health` probe.

#### Option B: Manual Web Service
- **Root Directory**: `server`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npx prisma migrate deploy && npm run start`
- **Health Check Path**: `/health`
- **Environment Variables**:
  | Variable | Value / Description |
  | :--- | :--- |
  | `NODE_ENV` | `production` |
  | `PORT` | `10000` (Render default) |
  | `DATABASE_URL` | Your PostgreSQL connection URI (Render Postgres / Neon / Supabase) |
  | `FRONTEND_URL` | Your Vercel frontend URL (e.g. `https://staynest.vercel.app`) |
  | `JWT_SECRET` | 32+ character random string |
  | `PAYMENT_PROVIDER` | `sandbox_mock` (or `razorpay`) |

---

### 2. Frontend Deployment (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New...** > **Project**.
2. Import the `StayNest` GitHub repository.
3. Configure Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: Set to `client` (or leave as root; `vercel.json` supports both)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables:
   | Variable | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://your-render-service.onrender.com/api/v1` |
   | `VITE_RAZORPAY_KEY_ID` | `rzp_test_placeholder_key` |
5. Click **Deploy**. Vercel will build and launch your application with automatic SSL and global CDN distribution.

---

### 3. Continuous Integration & Visible Pipeline Updates

- **Automatic Previews on Pull Requests**: Every PR automatically triggers the GitHub Actions pipeline (`server-ci` and `client-ci`) and creates a Vercel preview deployment.
- **Continuous Deployment on `main`**: Pushes to `main` trigger:
  1. Frontend build verification & automatic Vercel production deployment.
  2. Backend Vitest suite execution & automatic Render deploy.
  3. GitHub Actions Step Summary documenting the commit, build statuses, and deployment health.
- *(Optional)* Add `RENDER_DEPLOY_HOOK_URL` in **GitHub Repository Secrets** to trigger immediate Render deployments directly from the GitHub Actions workflow.

---

## 📜 License
MIT License. Built as an academic portfolio demonstration project.
