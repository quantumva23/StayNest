# StayNest Architecture & Design Specification

## 1. Overview
StayNest is a full-stack accommodation booking platform for hotels, lounges, and guest houses. Designed as a modular monolith, it balances security, data integrity, and low infrastructure overhead.

```mermaid
flowchart TB
    U[Guest / Host / Admin browser]
    FE[React + Vite + Tailwind Client]
    EDGE[Edge Gateway / CORS / Rate Limiting]
    API[Express REST API]
    AUTH[Supabase Auth / Server JWT Verification]
    MOD[Modules: Properties, Rooms, Bookings, Payments, Admin]
    DB[(PostgreSQL)]
    PAY[Razorpay / Sandbox Mock Gateway]
    JOB[Scheduled Hold Sweeper Job]

    U --> FE
    FE -->|HTTPS + Bearer Token| EDGE
    EDGE --> API
    API --> AUTH
    AUTH --> MOD
    MOD <--> DB
    MOD <--> PAY
    JOB --> DB
```

## 2. Key Architectural Tenets
1. **Zero Client Trust**: All pricing computations, room inventory checks, role authorizations, and payment verifications happen strictly on the server.
2. **Concurrency-Safe Inventory Allocation**:
   - Availability is calculated against both `CONFIRMED` bookings and active `PENDING_PAYMENT` holds (`expiresAt > now`).
   - Overbooking is prevented inside an atomic PostgreSQL interactive transaction.
3. **Idempotent Webhooks**:
   - Webhook events are cryptographically verified and recorded in `payment_webhook_events` with unique `(provider, provider_event_id)` constraints.
4. **Flexible Authentication**:
   - Local JWT tokens are verified on the server.
   - User profiles in PostgreSQL maintain server-authoritative roles (`GUEST`, `HOST`, `ADMIN`).
5. **Decoupled Integrations**:
   - Small provider interfaces (`IPaymentProvider`) isolate external gateway specifics from core reservation logic.
