'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import socket from '@/lib/socket';
import { Order } from '@/types';
import { Check, X, MapPin, Phone, Package, Lock, Home, Navigation, Bell, MapPinOff, ShieldCheck, Sparkles, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function DeliveryPanel() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomingOrder, setIncomingOrder] = useState<Order | null>(null);
  const [showOtpModal, setShowOtpModal] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [gpsErrors, setGpsErrors] = useState<Record<string, boolean>>({});
  
  // Authorization Guards
  const [authorized, setAuthorized] = useState(false);

  // Developer Role Switcher Drawer State
  const [showDevMenu, setShowDevMenu] = useState(false);

  useEffect(() => {
    // Enforce Route Authorization
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      toast.error('Aap logged in nahi hain! Please login karein.');
      router.push('/login?redirect=/delivery');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'DELIVERY' && user.role !== 'ADMIN') {
        toast.error('Access Denied! Sirf Delivery Rider hi is panel ko access kar sakte hain.');
        router.push('/');
        return;
      }
      setAuthorized(true);
      fetchOrders();
      
      // Initialize Socket connection
      socket.connect();
      socket.on('connect', () => { socket.emit('join_delivery_room'); });
      socket.on('new_order', (order: Order) => { setIncomingOrder(order); });
    } catch (e) {
      toast.error('Session error. Please login again.');
      router.push('/login');
    }

    const interval = setInterval(() => { 
      if (localStorage.getItem('token')) {
        fetchOrders(); 
      }
    }, 5000);

    return () => { 
      socket.off('connect'); 
      socket.off('new_order'); 
      clearInterval(interval); 
    };
  }, []);

  const fetchOrders = async () => {
    try { const { data } = await api.get('/orders'); setOrders(data); } 
    catch (error) { toast.error('Failed to load orders'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully!');
    router.push('/login');
  };

  const acceptOrder = async (id: string) => {
    try { 
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      await api.post(`/orders/${id}/accept`, { deliveryBoyId: user?.id }); 
      toast.success('Mission Claimed! 🛵'); 
      setIncomingOrder(null); 
      fetchOrders(); 
    } catch (error) { 
      toast.error('Order already taken!'); 
      setIncomingOrder(null); 
    }
  };

  const startGpsTracking = (id: string, trackingId: string) => {
      if (!("geolocation" in navigator)) {
          toast.error("Geolocation is not supported by your browser.");
          return;
      }

      const sendLocation = (position: GeolocationPosition) => {
          setGpsErrors(prev => ({ ...prev, [id]: false }));
          socket.emit('delivery_location_update', {
              trackingId: trackingId,
              lat: position.coords.latitude,
              lng: position.coords.longitude
          });
      };

      const handleError = (error: GeolocationPositionError) => {
          console.warn("GPS Watch Warning:", error.message);
          
          // Fallback: aggressive one-time fetch
          navigator.geolocation.getCurrentPosition(
              (pos) => {
                  toast.success("Using fallback GPS location.");
                  sendLocation(pos);
                  
                  const manualWatch = setInterval(() => {
                      navigator.geolocation.getCurrentPosition(sendLocation, () => {}, { maximumAge: 0, timeout: 5000, enableHighAccuracy: false });
                  }, 5000);
                  
                  (window as any).fallbackGpsInterval = manualWatch;
              },
              (err) => {
                  console.error("GPS Failure:", err);
                  setGpsErrors(prev => ({ ...prev, [id]: true }));
                  toast.error("GPS Permission denied. Switch to simulation mode.");
              },
              { enableHighAccuracy: false, timeout: 15000, maximumAge: Infinity }
          );
      };

      navigator.geolocation.watchPosition(
          sendLocation,
          handleError,
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 }
      );
  };

  const simulateGps = (id: string, trackingId: string) => {
      setGpsErrors(prev => ({ ...prev, [id]: false }));
      toast.success("GPS Simulation active! Live coordinates moving towards customer.");
      
      let lat = 28.6304;
      let lng = 77.2177;
      
      const simInterval = setInterval(() => {
          lat += 0.0001;
          lng += 0.0001;
          socket.emit('delivery_location_update', {
              trackingId: trackingId,
              lat: lat,
              lng: lng
          });
      }, 2500);

      (window as any).simGpsInterval = simInterval;
  };

  const markOutForDelivery = async (id: string) => {
    try {
        await api.post(`/orders/${id}/out-for-delivery`);
        toast.success('Marked Out for Delivery! 🛵');
        fetchOrders();
        
        const matchingOrder = orders.find(o => o.id === id);
        const trackingId = matchingOrder?.deviceTrackingId || '';
        
        simulateGps(id, trackingId);
    } catch (error) { toast.error('Failed to update status'); }
  };

  const completeOrder = async (id: string) => {
    try { 
      await api.post(`/orders/${id}/complete`, { otp }); 
      toast.success('Delivery Confirmed! Order Completed.'); 
      setShowOtpModal(null); 
      setOtp(''); 
      fetchOrders(); 
      
      if ((window as any).simGpsInterval) clearInterval((window as any).simGpsInterval);
      if ((window as any).fallbackGpsInterval) clearInterval((window as any).fallbackGpsInterval);
    } catch (error) { 
      toast.error('Incorrect OTP! Please check code with customer.'); 
    }
  };

  const toggleItemPacked = async (orderId: string, itemId: string, currentStatus: boolean) => {
    try {
      await api.put(`/orders/${orderId}/items/${itemId}/pack`, { isPacked: !currentStatus });
      setOrders(orders.map(order => order.id === orderId ? { ...order, items: order.items.map(item => item.id === itemId ? { ...item, isPacked: !currentStatus } : item) } : order));
    } catch (error) { toast.error('Failed to update item status'); }
  };

  const activeTasks = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Checking Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] p-4 sm:p-8 text-[#1C1917] pb-24">
      <header className="max-w-3xl mx-auto mb-8 flex justify-between items-center bg-white p-4 rounded-[24px] border border-stone-250/30 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => router.push('/')} className="p-2.5 bg-stone-50 rounded-xl hover:bg-[#1C1917] hover:text-white transition-all text-stone-700">
                <Home size={16} strokeWidth={2.5} />
            </button>
            <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none mb-0.5">Rider <span className="text-yellow-600">Dashboard</span></h1>
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Courier Operations</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100/50 shrink-0">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Online</span>
          </div>
          <button onClick={handleLogout} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 hover:bg-rose-600 hover:text-white transition-all shadow-sm shrink-0 border border-rose-100">
              <LogOut size={12} /> LOG OUT
          </button>
        </div>
      </header>

      {/* New Order Overlay Alarm */}
      <AnimatePresence>
      {incomingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/80 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl border-4 border-yellow-400 relative overflow-hidden">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner border border-yellow-250">
                <Navigation size={24} strokeWidth={2.5} className="animate-bounce" />
              </div>
              <h2 className="text-xl font-black text-[#1C1917] tracking-tighter uppercase italic mb-1">New Delivery Mission!</h2>
              <div className="inline-flex items-center gap-1.5 bg-[#1C1917] text-white px-4 py-1.5 rounded-full">
                <p className="text-lg font-black">₹{incomingOrder.totalAmount}</p>
                <div className="w-1 h-1 bg-yellow-500 rounded-full" />
                <p className="text-[10px] font-bold text-yellow-200">{incomingOrder.items.length} Item{incomingOrder.items.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => acceptOrder(incomingOrder.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-xs uppercase shadow-md transition-all active:scale-[0.98]">CLAIM MISSION 🛵</button>
              <button onClick={() => setIncomingOrder(null)} className="w-full py-2 text-stone-400 font-black text-[9px] uppercase tracking-widest hover:text-[#1C1917] transition-colors">Decline Mission</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-[9px] font-black text-stone-400 uppercase tracking-[0.4em] ml-2 flex items-center gap-2">
            <div className="w-4 h-1 bg-stone-300 rounded-full" />
            Active Tasks
        </h2>
        {activeTasks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[24px] border border-dashed border-stone-200 flex flex-col items-center">
                <Package size={36} strokeWidth={1.5} className="text-stone-300 mb-2" />
                <p className="text-xs font-black text-stone-400 uppercase tracking-widest">No active deliveries</p>
            </div>
        ) : (
            activeTasks.map((order) => (
                <motion.div layout key={order.id} className="bg-white rounded-[28px] p-5 shadow-sm border border-stone-200/80 relative overflow-hidden group">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                        order.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {order.status}
                      </span>
                      <p className="font-black text-stone-400 text-xs">ID: #{order.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="bg-stone-50 p-2 rounded-xl border border-stone-100 text-left sm:text-right">
                      <p className="text-lg font-black text-stone-900 leading-none">₹{order.totalAmount}</p>
                      <p className="text-[7px] font-bold text-stone-400 uppercase tracking-widest">COD collection</p>
                    </div>
                  </div>
                  
                  {/* Address & Contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <div className="flex items-center gap-3 bg-[#FFFBF7] p-2.5 rounded-xl border border-stone-100">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-rose-500 shadow-sm shrink-0 border border-stone-100"><MapPin size={14}/></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[7px] font-bold text-stone-400 uppercase leading-none mb-0.5">Address</p>
                        <p className="text-xs font-black text-stone-700 truncate leading-none">{order.address || 'Anonymous'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-[#FFFBF7] p-2.5 rounded-xl border border-stone-100">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-emerald-500 shadow-sm shrink-0 border border-stone-100"><Phone size={14}/></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[7px] font-bold text-stone-400 uppercase leading-none mb-0.5">Contact</p>
                        <p className="text-xs font-black text-stone-700 truncate leading-none">{order.customerPhone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pending items preview */}
                  {order.status === 'PENDING' && (
                    <div className="mb-5">
                      <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Order Items Preview</p>
                      <div className="bg-stone-50 p-2 rounded-xl border border-stone-100 space-y-1">
                        {order.items.map(item => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-stone-100"
                          >
                            <span className="font-bold text-xs text-[#1C1917]">{item.product?.name}</span>
                            <span className="font-black text-stone-500 text-[8px] px-1.5 py-0.5 bg-stone-50 border border-stone-100 rounded">{item.quantity} {item.product?.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accept items packing check-off checklist */}
                  {order.status === 'ACCEPTED' && (
                    <div className="mb-5">
                      <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-1.5 ml-1">Items checklist (Tap to pack)</p>
                      <div className="bg-stone-50 p-2 rounded-xl border border-stone-100 space-y-1">
                        {order.items.map(item => (
                          <div 
                            key={item.id} 
                            onClick={() => toggleItemPacked(order.id, item.id, !!item.isPacked)} 
                            className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-stone-100 cursor-pointer hover:border-emerald-200 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${item.isPacked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 bg-stone-50'}`}>
                                {item.isPacked && <Check size={10} strokeWidth={4} />}
                              </div>
                              <span className={`font-bold text-xs ${item.isPacked ? 'text-emerald-700' : 'text-[#1C1917]'}`}>{item.product?.name}</span>
                            </div>
                            <span className="font-black text-stone-500 text-[8px] px-1.5 py-0.5 bg-stone-50 border border-stone-100 rounded">{item.quantity} {item.product?.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button: PENDING -> CLAIM ORDER */}
                  {order.status === 'PENDING' && (
                    <button 
                      onClick={() => acceptOrder(order.id)} 
                      className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-[#1C1917] font-black rounded-xl text-xs uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                      <span>CLAIM ORDER 🛵</span>
                      <Navigation size={14} />
                    </button>
                  )}

                  {/* Action Button: ACCEPTED -> START DELIVERY */}
                  {order.status === 'ACCEPTED' && (
                    <button 
                      onClick={() => markOutForDelivery(order.id)} 
                      disabled={order.items.some(item => !item.isPacked)} 
                      className={`w-full py-3.5 rounded-xl font-black text-xs uppercase shadow-sm flex items-center justify-center gap-1.5 transition-all ${
                        order.items.some(item => !item.isPacked) 
                          ? 'bg-stone-50 text-stone-300 cursor-not-allowed border border-stone-200 shadow-none' 
                          : 'bg-[#1C1917] text-white hover:bg-yellow-500 hover:text-[#1C1917]'
                      }`}
                    >
                      <span>{order.items.some(item => !item.isPacked) ? 'PACK ALL ITEMS FIRST' : 'START DELIVERY (GPS SIM)'}</span>
                      <Navigation size={14} />
                    </button>
                  )}

                  {/* Action Button: OUT FOR DELIVERY -> ENTER OTP */}
                  {order.status === 'OUT_FOR_DELIVERY' && (
                    <div className="flex flex-col gap-3">
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-emerald-800 font-bold">GPS is simulating live coordinates</span>
                          <span className="bg-white text-emerald-700 px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-emerald-100 animate-pulse">TRANSMITTING</span>
                        </div>
                        <button 
                          onClick={() => setShowOtpModal(order.id)} 
                          className="w-full bg-[#1C1917] hover:bg-emerald-600 text-white font-black py-3.5 rounded-xl text-xs uppercase shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                            <span>VERIFY DROP & ENTER OTP</span>
                            <Lock size={14} />
                        </button>
                    </div>
                  )}
                </motion.div>
              ))
        )}
      </div>

      {/* OTP verification dialog keypad */}
      <AnimatePresence>
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/80 backdrop-blur-sm">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl border border-stone-250 relative">
            <h2 className="text-lg font-black text-center text-stone-900 tracking-tight uppercase mb-1">Verify Order</h2>
            <p className="text-stone-400 font-bold text-center mb-5 uppercase tracking-widest text-[8px]">Enter 4-Digit Code from Customer Screen</p>
            <input 
              type="text" 
              placeholder="0000" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              className="w-full py-3 bg-stone-50 rounded-xl text-center text-3xl font-black tracking-[0.6rem] mb-5 border-2 border-stone-100 placeholder:text-stone-200 text-[#1C1917] focus:border-yellow-400 outline-none shadow-inner" 
              maxLength={4} 
            />
            <div className="flex flex-col gap-2">
              <button onClick={() => completeOrder(showOtpModal)} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-all uppercase">COMPLETE DELIVERY ✅</button>
              <button onClick={() => setShowOtpModal(null)} className="w-full py-2 text-stone-400 font-black uppercase text-[8px] tracking-widest hover:text-rose-500 transition-colors">Cancel</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Dev Switcher Overlay */}
      <DevSwitcher activeRole="DELIVERY" router={router} showMenu={showDevMenu} setShowMenu={setShowDevMenu} />
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