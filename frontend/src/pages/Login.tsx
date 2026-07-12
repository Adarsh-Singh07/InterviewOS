import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import Logo from '../components/Logo';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';
    const body = isLogin 
      ? new URLSearchParams({ username: email, password })
      : JSON.stringify({ email, password });
      
    const headers = isLogin 
      ? { 'Content-Type': 'application/x-www-form-urlencoded' }
      : { 'Content-Type': 'application/json' };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (isLogin) {
        // Fetch user me
        const userRes = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        const userData = await userRes.json();
        
        login(data.access_token, userData);
        
        if (userData.role === 'admin') navigate('/admin');
        else navigate('/');
      } else {
        setIsLogin(true);
        setError('Registration successful. Pending admin approval. You can try logging in later.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 font-sans relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Noise and Ambience */}
      <div className="noise-overlay" />
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-500/0 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-emerald-500/5 to-indigo-500/0 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl bg-white/5 border border-white/5 shadow-2xl p-8 backdrop-blur-md relative z-10 space-y-6">
        
        {/* Header/Logo */}
        <div className="flex flex-col items-center space-y-4">
          <Logo theme="dark" className="justify-center scale-110 mb-2" />
          <h2 className="text-3xl font-serif text-white text-center">
            {isLogin ? 'Welcome back' : 'Create Account'}
          </h2>
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">{isLogin ? 'Sign in to InterviewOS' : 'Join the copilot network'}</p>
        </div>
        
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400 text-center font-medium">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full rounded-xl bg-[#0B0F19]/40 border border-white/10 p-3 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-slate-500"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-[#0B0F19]/40 border border-white/10 p-3 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-slate-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-white text-slate-950 p-3 font-semibold text-sm hover:opacity-90 shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] mt-2 cursor-pointer"
          >
            {isLogin ? 'Sign In' : 'Register Account'}
          </button>
        </form>
        
        <p className="text-center text-xs text-slate-400 pt-2 border-t border-white/5">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
