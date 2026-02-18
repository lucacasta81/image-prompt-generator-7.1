
import React, { useState } from 'react';
import { GeneratedPrompt, TokenUsage } from '../types';
import { Button } from './Button';
import { modifyPrompt } from '../services/geminiService';

interface PromptCardProps {
  prompt: GeneratedPrompt;
  onGeneratePreview: (id: string, content: string) => void;
  onCopy: (content: string) => void;
  onUpdate: (id: string, newContent: string, usage?: TokenUsage) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onGeneratePreview, onCopy, onUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [modifying, setModifying] = useState(false);

  const handleCopy = () => {
    onCopy(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleModify = async () => {
    if (!instruction.trim()) return;
    setModifying(true);
    try {
      const { text, usage } = await modifyPrompt(prompt.content, instruction);
      onUpdate(prompt.id, text, usage);
      setIsEditing(false);
      setInstruction('');
    } catch (e) { console.error("Modification failed:", e); }
    setModifying(false);
  };

  return (
    <div className="glass rounded-3xl overflow-hidden border-white/5 flex flex-col group transition-all hover:border-white/20">
      <div className="aspect-square bg-zinc-950 relative overflow-hidden flex items-center justify-center">
        {prompt.previewUrl ? (
          <img src={prompt.previewUrl} className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-700" alt="AI Preview" />
        ) : (
          <div className="p-8 text-center flex flex-col items-center gap-4">
            {prompt.isGeneratingPreview ? (
              <div className="flex flex-col items-center gap-2">
                <i className="fas fa-circle-notch fa-spin text-zinc-700 text-xl"></i>
                <span className="text-[8px] font-black uppercase text-zinc-700 tracking-widest">Generating...</span>
              </div>
            ) : (
              <Button variant="outline" className="text-[9px] uppercase tracking-widest px-6" onClick={() => onGeneratePreview(prompt.id, prompt.content)}>Preview Neural</Button>
            )}
          </div>
        )}
        <div className="absolute top-4 left-4">
          <span className="px-2 py-0.5 bg-black/80 text-[8px] font-black uppercase rounded border border-white/10 text-zinc-400">{prompt.config.style}</span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow bg-zinc-900/10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{prompt.title}</h3>
          <button onClick={() => setIsEditing(!isEditing)} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isEditing ? 'bg-white text-black' : 'text-zinc-600 hover:text-white'}`}>
            <i className={`fas ${isEditing ? 'fa-times' : 'fa-wand-magic'} text-[9px]`}></i>
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea 
              className="w-full bg-black border border-white/5 rounded-xl p-3 text-[10px] outline-none h-20 resize-none focus:border-white/20 text-white font-medium"
              placeholder="Refine this prompt..."
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
            />
            <Button className="w-full py-2 text-[9px] uppercase tracking-widest" isLoading={modifying} onClick={handleModify}>Rewrite</Button>
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-zinc-300 font-medium mb-6 line-clamp-6 group-hover:line-clamp-none transition-all duration-500 cursor-default">
            {prompt.content}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-white/5">
          <Button variant={copied ? 'secondary' : 'primary'} className="w-full py-2.5 text-[9px] uppercase tracking-widest" onClick={handleCopy}>
            {copied ? 'Copied to Buffer' : 'Capture String'}
          </Button>
        </div>
      </div>
    </div>
  );
};
