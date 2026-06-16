'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import socket from '@/lib/socket';
import { Order } from '@/types';
import { Check, X, MapPin, Phone, Package, Lock, Home, Navigation, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function DeliveryPanel() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [showOtpModal, setShowOtpModal] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    fetchOrders();
    
    // Setup Socket connection
    socket.connect();
    
    socket.on('connect', () => {
      console.log('Connected to socket server with ID:', socket.id);
      socket.emit('join_delivery_room');
    });

    socket.on('new_order', (order: Order) => {
      console.log('Received new order in real-time:', order);
      setIncomingOrder(order);
    });

    // Auto-refresh Active Tasks every 5 seconds just to be absolutely sure
    const interval = setInterval(() => {
        fetchOrders();
    }, 5000);

    return () => { 
      socket.off('connect');
      socket.off('new_order'); 
      clearInterval(interval);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
    } catch (error) { toast.error('Failed to load orders'); }
  };

  const acceptOrder = async (id: string) => {
    try {
      await api.post(`/orders/${id}/accept`);
      toast.success('Order Claimed!');
      setIncomingOrder(null);
      fetchOrders();
    } catch (error) { toast.error('Order already taken!'); setIncomingOrder(null); }
  };

  const completeOrder = async (id: string) => {
    try {
      await api.post(`/orders/${id}/complete`, { otp });
      toast.success('Delivery Successful!');
      setShowOtpModal(null);
      setOtp('');
      fetchOrders();
    } catch (error) { toast.error('Incorrect OTP!'); }
  };

  const toggleItemPacked = async (orderId: string, itemId: string, currentStatus: boolean) => {
    try {
      await api.put(`/orders/${orderId}/items/${itemId}/pack`, { isPacked: !currentStatus });
      // Update local state for immediate feedback
      setOrders(orders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            items: order.items.map(item => 
              item.id === itemId ? { ...item, isPacked: !currentStatus } : item
            )
          };
        }
        return order;
      }));
    } catch (error) {
      toast.error('Failed to update item status');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF7] p-6 sm:p-10 text-[#1C1917]">
      <header className="max-w-4xl mx-auto mb-12 flex justify-between items-center bg-white p-6 rounded-[32px] shadow-xl shadow-orange-100/30 border-2 border-white">
        <div className="flex items-center gap-5">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => router.push('/')} className="p-3.5 bg-stone-50 text-stone-900 rounded-2xl hover:bg-[#1C1917] hover:text-white transition-all shadow-inner">
                <Home size={22} strokeWidth={2.5} />
            </motion.button>
            <div>
                <h1 className="text-2xl font-black tracking-tight leading-none mb-1">Rider <span className="text-[#F43F5E]">Dashboard</span></h1>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Live Operations</p>
            </div>
        </div>
        <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Active</span>
        </div>
      </header>

      <AnimatePresence>
      {incomingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1C1917]/80 backdrop-blur-xl">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white rounded-[60px] p-10 w-full max-w-md shadow-2xl border-[8px] border-orange-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12 text-[#F43F5E]"><Bell size={120} /></div>
            <div className="text-center mb-10 relative z-10">
              <div className="w-24 h-24 bg-rose-50 text-[#F43F5E] rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-inner border-2 border-rose-100">
                <Navigation size={48} strokeWidth={2.5} className="animate-bounce" />
              </div>
              <h2 className="text-4xl font-black text-[#1C1917] mb-2 tracking-tighter uppercase italic">New Mission!</h2>
              <div className="inline-flex items-center gap-4 bg-[#1C1917] text-white px-8 py-3 rounded-full shadow-2xl">
                <p className="text-3xl font-black">₹{incomingOrder.totalAmount}</p>
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                <p className="text-lg font-bold text-rose-100">{incomingOrder.items.length} Units</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 relative z-10">
              <button onClick={() => acceptOrder(incomingOrder.id)} className="btn-premium text-2xl py-6 rounded-[35px] shadow-rose-200">CLAIM ORDER</button>
              <button onClick={() => setIncomingOrder(null)} className="w-full py-4 text-stone-400 font-black text-sm uppercase tracking-widest hover:text-[#1C1917] transition-colors">Decline Mission</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-8">
        <h2 className="text-xl font-black text-stone-300 uppercase tracking-[0.4em] ml-2 flex items-center gap-4">
            <div className="w-12 h-1 bg-stone-200 rounded-full" />
            Active Tasks
        </h2>
        {orders.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-[50px] border-4 border-dashed border-orange-50/50 flex flex-col items-center">
                <Package size={64} strokeWidth={1} className="text-stone-100 mb-6" />
                <p className="text-xl font-black text-stone-200 uppercase tracking-widest leading-none">No pending tasks</p>
            </div>
        ) : (
            orders.map((order) => (
                <motion.div layout key={order.id} className="bg-white rounded-[50px] p-8 shadow-2xl shadow-stone-200/50 border-4 border-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-bl-[100px] -z-0 opacity-50 group-hover:scale-110 transition-transform duration-700" />
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 relative z-10">
                    <div className="flex items-center gap-5">
                      <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${
                        order.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {order.status}
                      </span>
                      <p className="font-black text-[#1C1917] text-2xl tracking-tighter leading-none">#{order.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-left sm:text-right bg-stone-50/50 p-4 rounded-3xl border border-stone-100 sm:min-w-[140px]">
                      <p className="text-3xl font-black text-[#1C1917]">₹{order.totalAmount}</p>
                      <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">COD Amount</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 relative z-10">
                    <div className="flex items-center gap-5 bg-[#FFFBF7] p-5 rounded-[32px] border-2 border-orange-50 shadow-inner group-hover:border-orange-100 transition-colors">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-xl border border-rose-50"><MapPin size={24} strokeWidth={2.5}/></div>
                      <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Customer</p><p className="text-xl font-black text-[#1C1917] truncate leading-none">{order.customerName || 'Anonymous'}</p></div>
                    </div>
                    <div className="flex items-center gap-5 bg-[#FFFBF7] p-5 rounded-[32px] border-2 border-orange-50 shadow-inner group-hover:border-orange-100 transition-colors">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-xl border border-emerald-50"><Phone size={24} strokeWidth={2.5}/></div>
                      <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Contact</p><p className="text-xl font-black text-[#1C1917] truncate leading-none">{order.customerPhone || 'N/A'}</p></div>
                    </div>
                  </div>
                  
                  {/* Packing Checklist */}
                  {order.status === 'ACCEPTED' && (
                    <div className="mb-8">
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Packing Checklist</p>
                      <div className="bg-[#FFFBF7] p-4 rounded-[24px] border-2 border-orange-50 shadow-inner space-y-2">
                        {order.items.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => toggleItemPacked(order.id, item.id, !!item.isPacked)}
                            className="flex items-center justify-between p-3 bg-white rounded-[16px] shadow-sm border border-stone-100 cursor-pointer hover:border-emerald-200 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${item.isPacked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 bg-stone-50'}`}>
                                {item.isPacked && <Check size={14} strokeWidth={4} />}
                              </div>
                              <span className={`font-bold text-sm ${item.isPacked ? 'text-stone-400 line-through' : 'text-[#1C1917]'}`}>{item.product?.name}</span>
                            </div>
                            <span className="font-black text-stone-600 text-xs px-2 py-1 bg-stone-100 rounded-lg">{item.quantity} {item.product?.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.status === 'ACCEPTED' && (
                    <button 
                      onClick={() => setShowOtpModal(order.id)} 
                      disabled={order.items.some(item => !item.isPacked)}
                      className={`w-full py-6 text-xl rounded-[32px] shadow-stone-300 flex items-center justify-center group/btn relative overflow-hidden transition-all ${order.items.some(item => !item.isPacked) ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-2 border-stone-200 shadow-none' : 'btn-dark'}`}
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            {order.items.some(item => !item.isPacked) ? 'PACK ALL ITEMS FIRST' : 'VERIFY DELIVERY'} 
                            <Lock size={20} strokeWidth={3} />
                        </span>
                        {!order.items.some(item => !item.isPacked) && (
                            <div className="absolute inset-0 bg-[#F43F5E] translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                        )}
                    </button>
                  )}
                </motion.div>
              ))
        )}
      </div>

      <AnimatePresence>
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1C1917]/90 backdrop-blur-2xl">
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="bg-white rounded-[70px] p-12 w-full max-w-md shadow-2xl border-[10px] border-stone-50 relative">
            <h2 className="text-4xl font-black mb-2 text-center text-[#1C1917] tracking-tighter uppercase italic">Confirm</h2>
            <p className="text-stone-400 font-bold text-center mb-12 uppercase tracking-widest text-xs">Enter 4-Digit Security Code</p>
            <input type="text" placeholder="0 0 0 0" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full p-8 bg-stone-50 rounded-[40px] text-center text-6xl font-black tracking-[1.5rem] mb-12 border-4 border-stone-100 placeholder:text-stone-200 text-[#1C1917] focus:border-emerald-500 outline-none shadow-inner" maxLength={4} />
            <div className="flex flex-col gap-4">
              <button onClick={() => completeOrder(showOtpModal)} className="w-full py-7 bg-emerald-600 text-white rounded-[35px] font-black text-2xl hover:bg-emerald-700 shadow-2xl shadow-emerald-100 active:scale-95 transition-all">COMPLETE DROP</button>
              <button onClick={() => setShowOtpModal(null)} className="w-full py-4 text-stone-300 font-black uppercase text-xs tracking-[0.4em] hover:text-[#F43F5E] transition-colors">Cancel Action</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
