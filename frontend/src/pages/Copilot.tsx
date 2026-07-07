import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { API_BASE_URL, WS_BASE_URL } from '../config';

interface Segment {
  id: string;
  text: string;
  isFinal: boolean;
}

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
}

export default function Copilot() {
  const { token, logout } = useAuth();
  const { sessionId } = useParams<{ sessionId: string }>();
  
  // State
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentInterim, setCurrentInterim] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoAnswer, setAutoAnswer] = useState(false);
  
  // Models State
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [fallbackWarning, setFallbackWarning] = useState<string>('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.model-dropdown')) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Models on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/stream/models`)
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          setModels(data.models);
          setSelectedModel(data.models[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Silence-based Auto Answer
  useEffect(() => {
    if (!autoAnswer || isGenerating) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (segments.length > 0 && !currentInterim) {
      debounceRef.current = setTimeout(() => {
        generateAnswerWithContext();
      }, 2500); 
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [segments, currentInterim, autoAnswer, isGenerating]);

  // Auto-scroll to bottom of transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, currentInterim]);

  // Sync theme to localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleRecording = () => {
    if (isRecording) {
      wsRef.current?.close();
      const recorder = (window as any).mediaRecorder;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
        recorder.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      setIsRecording(false);
    } else {
      wsRef.current = new WebSocket(`${WS_BASE_URL}/api/v1/stream/audio?token=${token}`);
      
      wsRef.current.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'transcript' && data.text.trim()) {
          if (data.is_final) {
            setSegments(prev => [...prev, { id: Date.now().toString(), text: data.text, isFinal: true }]);
            setCurrentInterim('');
          } else {
            setCurrentInterim(data.text);
          }
        }
      };
      
      setIsRecording(true);
      
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        (window as any).mediaRecorder = mediaRecorder;
        
        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        });
        
        mediaRecorder.start(250);
      }).catch(console.error);
    }
  };

  const handleClearContext = () => {
    setSegments([]);
    setCurrentInterim('');
  };

  const handleClearMeeting = async () => {
    if (!confirm("Are you sure you want to clear this session's memory?")) return;
    try {
      const url = `${API_BASE_URL}/api/v1/stream/memory` + (sessionId ? `?session_id=${sessionId}` : '');
      await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      handleClearContext();
      setAnswer('');
    } catch (e) {
      console.error(e);
    }
  };

  const generateAnswerWithContext = async (overrideContext?: string) => {
    const context = overrideContext !== undefined ? overrideContext : segments.map(s => s.text).join(" ");
    if (!context.trim()) return;

    setIsGenerating(true);
    setAnswer(''); 
    setFallbackWarning('');

    try {
      const url = `${API_BASE_URL}/api/v1/stream/generate?question=${encodeURIComponent(context)}&model_id=${selectedModel}` + (sessionId ? `&session_id=${sessionId}` : '');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAnswer(data.answer);
      
      setSegments([]);
      setCurrentInterim('');
      
      if (data.model && data.model !== selectedModel && data.model !== "none") {
        setFallbackWarning(`Model exhausted. Auto-fell back to ${data.model}`);
        setSelectedModel(data.model);
      }
    } catch (err) {
      console.error(err);
      setAnswer("Error generating response.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMergeText = () => {
    if (!manualInput.trim()) return;
    setSegments(prev => [...prev, { id: Date.now().toString(), text: manualInput, isFinal: true }]);
    setManualInput('');
  };

  const handleInstantSend = () => {
    if (!manualInput.trim()) return;
    const newSegments = [...segments, { id: Date.now().toString(), text: manualInput, isFinal: true }];
    setSegments(newSegments);
    setManualInput('');
    generateAnswerWithContext(newSegments.map(s => s.text).join(" "));
  };

  const getModelName = (id: string) => {
    return models.find(m => m.id === id)?.name || id;
  };

  return (
    <div className={`${theme} flex h-screen flex-col overflow-hidden`}>
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#0B0F19] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
        
        {/* Header */}
        <header className="relative z-50 flex items-center justify-between px-8 py-5 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-white/5 backdrop-blur-xl transition-colors duration-300">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <Link to="/dashboard" className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20" title="Back to Dashboard">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </Link>
              <h1 className="text-xl font-bold tracking-wide text-gray-800 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-gray-100 dark:to-gray-400">
                InterviewOS Copilot
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <Link to="/dashboard" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Dashboard</Link>
            <button onClick={logout} className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">Logout</button>
          </div>
        </header>
        
        {/* Main Workspace */}
        <main className="relative z-10 flex-1 grid grid-cols-1 grid-rows-[1fr_4fr] lg:grid-rows-1 lg:grid-cols-12 gap-6 p-4 lg:p-6 min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: Context (20% height on mobile, 4/12 width on desktop) */}
          <div className="lg:col-span-4 flex flex-col rounded-2xl bg-white dark:bg-[#131b2f] border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden h-full transition-colors duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
              <div className="flex items-center space-x-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400 dark:bg-gray-600'}`} />
                <h2 className="text-xs font-semibold tracking-widest text-gray-500 dark:text-gray-400 uppercase">Live Context</h2>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleClearContext}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                  title="Clear Current"
                >
                  Clear
                </button>
                <button
                  onClick={handleClearMeeting}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-red-500 dark:text-red-400/70 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Clear Meeting Memory"
                >
                  Reset
                </button>
                <button
                  onClick={toggleRecording}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    isRecording 
                      ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/20' 
                      : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90'
                  }`}
                >
                  {isRecording ? 'Stop' : 'Listen'}
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth">
              {segments.length === 0 && !currentInterim && (
                <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500 italic text-sm">
                  Waiting for speech or manual input...
                </div>
              )}
              
              {segments.map((seg) => (
                <div key={seg.id} className="text-gray-700 dark:text-gray-300 font-normal leading-relaxed text-base">
                  {seg.text}
                </div>
              ))}
              
              {currentInterim && (
                <div className="text-gray-900 dark:text-white font-medium leading-relaxed text-base animate-pulse">
                  {currentInterim}
                </div>
              )}
            </div>

            {/* Manual Input Bar */}
            <div className="p-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInstantSend()}
                  placeholder="Type instructions mid-interview..."
                  className="w-full pl-4 pr-24 py-2.5 rounded-xl bg-white dark:bg-[#0f172a] border border-gray-300 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
                <div className="absolute right-2 flex items-center space-x-1">
                  <button 
                    onClick={handleMergeText} 
                    className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" 
                    title="Merge to Context"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <button 
                    onClick={handleInstantSend} 
                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" 
                    title="Instant Send"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* RIGHT COLUMN: Answers (80% height on mobile, 8/12 width on desktop) */}
          <div className="lg:col-span-8 flex flex-col rounded-2xl bg-white dark:bg-[#131b2f] border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden h-full transition-colors duration-300">
            <div className="flex flex-wrap gap-4 items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
              <div className="flex items-center space-x-3">
                <h2 className="text-xs font-semibold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  <span>Intelligence Engine</span>
                </h2>
                {fallbackWarning && (
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 px-2 py-0.5 rounded-md font-medium animate-pulse">
                    Fallback: {fallbackWarning.split(' ').pop()}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                {/* Custom Model Selector */}
                <div className="relative flex items-center bg-white dark:bg-black/40 rounded-lg border border-gray-200 dark:border-white/10 model-dropdown shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 pl-3 pr-1 py-1.5 uppercase tracking-wider select-none">Model:</span>
                  
                  <button 
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="flex items-center justify-between min-w-[160px] px-2 py-1.5 text-xs text-gray-800 dark:text-indigo-300 font-semibold hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors focus:outline-none"
                  >
                    <span className="truncate">{getModelName(selectedModel)}</span>
                    <svg className={`w-3.5 h-3.5 ml-1 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isModelDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1.5 w-full min-w-[200px] bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="py-1">
                        {models.map(m => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedModel(m.id);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              selectedModel === m.id 
                                ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' 
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="font-semibold text-xs">{m.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto Answer Toggle */}
                <label className="flex items-center cursor-pointer group">
                  <span className="mr-2 text-xs font-semibold text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-300 transition-colors uppercase tracking-wider">Auto</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={autoAnswer} onChange={() => setAutoAnswer(!autoAnswer)} />
                    <div className={`block w-8 h-5 rounded-full transition-colors ${autoAnswer ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${autoAnswer ? 'translate-x-3' : 'translate-x-0'}`}></div>
                  </div>
                </label>

                <button
                  onClick={() => generateAnswerWithContext()}
                  disabled={isGenerating || (segments.length === 0 && !currentInterim)}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Answer
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10">
              {isGenerating ? (
                <div className="space-y-4 animate-pulse max-w-2xl">
                  <div className="h-4 bg-gray-200 dark:bg-indigo-500/20 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-indigo-500/20 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-indigo-500/20 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 dark:bg-indigo-500/20 rounded w-1/2"></div>
                </div>
              ) : answer ? (
                <div className="prose prose-gray dark:prose-invert prose-indigo max-w-none text-base md:text-[17px] leading-loose text-gray-800 dark:text-gray-100">
                  <ReactMarkdown>{answer}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-indigo-500/40 space-y-4">
                  <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  <p className="text-center font-medium">Ready to assist.<br/><span className="text-sm font-normal text-gray-400">I will analyze the context and provide intelligent suggestions here.</span></p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
