'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import socket from '@/lib/socket';
import { Product, Order } from '@/types';
import { ShoppingBag, Package, Plus, Minus, Trash2, CheckCircle, Home, ArrowLeft, X, User, Phone, MapPin, Hash, Sparkles, Search, ArrowRight, Receipt, Menu, Tag, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';

export default function UserShop() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orderComplete, setOrderComplete] = useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', address: '', pincode: '' });
  const [riderLocation, setRiderLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  // My Orders State
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [deviceId, setDeviceId] = useState<string>('');
  
  // Menu State
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => { 
      fetchProducts(); 
      
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
      });

      socket.on('rider_location', (data: {lat: number, lng: number}) => {
        setRiderLocation(data);
      });
      
      // Poll for order updates every 5 seconds if My Orders is open (fallback)
      const interval = setInterval(() => {
          if (showMyOrders || orderComplete) {
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
          
          // Filter out orders older than 30 days
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
      keys: ['name'],
      threshold: 0.6, // More forgiving (0.0 is perfect match, 1.0 matches everything)
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    return fuse.search(searchQuery).map(result => result.item);
  }, [fuse, searchQuery, products]);

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
    toast.success(`${product.name} added!`);
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.product.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        if (delta > 0 && newQty > item.product.retailStock) {
          toast.error(`Only ${item.product.retailStock} available!`);
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => { setCart(cart.filter((item) => item.product.id !== id)); };

  const checkout = async () => {
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.address || !customerDetails.pincode) {
      toast.error('Please fill all details!');
      return;
    }
    try {
      const items = cart.map(item => ({ productId: item.product.id, quantity: item.quantity, price: item.product.price }));
      const totalAmount = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
      const { data } = await api.post('/orders', { 
        items, totalAmount,
        customerName: customerDetails.name, customerPhone: customerDetails.phone,
        address: customerDetails.address, pincode: customerDetails.pincode,
        customerId: deviceId
      });
      setOrderComplete(data);
      setCart([]);
      setShowCart(false);
      setShowCheckoutForm(false);
      fetchMyOrders(deviceId);
      toast.success('Order Placed!');
    } catch (error) { toast.error('Failed to place order'); }
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const renderPhoto = (url: string | null) => {
    if (!url) return <Package size={48} className="text-stone-200" />;
    const fullUrl = url.startsWith('http') ? url : `http://localhost:4000${url}`;
    return <img src={fullUrl} alt="product" className="w-full h-full object-cover" />;
  };

  const activeOrder = myOrders.find(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');

  if (orderComplete) {
    // For real-time updates on the completion screen, we use the activeOrder if it matches
    const displayOrder = activeOrder?.id === orderComplete.id ? activeOrder : orderComplete;
    const packedItemsCount = displayOrder.items?.filter(item => item.isPacked).length || 0;
    const totalItems = displayOrder.items?.length || 0;
    const progressPercentage = totalItems > 0 ? (packedItemsCount / totalItems) * 100 : 0;

    let trackingStatus = "Order Placed & Waiting for Rider";
    if (displayOrder.status === 'DELIVERED') trackingStatus = "Delivered";
    else if (displayOrder.status === 'OUT_FOR_DELIVERY') trackingStatus = "Out for Delivery";
    else if (displayOrder.status === 'ACCEPTED') {
        if (packedItemsCount === totalItems) trackingStatus = "Ready for Delivery";
        else if (packedItemsCount > 0) trackingStatus = "Packing in Progress";
        else trackingStatus = "Rider Assigned";
    }

    return (
      <div className="min-h-screen bg-[#FFFBF7] flex flex-col items-center">
        {/* Full width header instead of trapped div */}
        <div className="w-full bg-white border-b-2 border-orange-50 shadow-sm p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-[24px] flex items-center justify-center shadow-inner border-2 border-white flex-shrink-0">
                    <CheckCircle size={40} strokeWidth={2.5} />
                </motion.div>
                <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-[#1C1917] mb-1 tracking-tighter">Order Confirmed!</h1>
                    <p className="text-[#F43F5E] font-black text-lg tracking-tight">{trackingStatus}</p>
                </div>
            </div>
            <button onClick={() => setOrderComplete(null)} className="w-full sm:w-auto btn-dark py-4 px-8 text-lg rounded-[20px]">Return to Shop</button>
        </div>

        <div className="w-full max-w-7xl mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 flex-1">
            {/* Left Column: Tracking & OTP */}
            <div className="flex flex-col gap-6">
                <div className="bg-white p-6 sm:p-8 rounded-[32px] border-2 border-orange-50 shadow-lg shadow-orange-100/30">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4 text-center">Secure Delivery OTP</p>
                    <div className="bg-gradient-to-br from-[#F43F5E] to-[#FB923C] w-full py-6 rounded-[24px] shadow-lg shadow-rose-200 text-center">
                        <span className="text-6xl sm:text-7xl font-black text-white tracking-[0.2em]">{displayOrder.otp}</span>
                    </div>
                    <p className="text-xs font-bold text-stone-400 mt-4 text-center">Show this code to the rider at delivery</p>
                </div>

                {displayOrder.status !== 'DELIVERED' && (
                <div className="bg-white p-6 sm:p-8 rounded-[32px] border-2 border-orange-50 shadow-lg shadow-orange-100/30">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">
                        <span>Packing Progress</span>
                        <span className="text-[#F43F5E]">{packedItemsCount} / {totalItems} Packed</span>
                    </div>
                    <div className="w-full h-4 bg-stone-50 rounded-full overflow-hidden border border-stone-200 shadow-inner mb-6">
                        <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${progressPercentage}%` }} 
                            transition={{ duration: 0.5 }}
                            className={`h-full rounded-full ${progressPercentage === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#F43F5E] to-[#FB923C]'}`} 
                        />
                    </div>
                    
                    {displayOrder.status === 'OUT_FOR_DELIVERY' && (
                        <div className="bg-emerald-50 border-2 border-emerald-100 p-5 rounded-[24px] shadow-sm animate-fade-in">
                            <p className="text-emerald-700 font-black text-sm mb-1 leading-tight">Your order will arrive in around 20-30 minutes.</p>
                            <p className="text-emerald-600 font-bold text-xs mb-4 leading-tight">Be ready with cash or changes, or online payment will be acceptable.</p>
                            
                            {riderLocation ? (
                                <div className="w-full h-32 bg-stone-100 rounded-[16px] overflow-hidden border-2 border-emerald-200 relative shadow-inner">
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        frameBorder="0" 
                                        scrolling="no" 
                                        marginHeight={0} 
                                        marginWidth={0} 
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${riderLocation.lng - 0.005},${riderLocation.lat - 0.005},${riderLocation.lng + 0.005},${riderLocation.lat + 0.005}&layer=mapnik&marker=${riderLocation.lat},${riderLocation.lng}`}
                                    ></iframe>
                                    <div className="absolute top-2 right-2 bg-white/80 backdrop-blur px-2 py-1 rounded-full text-[8px] font-black tracking-widest uppercase shadow-sm border border-stone-100 text-stone-600 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Live Map
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-12 bg-emerald-100/50 rounded-[16px] flex items-center justify-center border-2 border-dashed border-emerald-200 text-emerald-600/50 text-xs font-black uppercase tracking-widest">
                                    Waiting for Rider GPS...
                                </div>
                            )}
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* Right Column: Order Summary */}
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border-2 border-orange-50 shadow-lg shadow-orange-100/30 flex flex-col">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">Order Summary</p>
                <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {displayOrder.items?.map(item => (
                        <div key={item.id} className={`flex justify-between items-center bg-stone-50/50 p-3 rounded-2xl border transition-colors ${item.isPacked ? 'border-emerald-100 bg-emerald-50/30' : 'border-stone-100'}`}>
                            <div className="flex items-center gap-3">
                                {item.isPacked ? (
                                    <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-[3px] border-stone-200 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                    <p className={`font-black text-base leading-tight truncate ${item.isPacked ? 'text-emerald-700' : 'text-[#1C1917]'}`}>
                                        {item.product?.name || 'Item'}
                                    </p>
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{item.quantity} {item.product?.unit}</p>
                                </div>
                            </div>
                            <span className="font-black text-[#1C1917] text-lg pl-2">₹{item.price}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-end border-t-2 border-stone-100 pt-4 mt-4">
                    <span className="text-stone-400 font-black uppercase tracking-[0.2em] text-xs">Total Paid</span>
                    <span className="text-4xl font-black text-[#1C1917]">₹{displayOrder.totalAmount}</span>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] pb-32">
      <header className="bg-white/70 backdrop-blur-2xl sticky top-0 z-40 border-b border-orange-100/50">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                {/* Mobile Hamburger Menu */}
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowMenu(true)} className="lg:hidden p-3 sm:p-4 bg-stone-100 text-stone-600 rounded-[20px] sm:rounded-[24px] hover:bg-[#1C1917] hover:text-white transition-all shadow-inner shrink-0">
                    <Menu size={22} strokeWidth={2.5} />
                </motion.button>
                
                <div className="hidden sm:block shrink-0">
                    <h1 className="text-3xl font-black text-[#1C1917] tracking-tighter">MR. <span className="text-[#F43F5E]">CANDY</span></h1>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Open & Fresh</p>
                    </div>
                </div>

                {/* Desktop Tab Bar Navigation */}
                <div className="hidden lg:flex items-center gap-2 bg-stone-50 p-1.5 rounded-full border border-stone-200 ml-4 shrink-0">
                  <button onClick={() => router.push('/')} className="px-5 py-2.5 rounded-full text-sm font-black text-stone-600 hover:text-[#1C1917] hover:bg-white hover:shadow-sm transition-all flex items-center gap-2">
                    <Home size={16} /> Home
                  </button>
                  <button onClick={() => setShowMyOrders(true)} className="px-5 py-2.5 rounded-full text-sm font-black text-stone-600 hover:text-[#1C1917] hover:bg-white hover:shadow-sm transition-all flex items-center gap-2">
                    <Clock size={16} /> My Orders
                  </button>
                  <button className="px-5 py-2.5 rounded-full text-sm font-black text-stone-400 cursor-not-allowed flex items-center gap-2">
                    <Tag size={16} /> Price Range <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-widest ml-1">Soon</span>
                  </button>
                </div>

                {/* Smart Search Bar */}
                <div className="relative flex-1 max-w-xl ml-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search items (e.g. kurkre...)" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 sm:py-4 bg-stone-50 border-2 border-stone-100 rounded-[20px] sm:rounded-[24px] outline-none focus:border-[#F43F5E] focus:bg-white transition-all font-bold text-sm sm:text-base placeholder:text-stone-300 shadow-inner"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#F43F5E]">
                            <X size={16} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-4 items-center">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCart(true)} className="relative p-4 sm:p-5 bg-[#1C1917] text-white rounded-[20px] sm:rounded-[28px] shadow-2xl shadow-stone-300 transition-all shrink-0">
                    <ShoppingBag size={28} strokeWidth={2} />
                    {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#F43F5E] text-white text-[10px] w-8 h-8 rounded-full flex items-center justify-center font-black border-[4px] border-[#FFFBF7]">
                        {cart.length}
                    </span>
                    )}
                </motion.button>
            </div>
        </div>
      </header>

      <AnimatePresence>
        {activeOrder && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border-b-2 border-orange-50 shadow-md overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-10 py-6">
              <div className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-[32px] p-6 sm:p-8 border-2 border-white shadow-inner flex flex-col gap-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md text-emerald-500 flex-shrink-0">
                        <CheckCircle size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-[#1C1917] tracking-tight">
                        {activeOrder.status === 'PENDING' ? 'Order Placed & Waiting for Rider' : 'Packing in Progress'}
                        </h3>
                        <p className="text-sm font-bold text-stone-600 mt-1">
                        {activeOrder.items.filter(i => i.isPacked).length} of {activeOrder.items.length} items packed
                        </p>
                    </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col items-start md:items-end bg-white/50 p-4 rounded-2xl md:bg-transparent md:p-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">Secure Delivery OTP</p>
                        <div className="bg-white px-8 py-3 rounded-full shadow-md border-2 border-rose-100 text-3xl font-black text-indigo-600 tracking-widest">
                            {activeOrder.otp}
                        </div>
                    </div>
                </div>
                
                {/* Active Packing Checklist */}
                <div className="bg-white/60 p-5 rounded-[24px] border border-white shadow-sm mt-2">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Item Checklist</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeOrder.items.map(item => (
                            <div key={item.id} className={`flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border transition-colors ${item.isPacked ? 'border-emerald-100' : 'border-stone-100'}`}>
                                {item.isPacked ? (
                                    <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-stone-300 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-sm truncate ${item.isPacked ? 'text-emerald-700' : 'text-[#1C1917]'}`}>
                                        {item.product?.name || 'Item'}
                                    </p>
                                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider">{item.quantity} {item.product?.unit}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
        {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-orange-50/50">
                <div className="w-20 h-20 bg-stone-50 rounded-[24px] flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-stone-300" />
                </div>
                <h3 className="text-xl font-black text-stone-400 uppercase tracking-widest">No Matches Found</h3>
            </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                {filteredProducts.map((product) => (
                <motion.div layout initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} key={product.id} className="bg-white rounded-[24px] sm:rounded-[32px] p-3 sm:p-5 shadow-lg shadow-orange-100/30 border-2 border-white hover:border-orange-50 transition-all duration-300 flex flex-col group h-[260px] sm:h-[380px]">
                    <div onClick={() => setSelectedProduct(product)} className="aspect-square bg-[#FFFBF7] rounded-[16px] sm:rounded-[24px] mb-3 sm:mb-4 overflow-hidden flex items-center justify-center relative cursor-pointer shadow-inner">
                    <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.6 }} className="w-full h-full p-2 sm:p-4">
                        {renderPhoto(product.photoUrl)}
                    </motion.div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
                    </div>
                    <h3 onClick={() => setSelectedProduct(product)} className="font-black text-[#1C1917] text-sm sm:text-lg mb-1 sm:mb-2 px-1 tracking-tight line-clamp-2 cursor-pointer h-10 sm:h-14 leading-tight group-hover:text-[#F43F5E] transition-colors">{product.name}</h3>
                    <div className="flex justify-between items-center mb-3 sm:mb-6 px-1 mt-auto">
                        <div>
                            <p className="text-lg sm:text-2xl font-black text-[#1C1917]">₹{product.price}</p>
                            <p className="text-[8px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest">{product.unit}</p>
                        </div>
                        <div className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[7px] sm:text-[9px] font-black tracking-widest border ${product.retailStock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                            {product.retailStock > 0 ? `${product.retailStock} IN STOCK` : 'SOLD OUT'}
                        </div>
                    </div>
                    <button onClick={() => addToCart(product)} disabled={product.retailStock <= 0} className={`w-full py-2.5 sm:py-4 rounded-[16px] sm:rounded-[20px] font-black text-xs sm:text-sm transition-all active:scale-95 shadow-md ${product.retailStock > 0 ? 'bg-[#1C1917] text-white hover:bg-[#F43F5E] shadow-stone-200' : 'bg-stone-50 text-stone-300 cursor-not-allowed shadow-none'}`}>
                    {product.retailStock > 0 ? 'ADD TO BAG' : 'OUT'}
                    </button>
                </motion.div>
                ))}
            </div>
        )}
      </main>

      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProduct(null)} className="absolute inset-0 bg-[#1C1917]/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} transition={{ type: 'spring', damping: 25 }} className="relative bg-white w-full max-w-2xl rounded-[60px] overflow-hidden shadow-2xl border-[6px] border-white">
              <button onClick={() => setSelectedProduct(null)} className="absolute top-8 right-8 z-10 p-4 bg-stone-100 text-stone-900 rounded-[24px] hover:bg-[#F43F5E] hover:text-white shadow-xl transition-all"><X size={28} strokeWidth={3} /></button>
              <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/2 aspect-square bg-[#FFFBF7] p-12 flex items-center justify-center shadow-inner">{renderPhoto(selectedProduct.photoUrl)}</div>
                  <div className="md:w-1/2 p-10 sm:p-14 flex flex-col">
                    <div className="mb-10">
                        <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border border-orange-100"><Sparkles size={14} /> Top Quality</span>
                        <h2 className="text-4xl font-black text-[#1C1917] leading-none mb-4 tracking-tighter">{selectedProduct.name}</h2>
                        <p className="text-5xl font-black text-[#F43F5E]">₹{selectedProduct.price}<span className="text-lg text-stone-300 font-bold uppercase ml-2">/ {selectedProduct.unit}</span></p>
                    </div>
                    <div className="flex items-center gap-4 mb-12 bg-stone-50 p-6 rounded-[32px] border-2 border-stone-100 shadow-inner">
                      <div className={`w-4 h-4 rounded-full ${selectedProduct.retailStock > 0 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                      <p className="font-black text-[#1C1917] text-xl tracking-tight">{selectedProduct.retailStock > 0 ? `${selectedProduct.retailStock} ${selectedProduct.unit} in stock` : 'Currently Unavailable'}</p>
                    </div>
                    <button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} disabled={selectedProduct.retailStock <= 0} className="w-full btn-premium py-7 text-2xl rounded-[35px]">Add to Bag</button>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
      {showCart && (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCart(false)} className="fixed inset-0 z-[60] bg-[#1C1917]/70 backdrop-blur-md" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 35, stiffness: 200 }} className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-[#FFFBF7] shadow-2xl flex flex-col rounded-l-[40px] border-l-[6px] border-white">
                <div className="p-8 border-b border-orange-100/50 flex justify-between items-center bg-white rounded-tl-[34px]">
                    <div><h2 className="text-3xl font-black text-[#1C1917] tracking-tighter mb-1">My Bag</h2><p className="text-stone-400 font-black text-xs uppercase tracking-[0.3em] ml-1">{cart.length} Handpicked items</p></div>
                    <button onClick={() => setShowCart(false)} className="p-3 bg-stone-50 text-stone-900 rounded-[20px] hover:bg-[#F43F5E] hover:text-white transition-all shadow-inner"><ArrowLeft size={24} strokeWidth={3} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                    <div className="text-center py-20"><div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-100/30 border-2 border-white"><ShoppingBag size={48} strokeWidth={1.5} className="text-stone-200" /></div><p className="text-xl font-black text-stone-300 uppercase tracking-[0.3em]">Empty Bag</p></div>
                ) : (
                    cart.map((item) => (
                    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item.product.id} className="flex items-center gap-4 bg-white p-4 rounded-[32px] border-2 border-white shadow-md shadow-stone-200/40 relative group">
                        <div className="w-20 h-20 bg-[#FFFBF7] rounded-[24px] flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner border-2 border-orange-50">{renderPhoto(item.product.photoUrl)}</div>
                        <div className="flex-1"><h4 className="font-black text-[#1C1917] text-lg leading-tight mb-1 tracking-tight">{item.product.name}</h4><p className="text-[#F43F5E] font-black text-base tracking-tight">₹{item.product.price} <span className="text-[10px] text-stone-300 uppercase">/ {item.product.unit}</span></p></div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center bg-stone-50 rounded-[16px] border-2 border-stone-100 p-1 shadow-inner">
                                <button onClick={() => updateCartQty(item.product.id, -1)} className="p-2 text-stone-400 hover:text-[#F43F5E] transition-colors"><Minus size={14} strokeWidth={4}/></button>
                                <span className="w-8 text-center font-black text-sm text-[#1C1917]">{item.quantity}</span>
                                <button onClick={() => updateCartQty(item.product.id, 1)} className="p-2 text-stone-400 hover:text-[#F43F5E] transition-colors"><Plus size={14} strokeWidth={4}/></button>
                            </div>
                            <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-stone-300 hover:text-rose-500 transition-colors"><Trash2 size={18} strokeWidth={2.5} /></button>
                        </div>
                    </motion.div>
                    ))
                )}
                </div>
                {cart.length > 0 && (
                <div className="p-8 bg-white border-t-[4px] border-stone-50 rounded-t-[50px] shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.1)]">
                    <div className="flex justify-between items-end mb-6 px-2"><span className="text-stone-400 font-black uppercase tracking-[0.3em] text-xs">Amount Payable</span><span className="text-4xl font-black text-[#1C1917] tracking-tighter">₹{total}</span></div>
                    <button onClick={() => setShowCheckoutForm(true)} className="w-full btn-premium py-5 text-xl rounded-[28px] shadow-rose-200">Checkout <ArrowRight size={24} strokeWidth={4} /></button>
                    <p className="text-center text-stone-300 font-black mt-4 text-[10px] uppercase tracking-[0.4em]">Zero Platform Fees</p>
                </div>
                )}
            </motion.div>
        </>
      )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckoutForm && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCheckoutForm(false)} className="absolute inset-0 bg-[#1C1917]/90 backdrop-blur-2xl" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30 }} className="relative bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-6 sm:p-10 overflow-hidden shadow-2xl border-4 border-stone-50">
              <div className="flex justify-between items-center mb-8">
                <div><h2 className="text-3xl font-black text-[#1C1917] tracking-tighter">Details</h2><p className="text-[#F43F5E] font-black uppercase text-[10px] tracking-[0.2em] ml-1">Delivery Destination</p></div>
                <button onClick={() => setShowCheckoutForm(false)} className="p-3 bg-stone-50 text-stone-900 rounded-[20px] hover:bg-black hover:text-white shadow-inner transition-all"><X size={24} strokeWidth={3}/></button>
              </div>
              <div className="space-y-4 mb-8">
                <div className="relative"><User className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={20} /><input placeholder="Full Name" value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} className="input-premium pl-14 py-4 text-base rounded-[20px]" /></div>
                <div className="relative"><Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={20} /><input placeholder="Mobile Number" value={customerDetails.phone} onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})} className="input-premium pl-14 py-4 text-base rounded-[20px]" /></div>
                <div className="relative"><MapPin className="absolute left-5 top-8 -translate-y-1/2 text-stone-300" size={20} /><textarea placeholder="Full Address" rows={3} value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="input-premium pl-14 pt-6 text-base rounded-[20px] resize-none" /></div>
                <div className="relative"><Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={20} /><input placeholder="Pincode" value={customerDetails.pincode} onChange={e => setCustomerDetails({...customerDetails, pincode: e.target.value})} className="input-premium pl-14 py-4 text-base rounded-[20px]" /></div>
              </div>
              <button onClick={checkout} className="w-full btn-premium py-5 text-xl rounded-[24px] shadow-emerald-100 from-emerald-500 to-teal-600 border-none">Place Order (COD)</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showMyOrders && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMyOrders(false)} className="absolute inset-0 bg-[#1C1917]/90 backdrop-blur-2xl" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30 }} className="relative bg-[#FFFBF7] w-full max-w-3xl rounded-[50px] overflow-hidden shadow-2xl border-[8px] border-white flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center p-8 sm:p-10 bg-white border-b-4 border-orange-50">
                <div><h2 className="text-4xl font-black text-[#1C1917] tracking-tighter">My Orders</h2><p className="text-[#F43F5E] font-black uppercase text-xs tracking-[0.2em] mt-1">Recent 30 Days Activity</p></div>
                <button onClick={() => setShowMyOrders(false)} className="p-4 bg-stone-50 text-stone-900 rounded-[20px] hover:bg-rose-500 hover:text-white shadow-inner transition-all"><X size={28} strokeWidth={3}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6">
                  {myOrders.length === 0 ? (
                      <div className="text-center py-20">
                          <Receipt size={64} className="mx-auto text-stone-200 mb-6" />
                          <p className="text-2xl font-black text-stone-300 uppercase tracking-widest">No Recent Orders</p>
                      </div>
                  ) : (
                      myOrders.map(order => {
                          const packedItemsCount = order.items.filter(item => item.isPacked).length;
                          const totalItems = order.items.length;
                          const progressPercentage = totalItems > 0 ? (packedItemsCount / totalItems) * 100 : 0;
                          
                          let trackingStatus = "Order Placed";
                          if (order.status === 'DELIVERED') trackingStatus = "Delivered";
                          else if (order.status === 'ACCEPTED') {
                              if (packedItemsCount === totalItems) trackingStatus = "Ready for Delivery";
                              else if (packedItemsCount > 0) trackingStatus = "Packing in Progress";
                              else trackingStatus = "Rider Assigned";
                          }

                          return (
                          <div key={order.id} className="bg-white p-6 sm:p-8 rounded-[40px] shadow-lg shadow-orange-100/40 border-2 border-orange-50 relative overflow-hidden group">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 relative z-10">
                                  <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-4">
                                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                              {order.status}
                                          </span>
                                          <p className="text-xs font-bold text-stone-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                                      </div>
                                      <p className="font-black text-[#F43F5E] text-lg tracking-tight">{trackingStatus}</p>
                                  </div>
                                  <p className="text-3xl font-black text-[#1C1917]">₹{order.totalAmount}</p>
                              </div>
                              
                              {/* Tracking Progress Bar */}
                              {order.status !== 'DELIVERED' && (
                                <div className="mb-6 relative z-10">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">
                                        <span>Packing Progress</span>
                                        <span>{packedItemsCount} / {totalItems} Packed</span>
                                    </div>
                                    <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200 shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${progressPercentage}%` }} 
                                            transition={{ duration: 0.5 }}
                                            className={`h-full rounded-full ${progressPercentage === 100 ? 'bg-emerald-500' : 'bg-[#FB923C]'}`} 
                                        />
                                    </div>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                                  <div className="flex-1 space-y-2 bg-stone-50 p-5 rounded-[24px] border border-stone-100">
                                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Items</p>
                                      {order.items.map(item => (
                                          <div key={item.id} className={`flex justify-between items-center text-sm font-bold transition-colors ${item.isPacked ? 'text-emerald-700' : 'text-[#1C1917]'}`}>
                                              <span className="flex items-center gap-2">
                                                  {item.isPacked ? <CheckCircle size={16} className="text-emerald-500" strokeWidth={2.5} /> : <div className="w-4 h-4 rounded-full border-2 border-stone-300" />}
                                                  <span>
                                                      {item.quantity}x {item.product?.name || 'Item'}
                                                  </span>
                                              </span>
                                              <span>₹{item.price}</span>
                                          </div>
                                      ))}
                                  </div>
                                  {order.status !== 'DELIVERED' && order.otp && (
                                      <div className="sm:w-48 bg-indigo-50 p-5 rounded-[24px] border-2 border-indigo-100 flex flex-col items-center justify-center">
                                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Delivery OTP</p>
                                          <p className="text-4xl font-black text-indigo-600 tracking-widest">{order.otp}</p>
                                      </div>
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

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {showMenu && (
          <div className="fixed inset-0 z-[110] flex">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMenu(false)} className="absolute inset-0 bg-[#1C1917]/70 backdrop-blur-md" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 200 }} className="relative w-full max-w-[320px] bg-[#FFFBF7] h-full shadow-2xl border-r-4 border-white flex flex-col rounded-r-[50px] overflow-hidden">
              <div className="p-8 border-b-2 border-orange-50 bg-white flex justify-between items-center relative z-10 shadow-sm">
                <div>
                  <h2 className="text-3xl font-black text-[#1C1917] tracking-tighter">Menu</h2>
                  <p className="text-orange-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Explore More</p>
                </div>
                <button onClick={() => setShowMenu(false)} className="p-3 bg-stone-50 text-stone-900 rounded-[20px] hover:bg-rose-500 hover:text-white shadow-inner transition-all"><X size={24} strokeWidth={3}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <button onClick={() => { setShowMenu(false); setShowMyOrders(true); }} className="w-full p-6 bg-white rounded-[30px] shadow-sm border border-stone-100 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-100/50 transition-all flex items-center gap-5 group">
                  <div className="w-14 h-14 rounded-2xl bg-stone-50 text-stone-400 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors"><Clock size={24} strokeWidth={2.5}/></div>
                  <div className="text-left">
                    <p className="font-black text-[#1C1917] text-lg">Order History</p>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Track Activity</p>
                  </div>
                </button>

                <button className="w-full p-6 bg-white rounded-[30px] shadow-sm border border-stone-100 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/50 transition-all flex items-center gap-5 group relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Soon</div>
                  <div className="w-14 h-14 rounded-2xl bg-stone-50 text-stone-400 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors"><Tag size={24} strokeWidth={2.5}/></div>
                  <div className="text-left">
                    <p className="font-black text-[#1C1917] text-lg">Price Range</p>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Filter Items</p>
                  </div>
                </button>
              </div>

              <div className="p-8 bg-white border-t-2 border-orange-50 mt-auto">
                <div className="flex items-center justify-center gap-3 opacity-50">
                  <Sparkles size={16} className="text-[#F43F5E]" />
                  <p className="text-xs font-black tracking-[0.3em] text-[#1C1917] uppercase">MR. CANDY</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
