# 🍭 Mr. Candy - Premium Grocery Management System

Welcome to **Mr. Candy**, a high-end, 4-panel grocery store management application designed for a modern, "foodie" experience.

## 🚀 Overview
This application features four specialized interfaces to manage everything from wholesale stock arrivals to customer deliveries.

1.  **🛒 User Shop:** A premium, visual shopping experience for customers.
2.  **👩‍🍳 Mother Panel:** Simple, one-tap wholesale inventory management.
3.  **🛵 Delivery Boy:** Real-time order broadcasting and secure OTP verification.
4.  **⚙️ Admin Control:** Full system configuration, product setup, and unit management.

---

## 🛠 Tech Stack
- **Frontend:** Next.js 15, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend:** Node.js, Express, Socket.io (Real-time).
- **Database:** SQLite (via Prisma ORM) - *Zero configuration required.*

---

## 💻 Local Setup

### 1. Clone & Install
```bash
git clone https://github.com/ctrlaltsolveorg-cloud/mrcandy.git
cd mrcandy
```

### 2. Run Backend
```bash
cd backend
npm install
npx prisma db push
node prisma/seed.js
npm run dev
```
*Backend runs on: `http://localhost:4000`*

### 3. Run Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on: `http://localhost:3000`*

---

## 🌍 Deployment

### **Frontend (Vercel)**
1.  Connect this repo to Vercel.
2.  Set **Root Directory** as `frontend`.
3.  Add Env Var: `NEXT_PUBLIC_API_URL` = (Your Backend URL).

### **Backend (Railway / Render)**
1.  Connect this repo.
2.  Set **Root Directory** as `backend`.
3.  Build Command: `npm install && npx prisma generate`
4.  Start Command: `npm run dev` (or `node src/server.js` after build).

---

© 2026 Mr. Candy Hub - *Aapki pasand, hamari pehchan.*
