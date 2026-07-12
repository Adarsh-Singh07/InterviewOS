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

  const answerScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, currentInterim]);

  // Auto-scroll answer
  useEffect(() => {
    if (answerScrollRef.current) {
      answerScrollRef.current.scrollTop = answerScrollRef.current.scrollHeight;
    }
  }, [answer]);

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
      
      if (!res.body) throw new Error("No response body");
      
      // Stop the generating skeleton as soon as stream starts
      setIsGenerating(false);
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkValue = decoder.decode(value, { stream: true });
          const lines = chunkValue.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              try {
                 const parsed = JSON.parse(dataStr);
                 if (parsed.answer) {
                   setAnswer(prev => prev + parsed.answer);
                 }
                 if (parsed.model && parsed.model !== selectedModel && parsed.model !== "none") {
                   setFallbackWarning(`Model exhausted. Auto-fell back to ${parsed.model}`);
                   setSelectedModel(parsed.model);
                 }
              } catch(e) {}
            }
          }
        }
      }
      setSegments([]);
      setCurrentInterim('');
    } catch (err) {
      console.error(err);
      setAnswer(prev => prev || "Error generating response.");
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
    <div className={`${theme} flex h-screen flex-col overflow-hidden relative`}>
      {/* Background Noise and Ambience */}
      <div className="noise-overlay" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-500/0 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-emerald-500/5 to-indigo-500/0 blur-[80px] pointer-events-none" />

      <div className="flex-1 flex flex-col bg-[#FCFAF6] dark:bg-[#060814] text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
        
        {/* Header */}
        <header className="relative z-50 flex items-center justify-between px-8 py-4 border-b border-slate-200/60 dark:border-white/5 bg-white/60 dark:bg-[#0A0D1A]/40 backdrop-blur-md transition-colors duration-300">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center shadow-sm hover:scale-[1.02] transition-transform" title="Back to Dashboard">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}.5 d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </Link>
              <h1 className="text-2xl font-serif italic text-slate-900 dark:text-white">
                InterviewOS Copilot
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <Link to="/dashboard" className="text-xs font-semibold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Dashboard</Link>
            <button onClick={logout} className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors">Logout</button>
          </div>
        </header>
        
        {/* Main Workspace */}
        <main className="relative z-10 flex-1 grid grid-cols-1 grid-rows-[1.5fr_3fr] lg:grid-rows-1 lg:grid-cols-12 gap-6 p-6 min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: Transcript/Context Panel */}
          <div className="lg:col-span-4 flex flex-col rounded-3xl bg-white/70 dark:bg-[#0B0F19]/50 backdrop-blur-md border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden h-full transition-colors duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10">
              <div className="flex items-center space-x-2.5">
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`} />
                <h2 className="text-[10px] font-bold font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase">Transcript</h2>
              </div>
              
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleClearContext}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  title="Clear Current"
                >
                  Clear
                </button>
                <button
                  onClick={handleClearMeeting}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 dark:text-red-400/80 hover:bg-red-500/5 transition-colors"
                  title="Clear Meeting Memory"
                >
                  Reset
                </button>
                <button
                  onClick={toggleRecording}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
                    isRecording 
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/15' 
                      : 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:opacity-90 hover:scale-[1.02]'
                  }`}
                >
                  {isRecording ? 'Stop' : 'Listen'}
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
              {segments.length === 0 && !currentInterim && (
                <div className="flex h-full items-center justify-center text-slate-400 dark:text-slate-500 italic text-sm">
                  Waiting for speech or manual instructions...
                </div>
              )}
              
              {segments.map((seg) => (
                <div key={seg.id} className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/30 dark:border-white/5 text-slate-700 dark:text-slate-300 font-medium leading-relaxed text-sm md:text-base">
                  {seg.text}
                </div>
              ))}
              
              {currentInterim && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-slate-900 dark:text-white font-medium leading-relaxed text-sm md:text-base animate-pulse">
                  {currentInterim}
                </div>
              )}
            </div>

            {/* Manual Input Bar */}
            <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInstantSend()}
                  placeholder="Type instructions mid-interview..."
                  className="w-full pl-4 pr-24 py-3 rounded-xl bg-white dark:bg-[#0B0F19]/40 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-950 dark:text-slate-100 placeholder-slate-400"
                />
                <div className="absolute right-2 flex items-center space-x-0.5">
                  <button 
                    onClick={handleMergeText} 
                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors" 
                    title="Merge to Context"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <button 
                    onClick={handleInstantSend} 
                    className="p-1.5 text-indigo-500 hover:bg-indigo-500/5 rounded-lg transition-colors" 
                    title="Instant Send"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* RIGHT COLUMN: Answers/Intelligence Engine */}
          <div className="lg:col-span-8 flex flex-col rounded-3xl bg-white/70 dark:bg-[#0B0F19]/50 backdrop-blur-md border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden h-full transition-colors duration-300">
            <div className="flex flex-wrap gap-4 items-center justify-between p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10">
              <div className="flex items-center space-x-3.5">
                <h2 className="text-[10px] font-bold font-mono tracking-widest text-indigo-600 dark:text-indigo-400 uppercase flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  <span>Intelligence Engine</span>
                </h2>
                {fallbackWarning && (
                  <span className="text-[9px] font-mono bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/10 font-medium animate-pulse">
                    Fallback: {fallbackWarning.split(' ').pop()}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                {/* Custom Model Selector */}
                <div className="relative flex items-center bg-white dark:bg-[#060814]/40 rounded-xl border border-slate-200 dark:border-white/10 model-dropdown shadow-sm">
                  <span className="text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 pl-3 pr-1 py-1.5 uppercase tracking-wider select-none">Model:</span>
                  
                  <button 
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="flex items-center justify-between min-w-[170px] px-2 py-1.5 text-xs text-slate-800 dark:text-indigo-300 font-semibold hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors focus:outline-none"
                  >
                    <span className="truncate">{getModelName(selectedModel)}</span>
                    <svg className={`w-3.5 h-3.5 ml-1 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
 
                  {isModelDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1.5 w-full min-w-[200px] bg-white dark:bg-[#0A0D1A] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-50">
                      <div className="py-1.5 max-h-60 overflow-y-auto">
                        {models.map(m => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedModel(m.id);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                              selectedModel === m.id 
                                ? 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 font-semibold border-l-2 border-indigo-500' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                          >
                            <div>{m.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
 
                {/* Auto Answer Toggle */}
                <label className="flex items-center cursor-pointer group select-none">
                  <span className="mr-2 text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors uppercase tracking-wider">Auto</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={autoAnswer} onChange={() => setAutoAnswer(!autoAnswer)} />
                    <div className={`block w-8 h-5 rounded-full transition-colors ${autoAnswer ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${autoAnswer ? 'translate-x-3' : 'translate-x-0'}`}></div>
                  </div>
                </label>
 
                <button
                  onClick={() => generateAnswerWithContext()}
                  disabled={isGenerating || (segments.length === 0 && !currentInterim)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:opacity-90 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Answer
                </button>
              </div>
            </div>
 
            <div ref={answerScrollRef} className="flex-1 overflow-y-auto p-8 lg:p-12">
              {isGenerating ? (
                <div className="space-y-5 animate-pulse max-w-2xl">
                  <div className="h-4 bg-slate-200 dark:bg-indigo-500/5 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-indigo-500/5 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 dark:bg-indigo-500/5 rounded w-5/6"></div>
                  <div className="h-4 bg-slate-200 dark:bg-indigo-500/5 rounded w-1/2"></div>
                </div>
              ) : answer ? (
                <div className="prose prose-slate dark:prose-invert max-w-none text-[15px] md:text-[16px] leading-relaxed text-slate-700 dark:text-slate-200 font-sans prose-headings:font-serif prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:mb-4 prose-li:my-1.5 prose-strong:font-bold prose-strong:text-slate-900 dark:prose-strong:text-white prose-code:font-mono prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-indigo-500/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:border prose-code:border-indigo-500/10 prose-code:before:content-none prose-code:after:content-none">
                  <ReactMarkdown>{answer}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 space-y-4">
                  <svg className="w-12 h-12 opacity-40 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  <p className="text-center font-medium">Ready to assist.<br/><span className="text-xs font-normal text-slate-500 mt-1 block">I will analyze the context and provide intelligent suggestions here.</span></p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
