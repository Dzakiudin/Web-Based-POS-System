# 🌌 Midnight Glass POS Pro
> **Commercial-Grade Point of Sale & Analytics System**

![Platform](https://img.shields.io/badge/Platform-Web-indigo)
![Architecture](https://img.shields.io/badge/Architecture-MERN-blue?logo=react)
![UI](https://img.shields.io/badge/Design-Midnight_Glass-purple)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)

Midnight Glass POS is a premium, high-performance Point of Sale system designed for modern retail environments. Built with a stunning **glassmorphic aesthetic**, it provides a seamless bridge between powerful business management and luxurious user experience.

---

## ✨ Key Feature Ecosystem

### 🛒 Core POS & Transactions
- **Express Checkout:** Optimized flow for high-speed transactions.
- **Dynamic Cart:** Real-time calculation with support for multiple payment methods (Cash, QRIS, Transfer).
- **Receipt Generation:** Professional branding with digital and printable formats.

### 📦 Inventory & Categories
- **Smart Tracking:** Automated stock deduction with low-stock alerts.
- **Categorization:** Color-coded categories for rapid visual product search.
- **Variant Management:** Support for different sizes, colors, or types per product.

### 💎 CRM & Loyalty System
- **Customer Tiers:** Automated tiering (Bronze, Silver, Gold, Platinum) based on spending.
- **Loyalty Points:** Gamified rewards system to increase customer retention.
- **Voucher Engine:** Custom promo codes and discount management.

### 📊 Business Intelligence
- **Real-time Dashboard:** Live revenue tracking and transaction counters.
- **Peak Hour Analytics:** Identify your busiest hours to optimize staffing.
- **Top Products:** Data-driven insights into your best-selling inventory.

### 🛡️ Security & Enterprise Controls
- **RBAC:** Role-Based Access Control (Owner, Admin, Cashier).
- **Audit Logs:** Full traceability of every critical action performed in the system.
- **Cash Management:** Structured cashier sessions with opening/closing balance verification.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, Axios |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Auth** | JWT (JSON Web Tokens) with Secure Middleware |
| **Logging** | Winston & Custom Audit Logging |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL Instance
- npm or yarn

### 1. Database Setup
```bash
# In the /server directory
npm install
cp .env.example .env
# Edit .env and set your DATABASE_URL
npx prisma migrate dev --name init
npx prisma generate
```

### 2. Backend Initialization
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend Initialization
```bash
cd client
npm install
npm run dev
# Dashboard available on http://localhost:5173
```

---

## 🔒 Environment Variables
Ensure the following are configured in `server/.env`:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `JWT_SECRET`: A secure string for token signing.
- `PORT`: Server port (defaults to 5000).

---

## 🎨 Design Philosophy
The system utilizes the **"Midnight Glass"** design system:
- **Glassmorphism:** Transparency and background blurs for depth.
- **Vibrant Accents:** High-contrast indigo and violet hues.
- **Kinetic Motion:** Subtle micro-animations using Tailwind transitions.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Created with ❤️ for professional retail excellence.*
