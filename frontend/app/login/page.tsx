'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Phone, Lock, Sparkles, Home, LogIn } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Loading Security Portal...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('Phone and Password are required!');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { phone, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast.success(`Welcome back, ${data.user.name || 'User'}!`);
      
      // Handle redirect parameter if present
      if (redirect) {
        router.push(redirect);
      } else {
        const role = data.user.role;
        if (role === 'ADMIN') router.push('/admin');
        else if (role === 'MOTHER') router.push('/mother');
        else if (role === 'DELIVERY') router.push('/delivery');
        else router.push('/shop');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Login failed. Please verify credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF7] flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-yellow-100">
      {/* Decorative Blur Circles */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-200/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Home Button */}
      <motion.button 
        whileHover={{ scale: 1.05 }} 
        whileTap={{ scale: 0.95 }} 
        onClick={() => router.push('/')} 
        className="absolute top-6 left-6 p-3 bg-white rounded-2xl border border-stone-200/60 text-stone-700 shadow-sm hover:bg-stone-50 flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all"
      >
        <Home size={14} /> Home
      </motion.button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-xl shadow-orange-100/10 border border-stone-200/50 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-750 px-3.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase mb-4 border border-yellow-250/30">
            <Sparkles size={10} className="animate-spin-slow" /> Security Portal
          </div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tighter leading-none mb-2">MR. <span className="text-yellow-500">CANDY</span></h2>
          <p className="text-xs font-bold text-stone-400">Apna register kiya hua account details daalkar login karein</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-yellow-400 font-bold text-xs"
                placeholder="1111, 2222, or 3333"
              />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-yellow-400 font-bold text-xs"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 disabled:bg-stone-100 disabled:text-stone-300 text-[#1C1917] font-black rounded-xl text-xs uppercase shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-0 mt-6"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Secure Log In</span>
                <LogIn size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-100">
          <p className="text-[10px] font-black text-stone-350 tracking-wider uppercase text-center mb-3">Quick Demo Access Code</p>
          <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold text-stone-500">
            <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
              <span className="block font-black text-stone-700">Admin</span>
              <span>1111 / 1234</span>
            </div>
            <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
              <span className="block font-black text-stone-700">Mummy</span>
              <span>2222 / 1234</span>
            </div>
            <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
              <span className="block font-black text-stone-700">Raju Rider</span>
              <span>3333 / 1234</span>
            </div>
            <div className="bg-stone-50 p-2 rounded-lg border border-stone-100">
              <span className="block font-black text-stone-700">Customer</span>
              <span>4444 / 1234</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
