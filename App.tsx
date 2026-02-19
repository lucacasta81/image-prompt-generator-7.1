
import React, { useState, useRef, useEffect } from 'react';
import { VisualStyle, LightingMode, Perspective, GeneratedPrompt, ImageGenerator, PromptConfig } from './types';
import { expandPrompt, extractPromptFromImage } from './services/geminiService';
import { Button } from './components/Button';
import { PromptCard } from './components/PromptCard';
import { OnboardingGuide } from './components/OnboardingGuide';
import { Loader2, Plug, ExternalLink, Rocket, Dices, Image as ImageIcon, Terminal } from 'lucide-react';

const STORAGE_KEY = 'promptcraft_v4_data';

export {};
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [mode, setMode] = useState<'gen' | 'vis'>('gen');
  const [seed, setSeed] = useState('');
  const [config, setConfig] = useState<PromptConfig>({
    style: VisualStyle.NEUTRAL,
    lighting: LightingMode.NEUTRAL,
    perspective: Perspective.NEUTRAL,
    generator: ImageGenerator.UNIVERSAL,
    isConcise: false
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedPrompt[]>([]);
  const [tokens, setTokens] = useState(0);
  const [preview, setPreview] = useState<{base64: string, mime: string} | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Default to null to indicate initial checking state.
  const [isKeyConnected, setIsKeyConnected] = useState<boolean | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { results: r, tokens: t } = JSON.parse(saved);
        setResults(r || []);
        setTokens(t || 0);
      } catch (e) { console.warn("Cache reset"); }
    }
    if (!localStorage.getItem('promptcraft_visited')) setShowOnboarding(true);

    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          const connected = await window.aistudio.hasSelectedApiKey();
          setIsKeyConnected(connected);
        } catch (error) {
          console.error("Error checking AI Studio API key:", error);
          // If there's an error checking the key, assume it's not connected or issue exists.
          setIsKeyConnected(false); 
        }
      } else {
        // If not in AI Studio context, assume API_KEY is available via process.env
        // Subsequent API calls will trigger the connection gate if it's not.
        setIsKeyConnected(true); 
      }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: results.slice(0, 15), tokens }));
  }, [results, tokens]);

  const handleConnectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success and proceed to mitigate race conditions
      setIsKeyConnected(true);
    } else {
      // If not in AI Studio context, we can't open the key picker.
      alert("Please ensure an API Key is configured in your environment variables.");
      setIsKeyConnected(false); // Stay in disconnected state if manual configuration is needed.
    }
  };

  const handleAction = async (isDice = false) => {
    setLoading(true);
    try {
      if (mode === 'gen') {
        const res = await expandPrompt(isDice ? "SURPRISE_ME: Artistic" : seed, config);
        setTokens(prev => prev + (res.usage?.totalTokenCount || 0));
        const news = res.prompts.map(p => ({ 
          id: Math.random().toString(36).substr(2, 9), 
          title: p.title, 
          content: p.content, 
          config, 
          usage: res.usage 
        }));
        setResults(prev => [...news, ...prev]);
        setSeed('');
      } else if (preview) {
        const res = await extractPromptFromImage(preview.base64.split(',')[1], preview.mime, config);
        setTokens(prev => prev + (res.usage?.totalTokenCount || 0));
        setResults(prev => [{ 
          id: Math.random().toString(36).substr(2, 9), 
          title: "Neural Scan", 
          content: res.text, 
          config, 
          sourceImageUrl: preview.base64, 
          usage: res.usage 
        }, ...prev]);
      }
    } catch (e: any) { 
      console.error("Application Error:", e);
      // Trigger the connection gate only if the error specifically indicates a missing/invalid project setup
      // or "entity not found" which is common when a key hasn't been picked for specific models.
      const errorMessage = e.message?.toLowerCase() || "";
      if (errorMessage.includes("entity was not found") || errorMessage.includes("api key") || errorMessage.includes("404") || errorMessage.includes("403")) {
        setIsKeyConnected(false);
      } else {
        alert(`Forge failed: ${e.message || "Unknown neural glitch"}`);
      }
    }
    setLoading(false);
  };

  // Initial loading state while checking API key
  if (isKeyConnected === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-reddish-black">
        <div className="glass max-w-sm w-full rounded-[2.5rem] p-10 text-center flex flex-col items-center border border-light-red/10 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-light-red flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,232,232,0.1)]">
            <Loader2 className="w-8 h-8 text-deep-red animate-spin" />
          </div>
          <p className="text-light-red text-lg font-black uppercase tracking-wider">Initializing Neural Core...</p>
          <p className="text-dark-red text-[8px] mt-4 uppercase font-black tracking-widest">Awaiting system handshake</p>
        </div>
      </div>
    );
  }

  // Connection Gate (only shown when explicitly required after a failed attempt or initial check)
  if (isKeyConnected === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-reddish-black">
        <div className="glass max-w-md w-full rounded-[2.5rem] p-10 text-center flex flex-col items-center border border-light-red/10 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-light-red flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(255,232,232,0.1)]">
            <Plug className="w-10 h-10 text-deep-red" />
          </div>
          <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter text-light-red">Connection Required</h2>
          <p className="text-medium-red text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">
            The neural engine requires a linked API key from a paid Google Cloud project to proceed with high-precision generation.
          </p>
          
          {window.aistudio ? (
            <Button onClick={handleConnectKey} className="w-full py-4 text-[10px] tracking-[0.2em]">
              CONNECT AI STUDIO KEY
            </Button>
          ) : (
            <div className="p-6 bg-deep-red/50 rounded-2xl border border-light-red/10 w-full text-[10px] uppercase font-bold text-light-red tracking-widest leading-relaxed">
              Neural injection failed. Ensure your environment has a valid <code className="text-light-red">API_KEY</code> or that you are in an supported interface.
            </div>
          )}
          
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-6 text-[9px] text-dark-red hover:text-medium-red uppercase font-black tracking-widest transition-colors flex items-center gap-1"
          >
            Billing Documentation <ExternalLink className="w-3 h-3" />
          </a>

          <button 
            onClick={() => setIsKeyConnected(true)} 
            className="mt-8 text-[8px] text-dark-red hover:text-light-red uppercase tracking-[0.3em] font-black border-b border-transparent hover:border-light-red/20 transition-all"
          >
            Attempt Re-Entry to Core
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-reddish-black text-light-red selection:bg-light-red/20">
      {showOnboarding && <OnboardingGuide onComplete={() => {
        localStorage.setItem('promptcraft_visited', 'true');
        setShowOnboarding(false);
      }} />}

      <header className="p-6 md:px-12 flex justify-between items-center border-b border-light-red/5 sticky top-0 bg-reddish-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-light-red rounded-lg flex items-center justify-center text-reddish-black">
            <Rocket className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">PromptCraft <span className="text-dark-red italic">Pro</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:block text-[9px] font-black uppercase tracking-widest text-dark-red">
            {`Usage: ${tokens.toLocaleString()} tokens`}
          </div>
          <nav className="flex items-center gap-4">
            <div className="flex bg-deep-red p-1 rounded-xl border border-light-red/10">
              <button onClick={() => setMode('gen')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'gen' ? 'bg-light-red text-reddish-black' : 'text-medium-red hover:text-light-red'}`}>Architect</button>
              <button onClick={() => setMode('vis')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'vis' ? 'bg-light-red text-reddish-black' : 'text-medium-red hover:text-light-red'}`}>Vision</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto max-w-5xl px-6 py-12">
        <section className="mb-12">
          <div className="glass p-2 rounded-3xl border-light-red/10 flex flex-col md:flex-row gap-2 shadow-2xl">
            {mode === 'gen' ? (
              <div className="flex-grow flex gap-2 p-2">
                <input 
                  className="flex-grow bg-transparent border-none outline-none px-6 text-xl font-bold placeholder:text-dark-red text-light-red"
                  placeholder="Insert idea seed..."
                  value={seed}
                  onChange={e => setSeed(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAction()}
                />
                <Button variant="ghost" className="px-4" onClick={() => handleAction(true)} disabled={loading}><Dices className="w-5 h-5" /></Button>
                <Button onClick={() => handleAction()} isLoading={loading} disabled={!seed.trim()} className="rounded-2xl px-8">Forge</Button>
              </div>
            ) : (
              <div className="flex-grow flex gap-4 p-4 items-center">
                <div className="w-16 h-16 bg-deep-red rounded-2xl flex items-center justify-center border border-light-red/5 overflow-hidden shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {preview ? <img src={preview.base64} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-dark-red" />}
                </div>
                <div className="flex-grow">
                  <p className="text-[9px] font-black uppercase text-dark-red mb-1 tracking-widest">Vision Reference</p>
                  <button onClick={() => fileInputRef.current?.click()} className="text-sm font-bold hover:text-medium-red transition-colors uppercase tracking-widest">Choose Image</button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setPreview({ base64: ev.target?.result as string, mime: file.type });
                      setMode('vis');
                    };
                    reader.readAsDataURL(file);
                  }
                }} />
                <Button onClick={() => handleAction()} isLoading={loading} disabled={!preview} className="rounded-2xl px-12">Deconstruct</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <select className="glass p-3 rounded-xl text-[9px] font-black uppercase bg-reddish-black outline-none border-light-red/5" value={config.style} onChange={e => setConfig({...config, style: e.target.value as any})}>
              {Object.values(VisualStyle).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="glass p-3 rounded-xl text-[9px] font-black uppercase bg-reddish-black outline-none border-light-red/5" value={config.lighting} onChange={e => setConfig({...config, lighting: e.target.value as any})}>
              {Object.values(LightingMode).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="glass p-3 rounded-xl text-[9px] font-black uppercase bg-reddish-black outline-none border-light-red/5" value={config.perspective} onChange={e => setConfig({...config, perspective: e.target.value as any})}>
              {Object.values(Perspective).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="glass p-3 rounded-xl text-[9px] font-black uppercase bg-reddish-black outline-none border-light-red/5" value={config.generator} onChange={e => setConfig({...config, generator: e.target.value as any})}>
              {Object.values(ImageGenerator).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <button onClick={() => setConfig({...config, isConcise: !config.isConcise})} className={`glass p-3 rounded-xl text-[9px] font-black uppercase border-light-red/5 transition-all ${config.isConcise ? 'bg-light-red text-reddish-black' : 'text-medium-red hover:text-light-red'}`}>
              {config.isConcise ? 'Tags Only' : 'Full Detail'}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {results.map(res => (
            <PromptCard 
              key={res.id} 
              prompt={res} 
              onCopy={t => navigator.clipboard.writeText(t)}
              onUpdate={(id, c, u) => {
                if(u) setTokens(prev => prev + u.totalTokenCount);
                setResults(prev => prev.map(p => p.id === id ? { ...p, content: c } : p));
              }}
            />
          ))}
          {results.length === 0 && !loading && (
            <div className="col-span-full py-24 text-center">
              <div className="w-16 h-16 bg-deep-red/50 rounded-full mx-auto flex items-center justify-center mb-6">
                <Terminal className="w-8 h-8 text-dark-red" />
              </div>
              <p className="text-dark-red font-black uppercase tracking-[0.4em] text-[10px]">Ready for Injection</p>
            </div>
          )}
        </section>
      </main>

      <footer className="p-12 border-t border-light-red/5 flex justify-center mt-20">
        <p className="text-[10px] font-black text-dark-red uppercase tracking-[0.6em] italic">PROMPTCRAFT PRO &bull; MMXXV</p>
      </footer>
    </div>
  );
};

export default App;
