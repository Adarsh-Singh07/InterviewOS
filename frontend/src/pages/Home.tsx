import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Home() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-playing slider for screenshots/mockups
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const slideContent = [
    {
      title: "Real-time Intelligence Console",
      description: "Our Copilot listens to audio cues in real-time, matching queries with your context documents and suggesting perfect candidate answers immediately.",
      type: "workspace",
      badge: "Copilot View"
    },
    {
      title: "Unified Candidate Dashboard",
      description: "Manage your resumes, upload job descriptions, configure custom persona instructions, and start new mock interview sessions instantly.",
      type: "dashboard",
      badge: "Manager View"
    },
    {
      title: "Smart Context Integration",
      description: "Attach reference sheets, past system designs, and multiple versions of your CV. The engine cross-references all data to build custom answers.",
      type: "context",
      badge: "Data Sync"
    }
  ];

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 font-sans relative overflow-hidden">
      {/* Visual background details */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[100px]" />
        <div className="fixed top-0 left-0 w-screen h-screen bg-image bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E')] opacity-[0.02] z-50 pointer-events-none" />
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5">
        <Link to="/">
          <Logo theme="dark" />
        </Link>

        <div className="flex items-center space-x-4">
          {token ? (
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white text-slate-950 hover:bg-slate-100 transition-all hover:scale-[1.02]"
            >
              Dashboard
            </button>
          ) : (
            <>
              <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <button 
                onClick={() => navigate('/login')}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white text-slate-950 hover:bg-slate-100 transition-all hover:scale-[1.02]"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 text-center space-y-8">
        <div className="space-y-4 max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 uppercase">
            Live Interview Copilot
          </span>
          <h1 className="text-6xl md:text-7xl font-serif text-white leading-tight tracking-tight">
            Tell your story, <br />
            <span className="italic font-light text-slate-400">flawlessly and naturally.</span>
          </h1>
          <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            InterviewOS runs quietly in the background during live interviews. It listens to audio prompts and instantly drafts narrative, human-sounding answers customized to your exact resume.
          </p>
        </div>

        <div className="flex items-center justify-center space-x-4">
          <button 
            onClick={() => navigate(token ? '/dashboard' : '/login')}
            className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-95 shadow-md shadow-indigo-500/15 hover:scale-[1.02] transition-all"
          >
            Start Your First Session
          </button>
          <a 
            href="#features"
            className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Interactive Screenshot & Collage Slider */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="p-2 rounded-3xl bg-slate-900/30 border border-white/5 shadow-2xl backdrop-blur-md overflow-hidden relative">
          <div className="aspect-[16/9] w-full bg-[#0A0E1A] rounded-2xl border border-white/5 p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden">
            {/* Slide Navigation Overlay */}
            <div className="absolute bottom-6 left-6 z-20 flex space-x-2">
              {slideContent.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    activeSlide === idx ? 'bg-indigo-500 px-3' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                />
              ))}
            </div>

            {/* Left part of slide: Information */}
            <div className="md:w-2/5 flex flex-col justify-between z-10 py-4">
              <div className="space-y-4">
                <span className="inline-block px-2.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/5 border border-indigo-500/10">
                  {slideContent[activeSlide].badge}
                </span>
                <h3 className="text-2xl font-serif text-white">{slideContent[activeSlide].title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{slideContent[activeSlide].description}</p>
              </div>
              <div className="hidden md:block">
                <p className="text-[10px] font-mono text-slate-500">SYSTEM MOCKUP - INTERVIEWOS CORE v1.0</p>
              </div>
            </div>

            {/* Right part of slide: Visual Mockup (Interactive HTML Collage) */}
            <div className="md:w-3/5 relative flex items-center justify-center bg-black/40 rounded-xl border border-white/5 overflow-hidden min-h-[220px]">
              
              {/* Slider Panel 1: Copilot Workspace Mockup */}
              {activeSlide === 0 && (
                <div className="w-full h-full p-4 flex flex-col justify-between text-left font-sans animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-bold font-mono text-indigo-400">INTELLIGENCE CONSOLE</span>
                    <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded uppercase">Streaming...</span>
                  </div>
                  <div className="flex-1 py-3 space-y-3 overflow-hidden">
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Interviewer Audio Input:</p>
                      <p className="text-xs text-slate-300 mt-1">"Can you explain a time you optimized database query times in production?"</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                      <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">⭐ Suggested Candidate Answer:</p>
                      <p className="text-xs text-slate-300 mt-1">
                        "Sure! So, in my last project, we noticed search times scaling up as records hit millions. I implemented composite indexes on critical columns, which trimmed latency by..."
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Slider Panel 2: Dashboard Mockup */}
              {activeSlide === 1 && (
                <div className="w-full h-full p-4 flex flex-col justify-between text-left font-sans animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-bold font-mono text-emerald-400">ACTIVE INTERVIEW SESSIONS</span>
                    <span className="text-[9px] font-mono text-slate-500">2 Complete</span>
                  </div>
                  <div className="flex-1 py-3 grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                      <h4 className="text-xs font-bold text-slate-200">Google Inc.</h4>
                      <p className="text-[10px] text-slate-400">Software Engineer III</p>
                      <span className="inline-block text-[8px] font-mono text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-1.5 py-0.5 rounded">Active</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
                      <h4 className="text-xs font-bold text-slate-200">Meta Platform</h4>
                      <p className="text-[10px] text-slate-400">Systems Designer</p>
                      <span className="inline-block text-[8px] font-mono text-slate-500 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded">Complete</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Slider Panel 3: Context Integration Mockup */}
              {activeSlide === 2 && (
                <div className="w-full h-full p-4 flex flex-col justify-between text-left font-sans animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-bold font-mono text-purple-400">DOCUMENT ATTACHMENT</span>
                    <span className="text-[9px] font-mono bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 uppercase">Indexed</span>
                  </div>
                  <div className="flex-1 py-3 space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                      <span className="font-semibold text-slate-300">Resume_Senior_Engineer.pdf</span>
                      <span className="text-[9px] text-indigo-400 font-mono">Resume</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                      <span className="font-semibold text-slate-300">System_Design_Cheatsheet.docx</span>
                      <span className="text-[9px] text-emerald-400 font-mono">Reference</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid: Features Collage */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 pb-24 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-serif text-white">Designed for high-pressure loops</h2>
          <p className="text-xs font-mono text-slate-400 tracking-wider uppercase">Advanced features that guarantee interview confidence</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/5 space-y-4 hover:border-indigo-500/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/5 text-indigo-400 flex items-center justify-center border border-indigo-500/10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-200">Real-time Audio Sync</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Continuous live transcription analyzes interviewer questions immediately, generating prompt inputs without manual typing.</p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/5 space-y-4 hover:border-purple-500/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/5 text-purple-400 flex items-center justify-center border border-purple-500/10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-200">Personalized Context</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Deep document integration processes your resume and project briefs, matching your background directly to answer prompts.</p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/5 space-y-4 hover:border-emerald-500/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/5 text-emerald-400 flex items-center justify-center border border-emerald-500/10">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-200">SSE Word Streaming</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Fast Server-Sent Events allow suggested replies to type out word-by-word instantly, giving you immediate glance support.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between border-t border-white/5 text-slate-500 text-xs gap-4">
        <p>&copy; 2026 InterviewOS. All rights reserved.</p>
        <p className="font-mono">ENGINEERING EXCELLENCE</p>
      </footer>
    </div>
  );
}
