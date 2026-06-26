'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Product } from '@/types';
import { Plus, Edit2, X, Image as ImageIcon, Package, Home, LayoutGrid, DollarSign, Archive, ArrowRight, Search, ShieldCheck, Sparkles, LogOut, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Store Settings state
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [settings, setSettings] = useState({ STORE_LAT: '28.6139', STORE_LNG: '77.2090', STORE_ADDRESS: 'Connaught Place, New Delhi' });
  
  // Authorization Guards
  const [authorized, setAuthorized] = useState(false);

  // Developer Switcher
  const [showDevMenu, setShowDevMenu] = useState(false);

  useEffect(() => {
    // Enforce Route Authorization
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      toast.error('Aap logged in nahi hain! Please login karein.');
      router.push('/login?redirect=/admin');
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
      fetchProducts();
      fetchSettings();
    } catch (e) {
      toast.error('Session error. Please login again.');
      router.push('/login');
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      if (data.STORE_LAT) {
        setSettings({
          STORE_LAT: data.STORE_LAT,
          STORE_LNG: data.STORE_LNG,
          STORE_ADDRESS: data.STORE_ADDRESS
        });
      }
    } catch (e) {
      console.error('Failed to load settings');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.post('/settings', settings);
      toast.success('Store configuration updated!');
      setShowSettingsForm(false);
    } catch (e) {
      toast.error('Failed to update store settings');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      const sorted = [...data].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setProducts(sorted);
    } catch (error) { toast.error('Failed to load catalog'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully!');
    router.push('/login');
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name || '',
        wholesaleUnitQty: formData.wholesaleUnitQty || 1,
        price: formData.price || 0,
        unit: formData.unit || 'pcs',
        category: formData.category || 'Snacks & Munchies',
        photoUrl: formData.photoUrl || ''
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        toast.success('Catalog updated!');
      } else {
        await api.post('/products', payload);
        toast.success('New item launched!');
        setShowAddForm(false);
      }
      setEditingId(null);
      setFormData({});
      fetchProducts();
    } catch (error) { toast.error('Operation failed'); }
  };

  const renderPhoto = (url: string | null) => {
    if (!url) return <ImageIcon size={20} className="text-stone-300" />;
    const fullUrl = url.startsWith('http') ? url : `http://localhost:4000${url}`;
    return <img src={fullUrl} alt="product" className="w-full h-full object-cover" />;
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#FFFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Checking Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 text-[#1C1917] pb-24">
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <div className="flex items-center gap-3 mb-3">
                <motion.button whileHover={{ scale: 1.1 }} onClick={() => router.push('/')} className="p-3 bg-white rounded-[20px] shadow-lg shadow-slate-200/50 border border-slate-100 text-stone-900"><Home size={20} strokeWidth={2.5}/></motion.button>
                <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase border border-indigo-100">Control Center</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none mb-1">Shop <span className="text-indigo-600">Admin</span></h1>
            <p className="text-sm font-bold text-slate-400">Advanced catalog & operations management.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button onClick={() => { setShowSettingsForm(true); setShowAddForm(false); setEditingId(null); }} className="flex-1 md:flex-none bg-indigo-50 text-indigo-600 border border-indigo-200 px-6 py-4 rounded-[24px] font-black text-sm flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                <Settings className="mr-2" size={16} /> STORE CONFIG
            </button>
            <button onClick={() => router.push('/admin/orders')} className="flex-1 md:flex-none bg-white text-stone-900 px-6 py-4 rounded-[24px] font-black text-sm flex items-center justify-center border border-slate-250 hover:bg-[#1C1917] hover:text-white hover:border-[#1C1917] transition-all">
                <Package className="mr-2 text-[#F43F5E]" size={20} strokeWidth={2.5} /> ORDERS
            </button>
            <button onClick={() => { setShowAddForm(true); setShowSettingsForm(false); setEditingId(null); setFormData({ wholesaleUnitQty: 1, price: 0, unit: 'pcs', category: 'Snacks & Munchies' }); }} className="flex-1 md:flex-none bg-[#1C1917] text-white px-6 py-4 rounded-[24px] font-black text-sm flex items-center justify-center shadow-lg shadow-stone-300 hover:bg-indigo-600 transition-all">
                <Plus className="mr-2" size={20} strokeWidth={3} /> NEW SKU
            </button>
            <button onClick={handleLogout} className="flex-1 md:flex-none bg-rose-50 text-rose-600 px-6 py-4 rounded-[24px] font-black text-sm flex items-center justify-center border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                <LogOut className="mr-2" size={16} /> LOG OUT
            </button>
        </div>
      </header>

      <AnimatePresence>
        {(showAddForm || editingId) && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-7xl mx-auto mb-10 bg-white p-6 sm:p-10 rounded-[40px] shadow-xl shadow-indigo-100 border-4 border-indigo-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-12 text-indigo-600 font-black text-8xl">MOD</div>
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{editingId ? 'Edit Product' : 'Create New Entry'}</h2>
                    <button onClick={() => { setEditingId(null); setShowAddForm(false); }} className="p-3 bg-stone-50 text-stone-900 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><X size={20} strokeWidth={3}/></button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 relative z-10">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="relative"><LayoutGrid className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={18} /><input placeholder="Product Name (e.g. Kurkure)" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-premium pl-14 !py-4 text-sm rounded-2xl" /></div>
                        <div className="relative">
                            <ImageIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                            <input 
                                placeholder="Photo URL (e.g. https://...)" 
                                value={formData.photoUrl || ''} 
                                onChange={e => setFormData({ ...formData, photoUrl: e.target.value })} 
                                className="input-premium pl-14 !py-4 text-sm rounded-2xl" 
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="relative"><Archive className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={18} /><input type="number" placeholder="Batch Qty" value={formData.wholesaleUnitQty || ''} onChange={e => setFormData({ ...formData, wholesaleUnitQty: Number(e.target.value) })} className="input-premium pl-14 !py-4 text-sm rounded-2xl" /></div>
                        <select value={formData.unit || 'pcs'} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="input-premium appearance-none bg-stone-50 !py-4 text-sm rounded-2xl">
                            {['pcs', 'kg', 'doz', 'pkt', 'ltr', 'gm'].map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div className="space-y-4">
                        <div className="relative"><DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-300" size={18} /><input type="number" placeholder="Retail Price" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="input-premium pl-14 !py-4 text-sm rounded-2xl" /></div>
                        <select value={formData.category || 'Snacks & Munchies'} onChange={e => setFormData({ ...formData, category: e.target.value })} className="input-premium appearance-none bg-stone-50 !py-4 text-sm rounded-2xl">
                            {['Fruits & Veggies', 'Dairy & Bread', 'Snacks & Munchies', 'Staples & Spices'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={handleSave} className="w-full btn-premium !py-4 text-sm rounded-2xl h-[56px]">SAVE <ArrowRight size={16} strokeWidth={3}/></button>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsForm && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-7xl mx-auto mb-10 bg-white p-6 sm:p-10 rounded-[40px] shadow-xl shadow-indigo-100 border-4 border-indigo-50 relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                        <Settings className="text-indigo-600" /> Reference Store Location
                      </h2>
                      <p className="text-slate-400 font-bold text-xs mt-1">This location is the reference dispatch store coordinates. Delivery charges are dynamically calculated at ₹8/km from here.</p>
                    </div>
                    <button onClick={() => setShowSettingsForm(false)} className="p-3 bg-stone-50 text-stone-900 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><X size={20} strokeWidth={3}/></button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Store Latitude</label>
                        <input type="text" placeholder="e.g. 28.6139" value={settings.STORE_LAT} onChange={e => setSettings({ ...settings, STORE_LAT: e.target.value })} className="input-premium text-sm rounded-2xl" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Store Longitude</label>
                        <input type="text" placeholder="e.g. 77.2090" value={settings.STORE_LNG} onChange={e => setSettings({ ...settings, STORE_LNG: e.target.value })} className="input-premium text-sm rounded-2xl" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Store Address / Name</label>
                        <input type="text" placeholder="Connaught Place, New Delhi" value={settings.STORE_ADDRESS} onChange={e => setSettings({ ...settings, STORE_ADDRESS: e.target.value })} className="input-premium text-sm rounded-2xl" />
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={() => setShowSettingsForm(false)} className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black text-xs uppercase rounded-xl transition-all">Cancel</button>
                    <button onClick={handleSaveSettings} className="px-6 py-3 bg-[#1C1917] hover:bg-indigo-600 text-white font-black text-xs uppercase rounded-xl transition-all flex items-center gap-2">Save Store Config <ArrowRight size={14} /></button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border-4 border-white overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Active Catalog</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white border-b-2 border-slate-100">
                <tr>
                  <th className="p-5 sm:p-6 font-black text-slate-300 uppercase text-[9px] tracking-[0.2em]">Product</th>
                  <th className="p-5 sm:p-6 font-black text-slate-300 uppercase text-[9px] tracking-[0.2em]">Category</th>
                  <th className="p-5 sm:p-6 font-black text-slate-300 uppercase text-[9px] tracking-[0.2em]">Scale</th>
                  <th className="p-5 sm:p-6 font-black text-slate-300 uppercase text-[9px] tracking-[0.2em]">Price</th>
                  <th className="p-5 sm:p-6 font-black text-slate-300 uppercase text-[9px] tracking-[0.2em]">Status</th>
                  <th className="p-5 sm:p-6 font-black text-slate-300 uppercase text-[9px] tracking-[0.2em]">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map((product) => (
                  <tr key={product.id} className="group hover:bg-indigo-50/30 transition-colors">
                    <td className="p-5 sm:p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-[14px] flex items-center justify-center overflow-hidden border-2 border-white shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                          {renderPhoto(product.photoUrl)}
                        </div>
                        <div className="min-w-0"><p className="font-black text-slate-900 text-sm sm:text-lg tracking-tight leading-none mb-1 truncate">{product.name}</p><p className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Standard SKU</p></div>
                      </div>
                    </td>
                    <td className="p-5 sm:p-6"><span className="text-xs font-bold text-slate-500">{product.category}</span></td>
                    <td className="p-5 sm:p-6"><div className="bg-slate-100 inline-flex items-center px-3 py-1.5 rounded-xl border border-slate-200 font-black text-slate-600 text-xs">{product.wholesaleUnitQty} {product.unit.toUpperCase()}</div></td>
                    <td className="p-5 sm:p-6"><p className="text-lg sm:text-xl font-black text-stone-900 leading-none mb-0.5">₹{product.price}</p><p className="text-[8px] font-bold text-slate-300 uppercase">Per {product.unit}</p></td>
                    <td className="p-5 sm:p-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest border-2 ${product.retailStock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${product.retailStock > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {product.retailStock} {product.unit.toUpperCase()}
                      </div>
                    </td>
                    <td className="p-5 sm:p-6">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleEdit(product)} className="p-3 text-indigo-600 hover:bg-white hover:shadow-md rounded-[14px] transition-all border border-transparent hover:border-indigo-100"><Edit2 size={18} strokeWidth={2.5} /></motion.button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      {/* Developer Role Switcher overlay */}
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