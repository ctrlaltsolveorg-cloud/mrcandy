'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Product } from '@/types';
import { Plus, Edit2, Save, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await api.get('/products');
    setProducts(data);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData(product);
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      data.append('name', formData.name || '');
      data.append('wholesaleUnitQty', String(formData.wholesaleUnitQty || 1));
      data.append('price', String(formData.price || 0));
      data.append('unit', formData.unit || 'pcs');
      if (selectedFile) {
        data.append('photo', selectedFile);
      }

      if (editingId) {
        await api.put(`/products/${editingId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product updated!');
      } else {
        await api.post('/products', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product added!');
        setShowAddForm(false);
      }
      setEditingId(null);
      setFormData({});
      setSelectedFile(null);
      fetchProducts();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const renderPhoto = (url: string | null) => {
    if (!url) return <ImageIcon size={20} className="text-gray-900" />;
    const fullUrl = url.startsWith('http') ? url : `http://localhost:4000${url}`;
    return <img src={fullUrl} className="w-full h-full object-cover" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-gray-900">Admin Control</h1>
        <button
          onClick={() => { setShowAddForm(true); setFormData({ wholesaleUnitQty: 1, price: 0, unit: 'pcs' }); }}
          className="bg-blue-700 text-white px-6 py-3 rounded-xl font-black flex items-center shadow-lg hover:bg-blue-800 transition-colors"
        >
          <Plus className="mr-2" /> Naya Samaan
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="p-4 font-black text-gray-900 uppercase text-xs tracking-wider">Samaan</th>
              <th className="p-4 font-black text-gray-900 uppercase text-xs tracking-wider">Wholesale Unit</th>
              <th className="p-4 font-black text-gray-900 uppercase text-xs tracking-wider">Price (Retail)</th>
              <th className="p-4 font-black text-gray-900 uppercase text-xs tracking-wider">Stock</th>
              <th className="p-4 font-black text-gray-900 uppercase text-xs tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(showAddForm || editingId) && (
              <tr className="bg-blue-50">
                <td className="p-4">
                  <input
                    placeholder="Name"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="p-2 border-2 border-gray-400 rounded w-full mb-2 placeholder:text-gray-600 text-gray-900 font-bold bg-white outline-none focus:border-blue-600"
                  />
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">Product Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                      className="text-xs text-gray-900 font-bold file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-black file:bg-blue-200 file:text-blue-900 hover:file:bg-blue-300"
                    />
                  </div>
                </td>
                <td className="p-4">
                  <input
                    type="number"
                    value={formData.wholesaleUnitQty || ''}
                    onChange={e => setFormData({ ...formData, wholesaleUnitQty: Number(e.target.value) })}
                    className="p-2 border-2 border-gray-400 rounded w-20 mb-2 text-gray-900 font-bold bg-white"
                  />
                  <select
                    value={formData.unit || 'pcs'}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="p-2 border-2 border-gray-400 rounded w-20 text-gray-900 font-black bg-white"
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="doz">doz</option>
                    <option value="pkt">pkt</option>
                    <option value="ltr">ltr</option>
                    <option value="gm">gm</option>
                  </select>
                </td>
                <td className="p-4">
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="p-2 border-2 border-gray-400 rounded w-20 text-gray-900 font-bold bg-white"
                  />
                </td>
                <td className="p-4 text-gray-900 font-black">
                  {editingId ? 'Updating...' : 'Initial: 0'}
                </td>
                <td className="p-4">
                  <div className="flex space-x-2">
                    <button onClick={handleSave} className="p-2 bg-green-600 text-white rounded shadow-sm hover:bg-green-700"><Save size={18} /></button>
                    <button onClick={() => { setEditingId(null); setShowAddForm(false); }} className="p-2 bg-gray-800 text-white rounded shadow-sm hover:bg-black"><X size={18} /></button>
                  </div>
                </td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="p-4 flex items-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mr-4 flex items-center justify-center overflow-hidden border border-gray-300">
                    {renderPhoto(product.photoUrl)}
                  </div>
                  <span className="font-bold text-gray-900 text-lg">{product.name}</span>
                </td>
                <td className="p-4 font-bold text-gray-800 text-base">{product.wholesaleUnitQty} {product.unit}</td>
                <td className="p-4 font-black text-gray-950 text-base">₹{product.price} / {product.unit}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-black border-2 ${product.retailStock > 0 ? 'bg-green-100 text-green-900 border-green-200' : 'bg-red-100 text-red-900 border-red-200'}`}>
                    {product.retailStock} {product.unit}
                  </span>
                </td>
                <td className="p-4">
                  <button onClick={() => handleEdit(product)} className="p-3 text-blue-700 hover:bg-blue-100 rounded-full transition-colors"><Edit2 size={20} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
