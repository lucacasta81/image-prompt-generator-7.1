import React, { useState } from 'react';
import { Button } from './Button';
import { Terminal, Fingerprint, SlidersHorizontal } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: "Architetto Neurale",
    description: "Inizializza concetti in prompt ad altissima precisione. Usa la modalità Entropia per ispirazioni strutturali casuali.",
    icon: Terminal,
    color: "text-light-green"
  },
  {
    title: "Decostruzione Visiva",
    description: "Decostruisci media visivi esistenti in progetti basati su testo usando la nostra scansione visiva nativa.",
    icon: Fingerprint,
    color: "text-medium-green"
  },
  {
    title: "Motore di Targeting",
    description: "Calibra l'output per modelli di sintesi specifici come Midjourney, DALL-E o FLUX per una sintassi ottimizzata.",
    icon: SlidersHorizontal,
    color: "text-dark-green"
  }
];

interface OnboardingGuideProps {
  onComplete: () => void;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-greenish-black/95 backdrop-blur-3xl animate-fade-in">
      <div className="glass max-w-sm w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-light-green/5 flex flex-col items-center text-center p-10 relative">
        
        <div className="flex gap-2 mb-10">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`h-0.5 transition-all duration-500 ${i === currentStep ? 'w-10 bg-light-green' : 'w-2 bg-dark-green'}`}
            />
          ))}
        </div>

        <div className="w-24 h-24 rounded-3xl bg-deep-green/50 border border-light-green/5 flex items-center justify-center mb-8 shadow-inner">
          <Icon className="w-10 h-10 text-light-green" />
        </div>

        <h2 className="text-3xl font-black mb-4 tracking-tighter text-light-green uppercase italic">
          {step.title}
        </h2>
        
        <p className="text-medium-green text-xs font-bold leading-relaxed mb-12 min-h-[4rem] uppercase tracking-wide">
          {step.description}
        </p>

        <div className="w-full flex flex-col gap-4">
          <Button 
            onClick={next} 
            className="w-full py-5 text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(232,255,232,0.1)]"
          >
            {currentStep === STEPS.length - 1 ? "INIZIALIZZA" : "MODULO SUCCESSIVO"}
          </Button>
          
          <button 
            onClick={onComplete}
            className="text-[9px] text-dark-green hover:text-light-green font-black uppercase tracking-[0.4em] py-2 transition-all"
          >
            SALTA
          </button>
        </div>
      </div>
    </div>
  );
};