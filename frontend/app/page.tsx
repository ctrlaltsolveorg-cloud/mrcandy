'use client';

import { useRouter } from 'next/navigation';
import { ShoppingBag, Package, Truck, Settings, Sparkles, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();

  const cards = [
    { title: 'Order Samaan', desc: 'Fresh & Tasty Items', icon: <Utensils />, path: '/shop', color: 'bg-[#f43f5e]', light: 'bg-rose-50' },
    { title: 'Stock Check', desc: 'Manage Inventory', icon: <Package />, path: '/mother', color: 'bg-[#fbbf24]', light: 'bg-amber-50' },
    { title: 'Delivery', desc: 'Speedy Delivery', icon: <Truck />, path: '/delivery', color: 'bg-[#10b981]', light: 'bg-emerald-50' },
    { title: 'Admin', desc: 'Settings & More', icon: <Settings />, path: '/admin', color: 'bg-[#6366f1]', light: 'bg-indigo-50' },
  ];

  return (
    <div className="min-h-screen bg-[#FFFCF9] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden relative">
      {/* Warm Foodie Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-200/30 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 relative z-10"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="bg-orange-100 text-orange-700 px-5 py-2 rounded-full text-sm font-black tracking-wide uppercase flex items-center gap-2 border-2 border-orange-200 shadow-sm">
            <Sparkles size={16} /> Swadist & Fresh
          </span>
        </div>
        <h1 className="text-7xl sm:text-8xl font-black text-[#2D1B14] mb-4 tracking-tighter leading-none">
          Mr. <span className="text-[#f43f5e]">Candy</span>
        </h1>
        <p className="text-orange-900/60 text-xl sm:text-2xl font-bold max-w-lg mx-auto leading-relaxed italic">
          "Aapki pasand, hamari pehchan."
        </p>
      </motion.div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-4xl relative z-10">
        {cards.map((card, idx) => (
          <motion.button 
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
            whileHover={{ scale: 1.05, rotate: idx % 2 === 0 ? 1 : -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(card.path)}
            className="group bg-white p-8 rounded-[45px] shadow-2xl shadow-orange-100/50 border-4 border-white hover:border-orange-100 flex items-center gap-8 transition-all duration-500"
          >
            <div className={`w-20 h-20 rounded-[30px] ${card.light} flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform duration-500`}>
              <div className={`${card.color} text-white p-4 rounded-2xl shadow-lg shadow-black/10`}>
                {card.icon}
              </div>
            </div>
            <div className="text-left">
              <h2 className="text-3xl font-black text-[#2D1B14] mb-1 tracking-tight">{card.title}</h2>
              <p className="text-orange-900/40 font-bold text-base leading-tight uppercase tracking-widest">{card.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
      
      <div className="mt-24 flex items-center gap-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700 cursor-default">
          <div className="w-12 h-1 text-[#f43f5e] bg-current rounded-full" />
          <p className="text-[#2D1B14] text-sm font-black tracking-[0.3em] uppercase">
            ESTD 2026
          </p>
          <div className="w-12 h-1 text-[#f43f5e] bg-current rounded-full" />
      </div>
    </div>
  );
}
