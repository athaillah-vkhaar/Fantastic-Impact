import React, { useState } from 'react';
import { CharacterId } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface CodexOracleModalProps {
  activeCharId: CharacterId;
  onClose: () => void;
}

export const CodexOracleModal: React.FC<CodexOracleModalProps> = ({
  activeCharId,
  onClose,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('Tactics');

  const presetQuestions = [
    'How should I break The Ancient Colossus shield with Kael, Lyra, and Orion?',
    'What elemental synergy is most effective between Ember, Aqua, and Volt?',
    'What is the ancient lore of the continent of Aeravia and the Forgotten Temple?',
    'How do I unlock and trigger Steam Burst and Overload reactions reliably?',
  ];

  const handleAsk = async (queryText?: string) => {
    const q = queryText || prompt;
    if (!q.trim() || isLoading) return;

    setIsLoading(true);
    soundManager.playReactionSound('ORACLE');

    try {
      const res = await fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: q,
          characterContext: `Active hero: ${activeCharId.toUpperCase()}`,
          category,
        }),
      });

      const data = await res.json();
      if (data.answer) {
        setResponse(data.answer);
      } else {
        setResponse('The leylines echo quietly... (Ensure GEMINI_API_KEY is configured in Settings > Secrets).');
      }
    } catch (err) {
      setResponse('The ethereal leylines are flickering. Please commune again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md font-sans">
      <div className="relative flex h-[85vh] w-[95vw] max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-gradient-to-r from-slate-950 via-purple-950/40 to-slate-950">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">✨</span>
            <div>
              <h2 className="font-serif text-lg font-bold text-amber-300">
                AERAVIA ANCIENT CODEX & TACTICAL ORACLE
              </h2>
              <p className="text-xs text-purple-300">
                Communing with the Celestial Leylines via Gemini Intelligence
              </p>
            </div>
          </div>

          <button
            onClick={() => { soundManager.playUIClick(); onClose(); }}
            className="rounded-xl border border-white/10 bg-slate-800/80 px-4 py-1.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
          >
            ✕ Close
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-6 overflow-y-auto space-y-5">
          {/* Preset Buttons */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 block">
              Inquire of the Leylines:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presetQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(q);
                    handleAsk(q);
                  }}
                  className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-left text-xs text-slate-300 transition-all hover:border-amber-400/50 hover:bg-slate-900 hover:text-white"
                >
                  💬 {q}
                </button>
              ))}
            </div>
          </div>

          {/* Response Box */}
          <div className="flex-1 rounded-2xl border border-purple-500/30 bg-slate-900/40 p-5 backdrop-blur-sm flex flex-col justify-between">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="text-4xl animate-spin mb-3">🔮</span>
                <p className="font-serif text-sm text-purple-300 animate-pulse">
                  The ancient ethereal leylines are resonating...
                </p>
              </div>
            ) : response ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <span>📜 Voice of the Aeravian Oracle:</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-serif whitespace-pre-line">
                  {response}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <span className="text-4xl mb-2">✨</span>
                <p className="text-sm font-semibold text-slate-300">The Leylines Await Your Inquiry</p>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  Ask the Oracle for battle wisdom, elemental reaction synergies, or ancient Aeravian lore.
                </p>
              </div>
            )}
          </div>

          {/* Input & Ask Form */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ask the Oracle anything about combat, lore, bosses, or characters..."
              className="flex-1 rounded-xl border border-white/20 bg-slate-900/80 px-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
            />
            <button
              onClick={() => handleAsk()}
              disabled={isLoading || !prompt.trim()}
              className="rounded-xl border border-amber-400 bg-gradient-to-r from-amber-500 to-purple-600 px-6 py-3 text-xs font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              Commune ✦
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
