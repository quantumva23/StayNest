# StayNest REST API Documentation

Base URL: `/api/v1`

## Authentication
| Method | Path | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public (Rate-limited) | Register new user account |
| `POST` | `/auth/login` | Public (Rate-limited) | Authenticate user & issue JWT |
| `POST` | `/auth/logout` | Authenticated | Clear session cookie |
| `GET` | `/auth/me` | Authenticated | Fetch current profile & stats |

## Properties & Rooms
| Method | Path | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/properties` | Public | Search listings with date/filter availability |
| `GET` | `/properties/:propertyId` | Public | View property details, rooms & amenities |
| `POST` | `/properties` | Host / Admin | Create new property listing |
| `PATCH` | `/properties/:propertyId` | Owning Host / Admin | Update listing details |
| `POST` | `/properties/:propertyId/images` | Owning Host / Admin | Attach image gallery URLs |
| `POST` | `/properties/:propertyId/rooms` | Owning Host / Admin | Add room category & inventory |
| `PATCH` | `/rooms/:roomId` | Owning Host / Admin | Update room capacity, pricing, total units |
| `GET` | `/rooms/:roomId/availability` | Public | Real-time availability for date range |

## Bookings & Payments
| Method | Path | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/bookings/quote` | Public / Guest | Server calculation of nights, subtotal & fees |
| `POST` | `/bookings` | Authenticated | Atomic inventory hold (15 min hold) |
| `GET` | `/bookings/me` | Authenticated | List current user reservations |
| `GET` | `/bookings/:bookingId` | Guest Owner / Host / Admin | Reservation details & payment status |
| `POST` | `/bookings/:bookingId/cancel` | Guest Owner / Host / Admin | Cancel reservation if eligible |
| `POST` | `/payments/checkout` | Booking Owner | Create gateway order with server amount |
| `POST` | `/payments/verify` | Booking Owner | Verify signature & confirm booking |
| `POST` | `/payments/webhook` | Provider Webhook | Idempotent webhook verification |

## Host & Admin Operations
| Method | Path | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/host/properties` | Host / Admin | View own properties & counts |
| `GET` | `/host/bookings` | Host / Admin | View reservations on host properties |
| `GET` | `/admin/users` | Admin | List all registered users |
| `PATCH` | `/admin/users/:userId/status`| Admin | Deactivate/activate user or change role |
| `GET` | `/admin/properties` | Admin | Moderation queue for properties |
| `PATCH` | `/admin/properties/:propertyId/status` | Admin | Update status (ACTIVE, REJECTED, etc.) |
| `GET` | `/admin/bookings` | Admin | View all system reservations |
