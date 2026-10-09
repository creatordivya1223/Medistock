# MediStock — Pharmacy Inventory Management System

A full-stack, production-ready pharmacy inventory management web application built with React, Redux Toolkit, Node.js, Express, and MongoDB.

## Features
- **Medicine Inventory**: Real-time CRUD, stock level indicators, category tagging, batch expiration tracking, and search/filtering.
- **Role-Based Access Control (RBAC)**: Secure JWT authentication with `admin` and `staff` permission levels.
- **Interactive Dashboard & Reports**: Inventory valuation, category breakdowns, stock alerts, and downloadable reports.
- **Enterprise Security**: Helmet headers, CORS origin restrictions, rate limiting with IP lockout, NoSQL injection protection, HPP, and audit logging.

## Tech Stack
- **Frontend**: React 19, Vite, Redux Toolkit, React Router 7, React Icons, Axios
- **Backend**: Node.js, Express 4, Mongoose / MongoDB Atlas, Zod, JWT, Bcrypt
- **Deployment**: Render (API Web Service), MongoDB Atlas (Cloud Database), Vercel/Netlify (Frontend)

## Quick Start (Local Development)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env # customize your variables
npm run seed        # seed initial admin & sample inventory
npm run dev         # starts API at http://localhost:5000
```

### 2. Frontend Setup
```bash
npm install
npm run dev         # starts UI at http://localhost:5173
```

## Production Deployment Guide

For full production deployment instructions with MongoDB Atlas and Render, please consult:
👉 **[DEPLOYMENT.md](./DEPLOYMENT.md)**
