import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

interface DemoStep {
  question: string;
  transcript: string;
  checks: string[];
  answer: string;
  latency: string;
}

export default function Home() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const demoSectionRef = useRef<HTMLDivElement>(null);
  
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');

  // Stats counting ticker states
  const [latencyCount, setLatencyCount] = useState(650);
  const [accuracyCount, setAccuracyCount] = useState(80);
  const [memoryCount, setMemoryCount] = useState(1);

  // Stats counting effect
  useEffect(() => {
    const latencyInterval = setInterval(() => {
      setLatencyCount((prev) => {
        if (prev <= 420) {
          clearInterval(latencyInterval);
          return 420;
        }
        return prev - 10;
      });
    }, 30);

    const accuracyInterval = setInterval(() => {
      setAccuracyCount((prev) => {
        if (prev >= 98) {
          clearInterval(accuracyInterval);
          return 98;
        }
        return prev + 1;
      });
    }, 40);

    const memoryInterval = setInterval(() => {
      setMemoryCount((prev) => {
        if (prev >= 100) {
          clearInterval(memoryInterval);
          return 100;
        }
        return prev + 3;
      });
    }, 20);

    return () => {
      clearInterval(latencyInterval);
      clearInterval(accuracyInterval);
      clearInterval(memoryInterval);
    };
  }, []);

  // Simulated live demo configurations
  const demoData: DemoStep[] = [
    {
      question: "Explain CAP theorem and how it affects microservices.",
      transcript: "Explain the CAP theorem and how it affects microservice architecture design.",
      checks: [
        "✓ Resume profile loaded (8.5ms)",
        "✓ Target JD matched (12.4ms)",
        "✓ System design cheatsheets parsed (9.2ms)",
        "✓ Context search mapped (11.0ms)"
      ],
      answer: "⭐ **Answer:** Sure! So the CAP theorem stands for Consistency, Availability, and Partition Tolerance. In any distributed system, you can only guarantee two of these three. For instance, when designing high-throughput microservices, partition tolerance is non-negotiable because networks will always experience lag or failure. If a partition occurs, you must choose between Consistency—where all database nodes return the same data (meaning we block requests until sync is complete)—or Availability, where every non-failing node returns a response immediately, even if it is stale.\n\nIn my previous projects, we chose an AP configuration with eventual consistency using message brokers, ensuring our user transactions remained highly available even during connection hiccups.",
      latency: "384 ms"
    },
    {
      question: "What is database normalization?",
      transcript: "What is database normalization and when would you de-normalize?",
      checks: [
        "✓ Database schemas loaded (5.4ms)",
        "✓ Experience data mapped (7.2ms)",
        "✓ Index configurations validated (14.0ms)",
        "✓ RAG hit complete (9.5ms)"
      ],
      answer: "⭐ **Answer:** Database normalization is the process of structuring a relational database to reduce data redundancy and improve data integrity. It usually involves breaking tables down to Third Normal Form (3NF) to prevent anomalies during insert, update, or delete operations.\n\nHowever, de-normalization is key when optimizing read performance. In my last backend system, we noticed that compiling complex metrics reports required multiple expensive table joins. By strategically duplicating data into a de-normalised read-optimized table, we reduced API latencies by over 60%.",
      latency: "410 ms"
    },
    {
      question: "Tell me about a time you solved a hard technical bug.",
      transcript: "Can you tell me about a time you solved a complex production bug under pressure?",
      checks: [
        "✓ Past projects parsed (9.0ms)",
        "✓ Custom persona instructions active (4.2ms)",
        "✓ Debug logs contextualized (15.5ms)",
        "✓ Context reference mapped (12.1ms)"
      ],
      answer: "⭐ **Answer:** Absolutely. Last year, our real-time notification service began randomly dropping user connections during high-traffic peaks. The logs didn't show any memory leaks, but CPU spikes were throttling the server.\n\nI isolated the issue by writing a custom logging utility. I realized we had a connection pool leak because our websocket close events weren't releasing resources back to the pool. I overhauled the connection lifecycle handlers, ensuring that every closed connection triggered an explicit database release hook. This immediately stabilized CPU usage and brought connection drop rates down to 0%.",
      latency: "438 ms"
    }
  ];

  const [selectedDemoIdx, setSelectedDemoIdx] = useState(0);
  const [demoStatus, setDemoStatus] = useState<'idle' | 'listening' | 'thinking' | 'generating' | 'complete'>('idle');
  const [visibleTranscript, setVisibleTranscript] = useState('');
  const [visibleAnswer, setVisibleAnswer] = useState('');
  const [visibleChecks, setVisibleChecks] = useState<string[]>([]);
  const demoIntervalRef = useRef<any>(null);

  const activeDemo = demoData[selectedDemoIdx];

  const startDemo = () => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    
    setDemoStatus('listening');
    setVisibleTranscript('');
    setVisibleAnswer('');
    setVisibleChecks([]);

    let charIdx = 0;
    const fullTranscript = activeDemo.transcript;
    const typingSpeed = 35;
    
    const typeInterval = setInterval(() => {
      if (charIdx < fullTranscript.length) {
        setVisibleTranscript((prev) => prev + fullTranscript.charAt(charIdx));
        charIdx++;
      } else {
        clearInterval(typeInterval);
        
        setDemoStatus('thinking');
        let checkIdx = 0;
        const checkTimer = setInterval(() => {
          if (checkIdx < activeDemo.checks.length) {
            setVisibleChecks((prev) => [...prev, activeDemo.checks[checkIdx]]);
            checkIdx++;
          } else {
            clearInterval(checkTimer);
            
            setDemoStatus('generating');
            let wordIdx = 0;
            const words = activeDemo.answer.split(' ');
            const streamSpeed = 40;
            
            const streamInterval = setInterval(() => {
              if (wordIdx < words.length) {
                setVisibleAnswer((prev) => prev + (wordIdx === 0 ? '' : ' ') + words[wordIdx]);
                wordIdx++;
              } else {
                clearInterval(streamInterval);
                setDemoStatus('complete');
              }
            }, streamSpeed);
            demoIntervalRef.current = streamInterval;
          }
        }, 300);
        demoIntervalRef.current = checkTimer;
      }
    }, typingSpeed);
    demoIntervalRef.current = typeInterval;
  };

  useEffect(() => {
    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, []);

  const scrollToDemo = () => {
    demoSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={`${theme} min-h-screen bg-[#FCFAF6] dark:bg-[#060814] text-slate-800 dark:text-slate-100 font-sans relative overflow-hidden transition-colors duration-300 selection:bg-indigo-500/20 selection:text-slate-900 dark:selection:text-white`}>
      
      {/* Custom Styles for Keyframe Animations */}
      <style>{`
        @keyframes float-glow-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(50px, -80px) scale(1.15); }
        }
        @keyframes float-glow-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-60px, 50px) scale(0.9); }
        }
        @keyframes pulse-wave {
          0%, 100% { height: 4px; }
          50% { height: 32px; }
        }
        @keyframes blink-cursor {
          50% { opacity: 0; }
        }
        .animate-float-1 { animation: float-glow-1 25s infinite ease-in-out; }
        .animate-float-2 { animation: float-glow-2 30s infinite ease-in-out; }
        .animate-wave-bar { animation: pulse-wave 1.2s infinite ease-in-out; }
        .animate-cursor { animation: blink-cursor 0.8s infinite; }
      `}</style>

      {/* Floating Animated Gradient Background Mesh */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className={`absolute top-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full blur-[130px] animate-float-1 ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-500/5'}`} />
        <div className={`absolute bottom-[-15%] left-[-15%] w-[600px] h-[600px] rounded-full blur-[120px] animate-float-2 ${theme === 'dark' ? 'bg-purple-500/5' : 'bg-purple-500/3'}`} />
        <div className="fixed top-0 left-0 w-screen h-screen bg-image bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')] opacity-[0.015] z-50 pointer-events-none" />
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-8 py-6 flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 bg-slate-50/20 dark:bg-black/10 backdrop-blur-sm transition-colors duration-300">
        <Logo theme={theme} />

        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Light Mode / Dark Mode Toggle */}
          <button 
            onClick={() => {
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextTheme);
              localStorage.setItem('theme', nextTheme);
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          {token ? (
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-black/5 dark:shadow-white/5"
            >
              Dashboard
            </button>
          ) : (
            <>
              <Link to="/login" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors">
                Sign In
              </Link>
              <button 
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-black/5 dark:shadow-white/5"
              >
                Launch Copilot
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pt-24 pb-20 text-center space-y-10">
        <div className="space-y-6 max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full text-[9px] font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 uppercase">
            Invisible AI Interview Copilot
          </span>
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-serif text-slate-900 dark:text-white leading-none tracking-tight">
            Listens. <br />
            Understands. <br />
            <span className="italic font-light text-slate-400 dark:text-slate-500">Answers.</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed pt-2">
            Real-time AI that hears every interview question, matches it instantly against your resume and custom notes, and streams natural answers before you finish thinking.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button 
            onClick={() => navigate(token ? '/dashboard' : '/login')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-semibold bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white hover:opacity-95 shadow-lg shadow-indigo-600/10 dark:shadow-indigo-500/15 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Start Live Interview
          </button>
          <button 
            onClick={scrollToDemo}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl text-sm font-semibold bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Live Demo
          </button>
        </div>
      </section>

      {/* Interactive macOS Live Demo Section */}
      <section ref={demoSectionRef} className="relative z-10 max-w-5xl mx-auto px-8 pb-32">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-3xl sm:text-4xl font-serif text-slate-900 dark:text-white">Experience InterviewOS in Action</h2>
          <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 tracking-wider uppercase font-bold">Press play to launch the simulated Technical Interview Copilot</p>
        </div>

        {/* Demo Controller Buttons */}
        <div className="flex justify-center flex-wrap gap-2.5 mb-6">
          {demoData.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedDemoIdx(idx);
                setDemoStatus('idle');
                setVisibleTranscript('');
                setVisibleAnswer('');
                setVisibleChecks([]);
              }}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                selectedDemoIdx === idx
                  ? 'bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/15 dark:border-indigo-500/20'
                  : 'bg-white/40 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Question {idx + 1}
            </button>
          ))}
        </div>

        {/* macOS Window Wrapper */}
        <div className="rounded-3xl bg-white/70 dark:bg-[#090D1A]/50 border border-slate-200/60 dark:border-white/5 shadow-2xl backdrop-blur-md overflow-hidden relative group hover:border-indigo-500/20 dark:hover:border-indigo-500/10 transition-all duration-500">
          <div className="noise-overlay" />
          
          {/* Header Bar */}
          <div className="px-6 py-4.5 bg-slate-100/50 dark:bg-black/30 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between transition-colors duration-300">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pl-4 uppercase tracking-wider font-semibold">Mock Session - Google SWE III</span>
            </div>
            <div className="flex items-center space-x-3.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Listening...</span>
            </div>
          </div>

          {/* Window Body Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px] text-left">
            
            {/* Left Panel: Voice Capture & Transcript */}
            <div className="md:col-span-5 border-r border-slate-200/60 dark:border-white/5 p-6 flex flex-col justify-between space-y-6 transition-colors duration-300">
              
              {/* Voice Waves */}
              <div className="space-y-4">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest block">Interviewer Audio</span>
                <div className="flex items-center space-x-1 h-10 bg-slate-50/50 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-2xl px-4 transition-colors duration-300">
                  {demoStatus === 'listening' ? (
                    <>
                      <div className="w-1 bg-indigo-500 rounded-full animate-wave-bar" style={{ animationDelay: '0.1s' }} />
                      <div className="w-1 bg-indigo-500 rounded-full animate-wave-bar" style={{ animationDelay: '0.3s' }} />
                      <div className="w-1 bg-indigo-500 rounded-full animate-wave-bar" style={{ animationDelay: '0.5s' }} />
                      <div className="w-1 bg-indigo-400 rounded-full animate-wave-bar" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1 bg-indigo-400 rounded-full animate-wave-bar" style={{ animationDelay: '0.4s' }} />
                      <div className="w-1 bg-indigo-300 rounded-full animate-wave-bar" style={{ animationDelay: '0.6s' }} />
                      <div className="w-1 bg-indigo-300 rounded-full animate-wave-bar" style={{ animationDelay: '0.1s' }} />
                      <div className="w-1 bg-indigo-500 rounded-full animate-wave-bar" style={{ animationDelay: '0.3s' }} />
                    </>
                  ) : (
                    <div className="flex items-center space-x-1 w-full justify-center text-[10px] font-mono text-slate-400 dark:text-slate-600">
                      <span>AUDIO IDLE</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transcript Display */}
              <div className="flex-1 space-y-3">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest block">Live Transcript</span>
                <div className="p-4 bg-white dark:bg-black/25 border border-slate-200 dark:border-white/5 rounded-2xl min-h-[160px] text-xs leading-relaxed text-slate-700 dark:text-slate-300 transition-colors duration-300">
                  {visibleTranscript || (
                    <span className="text-slate-400 dark:text-slate-650 italic">Interviewer voice text will appear here...</span>
                  )}
                  {demoStatus === 'listening' && (
                    <span className="w-1 h-3.5 inline-block bg-indigo-500 dark:bg-indigo-400 ml-0.5 animate-cursor" />
                  )}
                </div>
              </div>

              {/* Start Button */}
              <div>
                <button
                  onClick={startDemo}
                  disabled={demoStatus === 'listening' || demoStatus === 'thinking' || demoStatus === 'generating'}
                  className="w-full py-3.5 rounded-xl bg-indigo-650 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-500 active:scale-[0.98] transition-all text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
                >
                  {demoStatus === 'idle' ? 'Start Live Demo' : demoStatus === 'complete' ? 'Run Again' : 'Simulating...'}
                </button>
              </div>
            </div>

            {/* Right Panel: AI Processing & suggested answers */}
            <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-6 bg-slate-50/30 dark:bg-black/15 transition-colors duration-300">
              
              {/* Checklists & Intelligence checks */}
              <div className="space-y-4.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-widest">Intelligence Check</span>
                  {demoStatus === 'complete' && (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">✓ Suggested answer compiled</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {visibleChecks.map((check, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 flex items-center space-x-2 transition-colors duration-300">
                      <span className="text-emerald-500 dark:text-emerald-400">✓</span>
                      <span>{check}</span>
                    </div>
                  ))}
                  {demoStatus === 'thinking' && (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 flex items-center space-x-2 animate-pulse transition-colors duration-300">
                      <div className="w-2.5 h-2.5 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-indigo-600 dark:text-indigo-400">Querying knowledge assets...</span>
                    </div>
                  )}
                  {demoStatus === 'idle' && (
                    <div className="col-span-2 text-center py-4 text-slate-400 dark:text-slate-600 italic font-sans text-xs">
                      Start the demo to see context checks.
                    </div>
                  )}
                </div>
              </div>

              {/* Streaming Answer Output */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">Suggested Answer</span>
                  {activeDemo.latency && (demoStatus === 'generating' || demoStatus === 'complete') && (
                    <span className="text-[9px] font-mono bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded font-bold">
                      LATENCY: {activeDemo.latency}
                    </span>
                  )}
                </div>
                <div className="p-5 bg-white dark:bg-black/45 border border-slate-200 dark:border-white/5 rounded-2xl min-h-[220px] text-xs md:text-sm leading-relaxed text-slate-800 dark:text-slate-300 overflow-y-auto max-h-[260px] font-sans transition-colors duration-300">
                  {visibleAnswer ? (
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">⭐ Suggested Answer:</span>
                      <p className="mt-2 text-slate-755 dark:text-slate-300 whitespace-pre-line">{visibleAnswer.replace('⭐ **Answer:** ', '')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-650 italic">
                      {demoStatus === 'thinking' ? 'Analyzing query context...' : 'Suggested reply will render word-by-word here...'}
                    </div>
                  )}
                  {demoStatus === 'generating' && (
                    <span className="w-1.5 h-3.5 inline-block bg-indigo-500 dark:bg-indigo-400 ml-0.5 animate-cursor" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why InterviewOS Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-32 text-center space-y-8 border-t border-slate-200/60 dark:border-white/5 pt-24 transition-colors duration-300">
        <span className="inline-block px-3 py-1 rounded-full text-[9px] font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 uppercase">
          Autonomous Copilot vs Chatbots
        </span>
        <h2 className="text-4xl sm:text-5xl font-serif text-slate-900 dark:text-white max-w-2xl mx-auto leading-tight">
          Not another chatbot. <br />
          <span className="italic font-light text-slate-400 dark:text-slate-500">InterviewOS doesn't wait for your command.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left pt-6">
          <div className="p-6 bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-2xl space-y-2 hover:border-indigo-500/20 hover:bg-slate-100/50 dark:hover:bg-white/10 transition-all duration-300">
            <span className="text-xl animate-bounce">🎤</span>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">It Listens.</h4>
            <p className="text-xs text-slate-400 dark:text-slate-450 leading-relaxed">Runs in the background, listening continuously to streaming voice inputs from the interviewer.</p>
          </div>
          <div className="p-6 bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-2xl space-y-2 hover:border-indigo-500/20 hover:bg-slate-100/50 dark:hover:bg-white/10 transition-all duration-300">
            <span className="text-xl animate-bounce">🧠</span>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">It Understands.</h4>
            <p className="text-xs text-slate-400 dark:text-slate-455 leading-relaxed">Extracts the semantic intent of the question, filtering noise and conversation filler instantly.</p>
          </div>
          <div className="p-6 bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-2xl space-y-2 hover:border-indigo-500/20 hover:bg-slate-100/50 dark:hover:bg-white/10 transition-all duration-300">
            <span className="text-xl animate-bounce">⚡</span>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">It Prepares.</h4>
            <p className="text-xs text-slate-400 dark:text-slate-455 leading-relaxed">Cross-references all documents (CV, reference notes, cheat sheets) stored in your secure vector base.</p>
          </div>
          <div className="p-6 bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-2xl space-y-2 hover:border-indigo-500/20 hover:bg-slate-100/50 dark:hover:bg-white/10 transition-all duration-300">
            <span className="text-xl animate-bounce">💬</span>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">It Answers.</h4>
            <p className="text-xs text-slate-400 dark:text-slate-455 leading-relaxed">Streams a tailored candidate response in a spoken candidate persona directly onto your overlay dashboard.</p>
          </div>
        </div>
      </section>

      {/* Timeline process Workflow */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-32">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif text-slate-900 dark:text-white">How it Works</h2>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">A seamless flow from voice capture to instant stream</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-[44px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/0 z-0" />

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left space-y-4 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-650 dark:text-indigo-400 font-bold font-mono text-sm group-hover:scale-110 transition-transform">
              1
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">LISTEN</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-[200px]">
              Captures interviewer audio streams via WebSockets in real time.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left space-y-4 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-650 dark:text-indigo-400 font-bold font-mono text-sm group-hover:scale-110 transition-transform">
              2
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">UNDERSTAND</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-[200px]">
              Matches every question against your secure, custom-parsed resume.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left space-y-4 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-650 dark:text-indigo-400 font-bold font-mono text-sm group-hover:scale-110 transition-transform">
              3
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">GENERATE</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-[200px]">
              Streams spoken, human-quality answers to your dashboard.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left space-y-4 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-650 dark:text-indigo-400 font-bold font-mono text-sm group-hover:scale-110 transition-transform">
              4
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">REMEMBER</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed max-w-[200px]">
              Maintains full context memory throughout the active session.
            </p>
          </div>
        </div>
      </section>

      {/* Modern Architecture Diagram (Flowchart) */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-32">
        <div className="text-center space-y-3 mb-14">
          <h2 className="text-3xl sm:text-4xl font-serif text-slate-900 dark:text-white">System Architecture</h2>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Designed for sub-500ms end-to-end response pipelines</p>
        </div>

        {/* Diagram Card Container */}
        <div className="p-8 rounded-3xl bg-white/50 dark:bg-[#090D1A]/30 border border-slate-200/60 dark:border-white/5 flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left max-w-4xl mx-auto transition-colors duration-300">
          
          <div className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 min-w-[120px] transition-colors">
            Audio Stream
          </div>

          <div className="text-indigo-600 dark:text-indigo-500 font-bold text-sm">➔</div>

          <div className="px-4 py-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 min-w-[140px] transition-colors">
            Deepgram (ASR)
          </div>

          <div className="text-indigo-600 dark:text-indigo-500 font-bold text-sm">➔</div>

          <div className="px-4 py-3 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 min-w-[150px] transition-colors">
            Context Search (RAG)
          </div>

          <div className="text-indigo-600 dark:text-indigo-500 font-bold text-sm">➔</div>

          <div className="px-4 py-3 rounded-xl bg-purple-50/80 dark:bg-purple-500/10 border border-purple-500/10 dark:border-purple-500/20 text-xs font-mono font-bold text-purple-650 dark:text-purple-400 min-w-[150px] transition-colors">
            Groq / Gemini (LLM)
          </div>

          <div className="text-indigo-600 dark:text-indigo-500 font-bold text-sm">➔</div>

          <div className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 text-xs font-mono font-bold text-slate-800 dark:text-white min-w-[120px] transition-colors">
            Overlay UI
          </div>
        </div>
      </section>

      {/* Premium Statistics & AI Memory */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-32 grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Stats Grid */}
        <div className="md:col-span-7 grid grid-cols-2 gap-4">
          <div className="p-8 rounded-3xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col justify-center space-y-2 hover:border-indigo-500/20 transition-all duration-300">
            <span className="text-4xl md:text-5xl font-serif text-slate-900 dark:text-white font-bold">&lt; {latencyCount}ms</span>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Average response time</span>
          </div>

          <div className="p-8 rounded-3xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col justify-center space-y-2 hover:border-indigo-500/20 transition-all duration-300">
            <span className="text-4xl md:text-5xl font-serif text-slate-900 dark:text-white font-bold">{accuracyCount}%</span>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Detection accuracy</span>
          </div>

          <div className="p-8 rounded-3xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col justify-center space-y-2 hover:border-indigo-500/20 transition-all duration-300 col-span-2">
            <span className="text-4xl md:text-5xl font-serif text-slate-900 dark:text-white font-bold">{memoryCount}% Private</span>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fully encrypted storage and zero data retention models</span>
          </div>
        </div>

        {/* Right Memory Widget Panel */}
        <div className="md:col-span-5 p-8 rounded-3xl bg-white/80 dark:bg-[#090D1A]/40 border border-slate-200/60 dark:border-white/5 flex flex-col justify-between space-y-6 hover:border-indigo-500/20 transition-all duration-300">
          <div className="space-y-4">
            <span className="text-[9px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-widest block">AI Memory Matrix</span>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Resume & Credentials</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Parsed</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Projects & Repositories</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Indexed</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Target Job Description</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Understood</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-2">
            <div className="flex justify-between text-[9px] font-mono text-indigo-600 dark:text-indigo-300 uppercase">
              <span>Active session memory buffer</span>
              <span>100% full</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-black/40 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-full rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / FAQ Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-32 border-t border-slate-200/60 dark:border-white/5 pt-24 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-serif text-slate-900 dark:text-white">Simple, transparent options</h2>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">Get interview-ready with our advanced plans</p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Card Trial */}
          <div className="p-8 rounded-3xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex flex-col justify-between min-h-[380px] hover:border-slate-400 dark:hover:border-slate-700 transition-all duration-300">
            <div className="space-y-4">
              <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Starter Tier</span>
              <h3 className="text-3xl font-serif text-slate-900 dark:text-white">Free Practice</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Configure your resume and try out our simulator with basic models.
              </p>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 pt-2">
                <li>• 15 active transcription minutes</li>
                <li>• Basic Gemini flash models</li>
                <li>• Full Resume Form Editor</li>
                <li>• 2 test mock session transcripts</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full mt-6 py-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-800 dark:text-white transition-colors"
            >
              Get Started Free
            </button>
          </div>

          {/* Card Pro */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-indigo-500/10 to-indigo-500/0 border border-indigo-500/20 flex flex-col justify-between min-h-[380px] hover:border-indigo-500/40 transition-all duration-300 shadow-xl shadow-indigo-500/5 relative">
            <div className="absolute top-4 right-4 bg-indigo-650 dark:bg-indigo-500 text-white text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Most Popular
            </div>
            <div className="space-y-4">
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Premium Tier</span>
              <h3 className="text-3xl font-serif text-slate-900 dark:text-white">Unlimited Copilot</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Deploy full Llama 3.3 and Groq engine access for real-time latency.
              </p>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-2 pt-2">
                <li>• 500+ monthly transcription minutes</li>
                <li>• Full access to Llama 3.3 70B & GPT-5.4-Mini</li>
                <li>• Multi-doc context search integration</li>
                <li>• Complete session performance summaries</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full mt-6 py-3 rounded-xl bg-indigo-650 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/10"
            >
              Unlock Premium Access
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-8 py-8 flex flex-col md:flex-row items-center justify-between border-t border-slate-200/60 dark:border-white/5 text-slate-500 text-xs gap-4 bg-slate-50/20 dark:bg-black/10 transition-colors duration-300">
        <div className="flex items-center space-x-2">
          <Logo theme={theme} />
        </div>
        <p className="text-slate-500 font-sans">&copy; 2026 InterviewOS. All rights reserved.</p>
        <p className="font-mono text-[9px] tracking-widest text-indigo-600 dark:text-indigo-500/80">ENGINEERING EXCELLENCE</p>
      </footer>
    </div>
  );
}
