# Deployment & Database Setup Guide (Mr. Candy)

Aapki application local environment se production environment (online) me deploy karne ke liye niche diye gaye steps follow karein. 

---

## 1. Database Setup (Online Database)

Production me SQLite file support nahi hoti (kyunki PaaS platforms jaise Render/Vercel state save nahi rakhte aur container restart hone par database clear ho jata hai). Isliye hum **PostgreSQL** database use karenge.

### Step 1: Create a Free PostgreSQL Database
Aap **Neon** ya **Supabase** par free PostgreSQL database bana sakte hain:
- **Option A (Neon - Recommended):** [Neon.tech](https://neon.tech/) par sign up karein aur ek free database instance create karein. Aapko ek **Connection String** milegi (jaise `postgresql://alex:password@ep-cool-flower-1234.us-east-2.aws.neon.tech/neondb?sslmode=require`).
- **Option B (Supabase):** [Supabase.com](https://supabase.com/) par sign up karein, naya project banayein, aur Settings > Database me jakar Connection string copy karein.

---

## 2. Code Modifications for PostgreSQL

Aapko backend code me dynamic database support aur configurations set karni padegi.

### Step 2: Edit `backend/prisma/schema.prisma`
Prisma me database provider change karein.
Apne `backend/prisma/schema.prisma` file ko open karke **line 8-11** ko badal kar aisa karein:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Step 3: Configure Environment Variables (`.env`)
Apne `backend` folder me `.env` file ko open karein (ya naya banayein) aur apna live connection string set karein:

```env
DATABASE_URL="aapka_neon_ya_supabase_connection_string"
JWT_SECRET="aapka_koi_bhi_secret_key"
PORT=4000
```

---

## 3. Database Migration & Seeding (Online Transfer)

Ab aapko apne database tables online server par create karne hain aur seed data push karna hai.

### Step 4: Live Database par Schema deploy karein
Terminal me `backend` folder ke andar niche diya gaya command run karein:
```bash
npx prisma db push
```
*Yeh command aapke online database par automatic saare tables (`User`, `Product`, `Order`, `OrderItem`, `SystemSetting`) create kar dega.*

### Step 5: Database me Initial Products seed karein
Niche diya gaya command run karein jisse online database me saare initial products, default admin creds (`1111`, password `1234`), aur store settings automatically seed ho jayein:
```bash
npm run seed
```
*(Aapka database ab online ready ho chuka hai!)*

---

## 4. Backend Deployment (Node/Express API)

Aap backend ko **Render.com** ya **Railway.app** par bilkul free deploy kar sakte hain.

### Step 6: Deploy to Render.com
1. [Render.com](https://render.com/) par account banayein aur **New > Web Service** select karein.
2. Apne GitHub repository ko connect karein.
3. Service Settings configure karein:
   - **Name:** `mrcandy-backend`
   - **Language/Runtime:** `Node`
   - **Build Command:** `cd backend && npm install && npm run build`
   - **Start Command:** `cd backend && node dist/app.js`
4. **Environment Variables** tab me jakar niche diye variables add karein:
   - `DATABASE_URL` = *(Aapka PostgreSQL database URL)*
   - `JWT_SECRET` = *(Aapka custom secret token)*
   - `PORT` = `10000` (Render default port)
5. Deploy button click karein. Aapko ek live URL milega, jaise: `https://mrcandy-backend.onrender.com`.

---

## 5. Frontend Deployment (Next.js App)

Frontend ko **Vercel** (Best for Next.js) ya **Render** par deploy karein.

### Step 7: Deploy to Vercel
1. [Vercel.com](https://vercel.com/) par login karke **Add New > Project** select karein.
2. Apne GitHub repository ko connect karein.
3. Configure Project settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Next.js`
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
4. **Environment Variables** section me:
   - `NEXT_PUBLIC_API_URL` = `https://aapka-backend-url.onrender.com/api` (End me `/api` lagana na bhulein)
5. **Deploy** par click karein. Aapka frontend online live ho jayega (e.g. `https://mrcandy-shop.vercel.app`)!

---

## 6. Access and Testing

Aapka pura ecosystem ab online hai!
- **Customer Panel:** `https://aapka-frontend.vercel.app/shop`
- **Admin Dashboard:** `https://aapka-frontend.vercel.app/admin` (Phone: `1111`, Pass: `1234`)
- **Mother Dashboard:** `https://aapka-frontend.vercel.app/mother` (Phone: `2222`, Pass: `1234`)
- **Rider Dashboard:** `https://aapka-frontend.vercel.app/delivery` (Phone: `3333`, Pass: `1234`)
