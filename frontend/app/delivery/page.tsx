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
    socket.connect();
    socket.on('connect', () => { socket.emit('join_delivery_room'); });
    socket.on('new_order', (order: Order) => { setIncomingOrder(order); });
    const interval = setInterval(() => { fetchOrders(); }, 5000);
    return () => { socket.off('connect'); socket.off('new_order'); clearInterval(interval); };
  }, []);

  const fetchOrders = async () => {
    try { const { data } = await api.get('/orders'); setOrders(data); } 
    catch (error) { toast.error('Failed to load orders'); }
  };

  const acceptOrder = async (id: string) => {
    try { await api.post(`/orders/${id}/accept`); toast.success('Order Claimed!'); setIncomingOrder(null); fetchOrders(); } 
    catch (error) { toast.error('Order already taken!'); setIncomingOrder(null); }
  };

  const markOutForDelivery = async (id: string) => {
    try {
        await api.post(`/orders/${id}/out-for-delivery`);
        toast.success('Marked Out for Delivery!');
        fetchOrders();

        if ("geolocation" in navigator) {
            navigator.geolocation.watchPosition((position) => {
                socket.emit('delivery_location_update', {
                    trackingId: orders.find(o => o.id === id)?.deviceTrackingId || '',
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            }, (error) => {
                console.error("GPS Error:", error);
                toast.error("Please enable GPS for live tracking.");
            }, { enableHighAccuracy: true });
        }
    } catch (error) { toast.error('Failed to update status'); }
  };

  const completeOrder = async (id: string) => {
    try { await api.post(`/orders/${id}/complete`, { otp }); toast.success('Delivery Successful!'); setShowOtpModal(null); setOtp(''); fetchOrders(); } 
    catch (error) { toast.error('Incorrect OTP!'); }
  };

  const toggleItemPacked = async (orderId: string, itemId: string, currentStatus: boolean) => {
    try {
      await api.put(`/orders/${orderId}/items/${itemId}/pack`, { isPacked: !currentStatus });
      setOrders(orders.map(order => order.id === orderId ? { ...order, items: order.items.map(item => item.id === itemId ? { ...item, isPacked: !currentStatus } : item) } : order));
    } catch (error) { toast.error('Failed to update item status'); }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF7] p-4 sm:p-8 text-[#1C1917]">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center bg-white p-3 sm:p-4 rounded-3xl shadow-lg shadow-orange-100/30 border-2 border-white">
        <div className="flex items-center gap-3 sm:gap-4">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => router.push('/')} className="p-2 sm:p-3 bg-stone-50 text-stone-900 rounded-xl hover:bg-[#1C1917] hover:text-white transition-all shadow-inner">
                <Home size={20} strokeWidth={2.5} />
            </motion.button>
            <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none mb-1">Rider <span className="text-[#F43F5E]">Dashboard</span></h1>
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Live Operations</p>
            </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Active</span>
        </div>
      </header>

      <AnimatePresence>
      {incomingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/80 backdrop-blur-xl">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 w-full max-w-sm shadow-2xl border-[6px] border-orange-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none rotate-12 text-[#F43F5E]"><Bell size={64} /></div>
            <div className="text-center mb-6 relative z-10">
              <div className="w-16 h-16 bg-rose-50 text-[#F43F5E] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner border-2 border-rose-100">
                <Navigation size={28} strokeWidth={2.5} className="animate-bounce" />
              </div>
              <h2 className="text-2xl font-black text-[#1C1917] mb-2 tracking-tighter uppercase italic">New Mission!</h2>
              <div className="inline-flex items-center gap-2 bg-[#1C1917] text-white px-5 py-2 rounded-full shadow-xl">
                <p className="text-xl font-black">₹{incomingOrder.totalAmount}</p>
                <div className="w-1 h-1 bg-rose-500 rounded-full" />
                <p className="text-xs font-bold text-rose-100">{incomingOrder.items.length} Units</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 relative z-10">
              <button onClick={() => acceptOrder(incomingOrder.id)} className="btn-premium text-base py-4 rounded-[20px] shadow-rose-200">CLAIM ORDER</button>
              <button onClick={() => setIncomingOrder(null)} className="w-full py-2 text-stone-400 font-black text-[10px] uppercase tracking-widest hover:text-[#1C1917] transition-colors">Decline Mission</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-xs font-black text-stone-300 uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
            <div className="w-6 h-1 bg-stone-200 rounded-full" />
            Active Tasks
        </h2>
        {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[24px] border-2 border-dashed border-orange-50/50 flex flex-col items-center">
                <Package size={40} strokeWidth={1.5} className="text-stone-200 mb-3" />
                <p className="text-xs font-black text-stone-300 uppercase tracking-widest leading-none">No pending tasks</p>
            </div>
        ) : (
            orders.map((order) => (
                <motion.div layout key={order.id} className="bg-white rounded-[32px] p-5 shadow-lg shadow-stone-200/50 border-2 border-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-stone-50 rounded-bl-[40px] -z-0 opacity-50 group-hover:scale-110 transition-transform duration-700" />
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${
                        order.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {order.status}
                      </span>
                      <p className="font-black text-[#1C1917] text-base tracking-tighter leading-none">#{order.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-left sm:text-right bg-stone-50/50 p-2.5 rounded-2xl border border-stone-100 sm:min-w-[100px]">
                      <p className="text-xl font-black text-[#1C1917]">₹{order.totalAmount}</p>
                      <p className="text-[8px] font-black text-stone-300 uppercase tracking-widest">COD Amount</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 relative z-10">
                    <div className="flex items-center gap-3 bg-[#FFFBF7] p-3 rounded-[24px] border-2 border-orange-50 shadow-inner group-hover:border-orange-100 transition-colors">
                      <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center text-rose-500 shadow-sm border border-rose-50"><MapPin size={18} strokeWidth={2.5}/></div>
                      <div className="flex-1 min-w-0"><p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Customer</p><p className="text-sm font-black text-[#1C1917] truncate leading-none">{order.customerName || 'Anonymous'}</p></div>
                    </div>
                    <div className="flex items-center gap-3 bg-[#FFFBF7] p-3 rounded-[24px] border-2 border-orange-50 shadow-inner group-hover:border-orange-100 transition-colors">
                      <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-50"><Phone size={18} strokeWidth={2.5}/></div>
                      <div className="flex-1 min-w-0"><p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Contact</p><p className="text-sm font-black text-[#1C1917] truncate leading-none">{order.customerPhone || 'N/A'}</p></div>
                    </div>
                  </div>
                  
                  {order.status === 'PENDING' && (
                    <button onClick={() => acceptOrder(order.id)} className="w-full btn-premium py-4 text-sm rounded-[24px] shadow-rose-200 flex items-center justify-center group/btn relative overflow-hidden">
                        <span className="relative z-10 flex items-center gap-2">CLAIM ORDER <Check size={16} strokeWidth={3} /></span>
                    </button>
                  )}

                  {order.status === 'ACCEPTED' && (
                    <div className="mb-5">
                      <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-2">Packing Checklist</p>
                      <div className="bg-[#FFFBF7] p-2.5 rounded-[20px] border-2 border-orange-50 shadow-inner space-y-1">
                        {order.items.map(item => (
                          <div key={item.id} onClick={() => toggleItemPacked(order.id, item.id, !!item.isPacked)} className="flex items-center justify-between p-2.5 bg-white rounded-[14px] shadow-sm border border-stone-100 cursor-pointer hover:border-emerald-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${item.isPacked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 bg-stone-50'}`}>
                                {item.isPacked && <Check size={12} strokeWidth={4} />}
                              </div>
                              <span className={`font-bold text-xs ${item.isPacked ? 'text-emerald-700' : 'text-[#1C1917]'}`}>{item.product?.name}</span>
                            </div>
                            <span className="font-black text-stone-500 text-[9px] px-2 py-1 bg-stone-100 rounded-md">{item.quantity} {item.product?.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.status === 'ACCEPTED' && (
                    <button onClick={() => markOutForDelivery(order.id)} disabled={order.items.some(item => !item.isPacked)} className={`w-full py-4 text-sm rounded-[24px] shadow-stone-300 flex items-center justify-center group/btn relative overflow-hidden transition-all ${order.items.some(item => !item.isPacked) ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-2 border-stone-200 shadow-none' : 'btn-dark'}`}>
                        <span className="relative z-10 flex items-center gap-2">
                            {order.items.some(item => !item.isPacked) ? 'PACK ALL ITEMS FIRST' : 'START DELIVERY (GPS)'} 
                            <Navigation size={16} strokeWidth={3} />
                        </span>
                        {!order.items.some(item => !item.isPacked) && (
                            <div className="absolute inset-0 bg-[#F43F5E] translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                        )}
                    </button>
                  )}

                  {order.status === 'OUT_FOR_DELIVERY' && (
                    <button onClick={() => setShowOtpModal(order.id)} className="w-full btn-premium py-4 text-sm rounded-[24px] shadow-rose-200 flex items-center justify-center group/btn relative overflow-hidden">
                        <span className="relative z-10 flex items-center gap-2">
                            VERIFY DELIVERY 
                            <Lock size={16} strokeWidth={3} />
                        </span>
                    </button>
                  )}
                </motion.div>
              ))
        )}
      </div>

      <AnimatePresence>
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/90 backdrop-blur-2xl">
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="bg-white rounded-[40px] p-6 sm:p-8 w-full max-w-sm shadow-2xl border-[6px] border-stone-50 relative">
            <h2 className="text-2xl font-black mb-1 text-center text-[#1C1917] tracking-tighter uppercase italic">Confirm</h2>
            <p className="text-stone-400 font-bold text-center mb-6 uppercase tracking-widest text-[9px]">Enter 4-Digit Code</p>
            <input type="text" placeholder="0000" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full p-4 bg-stone-50 rounded-[24px] text-center text-4xl font-black tracking-[1rem] mb-6 border-4 border-stone-100 placeholder:text-stone-200 text-[#1C1917] focus:border-emerald-500 outline-none shadow-inner" maxLength={4} />
            <div className="flex flex-col gap-2">
              <button onClick={() => completeOrder(showOtpModal)} className="w-full py-4 bg-emerald-600 text-white rounded-[20px] font-black text-sm hover:bg-emerald-700 shadow-xl shadow-emerald-100 active:scale-95 transition-all">COMPLETE DROP</button>
              <button onClick={() => setShowOtpModal(null)} className="w-full py-3 text-stone-300 font-black uppercase text-[10px] tracking-[0.3em] hover:text-[#F43F5E] transition-colors">Cancel Action</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}