# MediStock API Backend

Secure REST API backend for the **MediStock** pharmacy inventory management application.

## Tech Stack
- **Runtime**: Node.js (LTS, CommonJS)
- **Framework**: Express 4
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs` (cost factor 12)
- **Schema Validation**: `zod`
- **Security & Hardening**: `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `hpp`, `compression`, `morgan`, `dotenv`
- **Testing**: `jest`, `supertest`, `mongodb-memory-server`

---

## Environment Variables Reference

Configure these variables in `.env` (copy from `.env.example`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | Environment mode (`development`, `production`, `test`). In production, stack traces are withheld and generic 500 error messages are served. |
| `PORT` | Yes | `5000` | Port on which the Express server listens. |
| `MONGO_URI` | Yes | — | MongoDB connection string (e.g. `mongodb://localhost:27017/medistock` or Atlas URI). |
| `JWT_SECRET` | Yes | — | Cryptographic secret for signing tokens. **Must be at least 32 characters**. |
| `JWT_EXPIRES_IN` | No | `1h` | Expiration window for issued JWT tokens (e.g., `1h`, `7d`). |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed CORS origins. Supports comma-separated list of allowed URLs without wildcards. |
| `ADMIN_NAME` | No | `Admin` | Initial administrator full name used by `npm run seed`. |
| `ADMIN_EMAIL` | No | `admin@medistock.com` | Initial administrator email used by `npm run seed`. |
| `ADMIN_PASSWORD` | Optional | — | Initial administrator password used by `npm run seed` (enforces strong password policy). **Remove from environment after initial seed**. |

> 📖 **Production Deployment Guide**: See [DEPLOYMENT.md](../DEPLOYMENT.md) for full instructions on deploying to Render with MongoDB Atlas.

---

## API Reference Table

### Health
| Method | Path | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Service health probe. Returns `{ success: true, status: 'ok' }`. |

### Authentication
| Method | Path | Access Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public (Rate Limited) | Authenticate user credentials, enforce lockout after 5 failed attempts, return JWT token and user profile. |
| `GET` | `/api/auth/me` | Authenticated (`admin`, `staff`) | Retrieve profile details of currently logged-in user. |
| `POST` | `/api/auth/change-password` | Authenticated (`admin`, `staff`) | Change password for current account (requires `currentPassword` & `newPassword`). Invalidate earlier tokens. |

### Medicines Management
| Method | Path | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/medicines` | Authenticated (`admin`, `staff`) | List medicines with pagination, text search (`name`), filtering (`category`, `stockStatus`), and sorting (`sortBy`, `order`). |
| `GET` | `/api/medicines/:id` | Authenticated (`admin`, `staff`) | Retrieve single medicine by MongoDB ObjectId. |
| `POST` | `/api/medicines` | Authenticated (`admin`, `staff`) | Create medicine record. Validates types, strict schema, stamps `createdBy` & `updatedBy`. Emits audit log. |
| `PUT` | `/api/medicines/:id` | Authenticated (`admin`, `staff`) | Update whitelisted medicine fields (`name`, `price`, `stock`, `category`, `expiry`). Emits audit log. |
| `DELETE` | `/api/medicines/:id` | **Admin ONLY** | Delete medicine record. Staff receives `403 Forbidden`. Emits audit log. |

### User Management
| Method | Path | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/users` | **Admin ONLY** | List all user accounts with pagination. Excludes password hashes. |
| `POST` | `/api/users` | **Admin ONLY** | Create new user account (`admin` or `staff`). Enforces strong password policy. Emits audit log. |
| `PATCH` | `/api/users/:id` | **Admin ONLY** | Update user (`name`, `role`, `isActive`). Prevents self-demotion, self-deactivation, and demoting the last admin. Emits audit log. |
| `PATCH` | `/api/users/:id/password` | **Admin ONLY** | Reset a user's password. Updates `passwordChangedAt` to revoke earlier sessions. Emits audit log. |

### Computed & Aggregation Endpoints (MongoDB Pipelines)
| Method | Path | Access Role | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | Authenticated (`admin`, `staff`) | Computes `totalMedicines`, `totalStock`, `lowStock`, `outOfStock`, `availableUnits`, `inventoryValue`, `attentionRequired`, `recentMedicines`, `expiringSoon` (limit 5, soonest first), and `categoryBreakdown` via a single `$facet` query. |
| `GET` | `/api/alerts` | Authenticated (`admin`, `staff`) | Returns `lowStock`, `outOfStock`, `expiringSoon` (within horizon), and `expired` lists. Accepts optional query `?days=90` (validated 1-365). |
| `GET` | `/api/reports/valuation` | **Admin ONLY** | Computes `totalItems`, `totalUnits`, `totalInventoryValue`, per-medicine valuation rows sorted desc by value, and category valuation summary. Staff receives `403 Forbidden`. |

---

## Security Features & Hardening

1. **Strict Authentication & Account Lockout**:
   - Accounts lock for 15 minutes after 5 consecutive failed attempts.
   - Generic error messages (`Invalid email or password`) prevent username/email enumeration.
   - Passwords hashed with `bcryptjs` (salt rounds: 12).
   - Password fields use Mongoose `select: false` and are stripped in `toJSON` serialization.

2. **NoSQL Injection & Parameter Pollution Prevention**:
   - `express-mongo-sanitize` strips `$` and `.` characters from keys.
   - `zod` schemas strictly validate input types (`z.string()`, `z.number()`, `z.enum()`), rejecting injected operator objects with HTTP 400.
   - `hpp` prevents HTTP parameter pollution.

3. **CORS & HTTP Security Headers**:
   - `helmet` sets standard defensive headers (HSTS, CSP, X-Frame-Options, etc.).
   - `cors` enforces strict allowlist from `CLIENT_URL` with credentials support.
   - `x-powered-by` header disabled.

4. **Rate Limiting & Payload Safeguards**:
   - Global rate limiter: 100 requests per 15 minutes per IP.
   - Dedicated login rate limiter: 5 attempts per 15 minutes per IP.
   - Body parser payload limits: 10kb maximum body size (returns `413 Payload Too Large`).

5. **ReDoS & Regex Injection Protection**:
   - Search parameters escape special regex characters prior to query execution.

6. **Structured Audit Logging**:
   - Logs security and resource modification operations as structured JSON lines (`CREATE_MEDICINE`, `UPDATE_MEDICINE`, `DELETE_MEDICINE`, `CREATE_USER`, `UPDATE_USER`, `RESET_PASSWORD`, `CHANGE_PASSWORD`) recording `userId`, `action`, `targetId`, and `timestamp`.

---

## Scripts

```bash
# Start development server with nodemon
npm run dev

# Start production server
npm start

# Run all test suites (Jest + Supertest + MongoMemoryServer)
npm test

# Seed database with initial admin and sample medicines
npm run seed
```
