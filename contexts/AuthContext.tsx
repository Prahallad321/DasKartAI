
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../utils/auth-service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string, plan: 'trial' | 'paid') => Promise<void>;
  logout: () => Promise<void>;
  upgradeSubscription: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; password?: string }) => Promise<void>;
  isTrialExpired: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionUser = await authService.getSession();
      setUser(sessionUser);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    const user = await authService.login(email, pass);
    setUser(user);
  };

  const signup = async (name: string, email: string, pass: string, plan: 'trial' | 'paid') => {
    const user = await authService.signup(name, email, pass, plan);
    setUser(user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const upgradeSubscription = async () => {
    if (!user) return;
    const updatedUser = await authService.upgradeToPro(user.id);
    setUser(updatedUser);
  };

  const updateProfile = async (data: { name?: string; email?: string; password?: string }) => {
    if (!user) return;
    const updatedUser = await authService.updateProfile(user.id, data);
    setUser(updatedUser);
  };

  const isTrialExpired = !!(user?.plan === 'trial' && (user.subscriptionStatus === 'expired' || Date.now() > user.trialEndsAt));

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      signup, 
      logout, 
      upgradeSubscription,
      updateProfile,
      isTrialExpired
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
