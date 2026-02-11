
import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, Loader2, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await signup(formData.name, formData.email, formData.password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header decoration */}
        <div className="h-36 bg-gradient-to-br from-daskart-blue to-daskart-orange relative overflow-hidden flex items-center justify-center">
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
           <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
           
           <div className="flex flex-col items-center z-10">
             <div className="bg-white p-3 rounded-full shadow-xl mb-2">
                <Logo className="h-10 w-10" />
             </div>
             <span className="font-bold text-2xl text-white tracking-wider drop-shadow-md">DasKartAI</span>
           </div>

           <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors">
             <X size={18} />
           </button>
        </div>

        <div className="p-8">
          <div className="flex gap-6 mb-8 border-b border-white/10">
            <button 
              onClick={() => setIsLogin(true)}
              className={`pb-2 text-sm font-medium transition-colors relative ${isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Sign In
              {isLogin && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-daskart-blue rounded-full" />}
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`pb-2 text-sm font-medium transition-colors relative ${!isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Create Account
              {!isLogin && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-daskart-orange rounded-full" />}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                {error}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-daskart-orange focus:ring-1 focus:ring-daskart-orange transition-all text-sm"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-daskart-blue focus:ring-1 focus:ring-daskart-blue transition-all text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-daskart-blue focus:ring-1 focus:ring-daskart-blue transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-daskart-blue to-daskart-orange hover:from-blue-400 hover:to-orange-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Get Started'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            By continuing, you agree to DasKartAI's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};
