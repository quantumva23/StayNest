# StayNest Security & Firewall Controls

## Layered Defensive Architecture

1. **HTTP Hardening & Transport**:
   - `helmet` applies essential HTTP security headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`).
   - `x-powered-by` header is explicitly disabled.
   - Strict CORS policy restricts unauthorized browser origins.

2. **Rate Limiting & Abuse Prevention**:
   - Sensitive endpoints (`/auth/login`, `/auth/register`) are protected by an express rate-limiter (window: 15 mins, max 30 attempts per IP).

3. **Input Validation**:
   - Every request body, path parameter, and query string is parsed and validated using strictly typed `Zod` schemas before touching services or database queries.

4. **Resource Authorization & Ownership**:
   - Authentication sets identity; authorization verifies both role (`GUEST`, `HOST`, `ADMIN`) and ownership (e.g. host must own the property, guest must own the booking).

5. **Financial & Concurrency Safety**:
   - No payment amount from client input is ever trusted; the order amount is read directly from server database booking records.
   - Raw payment webhooks are cryptographically validated against secrets using timing-safe comparisons (`crypto.timingSafeEqual`).
   - Webhook events are idempotently tracked with unique composite constraints to prevent replay attacks.
   - Room allocations are serialized via PostgreSQL transactions with hold expiration logic.
