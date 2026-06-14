'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Product, Order } from '@/types';
import { ShoppingCart, Package, Plus, Minus, Trash2, CheckCircle, Home, ArrowLeft, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function UserShop() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orderComplete, setOrderComplete] = useState<Order | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (error) {
      console.error(error);
    }
  };

  const addToCart = (product: Product) => {
    if (product.retailStock <= 0) {
      toast.error('Out of Stock!');
      return;
    }

    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.retailStock) {
        toast.error(`Only ${product.retailStock} ${product.unit} available!`);
        return;
      }
      setCart(cart.map((item) => 
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
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

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.product.id !== id));
  };

  const checkout = async () => {
    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price
      }));
      const totalAmount = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

      const { data } = await api.post('/orders', { items, totalAmount });
      setOrderComplete(data);
      setCart([]);
      setShowCart(false);
      toast.success('Order Placed!');
    } catch (error) {
      toast.error('Failed to place order');
    }
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const renderPhoto = (url: string | null) => {
    if (!url) return <Package size={48} className="text-slate-300" />;
    const fullUrl = url.startsWith('http') ? url : `http://localhost:4000${url}`;
    return <img src={fullUrl} className="w-full h-full object-cover" />;
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 border-4 border-emerald-50"
        >
          <CheckCircle size={48} />
        </motion.div>
        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Order Confirmed!</h1>
        <p className="text-slate-500 text-lg mb-10">Show this OTP to the delivery boy:</p>
        
        <div className="bg-indigo-600 rounded-[40px] p-12 mb-12 shadow-2xl shadow-indigo-200 border-4 border-indigo-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-400/20 to-transparent" />
          <span className="text-xs uppercase font-black text-indigo-100 block mb-3 tracking-[0.2em] relative z-10">Delivery OTP</span>
          <span className="text-8xl font-black text-white tracking-widest relative z-10">{orderComplete.otp}</span>
        </div>

        <button
          onClick={() => setOrderComplete(null)}
          className="btn-foodie text-xl px-12"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFCF9] pb-32">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-orange-100 shadow-sm">
        <div className="max-w-7xl mx-auto p-5 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button onClick={() => router.push('/')} className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-100 transition-all shadow-inner">
                    <Home size={22} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-[#2D1B14] tracking-tighter">Mr. <span className="text-[#f43f5e]">Candy</span></h1>
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest leading-none">Fresh Mart</p>
                </div>
            </div>
            
            <button
                onClick={() => setShowCart(true)}
                className="group relative p-4 bg-[#2D1B14] text-white rounded-[20px] shadow-lg shadow-orange-100 hover:scale-105 active:scale-95 transition-all"
            >
                <ShoppingCart size={24} strokeWidth={2.5} />
                {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#f43f5e] text-white text-[10px] w-7 h-7 rounded-full flex items-center justify-center font-black border-4 border-white shadow-sm">
                    {cart.length}
                </span>
                )}
            </button>
        </div>
      </header>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8">
        {products.map((product) => (
          <motion.div 
            whileHover={{ y: -4 }}
            key={product.id} 
            className="bg-white rounded-[24px] sm:rounded-[40px] p-2.5 sm:p-5 shadow-lg shadow-orange-100/30 border border-orange-50 transition-all flex flex-col"
          >
            <div className="aspect-square bg-[#FFFCF9] rounded-[18px] sm:rounded-[30px] mb-3 sm:mb-6 overflow-hidden flex items-center justify-center group relative shadow-inner">
              {renderPhoto(product.photoUrl)}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </div>
            
            <h3 className="font-black text-[#2D1B14] text-sm sm:text-2xl mb-1 sm:mb-2 px-1 tracking-tight truncate sm:whitespace-normal">{product.name}</h3>
            
            <div className="flex justify-between items-center mb-3 sm:mb-8 px-1">
                <div>
                    <p className="text-base sm:text-3xl font-black text-[#f43f5e]">₹{product.price}</p>
                    <p className="text-[8px] sm:text-xs font-bold text-orange-900/40 uppercase tracking-widest leading-none">Per {product.unit}</p>
                </div>
                <div className={`px-2 sm:px-4 py-0.5 sm:py-1.5 rounded-full text-[7px] sm:text-xs font-black tracking-tighter sm:tracking-wide border ${product.retailStock > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                    {product.retailStock > 0 ? `${product.retailStock} ${product.unit}` : 'Sold Out'}
                </div>
            </div>

            <button
              onClick={() => addToCart(product)}
              disabled={product.retailStock <= 0}
              className={`w-full py-2.5 sm:py-5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-lg transition-all active:scale-95 shadow-md sm:shadow-xl ${
                product.retailStock > 0 
                ? 'bg-[#2D1B14] text-white hover:bg-[#f43f5e] shadow-rose-100' 
                : 'bg-orange-50 text-orange-200 cursor-not-allowed shadow-none'
              }`}
            >
              {product.retailStock > 0 ? '+ Add' : 'Out'}
            </button>
          </motion.div>
        ))}
      </main>

      {/* Cart Drawer */}
      <AnimatePresence>
      {showCart && (
        <>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowCart(false)}
                className="fixed inset-0 z-40 bg-[#2D1B14]/60 backdrop-blur-md" 
            />
            <motion.div 
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#FFFCF9] shadow-2xl flex flex-col rounded-l-[50px] border-l-4 border-white"
            >
                <div className="p-10 border-b border-orange-50 flex justify-between items-center bg-white rounded-tl-[50px]">
                    <div>
                        <h2 className="text-4xl font-black text-[#2D1B14] tracking-tight">Your Bag</h2>
                        <p className="text-orange-900/40 font-bold text-sm uppercase tracking-widest">{cart.length} items</p>
                    </div>
                    <button onClick={() => setShowCart(false)} className="p-4 bg-orange-50 text-orange-600 rounded-3xl hover:bg-orange-100 transition-all shadow-inner">
                        <ArrowLeft size={28} strokeWidth={3} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {cart.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="w-32 h-32 bg-white rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-orange-100/50">
                            <ShoppingBag size={64} strokeWidth={1.5} className="text-orange-100" />
                        </div>
                        <p className="text-2xl font-black text-orange-900/20 uppercase tracking-[0.2em]">Bag is Empty</p>
                    </div>
                ) : (
                    cart.map((item) => (
                    <motion.div 
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        key={item.product.id} 
                        className="flex items-center gap-3 sm:gap-5 bg-white p-3 sm:p-5 rounded-[25px] sm:rounded-[35px] border-2 border-orange-50 shadow-lg shadow-orange-100/30"
                    >
                        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-[#FFFCF9] rounded-[18px] sm:rounded-[25px] flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-orange-50 shadow-inner">
                            {renderPhoto(item.product.photoUrl)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-[#2D1B14] text-base sm:text-xl leading-tight mb-1 truncate">{item.product.name}</h4>
                            <p className="text-[#f43f5e] font-black text-sm sm:text-lg">₹{item.product.price}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                            <div className="flex items-center bg-[#FFFCF9] rounded-xl border-2 border-orange-50 p-1 shadow-inner">
                                <button onClick={() => updateCartQty(item.product.id, -1)} className="p-1 sm:p-2 text-orange-400 hover:text-[#f43f5e] transition-colors"><Minus size={16} strokeWidth={4}/></button>
                                <span className="w-8 sm:w-12 text-center font-black text-[10px] sm:text-sm text-[#2D1B14]">{item.quantity}</span>
                                <button onClick={() => updateCartQty(item.product.id, 1)} className="p-1 sm:p-2 text-orange-400 hover:text-[#f43f5e] transition-colors"><Plus size={16} strokeWidth={4}/></button>
                            </div>
                            <button onClick={() => removeFromCart(item.product.id)} className="p-1 text-orange-900/20 hover:text-[#f43f5e] transition-colors">
                                <Trash2 size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                    </motion.div>
                    ))
                )}
                </div>

                {cart.length > 0 && (
                <div className="p-10 bg-white border-t-4 border-orange-50 rounded-t-[60px] shadow-[0_-20px_50px_-20px_rgba(251,191,36,0.1)]">
                    <div className="flex justify-between mb-8">
                        <span className="text-orange-900/40 font-black uppercase tracking-widest">To Pay</span>
                        <span className="text-5xl font-black text-[#2D1B14]">₹{total}</span>
                    </div>
                    <button
                        onClick={checkout}
                        className="w-full py-6 bg-[#f43f5e] text-white rounded-[30px] font-black text-2xl shadow-2xl shadow-rose-200 hover:bg-[#e11d48] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <CheckCircle size={32} strokeWidth={3} /> CHECKOUT
                    </button>
                    <p className="text-center text-orange-900/30 font-black mt-8 text-xs uppercase tracking-[0.3em]">Cash on Delivery</p>
                </div>
                )}
            </motion.div>
        </>
      )}
      </AnimatePresence>
    </div>
  );
}
