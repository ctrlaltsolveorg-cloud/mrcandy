'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Product, Order } from '@/types';
import { Plus, Edit2, Save, X, Image as ImageIcon, Package, Home, LayoutGrid, DollarSign, Archive, ArrowRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      const sorted = [...data].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setProducts(sorted);
    } catch (error) { toast.error('Failed to load catalog'); }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData(product);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      data.append('name', formData.name || '');
      data.append('wholesaleUnitQty', String(formData.wholesaleUnitQty || 1));
      data.append('price', String(formData.price || 0));
      data.append('unit', formData.unit || 'pcs');
      if (selectedFile) data.append('photo', selectedFile);

      if (editingId) {
        await api.put(`/products/${editingId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Catalog updated!');
      } else {
        await api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('New item launched!');
        setShowAddForm(false);
      }
      setEditingId(null);
      setFormData({});
      setSelectedFile(null);
      fetchProducts();
    } catch (error) { toast.error('Operation failed'); }
  };

  const renderPhoto = (url: string | null) => {
    if (!url) return <ImageIcon size={20} className="text-stone-300" />;
    const fullUrl = url.startsWith('http') ? url : `http://localhost:4000${url}`;
    return <img src={fullUrl} alt="product" className="w-full h-full object-cover" />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 text-[#1C1917]">
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <div className="flex items-center gap-3 mb-3">
                <motion.button whileHover={{ scale: 1.1 }} onClick={() => router.push('/')} className="p-3 bg-white rounded-[20px] shadow-lg shadow-slate-200/50 border border-slate-100 text-stone-900"><Home size={20} strokeWidth={2.5}/></motion.button>
                <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] font-black tracking-[0.2em] uppercase border border-indigo-100">Control Center</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none mb-1">Shop <span className="text-indigo-600">Admin</span></h1>
            <p className="text-sm font-bold text-slate-400">Advanced catalog & operations management.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => router.push('/admin/orders')} className="flex-1 md:flex-none bg-white text-stone-900 px-6 py-4 rounded-[24px] font-black text-sm flex items-center justify-center border-2 border-slate-100 shadow-md shadow-slate-200/40 hover:bg-[#1C1917] hover:text-white hover:border-[#1C1917] transition-all">
                <Package className="mr-2 text-[#F43F5E]" size={20} strokeWidth={2.5} /> ORDERS
            </button>
            <button onClick={() => { setShowAddForm(true); setFormData({ wholesaleUnitQty: 1, price: 0, unit: 'pcs' }); }} className="flex-1 md:flex-none bg-[#1C1917] text-white px-6 py-4 rounded-[24px] font-black text-sm flex items-center justify-center shadow-lg shadow-stone-300 hover:bg-indigo-600 transition-all">
                <Plus className="mr-2" size={20} strokeWidth={3} /> NEW SKU
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
                        <div className="p-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors group">
                            <label className="flex flex-col items-center justify-center cursor-pointer gap-2">
                                <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center shadow-sm text-indigo-600 group-hover:scale-110 transition-transform"><ImageIcon size={20} /></div>
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{selectedFile ? selectedFile.name : 'Select HD Photo'}</span>
                                <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                            </label>
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
                        <button onClick={handleSave} className="w-full btn-premium !py-4 text-sm rounded-2xl h-[56px]">SAVE <ArrowRight size={16} strokeWidth={3}/></button>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border-4 border-white overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Active Catalog</h2>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} /><input placeholder="Quick filter..." className="pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 outline-none text-[10px] font-bold w-40 sm:w-60 focus:border-indigo-400 transition-all shadow-sm" /></div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white border-b-2 border-slate-100">
                <tr>
                  <th className="p-5 sm:p-6 font-black text-slate-300 uppercase text-[9px] tracking-[0.2em]">Product</th>
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
    </div>
  );
}