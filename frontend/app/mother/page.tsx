'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Product } from '@/types';
import { Plus, Minus, Package, Home, Sparkles, TrendingUp, ArrowUpDown, RefreshCw, ShieldCheck, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function MotherPanel() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'stock'>('newest');
  
  // Authorization Guard
  const [authorized, setAuthorized] = useState(false);

  // Developer Role Switcher State
  const [showDevMenu, setShowDevMenu] = useState(false);

  useEffect(() => {
    // Enforce Route Authorization
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      toast.error('Aap logged in nahi hain! Please login karein.');
      router.push('/login?redirect=/mother');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'MOTHER' && user.role !== 'ADMIN') {
        toast.error('Access Denied! Sirf Mummy (Mother) hi is panel ko access kar sakte hain.');
        router.push('/');
        return;
      }
      setAuthorized(true);
      fetchProducts();
    } catch (e) {
      toast.error('Session error. Please login again.');
      router.push('/login');
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
      applySorting(data, sortBy);
    } catch (error) { toast.error('Failed to load products'); } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully!');
    router.push('/login');
  };

  const applySorting = (list: Product[], type: 'newest' | 'stock') => {
    const sorted = [...list];
    if (type === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (type === 'stock') {
      sorted.sort((a, b) => a.retailStock - b.retailStock);
    }
    setDisplayProducts(sorted);
  };

  useEffect(() => {
    if (products.length > 0) {
      applySorting(products, sortBy);
    }
  }, [sortBy]);

  const updateStock = async (id: string, type: 'add' | 'deduct') => {
    try {
      const endpoint = type === 'add' ? `/products/${id}/add-stock` : `/products/${id}/deduct-stock`;
      const { data } = await api.post(endpoint, { multiplier: 1 });

      setProducts(prev => prev.map(p => p.id === id ? data : p));
      setDisplayProducts(prev => prev.map(p => p.id === id ? data : p));

      toast.success(`${type === 'add' ? 'Added Wholesale Pack' : 'Removed Wholesale Pack'}!`);
    } catch (error: any) { 
      const msg = error.response?.data?.message || 'Inventory update failed!';
      toast.error(msg); 
    }
  };

  const renderPhoto = (url: string | null) => {
    if (!url) return <Package className="w-8 h-8 text-stone-300" strokeWidth={1.5} />;
    const fullUrl = url.startsWith('http') ? url : `http://localhost:4000${url}`;
    return <img src={fullUrl} alt="product" className="w-full h-full object-cover" />;
  };

  if (!authorized || loading) return (
    <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-12 h-12 border-4 border-yellow-450 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Checking Authorization...</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFBF7] p-4 sm:p-8 text-[#1C1917] pb-24">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="flex-1">
            <div className="flex items-center gap-3 mb-2.5">
                <button onClick={() => router.push('/')} className="p-2.5 bg-white rounded-xl shadow-sm border border-stone-200 text-stone-900 hover:bg-[#1C1917] hover:text-white transition-all">
                    <Home size={16} strokeWidth={2.5} />
                </button>
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border border-yellow-200/50">Mummy Panel</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter leading-none mb-1">Dukan Stock <span className="text-yellow-600">Check</span></h1>
            <p className="text-xs font-bold text-stone-400">Manage wholesale unit counts. 1 click adds whole pack quantity.</p>
            
            <div className="flex items-center gap-2 mt-6">
                <button 
                  onClick={() => setSortBy('newest')}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] tracking-wider uppercase transition-all flex items-center gap-1.5 border ${sortBy === 'newest' ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}
                >
                  <Sparkles size={11} /> Newest
                </button>
                <button 
                  onClick={() => setSortBy('stock')}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] tracking-wider uppercase transition-all flex items-center gap-1.5 border ${sortBy === 'stock' ? 'bg-[#1C1917] text-white border-[#1C1917]' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}
                >
                  <ArrowUpDown size={11} /> Low Stock First
                </button>
                <button 
                  onClick={() => fetchProducts()}
                  className="p-2 bg-white text-stone-500 rounded-xl border border-stone-200 hover:bg-stone-50 transition-all"
                  title="Refresh Stock"
                >
                  <RefreshCw size={14} />
                </button>
            </div>
        </div>
        <div className="flex gap-4 items-center bg-white px-5 py-4 rounded-2xl border border-stone-200/50 shadow-sm shrink-0 h-fit self-start sm:self-auto">
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Total Products</span>
                <span className="text-xl font-black text-stone-850">{products.length} Items</span>
            </div>
            <div className="w-[1px] h-6 bg-stone-200" />
            <button onClick={handleLogout} className="bg-rose-50 text-rose-600 px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                <LogOut size={14} /> LOG OUT
            </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayProducts.map((product) => (
          <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} key={product.id} className="bg-white rounded-3xl border border-stone-200/60 shadow-sm p-4 flex flex-col group relative">
            {/* Category Tag */}
            <span className="absolute top-4 right-4 bg-stone-50 text-stone-500 px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border border-stone-100">
              {product.category}
            </span>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-16 h-16 bg-stone-50 rounded-xl overflow-hidden flex items-center justify-center border border-stone-100 shadow-inner flex-shrink-0">
                {renderPhoto(product.photoUrl)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-stone-900 mb-1 truncate leading-snug">{product.name}</h3>
                <div className="bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-100 inline-flex items-center shadow-inner">
                    <span className="text-base font-black text-emerald-600 leading-none">{product.retailStock}</span>
                    <span className="text-[9px] font-black text-emerald-500 uppercase ml-1 tracking-wider">{product.unit}</span>
                </div>
              </div>
            </div>

            <div className="bg-stone-50/50 border border-stone-100 rounded-2xl p-2.5 flex items-center justify-between mt-auto">
              <button
                onClick={() => updateStock(product.id, 'deduct')}
                disabled={product.retailStock < product.wholesaleUnitQty}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
                  product.retailStock < product.wholesaleUnitQty 
                  ? 'bg-stone-50 text-stone-200 cursor-not-allowed border border-stone-100' 
                  : 'bg-white text-rose-500 hover:bg-rose-500 hover:text-white border border-stone-200 shadow-sm'
                }`}
                title={`Deduct 1 wholesale pack (-${product.wholesaleUnitQty} ${product.unit})`}
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              
              <div className="text-center px-1">
                <p className="text-[7px] font-black text-stone-400 uppercase tracking-widest leading-none">Pack Qty</p>
                <p className="text-xs font-black text-stone-700 mt-0.5">±{product.wholesaleUnitQty} {product.unit}</p>
              </div>

              <button
                onClick={() => updateStock(product.id, 'add')}
                className="w-9 h-9 flex items-center justify-center bg-[#1C1917] text-white hover:bg-yellow-500 hover:text-[#1C1917] rounded-xl shadow-sm transition-all active:scale-95 border border-[#1C1917]"
                title={`Add 1 wholesale pack (+${product.wholesaleUnitQty} ${product.unit})`}
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-1 text-stone-300">
                <Sparkles size={10} />
                <span className="text-[7px] font-black uppercase tracking-widest">Inventory Sync Live</span>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Dev Switcher Overlay */}
      <DevSwitcher activeRole="MOTHER" router={router} showMenu={showDevMenu} setShowMenu={setShowDevMenu} />
    </div>
  );
}

// Dev switcher inline component with session injector
interface DevSwitcherProps {
  activeRole: string;
  router: any;
  showMenu: boolean;
  setShowMenu: (val: boolean) => void;
}

function DevSwitcher({ activeRole, router, showMenu, setShowMenu }: DevSwitcherProps) {
  const roles = [
    { id: 'CUSTOMER', label: '🛒 Customer view', path: '/shop' },
    { id: 'MOTHER', label: '🥛 Mother Panel', path: '/mother' },
    { id: 'DELIVERY', label: '🛵 Rider Dashboard', path: '/delivery' },
    { id: 'ADMIN', label: '🛠️ Store Admin', path: '/admin' },
  ];

  const handleRoleSwitch = (rolePath: string, roleId: string) => {
    if (roleId === 'CUSTOMER') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else {
      const mockUser = {
        id: `mock-${roleId.toLowerCase()}`,
        name: roleId === 'ADMIN' ? 'Admin Sahab' : roleId === 'MOTHER' ? 'Mummy' : 'Raju Delivery',
        phone: roleId === 'ADMIN' ? '1111' : roleId === 'MOTHER' ? '2222' : '3333',
        role: roleId,
      };
      localStorage.setItem('token', `mock-${roleId.toLowerCase()}-token`);
      localStorage.setItem('user', JSON.stringify(mockUser));
    }
    router.push(rolePath);
    setShowMenu(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[120] flex flex-col items-end">
      <AnimatePresence>
        {showMenu && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="mb-3 bg-[#1C1917] border border-stone-850 text-white rounded-2xl p-3 shadow-2xl w-56 flex flex-col gap-1.5"
          >
            <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest mb-1.5 px-2">Dev Console: Switch Role</p>
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => handleRoleSwitch(role.path, role.id)}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between ${
                  activeRole === role.id 
                    ? 'bg-yellow-400 text-[#1C1917] font-black' 
                    : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                }`}
              >
                <span>{role.label}</span>
                {activeRole === role.id && <ShieldCheck size={12} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setShowMenu(!showMenu)} 
        className="flex items-center gap-2 bg-yellow-400 text-[#1C1917] border-2 border-white px-4 py-2.5 rounded-full font-black text-xs tracking-tight shadow-xl hover:bg-yellow-500 hover:scale-105 active:scale-95 transition-all shrink-0 z-20"
      >
        <Sparkles size={14} className="animate-pulse" />
        <span>Dev Switcher</span>
      </button>
    </div>
  );
}
