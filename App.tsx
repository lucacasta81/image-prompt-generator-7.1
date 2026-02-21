
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

  const MAX_IMAGE_SIZE = 1024; // Max width/height for compression
  const JPEG_QUALITY = 0.8; // JPEG compression quality

  const processImage = (base64: string, mime: string): Promise<{base64: string, mime: string}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_IMAGE_SIZE) {
            height *= MAX_IMAGE_SIZE / width;
            width = MAX_IMAGE_SIZE;
          }
        } else {
          if (height > MAX_IMAGE_SIZE) {
            width *= MAX_IMAGE_SIZE / height;
            height = MAX_IMAGE_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
          resolve({ base64: compressedBase64, mime: 'image/jpeg' });
        } else {
          resolve({ base64, mime }); // Fallback if canvas context not available
        }
      };
    });
  };

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
      <div className="min-h-screen flex items-center justify-center bg-greenish-black">
        <div className="glass max-w-sm w-full rounded-[2.5rem] p-10 text-center flex flex-col items-center border border-light-green/10 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-light-green flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(232,255,232,0.1)]">
            <Loader2 className="w-8 h-8 text-deep-green animate-spin" />
          </div>
          <p className="text-light-green text-lg font-black uppercase tracking-wider">Inizializzazione Neural Core...</p>
          <p className="text-dark-green text-[8px] mt-4 uppercase font-black tracking-widest">In attesa di handshake di sistema</p>
        </div>
      </div>
    );
  }

  // Connection Gate (only shown when explicitly required after a failed attempt or initial check)
  if (isKeyConnected === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-greenish-black">
        <div className="glass max-w-md w-full rounded-[2.5rem] p-10 text-center flex flex-col items-center border border-light-green/10 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-light-green flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(232,255,232,0.1)]">
            <Plug className="w-10 h-10 text-deep-green" />
          </div>
          <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter text-light-green">Connessione Richiesta</h2>
          <p className="text-medium-green text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">
            Il motore neurale richiede una chiave API collegata da un progetto Google Cloud a pagamento per procedere con la generazione ad alta precisione.
          </p>
          
          {window.aistudio ? (
            <Button onClick={handleConnectKey} className="w-full py-4 text-[10px] tracking-[0.2em]">
              COLLEGA CHIAVE AI STUDIO
            </Button>
          ) : (
            <div className="p-6 bg-deep-green/50 rounded-2xl border border-light-green/10 w-full text-[10px] uppercase font-bold text-light-green tracking-widest leading-relaxed">
              Iniezione neurale fallita. Assicurati che il tuo ambiente abbia una <code className="text-light-green">API_KEY</code> valida o che tu sia in un'interfaccia supportata.
            </div>
          )}
          
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-6 text-[9px] text-dark-green hover:text-medium-green uppercase font-black tracking-widest transition-colors flex items-center gap-1"
          >
            Documentazione Fatturazione <ExternalLink className="w-3 h-3" />
          </a>

          <button 
            onClick={() => setIsKeyConnected(true)} 
            className="mt-8 text-[8px] text-dark-green hover:text-light-green uppercase tracking-[0.3em] font-black border-b border-transparent hover:border-light-green/20 transition-all"
          >
            Tenta Re-Ingresso al Core
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-greenish-black text-light-green selection:bg-light-green/20">
      {showOnboarding && <OnboardingGuide onComplete={() => {
        localStorage.setItem('promptcraft_visited', 'true');
        setShowOnboarding(false);
      }} />}

      <header className="p-6 md:px-12 flex justify-between items-center border-b border-light-green/5 sticky top-0 bg-greenish-black/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-light-green rounded-lg flex items-center justify-center text-greenish-black">
            <Rocket className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-black tracking-tighter uppercase">PromptCraft <span className="text-dark-green italic">Pro</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:block text-[9px] font-black uppercase tracking-widest text-dark-green">
            {`Utilizzo: ${tokens.toLocaleString()} token`}
          </div>
          <nav className="flex items-center gap-4">
            <div className="flex flex-col xs:flex-row bg-deep-green p-1 rounded-xl border border-light-green/10">
              <button onClick={() => { setMode('gen'); }} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'gen' ? 'bg-light-green text-greenish-black' : 'text-medium-green hover:text-light-green'}`}>Architetto</button>
              <button onClick={() => { setMode('vis'); }} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${mode === 'vis' ? 'bg-light-green text-greenish-black' : 'text-medium-green hover:text-light-green'}`}>Visione</button>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto max-w-5xl px-6 py-12">
        <section className="mb-12">
          <div className="glass p-2 rounded-3xl border-light-green/10 flex flex-col md:flex-row gap-2 shadow-2xl">
            {mode === 'gen' ? (
              <div className="flex-grow flex flex-col sm:flex-row gap-2 p-2">
                <input 
                  className="flex-grow bg-transparent border-none outline-none px-6 text-xl font-bold placeholder:text-dark-green text-light-green"
                  placeholder="Inserisci l'idea seed..."
                  value={seed}
                  onChange={e => setSeed(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAction()}
                />
                <div className="flex gap-2">
                  <Button variant="ghost" className="px-4 flex-grow" onClick={() => handleAction(true)} disabled={loading}><Dices className="w-5 h-5" /></Button>
                  <Button onClick={() => handleAction()} isLoading={loading} disabled={!seed.trim()} className="rounded-2xl px-8 flex-grow">Forgia</Button>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col sm:flex-row gap-4 p-4 items-center">
                <div className="w-16 h-16 bg-deep-green rounded-2xl flex items-center justify-center border border-light-green/5 overflow-hidden shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  {preview ? <img src={preview.base64} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-dark-green" />}
                </div>
                <div className="flex-grow">
                  <p className="text-[9px] font-black uppercase text-dark-green mb-1 tracking-widest">Riferimento Visione</p>
                  <button onClick={() => fileInputRef.current?.click()} className="text-sm font-bold hover:text-medium-green transition-colors uppercase tracking-widest">Scegli o Scatta Immagine</button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const base64 = ev.target?.result as string;
                      const processed = await processImage(base64, file.type);
                      setPreview(processed);
                      setMode('vis');
                    };
                    reader.readAsDataURL(file);
                  }
                }} />
                <Button onClick={() => handleAction()} isLoading={loading} disabled={!preview} className="rounded-2xl px-12 sm:ml-auto">Estrapola</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <select className="glass p-3 rounded-xl text-[9px] font-black uppercase bg-greenish-black outline-none border-light-green/5" value={config.style} onChange={e => setConfig({...config, style: e.target.value as any})}>
              {Object.values(VisualStyle).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="glass p-3 rounded-xl text-[9px] font-black uppercase bg-greenish-black outline-none border-light-green/5" value={config.lighting} onChange={e => setConfig({...config, lighting: e.target.value as any})}>
              {Object.values(LightingMode).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="glass p-3 rounded-xl text-[9px] font-black uppercase bg-greenish-black outline-none border-light-green/5" value={config.perspective} onChange={e => setConfig({...config, perspective: e.target.value as any})}>
              {Object.values(Perspective).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="glass p-3 rounded-xl text-[9px] font-black uppercase bg-greenish-black outline-none border-light-green/5" value={config.generator} onChange={e => setConfig({...config, generator: e.target.value as any})}>
              {Object.values(ImageGenerator).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <button onClick={() => setConfig({...config, isConcise: !config.isConcise})} className={`glass p-3 rounded-xl text-[9px] font-black uppercase border-light-green/5 transition-all ${config.isConcise ? 'bg-light-green text-greenish-black' : 'text-medium-green hover:text-light-green'}`}>
              {config.isConcise ? 'Solo Tag' : 'Dettaglio Completo'}
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
              <div className="w-16 h-16 bg-deep-green/50 rounded-full mx-auto flex items-center justify-center mb-6">
                <Terminal className="w-8 h-8 text-dark-green" />
              </div>
              <p className="text-dark-green font-black uppercase tracking-[0.4em] text-[10px]">Pronto per l'Iniezione</p>
            </div>
          )}
        </section>
      </main>

      <footer className="p-6 md:p-12 border-t border-light-green/5 flex justify-center mt-20">
        <p className="text-[10px] font-black text-dark-green uppercase tracking-[0.6em] italic">PROMPTCRAFT PRO &bull; MMXXV</p>
      </footer>
    </div>
  );
};

export default App;
