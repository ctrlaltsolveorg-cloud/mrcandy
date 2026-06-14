'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Product } from '@/types';
import { Plus, Minus, Package, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function MotherPanel() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (id: string, type: 'add' | 'deduct') => {
    try {
      const endpoint = type === 'add' ? `/products/${id}/add-stock` : `/products/${id}/deduct-stock`;
      const { data } = await api.post(endpoint, { multiplier: 1 });
      
      setProducts(products.map(p => p.id === id ? data : p));
      toast.success(`${type === 'add' ? 'Added' : 'Removed'} stock!`);
    } catch (error) {
      toast.error('Failed to update stock');
    }
  };

  const renderPhoto = (url: string | null) => {
    if (!url) return <Package className="w-10 h-10 text-gray-900" />;
    const fullUrl = url.startsWith('http') ? url : `http://localhost:4000${url}`;
    return <img src={fullUrl} className="w-full h-full object-cover" />;
  };

  if (loading) return <div className="p-8 text-center text-gray-900 font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20 text-gray-900">
      <header className="mb-8 flex items-center justify-between">
        <div>
            <div className="flex items-center space-x-2 mb-1">
                <button onClick={() => router.push('/')} className="p-2 bg-white rounded-full shadow-sm border border-gray-200"><Home size={20} className="text-gray-900"/></button>
                <h1 className="text-3xl font-black text-gray-900">Mummy's Inventory</h1>
            </div>
            <p className="text-gray-900 font-bold text-lg ml-10">Samaan ki list aur stock update karein</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-3xl shadow-md overflow-hidden border-2 border-gray-100 p-5">
            <div className="flex items-center space-x-5">
              <div className="w-28 h-28 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
                {renderPhoto(product.photoUrl)}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-gray-900 mb-1">{product.name}</h3>
                <p className="text-base text-gray-900 font-bold mb-1">
                  Current Stock: <span className="text-blue-700 font-black">{product.retailStock} {product.unit}</span>
                </p>
                <p className="text-sm text-gray-800 font-bold">
                  Wholesale Unit: {product.wholesaleUnitQty} {product.unit} / pack
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between bg-gray-100 rounded-2xl p-3 border border-gray-200">
              <button
                onClick={() => updateStock(product.id, 'deduct')}
                disabled={product.retailStock < product.wholesaleUnitQty}
                className={`w-14 h-14 flex items-center justify-center rounded-xl shadow-sm transition-all active:scale-95 ${
                  product.retailStock < product.wholesaleUnitQty 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <Minus size={28} strokeWidth={3} />
              </button>
              
              <div className="text-center">
                <span className="text-xs uppercase text-gray-800 font-black block tracking-widest mb-1">Update</span>
                <span className="text-lg font-black text-gray-900">±{product.wholesaleUnitQty} {product.unit}</span>
              </div>

              <button
                onClick={() => updateStock(product.id, 'add')}
                className="w-14 h-14 flex items-center justify-center bg-green-600 text-white rounded-xl shadow-md hover:bg-green-700 transition-all active:scale-95"
              >
                <Plus size={28} strokeWidth={3} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
