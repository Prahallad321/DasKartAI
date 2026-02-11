
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

  const daysLeft = user?.trialEndsAt 
    ? Math.ceil((user.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)) 
    : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-[#0F172A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-colors">
             <X size={20} />
        </button>

        {/* Free Tier Info */}
        <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-white/10 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-500 to-gray-400"></div>
          
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2 rounded-lg bg-gray-800 text-gray-300">
               <Zap size={20} />
             </div>
             <h3 className="text-xl font-bold text-gray-200">Free Trial</h3>
          </div>
          
          <div className="mb-6">
            <span className="text-3xl font-bold text-white">Free</span>
            <span className="text-gray-500 ml-2">/ 7 days</span>
          </div>

          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Experience the power of DasKartAI. Perfect for testing smart shopping capabilities.
          </p>

          <div className="space-y-4 mb-8">
            <Feature text="Basic Voice Conversations" included />
            <Feature text="Standard Response Speed" included />
            <Feature text="30 mins daily usage limit" included={false} />
            <Feature text="Smart Deal Finding" included={false} />
            <Feature text="Visual Product Search" included={false} />
          </div>

          <div className="mt-auto">
             {user?.plan === 'trial' ? (
                <div className={`p-4 rounded-xl border ${daysLeft > 0 ? 'bg-daskart-blue/10 border-daskart-blue/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <p className={`font-semibold ${daysLeft > 0 ? 'text-daskart-blue' : 'text-red-400'}`}>
                        {daysLeft > 0 ? `${daysLeft} days remaining` : 'Trial Expired'}
                    </p>
                </div>
             ) : (
                <button className="w-full py-3 rounded-xl border border-white/10 text-gray-400 font-medium cursor-not-allowed">
                    Current Plan
                </button>
             )}
          </div>
        </div>

        {/* Pro Tier Info */}
        <div className="flex-1 p-8 md:p-10 bg-gradient-to-br from-blue-900/20 to-orange-900/20 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-daskart-blue to-daskart-orange"></div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-daskart-blue to-daskart-orange text-white shadow-lg shadow-orange-900/50">
                    <Star size={20} fill="currentColor" />
                </div>
                <h3 className="text-xl font-bold text-white">DasKart Pro</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-daskart-blue/20 border border-daskart-blue/30 text-daskart-blue text-xs font-bold uppercase tracking-wider">
                Recommended
            </div>
          </div>

          <div className="mb-6">
            <span className="text-4xl font-bold text-white">$19</span>
            <span className="text-gray-400 ml-2">/ month</span>
          </div>

          <p className="text-blue-200/70 text-sm mb-8 leading-relaxed">
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
            className="w-full py-4 rounded-xl bg-gradient-to-r from-daskart-blue to-daskart-orange hover:from-blue-400 hover:to-orange-400 text-white font-bold shadow-xl shadow-blue-900/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Shield size={20} />}
            {user?.plan === 'pro' ? 'Plan Active' : 'Upgrade to Pro'}
          </button>
          
          <p className="text-center text-xs text-gray-500 mt-4">
            Secure payment via Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

const Feature: React.FC<{ text: string; included: boolean }> = ({ text, included }) => (
    <div className={`flex items-center gap-3 ${included ? 'text-gray-200' : 'text-gray-500'}`}>
        <div className={`p-0.5 rounded-full ${included ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-600'}`}>
            <Check size={12} />
        </div>
        <span className="text-sm">{text}</span>
    </div>
);
