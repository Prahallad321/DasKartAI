
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Settings, ShieldAlert, LogOut, 
  Search, Menu, CheckCircle, Lock, Trash2, Save,
  Cpu, Activity, DollarSign, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../utils/auth-service';
import { User, SystemStats, GlobalSettings } from '../../types';
import { Logo } from '../Logo';

// --- Components ---

const AdminLogin = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      // AuthContext will update user, Main AdminPanel will re-render
    } catch (err: any) {
      setError('Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
           <Logo className="w-12 h-12 mb-4" />
           <h1 className="text-2xl font-bold text-white">Admin Control Panel</h1>
           <p className="text-gray-400">Secure Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Admin Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>IP Address Logged: {window.location.hostname}</p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    authService.getSystemStats().then(setStats);
  }, []);

  if (!stats) return <div className="text-white">Loading stats...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">System Overview</h2>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Users" value={stats.totalUsers.toString()} icon={<Users size={20} className="text-blue-400" />} trend="+12%" />
        <MetricCard title="Active Sessions" value={stats.activeNow.toString()} icon={<Activity size={20} className="text-green-400" />} trend="Live" />
        <MetricCard title="AI Interactions" value={stats.totalMessages.toLocaleString()} icon={<MessageSquare size={20} className="text-purple-400" />} trend="+5.4%" />
        <MetricCard title="Est. Revenue" value={stats.revenue} icon={<DollarSign size={20} className="text-yellow-400" />} trend="+8.2%" />
      </div>

      {/* Charts Section (Mock) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
            <div className="h-64 flex items-end gap-2">
               {[40, 65, 45, 70, 85, 60, 75, 90, 80, 95, 100, 85].map((h, i) => (
                  <div key={i} className="flex-1 bg-blue-500/20 hover:bg-blue-500/40 rounded-t-sm transition-all relative group" style={{ height: `${h}%` }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-white">{h * 10}</div>
                  </div>
               ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
               <span>Jan</span><span>Dec</span>
            </div>
         </div>
         
         <div className="bg-slate-900 border border-white/5 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Storage Usage</h3>
            <div className="flex items-center justify-center py-8">
               <div className="relative w-40 h-40 rounded-full border-8 border-gray-700 flex items-center justify-center">
                  <div className="absolute inset-0 border-8 border-orange-500 rounded-full" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 75%, 0 75%)' }}></div>
                  <div className="text-center">
                     <div className="text-2xl font-bold text-white">75%</div>
                     <div className="text-xs text-gray-400">{stats.storageUsed}</div>
                  </div>
               </div>
            </div>
         </div>
      </div>
      
      {/* Recent Logs Mock */}
      <div className="bg-slate-900 border border-white/5 rounded-xl p-6">
         <h3 className="text-lg font-semibold text-white mb-4">Security Events</h3>
         <div className="space-y-3">
            {[1,2,3].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                   <div className="flex items-center gap-3">
                      <ShieldAlert size={16} className="text-red-400" />
                      <span className="text-sm text-gray-300">Suspicious login attempt from 192.168.1.{10+i}</span>
                   </div>
                   <span className="text-xs text-gray-500">2 min ago</span>
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const list = await authService.getAllUsers();
    setUsers(list);
  };

  const handleStatusChange = async (targetId: string, status: 'active' | 'suspended' | 'banned') => {
    if (!currentUser) return;
    await authService.updateUserStatus(currentUser.id, targetId, status);
    loadUsers();
  };

  const handleDelete = async (targetId: string) => {
    if (!currentUser) return;
    if (confirm("Permanently delete this user? This cannot be undone.")) {
       await authService.deleteUser(currentUser.id, targetId);
       loadUsers();
    }
  };

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold text-white">User Management</h2>
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500" 
            />
         </div>
      </div>

      <div className="bg-slate-900 border border-white/5 rounded-xl overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-black/20 text-gray-400 font-medium">
                  <tr>
                     <th className="p-4">User</th>
                     <th className="p-4">Role</th>
                     <th className="p-4">Plan</th>
                     <th className="p-4">Status</th>
                     <th className="p-4">Joined</th>
                     <th className="p-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5 text-gray-300">
                  {filtered.map(u => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                   {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                   <div className="font-medium text-white">{u.name}</div>
                                   <div className="text-xs text-gray-500">{u.email}</div>
                                </div>
                             </div>
                          </td>
                          <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-400'
                              }`}>
                                  {u.role.toUpperCase()}
                              </span>
                          </td>
                          <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  u.plan === 'pro' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                  {u.plan.toUpperCase()}
                              </span>
                          </td>
                          <td className="p-4">
                              <span className={`flex items-center gap-1.5 text-xs font-medium ${
                                  u.status === 'active' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                  {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                              </span>
                          </td>
                          <td className="p-4 text-gray-500">
                              {new Date(u.trialEndsAt - (7*24*60*60*1000)).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                              {u.role !== 'admin' && (
                                  <div className="flex items-center justify-end gap-2">
                                      {u.status === 'active' ? (
                                          <button onClick={() => handleStatusChange(u.id, 'suspended')} className="p-1.5 hover:bg-yellow-500/20 text-yellow-500 rounded" title="Suspend"><Lock size={16} /></button>
                                      ) : (
                                          <button onClick={() => handleStatusChange(u.id, 'active')} className="p-1.5 hover:bg-green-500/20 text-green-500 rounded" title="Activate"><CheckCircle size={16} /></button>
                                      )}
                                      <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-red-500/20 text-red-500 rounded" title="Delete"><Trash2 size={16} /></button>
                                  </div>
                              )}
                          </td>
                      </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

const SystemSettings = () => {
    const [settings, setSettings] = useState<GlobalSettings>({
        maintenanceMode: false,
        allowSignups: true,
        enableImageGen: true,
        systemInstruction: ''
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        authService.getGlobalSettings().then(setSettings);
    }, []);

    const handleSave = async () => {
        await authService.updateGlobalSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-6 max-w-4xl">
             <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">System Settings</h2>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
                >
                    {saved ? <CheckCircle size={18} /> : <Save size={18} />}
                    {saved ? 'Saved' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Feature Flags */}
                <div className="bg-slate-900 border border-white/5 rounded-xl p-6 space-y-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Cpu size={20} className="text-orange-400" /> Feature Control
                    </h3>
                    
                    <Toggle 
                        label="Maintenance Mode" 
                        desc="Disable access for non-admin users" 
                        active={settings.maintenanceMode} 
                        onChange={v => setSettings({...settings, maintenanceMode: v})}
                        danger
                    />
                    <Toggle 
                        label="Allow New Signups" 
                        desc="Let new users create accounts" 
                        active={settings.allowSignups} 
                        onChange={v => setSettings({...settings, allowSignups: v})}
                    />
                    <Toggle 
                        label="Image Generation (Gemini)" 
                        desc="Enable/Disable image creation features" 
                        active={settings.enableImageGen} 
                        onChange={v => setSettings({...settings, enableImageGen: v})}
                    />
                </div>

                {/* AI Configuration */}
                <div className="bg-slate-900 border border-white/5 rounded-xl p-6">
                     <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <Activity size={20} className="text-blue-400" /> AI Configuration
                    </h3>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Global System Instruction</label>
                        <textarea 
                            value={settings.systemInstruction}
                            onChange={e => setSettings({...settings, systemInstruction: e.target.value})}
                            rows={6}
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none resize-none"
                        />
                        <p className="text-xs text-gray-500">This prompt overrides the default behavior for all new sessions.</p>
                    </div>
                </div>
            </div>

            {/* API Keys (Simulation) */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <Lock size={20} className="text-gray-400" /> API Key Management
                </h3>
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5">
                    <div>
                        <div className="font-medium text-white">Gemini API Key</div>
                        <div className="text-xs text-gray-500 font-mono">AIzaSy...4Xo</div>
                    </div>
                    <button className="text-sm text-blue-400 hover:underline">Rotate Key</button>
                </div>
            </div>
        </div>
    );
};

const Toggle = ({ label, desc, active, onChange, danger = false }: any) => (
    <div className="flex items-center justify-between">
        <div>
            <div className="font-medium text-white">{label}</div>
            <div className="text-xs text-gray-500">{desc}</div>
        </div>
        <button 
            onClick={() => onChange(!active)}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${active ? (danger ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-700'}`}
        >
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </button>
    </div>
);

const MetricCard = ({ title, value, icon, trend }: any) => (
    <div className="bg-slate-900 border border-white/5 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
            <span className="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded">{trend}</span>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-gray-500">{title}</div>
    </div>
);

// --- Layout & Main ---

export const AdminPanel = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

    // Route Protection
    if (!user || user.role !== 'admin') {
        return <AdminLogin />;
    }

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'users', label: 'Users', icon: <Users size={20} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
    ];

    const handleLogout = async () => {
        await logout();
        window.history.pushState({}, '', '/');
        // Force popstate event to trigger app re-render
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    return (
        <div className="flex h-screen bg-slate-950 text-gray-300 font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 border-r border-white/5 flex flex-col hidden md:flex">
                <div className="p-6 flex items-center gap-3">
                    <Logo className="w-8 h-8" />
                    <div>
                        <div className="font-bold text-white tracking-wide">Admin</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Control Panel</div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 py-4">
                    {navItems.map(item => {
                        const active = activeTab === item.id;
                        return (
                            <button
                                key={item.id} 
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                                    active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                {item.icon}
                                <span className="font-medium text-sm">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-medium text-white truncate">{user.name}</div>
                            <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                        <button onClick={handleLogout} className="text-gray-400 hover:text-red-400">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-white/5">
                    <Logo className="w-8 h-8" />
                    <button className="text-gray-400"><Menu size={24} /></button>
                </div>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto admin-scroll p-6 md:p-8">
                    {activeTab === 'dashboard' && <Dashboard />}
                    {activeTab === 'users' && <UserManagement />}
                    {activeTab === 'settings' && <SystemSettings />}
                </main>
            </div>
        </div>
    );
};
