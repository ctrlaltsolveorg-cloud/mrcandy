'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { phone, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      const role = data.user.role;
      if (role === 'ADMIN') router.push('/admin');
      else if (role === 'MOTHER') router.push('/mother');
      else if (role === 'DELIVERY') router.push('/delivery');
      else router.push('/');
      
      toast.success('Welcome back!');
    } catch (error) {
      toast.error('Login failed. Phone: 1234, Pass: 1234 try karein (agar setup kiya hai)');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold mb-2">Mr. Candy</h1>
        <p className="text-gray-500 mb-8">Apna phone number daal kar login karein</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full p-4 bg-white border-2 border-gray-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 placeholder:text-gray-500 text-gray-900"
              placeholder="00000 00000"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-4 bg-white border-2 border-gray-200 rounded-2xl outline-none focus:ring-2 ring-blue-500 placeholder:text-gray-500 text-gray-900"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Admin se apna account banwayein.
        </p>
      </div>
    </div>
  );
}
