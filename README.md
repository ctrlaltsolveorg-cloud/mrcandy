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
- **Database:** PostgreSQL (via Prisma ORM) - *Configured online via Neon Serverless Postgres.*

---

## 💻 Local Setup & Development

### 1. Clone & Install
```bash
git clone https://github.com/ctrlaltsolveorg-cloud/mrcandy.git
cd mrcandy
```

### 2. Environment Variables (.env)
Create a `.env` file in the `backend` directory and add the environment variables:
```env
DATABASE_URL="postgresql://neondb_owner:npg_MOD97vlcwIpQ@ep-gentle-cloud-atu3s5dj.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="supersecret123"
PORT=4000
```

### 3. Run Backend
```bash
cd backend
npm install
npm run dev
```
*Backend runs on: `http://localhost:4000`*

### 4. Run Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on: `http://localhost:3000`*

---

## 🌍 Live Deployment (Bacha Hua Kaam / Remaining Steps)

Online Neon database configure karne aur data feed karne ka kaam main (Antigravity) complete kar chuka hu. Ab aapko keval application servers ko hosting par active karna hai:

### Step 1: Push latest changes to GitHub
Apne code changes ko GitHub repository par push karein:
```bash
git add .
git commit -m "feat: postgres config, stateless image uploader, and deployment setup"
git push origin main
```

### Step 2: Deploy Backend to Render.com (or Railway)
1. **Render.com** par register karein aur **New > Web Service** create karein.
2. Apne GitHub repository ko connect karein.
3. Niche di gayi settings fill karein:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/app.js`
4. **Environment Variables** button click karein aur add karein:
   - `DATABASE_URL` = `postgresql://neondb_owner:npg_MOD97vlcwIpQ@ep-gentle-cloud-atu3s5dj.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - `JWT_SECRET` = `supersecret123`
5. Deploy service click karein. Deploy hone ke baad, aapko ek automatic live API link milega (jaise: `https://mrcandy-backend.onrender.com`).

### Step 3: Deploy Frontend to Vercel
1. **Vercel.com** par project create karein aur GitHub repo connect karein.
2. Settings check karein:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Next.js`
3. **Environment Variables** me add karein:
   - `NEXT_PUBLIC_API_URL` = `https://aapka-backend.onrender.com/api` (Render se mila backend API link aur ant me `/api` lagayein)
4. Deploy button click karein! Pura set live aur connect ho chuka hai!

---

© 2026 Mr. Candy Hub - *Aapki pasand, hamari pehchan.*
