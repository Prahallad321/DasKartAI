
import React, { useState, useRef, useEffect } from 'react';
import { LogOut, CreditCard, ChevronDown, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserMenuProps {
  onOpenPricing: () => void;
  onOpenProfile: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenPricing, onOpenProfile }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-daskart-blue to-daskart-orange flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-black/20">
           {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:block text-left mr-1">
           <p className="text-sm font-semibold text-white leading-none tracking-tight">{user.name}</p>
           <p className="text-[10px] text-daskart-blue font-medium leading-none mt-1.5 uppercase tracking-wider">{user.plan} Plan</p>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-64 bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-3">
            <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-gray-500 mt-1 truncate font-mono">{user.email}</p>
            </div>
            
            <div className="py-2 px-2 space-y-1">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenPricing();
                        setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors"
                >
                    <div className="p-1.5 bg-daskart-blue/10 rounded-lg text-daskart-blue">
                      <CreditCard size={16} />
                    </div>
                    <span>Subscription</span>
                    {user.plan === 'trial' && <span className="ml-auto text-[10px] font-bold bg-daskart-blue/20 text-daskart-blue px-2 py-0.5 rounded-full">TRIAL</span>}
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile();
                        setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors"
                >
                    <div className="p-1.5 bg-daskart-orange/10 rounded-lg text-daskart-orange">
                      <UserIcon size={16} />
                    </div>
                    <span>Profile Settings</span>
                </button>
            </div>

            <div className="border-t border-white/5 pt-2 mt-1 px-2 pb-1">
                <button 
                    onClick={(e) => {
                       e.stopPropagation();
                       logout();
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors"
                >
                    <div className="p-1.5 bg-red-500/10 rounded-lg">
                      <LogOut size={16} />
                    </div>
                    Sign Out
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
