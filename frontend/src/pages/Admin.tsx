import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

type UserData = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  quotas?: {
    transcription_minutes_monthly?: number;
    transcription_minutes_used?: number;
  };
  allowed_models?: string[] | null;
};

const ALL_MODELS = [
  { id: 'gpt-5.4-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-5.4', name: 'GPT-4o' },
  { id: 'gemini-2.5-flash', name: 'Gemini Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini Lite' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 70B' }
];

export default function Admin() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');

  // Sync theme
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const updateUserRole = async (userId: number, role: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateUserStatus = async (userId: number, isActive: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateUserQuota = async (userId: number, minutes: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quotas: { transcription_minutes_monthly: minutes }
        })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleUserModel = async (userId: number, modelId: string, isAllowed: boolean, currentAllowed: string[] | null | undefined) => {
    let newAllowed: string[] = [];
    if (currentAllowed === null || currentAllowed === undefined) {
      const baseList = ALL_MODELS.map(m => m.id);
      if (isAllowed) {
        newAllowed = baseList;
      } else {
        newAllowed = baseList.filter(id => id !== modelId);
      }
    } else {
      if (isAllowed) {
        newAllowed = [...currentAllowed, modelId];
      } else {
        newAllowed = currentAllowed.filter(id => id !== modelId);
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          allowed_models: newAllowed
        })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`${theme} min-h-screen overflow-x-hidden relative`}>
      {/* Background Noise and Ambience */}
      <div className="noise-overlay" />
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-500/0 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/5 to-indigo-500/0 blur-[100px] pointer-events-none" />

      <div className="min-h-screen bg-[#FCFAF6] dark:bg-[#060814] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 p-8 lg:p-12 relative z-10">
        
        <header className="max-w-6xl mx-auto flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-serif text-slate-900 dark:text-white tracking-tight">Admin System</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Configure user minute limits, model permissions, and global restrictions.</p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleThemeToggle}
              className="p-2.5 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <a href="/" className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:opacity-90 transition-all hover:scale-[1.02]">
              Go to Copilot
            </a>
          </div>
        </header>

        <main className="max-w-6xl mx-auto space-y-6">
          {users.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-3xl bg-white/50 dark:bg-[#0B0F19]/50 backdrop-blur-md text-slate-400 dark:text-slate-500">
              <p className="font-semibold text-sm">No registered users found.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {users.map(u => {
                const limitMin = u.quotas?.transcription_minutes_monthly ?? 60;
                const usedMin = Math.round((u.quotas?.transcription_minutes_used ?? 0) * 10) / 10;
                
                return (
                  <div key={u.id} className="p-6 rounded-3xl bg-white/70 dark:bg-[#0B0F19]/50 backdrop-blur-md border border-slate-200/60 dark:border-white/5 shadow-sm hover:border-indigo-500/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                    
                    {/* Left: User Bio details */}
                    <div className="space-y-2.5 max-w-sm">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-base font-semibold text-slate-900 dark:text-white truncate max-w-[200px]" title={u.email}>{u.email}</span>
                        <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider border ${
                          u.is_active 
                            ? 'bg-green-500/5 text-green-600 dark:text-green-400 border-green-500/10' 
                            : 'bg-red-500/5 text-red-600 dark:text-red-400 border-red-500/10'
                        }`}>
                          {u.is_active ? 'Active' : 'Restricted'}
                        </span>
                      </div>
                      
                      {/* Transcription Limits indicator */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">
                          <span>Transcription Quota</span>
                          <span>{usedMin}m / {limitMin}m Used</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              usedMin >= limitMin ? 'bg-red-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min((usedMin / limitMin) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Middle: Quotas and Configs input */}
                    <div className="flex flex-wrap items-center gap-6">
                      
                      {/* Limit input */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Monthly Minutes</label>
                        <input 
                          type="number"
                          defaultValue={limitMin}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 0) {
                              updateUserQuota(u.id, val);
                            }
                          }}
                          className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0B0F19]/40 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Role selection dropdown */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Access Tier</label>
                        <select 
                          value={u.role}
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0B0F19]/40 text-xs font-semibold text-slate-900 dark:text-indigo-400 focus:outline-none"
                        >
                          <option value="pending">Pending</option>
                          <option value="trial">Trial</option>
                          <option value="approved">Approved</option>
                          <option value="blocked">Blocked</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      {/* Allowed Models Grid checkboxes */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Model Access permissions</label>
                        <div className="flex flex-wrap gap-2.5">
                          {ALL_MODELS.map(m => {
                            const isAllowed = u.allowed_models === null || u.allowed_models === undefined || u.allowed_models.includes(m.id);
                            return (
                              <label key={m.id} className="flex items-center space-x-1.5 cursor-pointer text-[10px] font-medium bg-slate-100/60 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-white/5 hover:border-indigo-500/20 select-none">
                                <input 
                                  type="checkbox"
                                  checked={isAllowed}
                                  onChange={(e) => toggleUserModel(u.id, m.id, e.target.checked, u.allowed_models)}
                                  className="rounded text-indigo-500 focus:ring-0 w-3 h-3 cursor-pointer"
                                />
                                <span className={isAllowed ? 'text-slate-900 dark:text-indigo-300 font-semibold' : 'text-slate-400'}>{m.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* Right: Restriction Toggles */}
                    <div className="shrink-0 flex items-center">
                      <button 
                        onClick={() => updateUserStatus(u.id, !u.is_active)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                          u.is_active 
                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                            : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                        }`}
                      >
                        {u.is_active ? 'Restrict User' : 'Restore Access'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
