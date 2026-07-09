import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface DocumentConfig {
  id: number;
  filename: string;
  file_type: string;
  created_at: string;
}

interface SessionConfig {
  id: number;
  company: string;
  job_description: string;
  created_at: string;
  attached_documents: { id: number; filename: string; file_type: string }[];
}

export default function Dashboard() {
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'home' | 'sessions' | 'resumes' | 'documents'>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionCompany, setSessionCompany] = useState('');
  const [sessionJD, setSessionJD] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [attachedDocs, setAttachedDocs] = useState<number[]>([]);

  // Data States
  const [documents, setDocuments] = useState<DocumentConfig[]>([]);
  const [sessions, setSessions] = useState<SessionConfig[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Sync theme to localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch Data
  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const docRes = await fetch(`${API_BASE_URL}/api/v1/documents`, { headers });
      const docData = await docRes.json();
      if (Array.isArray(docData)) setDocuments(docData);

      const sessRes = await fetch(`${API_BASE_URL}/api/v1/sessions`, { headers });
      const sessData = await sessRes.json();
      if (Array.isArray(sessData)) setSessions(sessData);
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'resume' | 'document') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/documents/upload?file_type=${fileType}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        alert(`${file.name} uploaded successfully!`);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.detail || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document? This will also wipe its vectors from AI memory.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSession = async () => {
    if (!sessionCompany.trim()) {
      alert('Please specify a company name.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company: sessionCompany,
          job_description: sessionJD,
          custom_instructions: customInstructions,
          attached_doc_ids: attachedDocs
        })
      });

      if (res.ok) {
        const newSession = await res.json();
        setIsModalOpen(false);
        // Clear modal state
        setSessionCompany('');
        setSessionJD('');
        setCustomInstructions('');
        setAttachedDocs([]);
        // Route to the Copilot workspace with this session ID
        navigate(`/session/${newSession.id}`);
      } else {
        const err = await res.json();
        alert(`Failed to create session: ${err.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to create session.');
    }
  };

  const toggleDocAttachment = (docId: number) => {
    setAttachedDocs(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const resumes = documents.filter(d => d.file_type === 'resume');
  const regularDocs = documents.filter(d => d.file_type === 'document');

  return (
    <div className={`${theme} flex h-screen overflow-hidden`}>
      <div className="flex-1 flex bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
        
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-[#131b2f] border-r border-gray-200 dark:border-white/5 flex flex-col justify-between transition-colors duration-300">
          <div className="p-6">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="text-lg font-bold tracking-wider text-gray-800 dark:text-white">
                InterviewOS
              </span>
            </div>

            {/* Nav List */}
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('home')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === 'home' 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                <span>Home</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('sessions')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === 'sessions' 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span>Call Sessions</span>
              </button>

              <button 
                onClick={() => setActiveTab('resumes')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === 'resumes' 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span>CVs & Resumes</span>
              </button>

              <button 
                onClick={() => setActiveTab('documents')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === 'documents' 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <span>Documents</span>
              </button>
            </nav>
          </div>

          {/* User profile & controls */}
          <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-bold text-gray-800 dark:text-white truncate max-w-[120px]">{user?.email}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">{user?.role} Role</div>
              </div>
              <button 
                onClick={handleThemeToggle}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>
            </div>
            {user?.role === 'admin' && (
              <a href="/admin" className="block text-xs font-semibold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-2 transition-colors">Admin Panel</a>
            )}
            <button onClick={logout} className="w-full text-left text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">Logout</button>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto p-8">
          
          {/* TAB: Home / Overview */}
          {activeTab === 'home' && (
            <div className="space-y-8 max-w-5xl">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white">Welcome back!</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get ready for your next interview with InterviewOS.</p>
              </div>

              {/* Start Session Quick Card */}
              <div className="p-8 rounded-3xl bg-white dark:bg-[#131b2f] border border-gray-200 dark:border-white/5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6 transition-colors duration-300">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Start a Call Session</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">Initialize your AI Copilot. The AI will listen, analyze real-time audio, and give you optimal answers formatted for instant reading.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(0,0,0,0.1)] self-start md:self-auto shrink-0"
                >
                  Start Session
                </button>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CV Box */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2f] border border-gray-200 dark:border-white/5 shadow-sm space-y-4 transition-colors duration-300">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">CVs & Resumes</h4>
                    <span className="text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md font-semibold">{resumes.length} Uploaded</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Upload your resume. The AI Copilot uses this to customize replies specifically to your background and career history.</p>
                  
                  <div className="flex items-center space-x-3 pt-2">
                    <label className={`px-4 py-2 bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      isUploading ? 'pointer-events-none opacity-50' : ''
                    }`}>
                      {isUploading ? 'Uploading...' : 'Upload Resume'}
                      <input type="file" onChange={(e) => handleFileUpload(e, 'resume')} className="hidden" accept=".pdf,.doc,.docx,.txt" disabled={isUploading} />
                    </label>
                    <button onClick={() => setActiveTab('resumes')} className="text-xs font-semibold text-indigo-500 hover:underline">View All</button>
                  </div>
                </div>

                {/* Docs Box */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2f] border border-gray-200 dark:border-white/5 shadow-sm space-y-4 transition-colors duration-300">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Reference Documents</h4>
                    <span className="text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md font-semibold">{regularDocs.length} Uploaded</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Add other reference materials such as company cheatsheets, system designs, or projects to inform the AI.</p>
                  
                  <div className="flex items-center space-x-3 pt-2">
                    <label className={`px-4 py-2 bg-gray-50 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      isUploading ? 'pointer-events-none opacity-50' : ''
                    }`}>
                      {isUploading ? 'Uploading...' : 'Upload Document'}
                      <input type="file" onChange={(e) => handleFileUpload(e, 'document')} className="hidden" accept=".pdf,.doc,.docx,.txt" disabled={isUploading} />
                    </label>
                    <button onClick={() => setActiveTab('documents')} className="text-xs font-semibold text-indigo-500 hover:underline">View All</button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB: Call Sessions */}
          {activeTab === 'sessions' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">Call Sessions</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Review your past sessions or start a new call.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition-opacity shadow-sm"
                >
                  Start New Session
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#131b2f] text-gray-400 dark:text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  <p className="font-semibold text-sm">No call sessions yet.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#131b2f] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden transition-colors duration-300">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-black/10 border-b border-gray-100 dark:border-white/5">
                      <tr className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Company</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Attached Context</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {sessions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">{s.company}</td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {s.attached_documents.map(d => (
                                <span key={d.id} className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-medium truncate max-w-[140px]">
                                  {d.filename}
                                </span>
                              ))}
                              {s.attached_documents.length === 0 && <span className="text-xs text-gray-400">None</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right space-x-3">
                            <button 
                              onClick={() => navigate(`/session/${s.id}`)}
                              className="text-xs font-bold text-indigo-500 hover:text-indigo-600"
                            >
                              Join Call
                            </button>
                            <button 
                              onClick={() => handleDeleteSession(s.id)}
                              className="text-xs font-bold text-red-500 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: CVs & Resumes */}
          {activeTab === 'resumes' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">CVs & Resumes</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload resumes. The AI uses this context to remember who is giving the interview.</p>
                </div>
                <label className={`px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 cursor-pointer shadow-sm ${
                  isUploading ? 'pointer-events-none opacity-50' : ''
                }`}>
                  {isUploading ? 'Uploading...' : 'Upload Resume'}
                  <input type="file" onChange={(e) => handleFileUpload(e, 'resume')} className="hidden" accept=".pdf,.doc,.docx,.txt" disabled={isUploading} />
                </label>
              </div>

              {resumes.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#131b2f] text-gray-400 dark:text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="font-semibold text-sm">No resumes uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resumes.map(r => (
                    <div key={r.id} className="p-5 rounded-2xl bg-white dark:bg-[#131b2f] border border-gray-200 dark:border-white/5 flex flex-col justify-between space-y-4 shadow-sm transition-colors duration-300">
                      <div className="flex items-start space-x-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm truncate text-gray-800 dark:text-white" title={r.filename}>{r.filename}</h4>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3">
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded uppercase">Resume</span>
                        <button onClick={() => handleDeleteDocument(r.id)} className="text-xs font-bold text-red-500 hover:text-red-600">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">Documents</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload reference sheets, guides, or cheat sheets for the AI model.</p>
                </div>
                <label className={`px-4 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 cursor-pointer shadow-sm ${
                  isUploading ? 'pointer-events-none opacity-50' : ''
                }`}>
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                  <input type="file" onChange={(e) => handleFileUpload(e, 'document')} className="hidden" accept=".pdf,.doc,.docx,.txt" disabled={isUploading} />
                </label>
              </div>

              {regularDocs.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#131b2f] text-gray-400 dark:text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  <p className="font-semibold text-sm">No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularDocs.map(d => (
                    <div key={d.id} className="p-5 rounded-2xl bg-white dark:bg-[#131b2f] border border-gray-200 dark:border-white/5 flex flex-col justify-between space-y-4 shadow-sm transition-colors duration-300">
                      <div className="flex items-start space-x-3">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm truncate text-gray-800 dark:text-white" title={d.filename}>{d.filename}</h4>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">{new Date(d.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3">
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Reference</span>
                        <button onClick={() => handleDeleteDocument(d.id)} className="text-xs font-bold text-red-500 hover:text-red-600">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* START SESSION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#131b2f] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6 transition-all duration-300">
            
            {/* Modal Title */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Start New Interview Session</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</label>
                <input 
                  type="text" 
                  value={sessionCompany}
                  onChange={e => setSessionCompany(e.target.value)}
                  placeholder="e.g. Google, Microsoft..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f172a] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Job Description</label>
                <textarea 
                  value={sessionJD}
                  onChange={e => setSessionJD(e.target.value)}
                  placeholder="Paste the job description or requirements here..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f172a] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Custom Instructions</label>
                <textarea 
                  value={customInstructions}
                  onChange={e => setCustomInstructions(e.target.value)}
                  placeholder="e.g. 'Answer concisely, act as a senior developer, focus on cloud security...'"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f172a] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-400"
                />
              </div>

              {/* Attach CVs & Docs Multi-select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Attach Context Documents</label>
                {documents.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No documents available to attach. Upload resumes/documents first.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5">
                    {documents.map(d => (
                      <label key={d.id} className="flex items-center space-x-3 text-xs p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={attachedDocs.includes(d.id)}
                          onChange={() => toggleDocAttachment(d.id)}
                          className="rounded text-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="truncate text-gray-800 dark:text-gray-300 font-semibold">{d.filename}</span>
                        <span className={`text-[9px] uppercase font-bold ml-auto px-1.5 py-0.5 rounded ${
                          d.file_type === 'resume' 
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/25 dark:text-indigo-400' 
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400'
                        }`}>
                          {d.file_type}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={handleCreateSession}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition-opacity shadow-sm"
              >
                Next
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
