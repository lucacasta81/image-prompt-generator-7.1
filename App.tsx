
import React, { useState, useRef, useEffect } from 'react';
import { VisualStyle, LightingMode, Perspective, GeneratedPrompt, TokenUsage, ImageGenerator, PromptConfig } from './types';
import { expandPrompt, generatePreviewImage, extractPromptFromImage } from './services/geminiService';
import { Button } from './components/Button';
import { PromptCard } from './components/PromptCard';
import { OnboardingGuide } from './components/OnboardingGuide';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const STORAGE_KEY = 'promptcraft_v4_data';

const App: React.FC = () => {
  // Verifica se la chiave è presente (su Vercel o locale)
  const hasEnvKey = !!process.env.API_KEY && process.env.API_KEY !== "" && process.env.API_KEY !== "undefined";
  
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Caricamento dati salvati
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { results: r, tokens: t } = JSON.parse(saved);
        setResults(r || []);
        setTokens(t || 0);
      } catch (e) { localStorage.removeItem(STORAGE_KEY); }
    }

    const firstVisit = !localStorage.getItem('promptcraft_visited');
    if (firstVisit) setShowOnboarding(true);
    
    // Se siamo in AI Studio, proviamo l'autorizzazione nativa, altrimenti procediamo
    if (window.aistudio && !hasEnvKey) {
      window.aistudio.hasSelectedApiKey().then(auth => setIsAuthorized(auth)).catch(() => setIsAuthorized(false));
    }
  }, [hasEnvKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: results.slice(0, 15), tokens }));
  }, [results, tokens]);

  const handleAuthorize = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setIsAuthorized(true);
      } catch (e) { console.error(e); }
    }
  };

  const addTokens = (u?: TokenUsage) => u && setTokens(prev => prev + u.totalTokenCount);

  const handleAction = async (isDice = false) => {
    if (!hasEnvKey && !window.aistudio) {
      alert("ERRORE: API_KEY mancante. Configura le Environment Variables su Vercel.");
      return;
    }

    setLoading(true);
    try {
      if (mode === 'gen') {
        const res = await expandPrompt(isDice ? "SURPRISE_ME: Artistic" : seed, config);
        addTokens(res.usage);
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
        addTokens(res.usage);
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
      console.error("Action error:", e);
      alert("Errore API: Verifica che la tua chiave Gemini sia corretta e attiva.");
    }
    setLoading(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreview({ base64: ev.target?.result as string, mime: file.type });
        setMode('vis');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePreview = async (id: string, content: string) => {
    setResults(prev => prev.map(p => p.id === id ? { ...p, isGeneratingPreview: true } : p));
    try {
      const res = await generatePreviewImage(content);
      addTokens(res.usage);
      setResults(prev => prev.map(p => p.id === id ? { ...p, previewUrl: res.url, isGeneratingPreview: false } : p));
    } catch {
      setResults(prev => prev.map(p => p.id === id ? { ...p, isGeneratingPreview: false } : p));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white selection:bg-white/20">
      {showOnboarding && <OnboardingGuide onComplete={() => {
        localStorage.setItem('promptcraft_visited', 'true');
        setShowOnboarding(false);
      }} />}
      
      {!hasEnvKey && !window.aistudio && (
        <div className="bg-white text-black p-3 text-center text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
          Attenzione: Configura la API_KEY su Vercel per attivare il sistema
        </div>
      )}

      <header className="p-6 md:px-12 flex justify-between items-center border-b border-white/5 sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black">
            <i className="fas fa-rocket text-sm"></i>
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">PromptCraft <span className="text-zinc-600">Flash</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Session Load: {tokens.toLocaleString()} tokens
          </div>
          <nav className="flex bg-zinc-900 p-1 rounded-xl border border-white/10">
            <button onClick={() => setMode('gen')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'gen' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Architect</button>
            <button onClick={() => setMode('vis')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mode === 'vis' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Vision</button>
          </nav>
          {window.aistudio && (
            <button onClick={handleAuthorize} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isAuthorized ? 'text-zinc-600' : 'text-red-500'}`}>
              <i className="fas fa-key text-xs"></i>
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow container mx-auto max-w-5xl px-6 py-12">
        <section className="mb-12">
          <div className="glass p-2 rounded-3xl border-white/10 flex flex-col md:flex-row gap-2 shadow-2xl">
            {mode === 'gen' ? (
              <div className="flex-grow flex gap-2 p-2">
                <input 
                  className="flex-grow bg-transparent border-none outline-none px-6 text-xl font-bold placeholder:text-zinc-800"
                  placeholder="Inject seed idea..."
                  value={seed}
                  onChange={e => setSeed(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAction()}
                />
                <Button variant="ghost" className="px-4" onClick={() => handleAction(true)} disabled={loading}><i className="fas fa-dice"></i></Button>
                <Button onClick={() => handleAction()} isLoading={loading} disabled={!seed.trim()} className="rounded-2xl px-8">Forge</Button>
              </div>
            ) : (
              <div className="flex-grow flex gap-4 p-4 items-center">
                <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 overflow-hidden shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {preview ? <img src={preview.base64} className="w-full h-full object-cover" /> : <i className="fas fa-image text-zinc-700"></i>}
                </div>
                <div className="flex-grow">
                  <p className="text-[10px] font-black uppercase text-zinc-600 mb-1">Source Visual</p>
                  <button onClick={() => fileInputRef.current?.click()} className="text-sm font-bold hover:text-zinc-400 transition-colors uppercase tracking-widest">Select Reference</button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFile} />
                <Button onClick={() => handleAction()} isLoading={loading} disabled={!preview} className="rounded-2xl px-12">Deconstruct</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <select className="glass p-3 rounded-xl text-[10px] font-black uppercase bg-black outline-none border-white/5 cursor-pointer" value={config.style} onChange={e => setConfig({...config, style: e.target.value as any})}>
              {Object.values(VisualStyle).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="glass p-3 rounded-xl text-[10px] font-black uppercase bg-black outline-none border-white/5 cursor-pointer" value={config.lighting} onChange={e => setConfig({...config, lighting: e.target.value as any})}>
              {Object.values(LightingMode).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="glass p-3 rounded-xl text-[10px] font-black uppercase bg-black outline-none border-white/5 cursor-pointer" value={config.perspective} onChange={e => setConfig({...config, perspective: e.target.value as any})}>
              {Object.values(Perspective).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="glass p-3 rounded-xl text-[10px] font-black uppercase bg-black outline-none border-white/5 cursor-pointer" value={config.generator} onChange={e => setConfig({...config, generator: e.target.value as any})}>
              {Object.values(ImageGenerator).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <button onClick={() => setConfig({...config, isConcise: !config.isConcise})} className={`glass p-3 rounded-xl text-[10px] font-black uppercase border-white/5 transition-all ${config.isConcise ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>
              {config.isConcise ? 'Technical' : 'Descriptive'}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {results.map(res => (
            <PromptCard 
              key={res.id} 
              prompt={res} 
              onGeneratePreview={handlePreview}
              onCopy={t => navigator.clipboard.writeText(t)}
              onUpdate={(id, c, u) => {
                addTokens(u);
                setResults(prev => prev.map(p => p.id === id ? { ...p, content: c } : p));
              }}
            />
          ))}
          {results.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center">
              <i className="fas fa-terminal text-zinc-800 text-5xl mb-6"></i>
              <p className="text-zinc-600 font-black uppercase tracking-[0.5em] text-[10px]">Awaiting system input...</p>
            </div>
          )}
        </section>
      </main>

      <footer className="p-12 border-t border-white/5 flex justify-center mt-20">
        <p className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.6em]">PROMPTCRAFT FLASH &bull; MMXXV</p>
      </footer>
    </div>
  );
};

export default App;
