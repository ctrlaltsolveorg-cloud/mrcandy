'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Order } from '@/types';
import { Package, Search, Calendar, User, MapPin, Phone, Hash, ArrowLeft, ShieldCheck, Sparkles, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchName] = useState('');
  
  // Authorization Guards
  const [authorized, setAuthorized] = useState(false);

  // Dev Switcher
  const [showDevMenu, setShowDevMenu] = useState(false);

  useEffect(() => {
    // Enforce Route Authorization
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      toast.error('Aap logged in nahi hain! Please login karein.');
      router.push('/login?redirect=/admin/orders');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'ADMIN') {
        toast.error('Access Denied! Sirf Admin hi is panel ko access kar sakte hain.');
        router.push('/');
        return;
      }
      setAuthorized(true);
      fetchOrders();
    } catch (e) {
      toast.error('Session error. Please login again.');
      router.push('/login');
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully!');
    router.push('/login');
  };

  const filteredOrders = orders.filter(order => 
    order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerPhone?.includes(searchTerm)
  );

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Checking Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 text-slate-900 pb-24">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-4 sm:p-6 rounded-[24px] shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="p-2 sm:p-3 bg-slate-50 text-slate-600 rounded-[14px] hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-0.5">Order Management</h1>
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">Customer Details & Tracking</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                placeholder="Search name/phone..."
                value={searchTerm}
                onChange={e => setSearchName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-[16px] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-bold text-xs shadow-inner"
              />
            </div>
            
            <button onClick={handleLogout} className="bg-rose-50 text-rose-600 px-5 py-2.5 rounded-[16px] font-black text-xs flex items-center justify-center border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm shrink-0">
                <LogOut size={14} className="mr-1.5" /> LOG OUT
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-[24px] border border-slate-100 shadow-md shadow-slate-200/40 overflow-hidden group hover:border-indigo-100 transition-all">
              <div className="flex flex-col lg:flex-row">
                {/* Left: Order Meta */}
                <div className="p-5 lg:w-1/4 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-row lg:flex-col justify-between lg:justify-start items-center lg:items-start">
                  <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black mb-1">₹{order.totalAmount}</h3>
                      <div className="flex items-center text-slate-400 text-[10px] sm:text-xs font-bold gap-1.5 mb-0 lg:mb-5">
                        <Calendar size={12} /> {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                  </div>
                  <div className="bg-white p-3 rounded-[16px] border border-slate-100 shadow-sm text-center lg:text-left min-w-[100px]">
                    <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Order OTP</p>
                    <p className="text-xl sm:text-2xl font-black text-indigo-600 tracking-widest">{order.otp}</p>
                  </div>
                </div>

                {/* Middle: Customer Details */}
                <div className="p-5 sm:p-6 lg:w-2/4 flex flex-col justify-center gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-[14px] flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 flex-shrink-0">
                            <User size={18} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-base sm:text-lg font-black truncate">{order.customerName || 'Walk-in Customer'}</p>
                            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] sm:text-xs">
                                <Phone size={12} /> {order.customerPhone || 'No Phone'}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-3 sm:gap-4 bg-slate-50/50 p-3 rounded-[16px] border border-slate-100">
                        <div className="w-10 h-10 bg-rose-50 rounded-[14px] flex items-center justify-center text-rose-500 shadow-sm border border-rose-100 mt-0.5 flex-shrink-0">
                            <MapPin size={18} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-slate-700 text-xs sm:text-sm leading-snug line-clamp-2">{order.address || 'N/A'}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                <Hash size={10} /> PIN: {order.pincode || '000000'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Items List */}
                <div className="p-5 sm:p-6 lg:w-1/4 bg-slate-50/50 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Items Summary</p>
                    <div className="space-y-2 overflow-y-auto max-h-32 pr-1 custom-scrollbar flex-1">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-[12px] border border-slate-100 shadow-sm">
                                <span className="font-bold text-slate-700 text-xs truncate mr-2">{item.product?.name || 'Item'}</span>
                                <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">x{item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    {order.deliveryCharges !== undefined && order.deliveryCharges > 0 && (
                        <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between items-center text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                            <span>Delivery Fee ({order.distance} km)</span>
                            <span>₹{order.deliveryCharges}</span>
                        </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredOrders.length === 0 && (
          <div className="text-center py-24 bg-white rounded-[32px] border-2 border-dashed border-slate-200 mt-6">
              <Package size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-lg font-black text-slate-400 uppercase tracking-widest">No Orders Found</p>
          </div>
        )}
      </div>

      {/* Dev Switcher overlay */}
      <DevSwitcher activeRole="ADMIN" router={router} showMenu={showDevMenu} setShowMenu={setShowDevMenu} />
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
