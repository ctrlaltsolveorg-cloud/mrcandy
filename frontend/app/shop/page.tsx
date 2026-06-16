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
      
      // Poll for order updates every 5 seconds if My Orders is open (fallback)
      const interval = setInterval(() => {
          if (showMyOrders || orderComplete) {
              fetchMyOrders(id);
          }
      }, 5000);
      
      return () => {
        clearInterval(interval);
        socket.off('item_packed_status');
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
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-32 h-32 bg-emerald-50 text-emerald-500 rounded-[40px] flex items-center justify-center mb-10 shadow-inner">
          <CheckCircle size={64} strokeWidth={1.5} />
        </motion.div>
        <h1 className="text-5xl font-black text-[#1C1917] mb-4 tracking-tighter">Order Placed!</h1>
        <p className="text-[#78716C] text-xl font-bold mb-12">Show this OTP to the delivery partner:</p>
        <div className="bg-gradient-to-br from-[#F43F5E] to-[#FB923C] rounded-[50px] p-16 mb-16 shadow-2xl shadow-rose-200 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <span className="text-xs uppercase font-black text-white/60 block mb-4 tracking-[0.4em]">Delivery OTP</span>
            <span className="text-9xl font-black text-white tracking-widest leading-none drop-shadow-2xl">{orderComplete.otp}</span>
        </div>
        <button onClick={() => setOrderComplete(null)} className="btn-premium text-2xl px-16 py-7">Back to Mart</button>
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
            className="bg-white border-b-2 border-orange-50 shadow-md"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-10 py-6">
              <div className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-[32px] p-6 sm:p-8 border-2 border-white shadow-inner flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md text-[#F43F5E]">
                    <CheckCircle size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#1C1917] tracking-tight">
                      {activeOrder.status === 'PENDING' ? 'Order Placed & Waiting for Rider' : 'Packing in Progress'}
                    </h3>
                    <p className="text-sm font-bold text-[#F43F5E] mt-1">
                      {activeOrder.items.filter(i => i.isPacked).length} of {activeOrder.items.length} items packed
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-auto flex flex-col items-center md:items-end">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">Secure Delivery OTP</p>
                    <div className="bg-white px-8 py-3 rounded-full shadow-md border-2 border-rose-100 text-3xl font-black text-indigo-600 tracking-widest">
                        {activeOrder.otp}
                    </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto p-4 sm:p-10">
        {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[40px] border-4 border-dashed border-orange-50/50">
                <div className="w-24 h-24 bg-stone-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
                    <Search size={40} className="text-stone-200" />
                </div>
                <h3 className="text-2xl font-black text-stone-300 uppercase tracking-widest">No Matches Found</h3>
                <p className="text-stone-400 font-bold mt-2">Try searching something else!</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-12">
                {filteredProducts.map((product) => (
                <motion.div layout initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} key={product.id} className="bg-white rounded-[50px] p-4 sm:p-7 shadow-[0_20px_50px_-20px_rgba(28,25,23,0.08)] border-4 border-white hover:border-orange-50 transition-all duration-500 flex flex-col group h-[320px] sm:h-[550px]">
                    <div onClick={() => setSelectedProduct(product)} className="aspect-square bg-[#FFFBF7] rounded-[36px] mb-4 sm:mb-8 overflow-hidden flex items-center justify-center relative cursor-pointer shadow-inner">
                    <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.6 }} className="w-full h-full p-4">
                        {renderPhoto(product.photoUrl)}
                    </motion.div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
                    </div>
                    <h3 onClick={() => setSelectedProduct(product)} className="font-black text-[#1C1917] text-lg sm:text-3xl mb-1 sm:mb-3 px-1 tracking-tight line-clamp-2 cursor-pointer h-12 sm:h-20 leading-tight group-hover:text-[#F43F5E] transition-colors">{product.name}</h3>
                    <div className="flex justify-between items-center mb-4 sm:mb-10 px-1 mt-auto">
                        <div>
                            <p className="text-2xl sm:text-4xl font-black text-[#1C1917]">₹{product.price}</p>
                            <p className="text-[10px] sm:text-xs font-black text-stone-400 uppercase tracking-widest">{product.unit}</p>
                        </div>
                        <div className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[8px] sm:text-xs font-black tracking-widest border-2 ${product.retailStock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                            {product.retailStock > 0 ? `${product.retailStock} IN STOCK` : 'SOLD OUT'}
                        </div>
                    </div>
                    <button onClick={() => addToCart(product)} disabled={product.retailStock <= 0} className={`w-full py-4 sm:py-6 rounded-[24px] sm:rounded-[32px] font-black text-xs sm:text-xl transition-all active:scale-95 shadow-xl ${product.retailStock > 0 ? 'bg-[#1C1917] text-white hover:bg-[#F43F5E] shadow-stone-200' : 'bg-stone-50 text-stone-300 cursor-not-allowed shadow-none'}`}>
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
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 35, stiffness: 200 }} className="fixed inset-y-0 right-0 z-[70] w-full max-w-xl bg-[#FFFBF7] shadow-2xl flex flex-col rounded-l-[70px] border-l-[8px] border-white">
                <div className="p-12 border-b border-orange-100/50 flex justify-between items-center bg-white rounded-tl-[62px]">
                    <div><h2 className="text-5xl font-black text-[#1C1917] tracking-tighter mb-2">My Bag</h2><p className="text-stone-400 font-black text-sm uppercase tracking-[0.3em] ml-1">{cart.length} Handpicked items</p></div>
                    <button onClick={() => setShowCart(false)} className="p-5 bg-stone-50 text-stone-900 rounded-[30px] hover:bg-[#F43F5E] hover:text-white transition-all shadow-inner"><ArrowLeft size={32} strokeWidth={3} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-8">
                {cart.length === 0 ? (
                    <div className="text-center py-32"><div className="w-40 h-40 bg-white rounded-[50px] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-orange-100/30 border-4 border-white"><ShoppingBag size={80} strokeWidth={1} className="text-stone-200" /></div><p className="text-3xl font-black text-stone-200 uppercase tracking-[0.3em]">Empty Bag</p></div>
                ) : (
                    cart.map((item) => (
                    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={item.product.id} className="flex items-center gap-8 bg-white p-8 rounded-[45px] border-4 border-white shadow-xl shadow-stone-200/40 relative group">
                        <div className="w-28 h-28 bg-[#FFFBF7] rounded-[32px] flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner border-2 border-orange-50">{renderPhoto(item.product.photoUrl)}</div>
                        <div className="flex-1"><h4 className="font-black text-[#1C1917] text-2xl leading-none mb-2 tracking-tight">{item.product.name}</h4><p className="text-[#F43F5E] font-black text-xl tracking-tight">₹{item.product.price} <span className="text-xs text-stone-300 uppercase">/ {item.product.unit}</span></p></div>
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center bg-stone-50 rounded-[22px] border-2 border-stone-100 p-2 shadow-inner">
                                <button onClick={() => updateCartQty(item.product.id, -1)} className="p-3 text-stone-400 hover:text-[#F43F5E] transition-colors"><Minus size={18} strokeWidth={4}/></button>
                                <span className="w-14 text-center font-black text-lg text-[#1C1917]">{item.quantity}</span>
                                <button onClick={() => updateCartQty(item.product.id, 1)} className="p-3 text-stone-400 hover:text-[#F43F5E] transition-colors"><Plus size={18} strokeWidth={4}/></button>
                            </div>
                            <button onClick={() => removeFromCart(item.product.id)} className="p-3 text-stone-200 hover:text-rose-500 transition-colors"><Trash2 size={24} strokeWidth={2.5} /></button>
                        </div>
                    </motion.div>
                    ))
                )}
                </div>
                {cart.length > 0 && (
                <div className="p-12 bg-white border-t-[6px] border-stone-50 rounded-t-[80px] shadow-[0_-30px_60px_-20px_rgba(0,0,0,0.1)]">
                    <div className="flex justify-between items-end mb-10 px-2"><span className="text-stone-400 font-black uppercase tracking-[0.3em] text-sm">Amount Payable</span><span className="text-6xl font-black text-[#1C1917] tracking-tighter">₹{total}</span></div>
                    <button onClick={() => setShowCheckoutForm(true)} className="w-full btn-premium py-8 text-3xl rounded-[40px] shadow-rose-200">Checkout <ArrowRight size={32} strokeWidth={4} /></button>
                    <p className="text-center text-stone-300 font-black mt-8 text-xs uppercase tracking-[0.4em]">Zero Platform Fees</p>
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
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30 }} className="relative bg-white w-full max-w-2xl rounded-t-[70px] sm:rounded-[70px] p-10 sm:p-16 overflow-hidden shadow-2xl border-[8px] border-stone-50">
              <div className="flex justify-between items-center mb-12">
                <div><h2 className="text-5xl font-black text-[#1C1917] tracking-tighter">Details</h2><p className="text-[#F43F5E] font-black uppercase text-sm tracking-[0.3em] ml-1">Delivery Destination</p></div>
                <button onClick={() => setShowCheckoutForm(false)} className="p-5 bg-stone-50 text-stone-900 rounded-[30px] hover:bg-black hover:text-white shadow-inner transition-all"><X size={32} strokeWidth={4}/></button>
              </div>
              <div className="space-y-6 mb-12">
                <div className="relative"><User className="absolute left-7 top-1/2 -translate-y-1/2 text-stone-300" size={24} /><input placeholder="Full Name" value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} className="input-premium pl-20" /></div>
                <div className="relative"><Phone className="absolute left-7 top-1/2 -translate-y-1/2 text-stone-300" size={24} /><input placeholder="Mobile Number" value={customerDetails.phone} onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})} className="input-premium pl-20" /></div>
                <div className="relative"><MapPin className="absolute left-7 top-10 -translate-y-1/2 text-stone-300" size={24} /><textarea placeholder="Full Address" rows={3} value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="input-premium pl-20 pt-8 resize-none" /></div>
                <div className="relative"><Hash className="absolute left-7 top-1/2 -translate-y-1/2 text-stone-300" size={24} /><input placeholder="Pincode" value={customerDetails.pincode} onChange={e => setCustomerDetails({...customerDetails, pincode: e.target.value})} className="input-premium pl-20" /></div>
              </div>
              <button onClick={checkout} className="w-full btn-premium py-8 text-3xl rounded-[40px] shadow-emerald-100 from-emerald-500 to-teal-600 border-none">Place Order (COD)</button>
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
