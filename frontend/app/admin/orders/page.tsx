'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Order } from '@/types';
import { Package, Search, Calendar, User, MapPin, Phone, Hash, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchName] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    }
  };

  const filteredOrders = orders.filter(order => 
    order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerPhone?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 text-slate-900">
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
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={e => setSearchName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[16px] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-bold text-sm shadow-inner"
            />
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
                    <div className="space-y-2 overflow-y-auto max-h-32 pr-1 custom-scrollbar">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-[12px] border border-slate-100 shadow-sm">
                                <span className="font-bold text-slate-700 text-xs truncate mr-2">{item.product.name}</span>
                                <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">x{item.quantity}</span>
                            </div>
                        ))}
                    </div>
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
    </div>
  );
}
