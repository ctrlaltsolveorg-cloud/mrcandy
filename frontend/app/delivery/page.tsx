'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import socket from '@/lib/socket';
import { Order } from '@/types';
import { Check, X, MapPin, Phone, Package, Lock, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function DeliveryPanel() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [showOtpModal, setShowOtpModal] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    fetchOrders();
    socket.emit('join_delivery_room');

    socket.on('new_order', (order: Order) => {
      setIncomingOrder(order);
    });

    return () => {
      socket.off('new_order');
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
    } catch (error) {
      toast.error('Failed to load orders');
    }
  };

  const acceptOrder = async (id: string) => {
    try {
      await api.post(`/orders/${id}/accept`);
      toast.success('Order Utha liya gaya!');
      setIncomingOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error('Order pehle hi kisi ne le liya hai');
      setIncomingOrder(null);
    }
  };

  const completeOrder = async (id: string) => {
    try {
      await api.post(`/orders/${id}/complete`, { otp });
      toast.success('Delivery Success!');
      setShowOtpModal(null);
      setOtp('');
      fetchOrders();
    } catch (error) {
      toast.error('Ghalat OTP hai!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20 text-gray-900">
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full shadow-sm border border-gray-200"><Home size={22} className="text-gray-900"/></button>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">DELIVERY BOY</h1>
        </div>
        <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full border border-green-200">
          <div className="w-2.5 h-2.5 bg-green-600 rounded-full animate-pulse"></div>
          <span className="text-xs font-black text-green-800 uppercase">Online</span>
        </div>
      </header>

      {/* New Order Popup */}
      {incomingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in duration-300 border-4 border-blue-500">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 text-blue-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner rotate-3">
                <Package size={40} strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-gray-950 mb-2 tracking-tight">NAYA ORDER!</h2>
              <div className="flex justify-center items-center space-x-3 bg-gray-100 py-2 rounded-2xl border border-gray-200">
                <p className="text-2xl font-black text-gray-950">₹{incomingOrder.totalAmount}</p>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                <p className="text-lg font-bold text-gray-700">{incomingOrder.items.length} Items</p>
              </div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => acceptOrder(incomingOrder.id)}
                className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xl flex items-center justify-center hover:bg-green-700 shadow-lg active:scale-95 transition-all"
              >
                <Check className="mr-2" strokeWidth={4} /> ACCEPT KARO
              </button>
              <button
                onClick={() => setIncomingOrder(null)}
                className="w-full py-4 bg-gray-100 text-gray-900 rounded-2xl font-black text-lg flex items-center justify-center hover:bg-gray-200 border-2 border-gray-200"
              >
                <X className="mr-2" strokeWidth={3} /> CHHODO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Deliveries */}
      <div className="space-y-6">
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest ml-1 flex items-center">
            <div className="w-2 h-6 bg-blue-600 mr-3 rounded-full"></div>
            Meri Deliveries
        </h2>
        
        {orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-bold">Abhi koi active delivery nahi hai.</p>
            </div>
        ) : (
            orders.map((order) => (
                <div key={order.id} className="bg-white rounded-[32px] p-6 shadow-md border-2 border-gray-50 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 ${
                        order.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'
                      }`}>
                        {order.status}
                      </span>
                      <p className="mt-4 font-black text-gray-950 text-xl tracking-tight leading-none">Order #{order.id.slice(-6)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-gray-950">₹{order.totalAmount}</p>
                      <p className="text-[10px] font-black text-gray-500 uppercase">Cash to Collect</p>
                    </div>
                  </div>
      
                  <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center text-gray-900 font-bold">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm border border-gray-100 text-blue-600"><MapPin size={18} strokeWidth={2.5}/></div>
                      <span className="text-lg">{order.customer.name}</span>
                    </div>
                    <div className="flex items-center text-gray-900 font-black">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm border border-gray-100 text-green-600"><Phone size={18} strokeWidth={2.5}/></div>
                      <span className="text-lg">{order.customer.phone}</span>
                    </div>
                  </div>
      
                  {order.status === 'ACCEPTED' && (
                    <button
                      onClick={() => setShowOtpModal(order.id)}
                      className="w-full py-4 bg-gray-950 text-white rounded-2xl font-black text-lg flex items-center justify-center hover:bg-black shadow-lg transition-all active:scale-[0.98]"
                    >
                      <Lock size={20} className="mr-2" strokeWidth={3} /> DELIVER KARO (OTP)
                    </button>
                  )}
                </div>
              ))
        )}
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl border-4 border-green-500">
            <h2 className="text-3xl font-black mb-2 text-center text-gray-950 tracking-tight">DELIVERY OTP</h2>
            <p className="text-gray-800 font-bold text-center mb-8">Customer se 4-digit code maangein</p>
            
            <input
              type="text"
              placeholder="0 0 0 0"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-6 bg-gray-100 rounded-3xl text-center text-5xl font-black tracking-[1rem] mb-8 border-4 border-gray-200 placeholder:text-gray-300 text-gray-950 focus:border-blue-500 outline-none shadow-inner"
              maxLength={4}
            />
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => completeOrder(showOtpModal)}
                className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-xl hover:bg-green-700 shadow-lg active:scale-95 transition-all"
              >
                VERIFY & DONE
              </button>
              <button
                onClick={() => setShowOtpModal(null)}
                className="w-full py-3 text-gray-950 font-black uppercase text-sm tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
