
import React, { useState } from 'react';
import { X, Check, Star, Zap, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PricingModalProps {
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ onClose }) => {
  const { user, upgradeSubscription } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await upgradeSubscription();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Calculate hours remaining for the 1-day trial
  const msLeft = user?.trialEndsAt ? user.trialEndsAt - Date.now() : 0;
  const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
  const isExpired = msLeft <= 0 && user?.plan === 'trial';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
             <X size={20} />
        </button>

        {/* Free Tier Info */}
        <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-slate-800 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-700 to-slate-800"></div>
          
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
               <Zap size={20} />
             </div>
             <h3 className="text-xl font-bold text-slate-200">Free Trial</h3>
          </div>
          
          <div className="mb-6">
            <span className="text-3xl font-bold text-white">Free</span>
            <span className="text-slate-500 ml-2">/ 1 Day</span>
          </div>

          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Experience the power of DasKartAI for 24 hours. Perfect for testing smart shopping capabilities.
          </p>

          <div className="space-y-4 mb-8">
            <Feature text="Basic Voice Conversations" included />
            <Feature text="Standard Response Speed" included />
            <Feature text="24-Hour Access Limit" included />
            <Feature text="Smart Deal Finding" included={false} />
            <Feature text="Visual Product Search" included={false} />
          </div>

          <div className="mt-auto">
             {user?.plan === 'trial' ? (
                <div className={`p-4 rounded-xl border ${!isExpired ? 'bg-blue-900/20 border-blue-800' : 'bg-red-900/20 border-red-800'}`}>
                    <p className={`font-semibold ${!isExpired ? 'text-blue-400' : 'text-red-400'}`}>
                        {!isExpired ? `${hoursLeft} hours remaining` : 'Trial Expired'}
                    </p>
                </div>
             ) : (
                <button className="w-full py-3 rounded-xl border border-slate-700 text-slate-500 font-medium cursor-not-allowed">
                    Current Plan (Pro)
                </button>
             )}
          </div>
        </div>

        {/* Pro Tier Info */}
        <div className="flex-1 p-8 md:p-10 bg-gradient-to-br from-blue-900/20 to-purple-900/20 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md">
                    <Star size={20} fill="currentColor" />
                </div>
                <h3 className="text-xl font-bold text-white">DasKart Pro</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/50 text-blue-300 text-xs font-bold uppercase tracking-wider">
                Recommended
            </div>
          </div>

          <div className="mb-6">
            <span className="text-4xl font-bold text-white">$19</span>
            <span className="text-slate-400 ml-2">/ month</span>
          </div>

          <p className="text-slate-300 text-sm mb-8 leading-relaxed">
            Unlock the full potential of your shopping assistant. Unlimited conversations, vision capabilities, and exclusive deals.
          </p>

          <div className="space-y-4 mb-8">
            <Feature text="Unlimited Voice & Video Chat" included />
            <Feature text="Real-time Product Vision Analysis" included />
            <Feature text="Ultra-low Latency (Priority)" included />
            <Feature text="Price Tracking & Alerts" included />
            <Feature text="Personalized Shopping Assistant" included />
          </div>

          <button 
            onClick={handleUpgrade}
            disabled={loading || user?.plan === 'pro'}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-xl shadow-blue-900/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Shield size={20} />}
            {user?.plan === 'pro' ? 'Plan Active' : 'Upgrade to Pro'}
          </button>
          
          <p className="text-center text-xs text-slate-500 mt-4">
            Secure payment via Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

const Feature: React.FC<{ text: string; included: boolean }> = ({ text, included }) => (
    <div className={`flex items-center gap-3 ${included ? 'text-slate-200' : 'text-slate-600'}`}>
        <div className={`p-0.5 rounded-full ${included ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-600'}`}>
            <Check size={12} />
        </div>
        <span className="text-sm">{text}</span>
    </div>
);
