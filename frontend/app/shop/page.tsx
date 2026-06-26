'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import socket from '@/lib/socket';
import { Product, Order } from '@/types';
import { 
  ShoppingBag, Package, Plus, Minus, Trash2, CheckCircle, Home, ArrowLeft, X, 
  User, Phone, MapPin, Hash, Sparkles, Search, ArrowRight, Receipt, Menu, 
  Tag, Clock, Compass, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';

// Blinkit-style Categories
const CATEGORIES = [
  { id: 'all', name: 'All Items', icon: '🛍️' },
  { id: 'Fruits & Veggies', name: 'Fruits & Veggies', icon: '🍎' },
  { id: 'Dairy & Bread', name: 'Dairy & Bread', icon: '🥛' },
  { id: 'Snacks & Munchies', name: 'Snacks & Munchies', icon: '🍿' },
  { id: 'Staples & Spices', name: 'Staples & Spices', icon: '🧂' },
];

export default function UserShop() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCart, setShowCart] = useState(false);
  const [orderComplete, setOrderComplete] = useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', address: '', pincode: '' });
  const [riderLocation, setRiderLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Store reference and distance states
  const [storeSettings, setStoreSettings] = useState({ STORE_LAT: 28.6139, STORE_LNG: 77.2090, STORE_ADDRESS: 'Connaught Place, New Delhi' });
  const [deliveryDistance, setDeliveryDistance] = useState<number>(1.5); // Default to 1.5 km
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'success' | 'failed'>('idle');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  // My Orders State
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  
  // Developer Role Switcher Drawer State
  const [showDevMenu, setShowDevMenu] = useState(false);

  useEffect(() => { 
      fetchProducts(); 
      fetchStoreSettings();
      // Initialize Device ID for anonymous tracking
      let id = localStorage.getItem('deviceId');
      if (!id) {
          id = 'user_' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('deviceId', id);
      }
      setDeviceId(id);
      
      // Fetch initial orders
      fetchMyOrders(id);

      // Socket connection for real-time updates
      socket.connect();
      socket.emit('join_user_room', id);

      socket.on('item_packed_status', (data: { orderId: string, itemId: string, isPacked: boolean }) => {
        setMyOrders(currentOrders => currentOrders.map(order => {
          if (order.id === data.orderId) {
            return {
              ...order,
              items: order.items.map(item => 
                item.id === data.itemId ? { ...item, isPacked: data.isPacked } : item
              )
            };
          }
          return order;
        }));
      });

      socket.on('order_status_update', (updatedOrder: Order) => {
        setMyOrders(currentOrders => currentOrders.map(order => 
            order.id === updatedOrder.id ? updatedOrder : order
        ));
        
        // If order complete is showing, update it as well
        setOrderComplete(current => {
          if (current && current.id === updatedOrder.id) {
            return updatedOrder;
          }
          return current;
        });
      });

      socket.on('rider_location', (data: {lat: number, lng: number}) => {
        setRiderLocation(data);
      });
      
      // Poll for order updates every 5 seconds if My Orders is open
      const interval = setInterval(() => {
          if (showMyOrders || orderComplete || myOrders.some(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')) {
              fetchMyOrders(id);
          }
      }, 5000);
      
      return () => {
        clearInterval(interval);
        socket.off('item_packed_status');
        socket.off('order_status_update');
        socket.off('rider_location');
      };
  }, [showMyOrders, orderComplete]);

  const fetchMyOrders = async (id: string) => {
      try {
          const { data } = await api.get(`/orders?customerId=${id}`);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentOrders = data.filter((order: Order) => new Date(order.createdAt) > thirtyDaysAgo);
          setMyOrders(recentOrders);
      } catch (error) {
          console.error('Failed to fetch my orders');
      }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (error) { console.error(error); }
  };

  // Fuzzy Search Logic using Fuse.js
  const fuse = useMemo(() => {
    return new Fuse(products, {
      keys: ['name', 'category'],
      threshold: 0.5,
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'all') {
      result = products.filter(p => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      result = fuse.search(searchQuery).map(res => res.item);
    }
    return result;
  }, [products, selectedCategory, searchQuery, fuse]);

  const addToCart = (product: Product) => {
    if (product.retailStock <= 0) { toast.error('Out of Stock!'); return; }
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.retailStock) {
        toast.error(`Only ${product.retailStock} ${product.unit} available!`);
        return;
      }
      setCart(cart.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    toast.success(`${product.name} added!`, { duration: 1000 });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.product.id === id) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
          return null; // will filter out next
        }
        if (delta > 0 && newQty > item.product.retailStock) {
          toast.error(`Only ${item.product.retailStock} available!`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as { product: Product; quantity: number }[]);
  };

  const fetchStoreSettings = async () => {
      try {
          const { data } = await api.get('/settings');
          if (data.STORE_LAT) {
              setStoreSettings({
                  STORE_LAT: parseFloat(data.STORE_LAT),
                  STORE_LNG: parseFloat(data.STORE_LNG),
                  STORE_ADDRESS: data.STORE_ADDRESS
              });
          }
      } catch (error) {
          console.error('Failed to fetch store settings');
      }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
  };

  const detectGpsLocation = () => {
      if (!("geolocation" in navigator)) {
          toast.error("Geolocation is not supported by your browser.");
          return;
      }
      setGpsStatus('detecting');
      navigator.geolocation.getCurrentPosition(
          (position) => {
              const uLat = position.coords.latitude;
              const uLng = position.coords.longitude;
              const calculated = calculateDistance(uLat, uLng, storeSettings.STORE_LAT, storeSettings.STORE_LNG);
              const distanceKm = Math.round(calculated * 10) / 10;
              setDeliveryDistance(distanceKm || 0.1);
              setGpsStatus('success');
              toast.success(`Location detected! Distance: ${distanceKm} km`);
          },
          (error) => {
              console.error("Checkout GPS Error:", error);
              setGpsStatus('failed');
              toast.error("GPS detection failed. Using manual distance slider.");
          },
          { enableHighAccuracy: true, timeout: 8000 }
      );
  };

  const checkout = async () => {
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.address || !customerDetails.pincode) {
      toast.error('Please fill all details!');
      return;
    }
    try {
      const items = cart.map(item => ({ productId: item.product.id, quantity: item.quantity, price: item.product.price }));
      const baseTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      const deliveryCharges = Math.round(deliveryDistance * 8 * 10) / 10;
      const totalAmount = baseTotal + deliveryCharges;
      
      const { data } = await api.post('/orders', { 
        items, totalAmount,
        customerName: customerDetails.name, customerPhone: customerDetails.phone,
        address: customerDetails.address, pincode: customerDetails.pincode,
        customerId: deviceId,
        deliveryCharges,
        distance: deliveryDistance
      });
      setOrderComplete(data);
      setCart([]);
      setShowCart(false);
      setShowCheckoutForm(false);
      fetchMyOrders(deviceId);
      toast.success('Order Placed! 🚀');
    } catch (error) { toast.error('Failed to place order'); }
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const renderPhoto = (url: string | null) => {
    if (!url) return <Package size={40} className="text-stone-300" />;
    const fullUrl = url.startsWith('http') ? url : `http://localhost:4000${url}`;
    return <img src={fullUrl} alt="product" className="w-full h-full object-cover" />;
  };

  const activeOrder = myOrders.find(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');

  const getProductQtyInCart = (productId: string) => {
    const item = cart.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const getDeliveryDuration = (order: Order) => {
    if (!order.createdAt || !order.updatedAt) return '10 mins';
    const start = new Date(order.createdAt).getTime();
    const end = new Date(order.updatedAt).getTime();
    const diffMs = Math.max(0, end - start);
    
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    if (minutes === 0) {
      return `${seconds} seconds`;
    }
    return `${minutes} min ${seconds} sec`;
  };

  if (orderComplete) {
    const displayOrder = activeOrder?.id === orderComplete.id ? activeOrder : orderComplete;
    const packedItemsCount = displayOrder.items?.filter(item => item.isPacked).length || 0;
    const totalItems = displayOrder.items?.length || 0;
    const progressPercentage = totalItems > 0 ? (packedItemsCount / totalItems) * 100 : 0;

    // Deliveryboy statuses matching requested details
    let trackingStatus = "Order Placed & Waiting for Rider";
    if (displayOrder.status === 'DELIVERED') trackingStatus = "Delivered ✅";
    else if (displayOrder.status === 'OUT_FOR_DELIVERY') trackingStatus = "Mr. Candy is on the way! (Out for Delivery 🛵)";
    else if (displayOrder.status === 'ACCEPTED') {
        if (packedItemsCount === totalItems) trackingStatus = "Saman Picked Up! Packing Complete";
        else if (packedItemsCount > 0) trackingStatus = "Saman Packing in Progress... 🥛";
        else trackingStatus = "Rider Assigned! Saman packing starting...";
    }

    return (
      <div className="min-h-screen bg-[#FFFBF7] flex flex-col items-center pb-20">
        <div className="w-full bg-white border-b-2 border-orange-50 shadow-sm p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-16 h-16 ${displayOrder.status === 'DELIVERED' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-500'} rounded-[20px] flex items-center justify-center border-2 border-white flex-shrink-0`}>
                    <CheckCircle size={32} strokeWidth={2.5} />
                </motion.div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] mb-0.5 tracking-tighter">
                      {displayOrder.status === 'DELIVERED' ? 'Order Delivered! 🎉' : 'Order Confirmed!'}
                    </h1>
                    <p className="text-emerald-600 font-black text-base tracking-tight">{trackingStatus}</p>
                </div>
            </div>
            <button onClick={() => setOrderComplete(null)} className="w-full sm:w-auto bg-[#1C1917] text-white hover:bg-emerald-600 px-6 py-3 rounded-2xl font-black text-sm tracking-tight transition-all">Return to Shop</button>
        </div>

        <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 flex-1">
            {/* Left Column: Tracking & OTP */}
            <div className="flex flex-col gap-6">
                {displayOrder.status === 'DELIVERED' ? (
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[32px] text-white shadow-lg text-center relative overflow-hidden border-2 border-white">
                      {/* Decorative background glow */}
                      <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] bg-emerald-300/30 rounded-full blur-[40px] pointer-events-none" />
                      
                      <div className="w-16 h-16 bg-white/20 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-white/30 backdrop-blur shadow-inner">
                          <CheckCircle size={36} strokeWidth={2.5} className="text-white" />
                      </div>
                      
                      <h2 className="text-2xl font-black tracking-tight mb-1">Delivered Successfully! 🎉</h2>
                      <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-6">Mila Kuch Hi Deri Mein Aapke Dwaar!</p>
                      
                      <div className="bg-white/10 backdrop-blur border border-white/20 py-4 px-6 rounded-[20px] shadow-inner inline-flex flex-col items-center justify-center gap-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-250">Delivery Time Taken</span>
                          <span className="text-2xl font-black tracking-tight text-yellow-300">
                              ⚡ {getDeliveryDuration(displayOrder)}
                          </span>
                      </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 sm:p-8 rounded-[32px] border-2 border-orange-50/50 shadow-lg shadow-orange-100/10">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-3 text-center">Secure Delivery OTP</p>
                      <div className="bg-gradient-to-br from-amber-400 to-yellow-500 w-full py-5 rounded-[20px] shadow-md text-center">
                          <span className="text-5xl sm:text-6xl font-black text-[#1C1917] tracking-[0.1em]">{displayOrder.otp}</span>
                      </div>
                      <p className="text-xs font-bold text-stone-400 mt-3 text-center">Show this code to the rider at delivery</p>
                  </div>
                )}

                {displayOrder.status === 'DELIVERED' ? (
                  <div className="bg-white p-6 sm:p-8 rounded-[32px] border-2 border-orange-50/50 shadow-lg shadow-orange-100/10 space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
                          <CheckCircle size={14} className="text-emerald-500" /> Delivery Receipt Details
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Ordered At</span>
                              <span className="font-bold text-stone-700">
                                  {new Date(displayOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                          </div>
                          <div>
                              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Delivered At</span>
                              <span className="font-bold text-stone-700">
                                  {displayOrder.updatedAt ? new Date(displayOrder.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </span>
                          </div>
                          <div>
                              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Delivered By</span>
                              <span className="font-bold text-stone-700">
                                  {displayOrder.deliveryBoy?.name || 'Raju Delivery 🛵'}
                              </span>
                          </div>
                          <div>
                              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Order ID</span>
                              <span className="font-bold text-stone-700">
                                  #{displayOrder.id.slice(-6).toUpperCase()}
                              </span>
                          </div>
                      </div>

                      <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-stone-100 text-xs">
                          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Delivered to</span>
                          <p className="font-black text-stone-700">{displayOrder.customerName || 'Customer'}</p>
                          <p className="text-stone-500 font-bold mt-0.5">{displayOrder.address}, {displayOrder.pincode}</p>
                      </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 sm:p-8 rounded-[32px] border-2 border-orange-50/50 shadow-lg shadow-orange-100/10">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">
                          <span>Packing Progress</span>
                          <span className="text-[#F43F5E]">{packedItemsCount} / {totalItems} Packed</span>
                      </div>
                      <div className="w-full h-3 bg-stone-50 rounded-full overflow-hidden border border-stone-100 mb-6">
                          <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${progressPercentage}%` }} 
                              transition={{ duration: 0.5 }}
                              className={`h-full rounded-full ${progressPercentage === 100 ? 'bg-emerald-500' : 'bg-yellow-400'}`} 
                          />
                      </div>
                      
                      {displayOrder.status === 'OUT_FOR_DELIVERY' && (
                          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-[20px] shadow-sm">
                              <p className="text-emerald-800 font-black text-sm mb-1">Mr. Candy is on the way!</p>
                              <p className="text-emerald-600 font-medium text-xs mb-3">Rider coordinates are updating live on the Google Map below.</p>
                              
                              {riderLocation ? (
                                  <div className="w-full h-64 bg-stone-100 rounded-[16px] overflow-hidden border border-emerald-250 relative shadow-inner">
                                      <iframe 
                                          width="100%" 
                                          height="100%" 
                                          frameBorder="0" 
                                          scrolling="no" 
                                          marginHeight={0} 
                                          marginWidth={0} 
                                          src={`https://maps.google.com/maps?q=${riderLocation.lat},${riderLocation.lng}&z=16&output=embed`}
                                      ></iframe>
                                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[8px] font-black tracking-widest uppercase shadow-sm border border-stone-100 text-stone-600 flex items-center gap-1">
                                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> LIVE GOOGLE MAP
                                      </div>
                                  </div>
                              ) : (
                                  <div className="w-full h-16 bg-emerald-50 rounded-[16px] flex items-center justify-center border border-dashed border-emerald-200 text-emerald-600/70 text-xs font-black uppercase tracking-widest">
                                      Connecting to Google Maps GPS...
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
                )}
            </div>

            {/* Right Column: Order Summary */}
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border-2 border-orange-50/50 shadow-lg shadow-orange-100/10 flex flex-col">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Order Details</p>
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                    {displayOrder.items?.map(item => (
                        <div key={item.id} className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${item.isPacked ? 'border-emerald-100 bg-emerald-50/20' : 'border-stone-100'}`}>
                            <div className="flex items-center gap-3">
                                {item.isPacked ? (
                                    <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-stone-200 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                    <p className={`font-bold text-sm truncate ${item.isPacked ? 'text-emerald-700' : 'text-[#1C1917]'}`}>
                                        {item.product?.name || 'Item'}
                                    </p>
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{item.quantity} {item.product?.unit}</p>
                                </div>
                            </div>
                            <span className="font-black text-[#1C1917] text-base">₹{item.price * item.quantity}</span>
                        </div>
                    ))}
                </div>
                <div className="space-y-2 border-t border-stone-100 pt-4 mt-4 text-xs font-bold text-stone-500">
                    <div className="flex justify-between">
                        <span>Items Subtotal</span>
                        <span>₹{Math.round((displayOrder.totalAmount - (displayOrder.deliveryCharges || 0)) * 10) / 10}</span>
                    </div>
                    {displayOrder.distance !== undefined && (
                        <div className="flex justify-between">
                            <span>Delivery Charges ({displayOrder.distance} km)</span>
                            <span>₹{displayOrder.deliveryCharges || 0}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-end text-[#1C1917] font-black text-sm pt-2 border-t border-stone-100">
                        <span className="uppercase tracking-[0.1em] text-[10px]">Total Cash (COD)</span>
                        <span className="text-2xl">₹{displayOrder.totalAmount}</span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Developer Console Switcher */}
        <DevSwitcher activeRole="CUSTOMER" router={router} showMenu={showDevMenu} setShowMenu={setShowDevMenu} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] pb-32">
      {/* Blinkit Style Sticky Header */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-orange-100/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Branding & Time Estimation */}
            <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-8">
              <div className="cursor-pointer shrink-0" onClick={() => router.push('/')}>
                  <h1 className="text-2xl font-black text-[#1C1917] tracking-tighter leading-none">MR. <span className="text-yellow-500">CANDY</span></h1>
                  <span className="text-[8px] font-black text-stone-400 uppercase tracking-[0.2em] block mt-0.5">GROCERY EXPRESS</span>
              </div>
              <div className="flex items-center gap-2 border-l border-stone-200 pl-4 py-1">
                <Compass className="text-yellow-500 animate-spin-slow shrink-0" size={20} strokeWidth={2.5} />
                <div>
                  <p className="text-[10px] font-black text-[#1C1917] tracking-tight uppercase">Delivery in 10 Mins</p>
                  <p className="text-[8px] font-bold text-stone-400 truncate max-w-[120px]">Home - Selected Area</p>
                </div>
              </div>
            </div>

            {/* Middle Search */}
            <div className="flex items-center gap-3 flex-1 max-w-xl mx-auto w-full">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search for kurkure, sugar, milk..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-8 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-yellow-400 focus:bg-white transition-all font-bold text-sm placeholder:text-stone-300"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-900">
                            <X size={14} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>

            {/* Right Controls: Cart & Orders */}
            <div className="flex gap-3 items-center justify-end">
                <button 
                  onClick={() => setShowMyOrders(true)} 
                  className="px-4 py-2 rounded-xl text-xs font-black text-stone-600 hover:text-stone-900 hover:bg-stone-50 border border-stone-200 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Clock size={14} /> My Orders
                </button>
                <motion.button 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }} 
                  onClick={() => setShowCart(true)} 
                  className="relative px-5 py-2.5 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-700/10 flex items-center gap-2 hover:bg-emerald-700 transition-all font-black text-xs shrink-0"
                >
                    <ShoppingBag size={16} strokeWidth={2.5} />
                    <span>My Cart ({cart.length})</span>
                </motion.button>
            </div>
        </div>
      </header>

      {/* Quick Category Quick-Links Bar on Mobile */}
      <div className="bg-white border-b border-orange-50/50 py-3 lg:hidden px-4 overflow-x-auto flex gap-2 scrollbar-none scroll-smooth">
        {CATEGORIES.map(category => (
          <button
            key={category.id}
            onClick={() => { setSelectedCategory(category.id); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border shrink-0 transition-all flex items-center gap-1.5 ${
              selectedCategory === category.id && !searchQuery
                ? 'bg-yellow-400 border-yellow-400 text-[#1C1917] font-black shadow-sm'
                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Active Order Stepper Indicator - Fixed Banner */}
      <AnimatePresence>
        {activeOrder && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto px-4 mt-4"
          >
            <div 
              onClick={() => setOrderComplete(activeOrder)}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-[#1C1917] px-5 py-4 rounded-[20px] cursor-pointer shadow-md flex items-center justify-between border-2 border-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Active Order In Progress (OTP: {activeOrder.otp})</h3>
                  <p className="text-[10px] font-bold opacity-80">Click here to track your rider live on Google Maps</p>
                </div>
              </div>
              <ArrowRight size={18} strokeWidth={2.5} className="text-[#1C1917]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 mt-6 flex gap-6">
        {/* Left Category List (Desktop Sidebar) */}
        <aside className="hidden lg:block w-64 bg-white border border-stone-200 rounded-[24px] p-4 shrink-0 h-fit sticky top-28 shadow-sm">
          <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-3 ml-2">Categories</p>
          <div className="space-y-1">
            {CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => { setSelectedCategory(category.id); setSearchQuery(''); }}
                className={`w-full px-4 py-3 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-3 border ${
                  selectedCategory === category.id && !searchQuery
                    ? 'bg-yellow-400/10 border-yellow-200 text-yellow-800 font-black'
                    : 'bg-transparent border-transparent text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Right Main Grid */}
        <div className="flex-1">
          {searchQuery && (
            <div className="mb-4">
              <p className="text-xs font-bold text-stone-400">Search results for &ldquo;{searchQuery}&rdquo;</p>
            </div>
          )}
          
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[24px] border-2 border-dashed border-orange-50/50">
                <Search size={32} className="text-stone-300 mx-auto mb-3" />
                <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest">No Products Found</h3>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const qty = getProductQtyInCart(product.id);
                  return (
                    <motion.div 
                      layout 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      viewport={{ once: true }} 
                      key={product.id} 
                      className="bg-white rounded-[24px] p-3 shadow-sm hover:shadow-md border border-stone-200/60 transition-all flex flex-col h-[280px] sm:h-[320px] group relative"
                    >
                      <span className="absolute top-3 left-3 bg-[#FFFBF2] text-yellow-700 px-2 py-0.5 rounded-full text-[8px] font-black tracking-wide border border-yellow-200/50 z-10 flex items-center gap-1 shadow-sm shrink-0">
                        ⚡ 10 MINS
                      </span>

                      <div onClick={() => setSelectedProduct(product)} className="aspect-square bg-stone-50/50 rounded-xl mb-3 overflow-hidden flex items-center justify-center relative cursor-pointer border border-stone-100">
                        <div className="w-full h-full p-3 group-hover:scale-105 transition-transform duration-300">
                            {renderPhoto(product.photoUrl)}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-start">
                        <h3 onClick={() => setSelectedProduct(product)} className="font-black text-stone-900 text-xs sm:text-sm mb-0.5 line-clamp-2 cursor-pointer leading-snug group-hover:text-yellow-600 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wide mb-2">
                          1 {product.unit}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-auto pt-2 border-t border-stone-50">
                          <div>
                              <p className="text-base sm:text-lg font-black text-stone-900 leading-none">₹{product.price}</p>
                          </div>
                          
                          {product.retailStock <= 0 ? (
                            <span className="px-3 py-1.5 rounded-lg text-[9px] font-black tracking-wider text-rose-500 bg-rose-50 border border-rose-100">
                              SOLD OUT
                            </span>
                          ) : qty === 0 ? (
                            <button 
                              onClick={() => addToCart(product)} 
                              className="bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-4 py-1.5 rounded-lg font-black text-xs sm:text-sm uppercase shadow-sm active:scale-95 transition-all shrink-0"
                            >
                              Add
                            </button>
                          ) : (
                            <div className="flex items-center bg-emerald-600 text-white rounded-lg overflow-hidden shadow-sm shrink-0">
                              <button onClick={() => updateCartQty(product.id, -1)} className="px-2.5 py-1.5 hover:bg-emerald-700 transition-colors font-bold text-xs">-</button>
                              <span className="px-1.5 font-bold text-xs min-w-[14px] text-center">{qty}</span>
                              <button onClick={() => updateCartQty(product.id, 1)} className="px-2.5 py-1.5 hover:bg-emerald-700 transition-colors font-bold text-xs">+</button>
                            </div>
                          )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Sheet Bar */}
      <AnimatePresence>
        {cart.length > 0 && !showCart && (
          <motion.div 
            initial={{ y: 80, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-6 inset-x-4 z-40 max-w-2xl mx-auto"
          >
            <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between border-2 border-emerald-500">
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} strokeWidth={2.5} className="animate-bounce" />
                <div>
                  <p className="font-black text-sm">{cart.length} Item{cart.length > 1 ? 's' : ''} • ₹{total}</p>
                  <p className="text-[9px] font-bold text-emerald-100 uppercase tracking-widest">Platform fees free</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCart(true)} 
                className="bg-white text-emerald-700 px-5 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-1 shadow-md hover:bg-emerald-50 transition-all"
              >
                <span>View Bag</span>
                <ArrowRight size={14} strokeWidth={3} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProduct(null)} className="absolute inset-0 bg-[#1C1917]/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl border border-stone-200">
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 p-2.5 bg-stone-100 text-stone-700 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={18} strokeWidth={3} /></button>
              <div className="p-6">
                <div className="aspect-square bg-stone-50 rounded-2xl p-6 flex items-center justify-center border border-stone-100 mb-6 max-h-[220px]">
                  {renderPhoto(selectedProduct.photoUrl)}
                </div>
                <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-750 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase mb-3 border border-yellow-250/50"><Sparkles size={10} /> Mr Candy Premium</span>
                    <h2 className="text-xl font-black text-[#1C1917] leading-tight mb-2 tracking-tight">{selectedProduct.name}</h2>
                    <p className="text-3xl font-black text-stone-900">₹{selectedProduct.price}<span className="text-xs text-stone-400 font-bold uppercase ml-1">/ {selectedProduct.unit}</span></p>
                </div>
                
                <div className="bg-[#FFFBF2] border border-yellow-100/50 p-4 rounded-xl flex items-center justify-between mb-6 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${selectedProduct.retailStock > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                    <p className="font-bold text-stone-700 text-xs">{selectedProduct.retailStock > 0 ? `${selectedProduct.retailStock} ${selectedProduct.unit} in stock` : 'Out of Stock'}</p>
                  </div>
                  <span className="text-[9px] font-black text-yellow-755 bg-yellow-100/50 px-2 py-1 rounded-md tracking-wider">⚡ FAST SHIP</span>
                </div>

                <button 
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} 
                  disabled={selectedProduct.retailStock <= 0} 
                  className="w-full bg-[#1C1917] hover:bg-emerald-600 disabled:bg-stone-100 disabled:text-stone-300 text-white font-black py-4 rounded-2xl text-sm transition-all active:scale-[0.98] shadow-md border-0"
                >
                  {selectedProduct.retailStock > 0 ? 'Add to Bag' : 'Out of Stock'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
      {showCart && (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCart(false)} className="fixed inset-0 z-50 bg-[#1C1917]/70 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 220 }} className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#FFFBF7] shadow-2xl flex flex-col rounded-l-[32px] border-l border-stone-200">
                <div className="p-6 border-b border-orange-100/30 flex justify-between items-center bg-white rounded-tl-[30px]">
                    <div>
                      <h2 className="text-2xl font-black text-[#1C1917] tracking-tight">My Basket</h2>
                      <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest">{cart.length} item{cart.length > 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={() => setShowCart(false)} className="p-2.5 bg-stone-50 text-stone-900 rounded-full hover:bg-rose-500 hover:text-white transition-all"><ArrowLeft size={18} strokeWidth={2.5} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-stone-200"><ShoppingBag size={28} strokeWidth={1.5} className="text-stone-300" /></div>
                      <p className="text-sm font-black text-stone-400 uppercase tracking-widest">Basket is Empty</p>
                    </div>
                ) : (
                    cart.map((item) => (
                    <motion.div layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} key={item.product.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-stone-200/50 shadow-sm relative group">
                        <div className="w-16 h-16 bg-stone-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-stone-100">{renderPhoto(item.product.photoUrl)}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-stone-900 text-xs sm:text-sm truncate mb-0.5">{item.product.name}</h4>
                          <p className="text-emerald-600 font-black text-xs">₹{item.product.price} <span className="text-[9px] text-stone-300 font-bold uppercase">/ {item.product.unit}</span></p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center bg-stone-50 rounded-lg border border-stone-200 p-0.5">
                                <button onClick={() => updateCartQty(item.product.id, -1)} className="px-2 py-1 text-stone-400 hover:text-rose-500 transition-colors font-bold text-xs">-</button>
                                <span className="px-1.5 font-bold text-xs text-stone-800">{item.quantity}</span>
                                <button onClick={() => updateCartQty(item.product.id, 1)} className="px-2 py-1 text-stone-400 hover:text-emerald-600 transition-colors font-bold text-xs">+</button>
                            </div>
                            <button onClick={() => updateCartQty(item.product.id, -item.quantity)} className="text-[10px] font-bold text-stone-400 hover:text-rose-500 mr-2 flex items-center gap-1 transition-colors">
                              <Trash2 size={12} /> Remove
                            </button>
                        </div>
                    </motion.div>
                    ))
                )}
                </div>
                {cart.length > 0 && (
                <div className="p-6 bg-white border-t border-stone-100 rounded-t-[24px] shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-end mb-4 px-1">
                      <span className="text-stone-400 font-black uppercase tracking-[0.2em] text-[10px]">Grand Total</span>
                      <span className="text-2xl font-black text-[#1C1917]">₹{total}</span>
                    </div>
                    <button onClick={() => setShowCheckoutForm(true)} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md transition-all active:scale-[0.98]">
                      <span>Proceed to Checkout</span>
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </button>
                    <p className="text-center text-stone-300 font-bold mt-3 text-[9px] uppercase tracking-widest">⚡ 10 mins express shipping</p>
                </div>
                )}
            </motion.div>
        </>
      )}
      </AnimatePresence>

      {/* Checkout Dialog Form */}
      <AnimatePresence>
        {showCheckoutForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCheckoutForm(false)} className="absolute inset-0 bg-[#1C1917]/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[28px] p-6 sm:p-8 overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#1C1917] tracking-tight">Checkout</h2>
                  <p className="text-yellow-600 font-black uppercase text-[8px] tracking-[0.2em]">Address & Delivery Fee</p>
                </div>
                <button onClick={() => setShowCheckoutForm(false)} className="p-2 bg-stone-50 rounded-full hover:bg-rose-50 hover:text-white transition-all"><X size={16} strokeWidth={3}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-6">
                {/* Store reference info */}
                <div className="bg-[#FFFBF7] p-3 rounded-2xl border border-amber-100 text-[10px] text-amber-800 font-bold flex flex-col gap-0.5 shadow-sm">
                  <span className="uppercase tracking-widest text-[8px] text-amber-600 leading-none mb-1">Dispatching Store Location</span>
                  <span className="font-black text-[#1C1917] leading-none mb-0.5">{storeSettings.STORE_ADDRESS}</span>
                  <span className="text-stone-400 font-bold">Coordinates: {storeSettings.STORE_LAT}, {storeSettings.STORE_LNG}</span>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input placeholder="Customer Name" value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-yellow-400 font-bold text-xs" />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input placeholder="Mobile Number" value={customerDetails.phone} onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-yellow-400 font-bold text-xs" />
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-5 -translate-y-1/2 text-stone-400" size={16} />
                    <textarea placeholder="Delivery Address" rows={2} value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="w-full pl-10 pr-4 pt-3.5 pb-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-yellow-400 font-bold text-xs resize-none" />
                  </div>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1C1917]" size={16} />
                    <input placeholder="Pincode" value={customerDetails.pincode} onChange={e => setCustomerDetails({...customerDetails, pincode: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-yellow-400 font-bold text-xs" />
                  </div>
                </div>

                {/* GPS and distance simulation */}
                <div className="space-y-3 border-t border-stone-100 pt-4">
                  <button onClick={detectGpsLocation} className="w-full py-2.5 bg-yellow-50 hover:bg-yellow-100 text-[#1C1917] border border-yellow-250 font-black text-[10px] uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm">
                    <MapPin size={12} />
                    {gpsStatus === 'detecting' ? 'Detecting GPS...' : gpsStatus === 'success' ? 'GPS Location Synced!' : '📍 Get Distance via Device GPS'}
                  </button>

                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/50">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-stone-400 font-black uppercase text-[9px] tracking-wider">Distance Simulation</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          step="0.1" 
                          min="0.1"
                          max="15.0"
                          value={deliveryDistance} 
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              setDeliveryDistance(Math.min(15, Math.max(0.1, val)));
                            }
                          }}
                          className="w-16 text-right px-1.5 py-0.5 bg-white border border-stone-200 rounded font-black text-stone-900 outline-none text-xs focus:border-yellow-400"
                        />
                        <span className="text-stone-500 font-black">km</span>
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="15.0" 
                      step="0.1" 
                      value={deliveryDistance} 
                      onChange={e => setDeliveryDistance(parseFloat(e.target.value))} 
                      className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#1C1917]" 
                    />
                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest text-center mt-1.5">₹8.00 per kilometer delivery charge (Supports decimal values)</p>
                  </div>
                </div>

                {/* Bill details */}
                <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-stone-200/50 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-stone-500 font-bold">
                    <span>Basket Subtotal</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between items-center text-stone-500 font-bold">
                    <span>Delivery Fee ({deliveryDistance} km)</span>
                    <span>₹{Math.round(deliveryDistance * 8 * 10) / 10}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#1C1917] font-black text-sm pt-2 border-t border-stone-100">
                    <span>Total Cash collection</span>
                    <span>₹{Math.round((total + deliveryDistance * 8) * 10) / 10}</span>
                  </div>
                </div>
              </div>

              <button onClick={checkout} className="w-full bg-[#1C1917] hover:bg-emerald-600 text-white font-black py-4 rounded-xl text-xs uppercase shadow-md transition-all active:scale-[0.98]">Place Order (Cash on Delivery)</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* My Orders History Dialog */}
      <AnimatePresence>
        {showMyOrders && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMyOrders(false)} className="absolute inset-0 bg-[#1C1917]/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#FFFBF7] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center p-6 bg-white border-b border-stone-200">
                <div>
                  <h2 className="text-2xl font-black text-stone-900 tracking-tight">Order History</h2>
                  <p className="text-yellow-600 font-black uppercase text-[8px] tracking-[0.2em] mt-0.5">Recent 30 Days activity</p>
                </div>
                <button onClick={() => setShowMyOrders(false)} className="p-2 bg-stone-50 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={16} strokeWidth={3}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {myOrders.length === 0 ? (
                      <div className="text-center py-20">
                          <Receipt size={40} className="mx-auto text-stone-300 mb-3" />
                          <p className="text-sm font-black text-stone-400 uppercase tracking-widest">No Orders Placed Yet</p>
                      </div>
                  ) : (
                      myOrders.map(order => {
                          const packedItemsCount = order.items.filter(item => item.isPacked).length;
                          const totalItems = order.items.length;
                          const progressPercentage = totalItems > 0 ? (packedItemsCount / totalItems) * 100 : 0;
                          
                          let trackingStatus = "Order Placed";
                          if (order.status === 'DELIVERED') trackingStatus = "Delivered ✅";
                          else if (order.status === 'ACCEPTED') {
                              if (packedItemsCount === totalItems) trackingStatus = "Saman Picked Up! Packing Complete";
                              else if (packedItemsCount > 0) trackingStatus = "Packing in Progress 🥛";
                              else trackingStatus = "Rider Assigned 🛵";
                          } else if (order.status === 'OUT_FOR_DELIVERY') {
                              trackingStatus = "Mr. Candy is on the way! (Out for Delivery 🛵)";
                          }

                          return (
                          <div key={order.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden group">
                              <div className="flex justify-between items-center mb-4">
                                  <div>
                                      <div className="flex items-center gap-2 mb-1.5">
                                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                            order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                          }`}>
                                              {order.status}
                                          </span>
                                          <p className="text-[10px] font-bold text-stone-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                                      </div>
                                      <p className="font-black text-stone-900 text-sm">{trackingStatus}</p>
                                      {order.status === 'DELIVERED' && (
                                        <p className="text-[10px] font-black text-emerald-600 tracking-tight mt-0.5">
                                          ⚡ Delivered in {getDeliveryDuration(order)}
                                        </p>
                                      )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-black text-[#1C1917]">₹{order.totalAmount}</p>
                                    <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">Total Paid</p>
                                  </div>
                              </div>
                              
                              {/* Packing Progress */}
                              {order.status !== 'DELIVERED' && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-stone-400 mb-1">
                                        <span>Packing checklist</span>
                                        <span>{packedItemsCount} / {totalItems} Packed</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-stone-50 rounded-full overflow-hidden border border-stone-100">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${progressPercentage}%` }} 
                                            className={`h-full rounded-full ${progressPercentage === 100 ? 'bg-emerald-500' : 'bg-yellow-400'}`} 
                                        />
                                    </div>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mt-2">
                                  <div className="space-y-1 bg-stone-50/50 p-3 rounded-xl border border-stone-100 flex-1">
                                      <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-1.5">Items Purchased</p>
                                      {order.items.map(item => (
                                          <div key={item.id} className="flex justify-between items-center text-xs font-bold text-stone-700">
                                              <span>{item.quantity}x {item.product?.name || 'Item'}</span>
                                              <span>₹{item.price * item.quantity}</span>
                                          </div>
                                      ))}
                                      {order.deliveryCharges !== undefined && order.deliveryCharges > 0 && (
                                          <div className="flex justify-between items-center text-xs font-bold text-stone-500 border-t border-dashed border-stone-100 pt-1.5 mt-1.5">
                                              <span>Delivery Fee ({order.distance} km)</span>
                                              <span>₹{order.deliveryCharges}</span>
                                          </div>
                                      )}
                                  </div>
                                  
                                  {/* OTP */}
                                  {order.status !== 'DELIVERED' && order.otp && (
                                      <div className="bg-yellow-50/50 p-3 rounded-xl border border-yellow-250/50 flex flex-col items-center justify-center shrink-0 min-w-[100px]">
                                          <p className="text-[8px] font-black text-yellow-750 uppercase tracking-widest mb-0.5">Rider OTP</p>
                                          <p className="text-xl font-black text-yellow-800 tracking-wider leading-none">{order.otp}</p>
                                      </div>
                                  )}
                                  
                                  {order.status !== 'DELIVERED' && (
                                    <button 
                                      onClick={() => { setOrderComplete(order); setShowMyOrders(false); }} 
                                      className="bg-[#1C1917] text-white hover:bg-emerald-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all self-stretch sm:self-auto shadow-sm shadow-stone-200"
                                    >
                                      <span>Track Live</span>
                                      <Compass size={12} className="animate-spin-slow" />
                                    </button>
                                  )}
                              </div>
                          </div>
                      );
                    })
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Floating Developer Console Switcher component */}
      <DevSwitcher activeRole="CUSTOMER" router={router} showMenu={showDevMenu} setShowMenu={setShowDevMenu} />
    </div>
  );
}

// Developer switcher reusable inline component with session injector
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
            className="mb-3 bg-[#1C1917] border border-stone-800 text-white rounded-2xl p-3 shadow-2xl w-56 flex flex-col gap-1.5"
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
