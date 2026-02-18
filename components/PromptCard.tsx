import React, { useState } from 'react';
import { GeneratedPrompt, TokenUsage } from '../types';
import { Button } from './Button';
import { modifyPrompt } from '../services/geminiService';

interface PromptCardProps {
  prompt: GeneratedPrompt;
  onCopy: (content: string) => void;
  onUpdate: (id: string, newContent: string, usage?: TokenUsage) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({ prompt, onCopy, onUpdate }) => {
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
    <div className="glass rounded-3xl overflow-hidden border-light-blue/5 flex flex-col group transition-all hover:border-light-blue/20">
      {prompt.sourceImageUrl && (
        <div className="aspect-[21/9] bg-bluish-black relative overflow-hidden">
          <img src={prompt.sourceImageUrl} className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-700" alt="Source Reference" />
          <div className="absolute inset-0 bg-gradient-to-t from-deep-blue to-transparent"></div>
        </div>
      )}

      <div className="p-6 flex flex-col flex-grow bg-deep-blue/10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="px-2 py-0.5 bg-light-blue/5 text-[8px] font-black uppercase rounded border border-light-blue/10 text-medium-blue mb-2 inline-block tracking-widest">{prompt.config.style}</span>
            <h3 className="text-[10px] font-black uppercase text-light-blue tracking-[0.2em]">{prompt.title}</h3>
          </div>
          <button onClick={() => setIsEditing(!isEditing)} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isEditing ? 'bg-light-blue text-bluish-black' : 'bg-dark-blue text-medium-blue hover:text-light-blue border border-light-blue/5'}`}>
            <i className={`fas ${isEditing ? 'fa-times' : 'fa-wand-magic'} text-[10px]`}></i>
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-3 mb-6">
            <textarea 
              className="w-full bg-bluish-black border border-light-blue/5 rounded-2xl p-4 text-[11px] outline-none h-32 resize-none focus:border-light-blue/20 text-light-blue font-medium placeholder:text-dark-blue"
              placeholder="Refine this prompt (e.g., 'make it more dramatic', 'add more neon'...)"
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
            />
            <Button className="w-full py-3 text-[9px] uppercase tracking-widest" isLoading={modifying} onClick={handleModify}>Rewrite Neural Core</Button>
          </div>
        ) : (
          <div className="relative mb-8">
            <p className="text-[13px] leading-relaxed text-light-blue font-medium tracking-tight">
              {prompt.content}
            </p>
          </div>
        )}

        <div className="mt-auto pt-6 border-t border-light-blue/5">
          <Button variant={copied ? 'secondary' : 'primary'} className="w-full py-3 text-[9px] uppercase tracking-widest" onClick={handleCopy}>
            {copied ? (
              <><i className="fas fa-check mr-2"></i> Copied to Buffer</>
            ) : (
              <><i className="fas fa-copy mr-2 opacity-50"></i> Capture Prompt</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};