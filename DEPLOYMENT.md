# MediStock Production Deployment Guide

Complete step-by-step guide for deploying the **MediStock** Pharmacy Management System to production using **Render** (API backend), **MongoDB Atlas** (cloud database), and **Vercel / Netlify** (React frontend).

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │            Client Browser              │
                      └───────────────────┬────────────────────┘
                                          │
                     HTTPS                │ HTTPS
                       │                  ▼
                       │        ┌───────────────────┐
                       │        │ Frontend (Vite)   │
                       │        │ Vercel / Netlify  │
                       │        └───────────────────┘
                       │                  │
                       │                  │ API Requests via Axios
                       ▼                  ▼ (VITE_API_URL=https://.../api)
             ┌────────────────────────────────────────┐
             │       Render Reverse Proxy / LB        │
             │   (SSL termination, X-Forwarded-For)   │
             └───────────────────┬────────────────────┘
                                 │
                                 ▼ (trust proxy: 1)
             ┌────────────────────────────────────────┐
             │         MediStock Node.js API          │
             │     (Express 4, Helmet, CORS, HPP,     │
             │    Rate Limit, Zod, Sanitization)      │
             └───────────────────┬────────────────────┘
                                 │
                                 ▼ Mongoose TLS Connection
             ┌────────────────────────────────────────┐
             │          MongoDB Atlas (M0)            │
             │     `medistock` production cluster     │
             └────────────────────────────────────────┘
```

---

## Step 1: Set Up MongoDB Atlas Cluster

### 1.1 Create Account and Free Cluster
1. Sign up or log in at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create** to launch a new database cluster.
3. Choose the **M0 Free (Shared)** tier.
4. Select your Cloud Provider and Region:
   - **Provider**: AWS
   - **Region**: Choose the region closest to where your Render service will be deployed (e.g., `Frankfurt (eu-central-1)`, `Ohio (us-east-2)`, or `Oregon (us-west-2)`).
5. Name your cluster (e.g., `medistock-cluster`) and click **Create Deployment**.

### 1.2 Create Database User (Least Privilege)
1. In the Atlas dashboard, navigate to **Security** > **Database Access**.
2. Click **Add New Database User**.
3. Authentication Method: **Password**.
4. Set credentials:
   - **Username**: e.g., `medistock_app_user`
   - **Password**: Generate a secure password (avoid symbols like `@`, `:`, `/`, or `%` which require URL-encoding, or URL-encode them if used).
5. Under **Database User Privileges**:
   - Do **NOT** use `atlasAdmin`.
   - Select **Built-in Role** > **Read and write to any database** OR choose **Add Specific Privileges**:
     - Database: `medistock`
     - Collection: (leave blank for all collections)
     - Role: `readWrite`
6. Click **Add User**.

### 1.3 Configure Network Access Rules
1. In the left navigation, select **Security** > **Network Access**.
2. Click **Add IP Address**.
3. Render Free Web Services use dynamic outbound IP addresses from a shared pool, so you must allow connections from any IP:
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Entry description: `Render Cloud Web Service dynamic IPs`.
4. Click **Confirm**. Wait ~1 minute until the rule status turns from *Pending* to *Active*.

> [!NOTE]
> MongoDB Atlas requires strict user authentication (username + complex password + SCRAM-SHA-256) even with `0.0.0.0/0`. On dedicated paid cloud infrastructure with static egress IPs, you can lock this down to Render's dedicated outbound IPs.

### 1.4 Get the Connection String
1. Go to **Deployment** > **Database**.
2. Click **Connect** next to your cluster.
3. Select **Drivers** (Node.js).
4. Copy the connection string format:
   ```
   mongodb+srv://<username>:<password>@medistock-cluster.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=medistock-cluster
   ```
5. Append the database name `/medistock` right before the `?` query parameters:
   ```
   mongodb+srv://medistock_app_user:YourSecurePassword123@medistock-cluster.xxxx.mongodb.net/medistock?retryWrites=true&w=majority&appName=medistock-cluster
   ```

---

## Step 2: Deploy Backend to Render

### 2.1 Connect Repository to Render
1. Log in to [Render](https://dashboard.render.com).
2. Click **New +** in the top navigation and select **Web Service**.
3. Select **Build and deploy from a Git repository**.
4. Connect your GitHub account and choose the repository (`creatordivya1223/Medistock` or your fork).

### 2.2 Configure Web Service Settings
Fill in the configuration fields:

| Setting | Value | Explanation |
|---|---|---|
| **Name** | `medistock-api` | Your unique service identifier on Render. |
| **Region** | Same region as Atlas (e.g., `Frankfurt`, `Oregon`, `Ohio`) | Minimizes network latency between API and MongoDB. |
| **Branch** | `main` | Production branch. |
| **Root Directory** | `backend` | **Important**: Tells Render to build from the `backend/` folder. |
| **Runtime** | `Node` | LTS Node.js environment. |
| **Build Command** | `npm install` | Installs backend dependencies. |
| **Start Command** | `npm start` | Executes `node src/server.js` (listens on `process.env.PORT`). |
| **Instance Type** | `Free` | Free tier instance (512 MB RAM, 0.1 CPU). |

### 2.3 Set Environment Variables on Render
Scroll down to the **Environment Variables** section and add the following keys:

| Key | Example Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enforces production security, structured logging, and stack trace suppression. |
| `PORT` | `10000` | Port for the HTTP listener (Render sets this automatically, but you can declare it). |
| `MONGO_URI` | `mongodb+srv://medistock_app_user:PASSWORD@cluster.mongodb.net/medistock?retryWrites=true&w=majority` | Your MongoDB Atlas connection URI with database `/medistock`. |
| `JWT_SECRET` | `c37b98f24419ad24f6ef84b39fae7c99738bf5e8e82f7c00e6d63da2482315b7` | Strong 64-byte random secret. **Must be ≥ 32 characters**. |
| `JWT_EXPIRES_IN` | `1h` | Token expiration duration (e.g., `1h` or `7d`). |
| `CLIENT_URL` | `https://medistock.vercel.app` | Production frontend URL (or comma-separated URLs). No wildcards. |
| `ADMIN_NAME` | `System Admin` | Admin name for initial seeding. |
| `ADMIN_EMAIL` | `admin@medistock.com` | Initial admin login email. |
| `ADMIN_PASSWORD` | `SecureAdminPass2026!` | Initial admin password (≥ 8 characters). **Removed after seeding.** |

> [!TIP]
> Generate a cryptographically strong `JWT_SECRET` locally:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

4. Click **Create Web Service**. Render will pull the code, install dependencies, and start the service.

---

## Step 3: Run Database Seed Script & Remove Admin Password

### 3.1 Run Seeding Script on Render
To seed the initial admin account and default medicine catalog into MongoDB Atlas:

#### Method A: Via Render Shell (Recommended)
1. On your Render Web Service dashboard, click **Shell** in the left menu.
2. Once the terminal opens, execute:
   ```bash
   npm run seed
   ```
3. Observe the output:
   ```
   Connecting to database for seeding...
   MongoDB Connected: medistock-cluster.xxxx.mongodb.net (medistock)
   ✅ Admin user seeded successfully:
      - Name: System Admin
      - Email: admin@medistock.com
      - Role: admin
      - ID: 6ac86...
   ✅ Seeded 6 default medicines.
   Database connection closed.
   ```

#### Method B: Via One-Off Job or Local CLI
If the Render Free tier Shell tab is disabled on your plan, you can run the seed script locally pointing to the Atlas database:
```bash
# In your local backend directory:
MONGO_URI="mongodb+srv://medistock_app_user:PASSWORD@cluster.mongodb.net/medistock?retryWrites=true&w=majority" \
JWT_SECRET="c37b98f24419ad24f6ef84b39fae7c99738bf5e8e82f7c00e6d63da2482315b7" \
CLIENT_URL="https://medistock.vercel.app" \
ADMIN_NAME="System Admin" \
ADMIN_EMAIL="admin@medistock.com" \
ADMIN_PASSWORD="SecureAdminPass2026!" \
node src/scripts/seed.js
```

### 3.2 Remove `ADMIN_PASSWORD` from Environment Variables
Once seeding completes:
1. In the Render Web Service dashboard, go to **Environment**.
2. Find `ADMIN_PASSWORD` in the variables table.
3. Click the **Delete** (trash bin) icon next to `ADMIN_PASSWORD`.
4. Click **Save Changes**.
5. Render will automatically redeploy the service.

> [!IMPORTANT]
> The backend environment schema (`src/config/env.js`) treats `ADMIN_PASSWORD` as optional at runtime. The web service starts normally without the plain-text password in the environment, protecting your system against credential exposure.

---

## Step 4: Verify Production Hardening

Verify that your deployed backend satisfies all production security standards:

### 4.1 Verify Trust Proxy
Render uses an internal reverse proxy in front of every Web Service. MediStock explicitly configures:
```javascript
// src/app.js
app.set('trust proxy', 1);
```
- **Verification**: Check your logs when requests come in. Rate-limiting uses the client's actual IP address forwarded in the `X-Forwarded-For` header, rather than Render's internal router IP.

### 4.2 Verify CORS Allowlist
The CORS middleware allows only origins listed in `CLIENT_URL` (normalizing trailing slashes) and allows non-browser requests without an `Origin` header (health checks, curl).

- **Allowed origin test**:
  ```bash
  curl -i -H "Origin: https://medistock.vercel.app" https://medistock-api.onrender.com/api/health
  # Response: HTTP 200 OK
  # access-control-allow-origin: https://medistock.vercel.app
  ```

- **Blocked origin test**:
  ```bash
  curl -i -H "Origin: https://malicious-site.com" https://medistock-api.onrender.com/api/health
  # Response: HTTP 403 Forbidden
  # { "success": false, "message": "Blocked by CORS policy: Origin not allowed" }
  ```

### 4.3 Verify Error Handling (Stack Trace Suppression)
When `NODE_ENV=production`:
- Unhandled 500 errors never return internal error messages or file paths; they return:
  ```json
  {
    "success": false,
    "message": "Something went wrong. Please try again later."
  }
  ```
- The `stack` property is completely omitted from all error responses.
- Validation errors (400) continue to return clean field-level messages without server internals.

### 4.4 Verify Health Check Probe
Visit your deployed endpoint in the browser or via curl:
```bash
curl https://<your-service-name>.onrender.com/api/health
```
Expected response:
```json
{
  "success": true,
  "status": "ok"
}
```

---

## Step 5: Frontend Deployment Configuration

### 5.1 Set `VITE_API_URL`
When deploying the frontend to **Vercel**, **Netlify**, or **Render Static Sites**:

1. In the frontend hosting dashboard, go to **Environment Variables**.
2. Add:
   ```
   VITE_API_URL=https://<your-render-backend-url>.onrender.com/api
   ```
   *(e.g., `https://medistock-api.onrender.com/api`)*
3. Trigger a frontend deployment (`npm run build`).
4. In `src/api/client.js`, Axios automatically routes all API requests through this base URL:
   ```javascript
   const api = axios.create({
     baseURL: import.meta.env.VITE_API_URL.replace(/\/+$/, ''),
     headers: { 'Content-Type': 'application/json' },
   });
   ```

### 5.2 Render Free Tier Sleep Behavior & Cold Starts

> [!WARNING]
> **Render Free Tier Inactivity Sleep**:
> Free Render Web Services automatically **spin down into sleep mode** after **15 minutes of inactivity**.
> - When a new request arrives, Render boots a fresh container.
> - The first request can experience a **cold start delay of 50 to 90 seconds**.
> - Subsequent requests respond instantly once the container is warm.

#### Best Practices for Managing Cold Starts:
1. **Frontend Loading Feedback**: The MediStock UI includes skeleton loaders and spinners so users know a request is in flight.
2. **Ping Service (Optional)**: If you need your API to stay awake during business hours, you can set up a free HTTP ping on [UptimeRobot](https://uptimerobot.com) or [cron-job.org](https://cron-job.org) targeting `https://<your-app>.onrender.com/api/health` every 10–14 minutes.
3. **Upgrade Path**: Upgrading the Web Service to Render's **Starter** tier ($7/mo) completely disables sleep mode and guarantees 100% uptime.

---

## Step 6: Production Security Checklist

Before handing off the project or going live, confirm each item in this checklist:

- [x] **Strong `JWT_SECRET`**:
  - Length ≥ 32 characters (recommended: 64 hex characters / 256-bit entropy).
  - Generated using `crypto.randomBytes(48).toString('hex')`.
  - Stored strictly in Render environment variables, never hardcoded.

- [x] **HTTPS Only**:
  - Render automatically provides managed SSL/TLS certificates and forces HTTPS.
  - Vercel/Netlify enforces HTTPS for frontend assets.
  - All cookies and authorization headers are encrypted in transit.

- [x] **MongoDB User with Least Privilege**:
  - Dedicated user `medistock_app_user` created.
  - Scoped only to `readWrite` on the `medistock` database.
  - No cluster administrator (`atlasAdmin`) credentials used by the application.

- [x] **MongoDB Atlas IP Access List**:
  - Configured with `0.0.0.0/0` with high-entropy database password.
  - Regularly audited for inactive database users.

- [x] **No `.env` Committed to Git**:
  - `.gitignore` verified in root and `backend/`.
  - Ran `git check-ignore backend/.env .env` (both confirmed ignored).
  - Only `.env.example` templates committed.

- [x] **Admin Password Erased**:
  - `ADMIN_PASSWORD` removed from Render environment variables after initial `npm run seed`.

- [x] **CORS Allowlist Restricted**:
  - `CLIENT_URL` matches the exact deployed frontend origin (e.g., `https://medistock.vercel.app`).
  - No wildcard (`*`) allowed.

- [x] **Express Trust Proxy & Rate Limiter Active**:
  - `app.set('trust proxy', 1)` enables accurate client IP tracking.
  - Global rate limiter (100 req / 15 min / IP) and auth rate limiter (5 failed attempts → lockout) active.

- [x] **Stack Traces Hidden in Error Responses**:
  - In `production`, internal errors return generic messages and stack traces are stripped.
