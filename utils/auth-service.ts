
import { User, PlanType, UserRole, UserStatus, SystemStats, AuditLog, GlobalSettings } from '../types';

const USERS_KEY = 'nova_users_db';
const SESSION_KEY = 'nova_session_user_id';
const SETTINGS_KEY = 'nova_global_settings';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Safe JSON Parse wrapper to prevent app crashes
const safeParse = (key: string, fallback: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Failed to parse ${key}, resetting to fallback.`, e);
    return fallback;
  }
};

// Initial seed for admin
const seedAdmin = () => {
  const users = safeParse(USERS_KEY, {}) as Record<string, any>;
  
  // Check if admin exists
  const adminExists = Object.values(users).some((u: any) => u.email === 'admin@daskart.ai');
  
  if (!adminExists) {
    const adminId = 'admin-001';
    users[adminId] = {
      id: adminId,
      name: 'System Admin',
      email: 'admin@daskart.ai',
      password: 'admin123', // In a real app, this would be hashed
      plan: 'pro',
      role: 'admin',
      status: 'active',
      subscriptionType: 'paid',
      subscriptionStatus: 'active',
      trialEndsAt: Date.now() + 100000000000,
      lastLogin: Date.now()
    };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

// Seed Global Settings
const seedSettings = () => {
  if (!localStorage.getItem(SETTINGS_KEY)) {
    const defaults: GlobalSettings = {
      maintenanceMode: false,
      allowSignups: true,
      enableImageGen: true,
      systemInstruction: `You are DasKartAI, a general AI assistant.
FORMATTING: Book Style. Plain Text Only.
MATH: Use Unicode (e.g., F = G(m₁ × m₂) / R²). Use '×' for multiply, superscripts for powers.
CHEMISTRY: Use Unicode subscripts (e.g., H₂O).
No Markdown code blocks or LaTeX.`
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaults));
  }
};

try {
    seedAdmin();
    seedSettings();
} catch (e) {
    console.error("Initialization error", e);
}

export const authService = {
  async signup(name: string, email: string, password: string, subscriptionChoice: 'trial' | 'paid'): Promise<User> {
    await delay(800);
    const users = safeParse(USERS_KEY, {}) as Record<string, any>;

    // Simple check if email exists
    const existingUser = Object.values(users).find((u: any) => u.email === email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    let newUser: User;

    if (subscriptionChoice === 'paid') {
        // Paid Subscription (Simulated immediate activation)
        // No trial end date needed, or set far future
        newUser = {
          id,
          name,
          email,
          plan: 'pro',
          role: 'user',
          status: 'active',
          subscriptionType: 'paid',
          subscriptionStatus: 'active',
          subscriptionStartAt: now,
          trialEndsAt: now + (365 * 10 * 24 * 60 * 60 * 1000), // Effectively infinite
          lastLogin: now
        };
    } else {
        // 1 Day Free Trial
        const trialEndsAt = now + (24 * 60 * 60 * 1000); // 24 Hours
        newUser = {
          id,
          name,
          email,
          plan: 'trial',
          role: 'user',
          status: 'active',
          subscriptionType: 'trial',
          subscriptionStatus: 'active',
          subscriptionStartAt: now,
          trialEndsAt,
          lastLogin: now
        };
    }

    // Store user + "password" (mock)
    users[id] = { ...newUser, password }; // In real app, hash password!
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(SESSION_KEY, id);

    return newUser;
  },

  async login(email: string, password: string): Promise<User> {
    await delay(800);
    const users = safeParse(USERS_KEY, {}) as Record<string, any>;

    const userRecord = Object.values(users).find((u: any) => u.email === email && u.password === password) as any;
    
    if (!userRecord) {
      throw new Error('Invalid email or password');
    }
    
    if (userRecord.status === 'banned' || userRecord.status === 'suspended') {
        throw new Error(`Account is ${userRecord.status}. Contact support.`);
    }

    // Check trial expiry on login
    if (userRecord.plan === 'trial' && userRecord.trialEndsAt < Date.now()) {
        userRecord.subscriptionStatus = 'expired';
        users[userRecord.id] = userRecord;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    // Update last login
    userRecord.lastLogin = Date.now();
    users[userRecord.id] = userRecord;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    const { password: _, ...user } = userRecord;
    localStorage.setItem(SESSION_KEY, user.id);
    return user as User;
  },

  async logout(): Promise<void> {
    await delay(200);
    localStorage.removeItem(SESSION_KEY);
  },

  async getSession(): Promise<User | null> {
    await delay(500); // Check session delay
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;

    const users = safeParse(USERS_KEY, {}) as Record<string, any>;
    
    if (users[id]) {
      const { password: _, ...user } = users[id];
      // Check status on session refresh too
      if (user.status === 'banned') return null;
      
      // Check trial expiry
      if (user.plan === 'trial' && user.trialEndsAt < Date.now()) {
        user.subscriptionStatus = 'expired';
      }

      return user as User;
    }
    return null;
  },

  async upgradeToPro(userId: string): Promise<User> {
    await delay(1500); // Simulate payment processing
    const users = safeParse(USERS_KEY, {}) as Record<string, any>;

    if (users[userId]) {
      users[userId].plan = 'pro';
      users[userId].subscriptionType = 'paid';
      users[userId].subscriptionStatus = 'active';
      // Pro users effectively have no trial end, or set far future
      users[userId].trialEndsAt = Date.now() + (365 * 10 * 24 * 60 * 60 * 1000); 
      
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      
      const { password: _, ...user } = users[userId];
      return user as User;
    }
    throw new Error("User not found");
  },

  async updateProfile(userId: string, data: { name?: string; email?: string; password?: string }): Promise<User> {
    await delay(800);
    const users = safeParse(USERS_KEY, {}) as Record<string, any>;

    if (!users[userId]) {
        throw new Error("User not found");
    }

    // If updating email, check uniqueness
    if (data.email && data.email !== users[userId].email) {
        const emailExists = Object.values(users).some((u: any) => u.id !== userId && u.email === data.email);
        if (emailExists) throw new Error("Email already taken");
    }

    const updatedUserEntry = { ...users[userId], ...data };
    
    // Clean up empty fields if passed
    if (!data.password) delete (updatedUserEntry as any).password; 
    else updatedUserEntry.password = data.password;

    users[userId] = updatedUserEntry;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Return sanitized user
    const { password: _, ...user } = updatedUserEntry;
    return user as User;
  },

  // --- ADMIN FUNCTIONS ---

  async getAllUsers(): Promise<User[]> {
    await delay(500);
    const users = safeParse(USERS_KEY, {}) as Record<string, any>;
    return Object.values(users).map(({ password, ...u }: any) => u as User);
  },

  async updateUserStatus(adminId: string, targetUserId: string, status: UserStatus): Promise<void> {
    await delay(500);
    const users = safeParse(USERS_KEY, {}) as Record<string, any>;
    
    if (users[targetUserId]) {
        users[targetUserId].status = status;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        console.log(`Admin ${adminId} changed user ${targetUserId} status to ${status}`);
    }
  },

  async deleteUser(adminId: string, targetUserId: string): Promise<void> {
    await delay(500);
    const users = safeParse(USERS_KEY, {}) as Record<string, any>;
    
    if (users[targetUserId]) {
        delete users[targetUserId];
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  async getSystemStats(): Promise<SystemStats> {
    await delay(500);
    const users = safeParse(USERS_KEY, {}) as Record<string, any>;
    const userCount = Object.keys(users).length;
    
    return {
        totalUsers: userCount,
        activeNow: Math.floor(Math.random() * 5) + 1,
        totalMessages: 14205 + Math.floor(Math.random() * 100),
        storageUsed: '4.2 GB',
        revenue: `$${(userCount * 19) + 450}`
    };
  },

  async getGlobalSettings(): Promise<GlobalSettings> {
      return safeParse(SETTINGS_KEY, {}) as GlobalSettings;
  },

  async updateGlobalSettings(settings: GlobalSettings): Promise<void> {
      await delay(500);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
};
