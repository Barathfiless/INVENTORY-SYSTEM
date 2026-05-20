# StockSync — MERN Inventory & E-commerce

Full-stack inventory management (admin) and Amazon-style e-commerce (admin + customer) with role-based access control.

## Features

### Inventory Management (Admin only)
- **Dashboard** — products, stock, purchases, sales, orders, low-stock alerts
- **Purchases** — record supplier purchases and increase stock
- **Sales** — record offline/direct sales and decrease stock
- **Stock Available** — view all SKUs, quantities, and low-stock warnings
- **Reports** — filtered purchase/sales/order analytics and top products
- **Products** — CRUD catalog shared with the store
- **E-commerce Orders** — manage online order status

### E-commerce (Admin & Customer)
- Amazon-inspired storefront with search, categories, and deals
- Product detail pages with ratings and add-to-cart
- Shopping cart and checkout (COD)
- Order history for customers

## Tech Stack
- **MongoDB** + **Express** + **React** (Vite) + **Node.js**
- JWT authentication, bcrypt passwords
- Role-based routes: `admin`, `customer`

## Prerequisites
- Node.js 18+ (20+ recommended)
- **MongoDB** — install [MongoDB Community](https://www.mongodb.com/try/download/community) locally, or use [MongoDB Atlas](https://www.mongodb.com/atlas) and set `MONGODB_URI` in `backend/.env`

## Setup

### 1. Backend
```bash
cd backend
cp .env.example .env   # if .env missing
npm install
npm run seed           # demo users + products
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

## Demo Accounts
| Role     | Email                   | Password      |
|----------|-------------------------|---------------|
| Admin    | admin@stocksync.com     | admin123      |
| Customer | customer@stocksync.com  | customer123   |

## API Overview
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/register` | Public |
| GET | `/api/products` | Public |
| GET | `/api/products/admin/*` | Admin |
| POST | `/api/purchases` | Admin |
| POST | `/api/sales` | Admin |
| POST | `/api/orders` | Auth |
| GET | `/api/reports/dashboard` | Admin |

## Project Structure
```
StockSync/
├── backend/     Express API, models, controllers
├── frontend/    React SPA (shop + admin panel)
└── README.md
```
