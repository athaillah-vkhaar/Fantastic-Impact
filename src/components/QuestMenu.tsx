import React, { useState } from 'react';
import { Quest } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface QuestMenuProps {
  quests: Quest[];
  onClose: () => void;
}

export const QuestMenu: React.FC<QuestMenuProps> = ({ quests, onClose }) => {
  const [filter, setFilter] = useState<'ALL' | 'MAIN' | 'WORLD' | 'SIDE'>('ALL');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(quests[0] || null);

  const filteredQuests = quests.filter((q) => {
    if (filter === 'ALL') return true;
    return q.category === filter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md font-sans">
      <div className="relative flex h-[90vh] w-[95vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950/95 shadow-2xl">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/70">
          <div className="flex items-center gap-2">
            {(['ALL', 'MAIN', 'WORLD', 'SIDE'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  soundManager.playUIClick();
                  setFilter(cat);
                }}
                className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                  filter === cat
                    ? 'border border-amber-400 bg-amber-500/20 text-amber-300'
                    : 'border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                {cat} QUESTS
              </button>
            ))}
          </div>

          <button
            onClick={() => { soundManager.playUIClick(); onClose(); }}
            className="rounded-xl border border-white/10 bg-slate-800/80 px-4 py-1.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
          >
            ✕ Close
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* List of Quests */}
          <div className="w-1/2 border-r border-white/10 p-5 overflow-y-auto space-y-2.5">
            {filteredQuests.map((quest) => {
              const isSelected = selectedQuest?.id === quest.id;
              return (
                <button
                  key={quest.id}
                  onClick={() => {
                    soundManager.playUIClick();
                    setSelectedQuest(quest);
                  }}
                  className={`w-full flex items-start justify-between rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 shadow-md'
                      : 'border-white/10 bg-slate-900/60 hover:border-white/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        [{quest.category}]
                      </span>
                      <h4 className="text-xs font-bold text-white">{quest.title}</h4>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">{quest.objective}</p>
                  </div>

                  {quest.isCompleted ? (
                    <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Completed ✓
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-300">
                      {quest.currentCount}/{quest.targetCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quest Details Panel */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            {selectedQuest ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-300 uppercase">
                    {selectedQuest.category}
                  </span>
                  <h3 className="font-serif text-lg font-bold text-white">{selectedQuest.title}</h3>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-4 text-xs text-slate-300">
                  <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px] mb-1">
                    Quest Description
                  </h4>
                  <p className="leading-relaxed">{selectedQuest.description}</p>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-4 text-xs">
                  <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-2">
                    Current Objective
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{selectedQuest.objective}</span>
                    <span className="font-bold text-amber-400">
                      {selectedQuest.currentCount} / {selectedQuest.targetCount}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (selectedQuest.currentCount / selectedQuest.targetCount) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Rewards */}
                <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/40 p-4">
                  <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] mb-2">
                    Completion Rewards
                  </h4>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-200">
                    <span className="flex items-center gap-1">⭐ {selectedQuest.rewards.exp} Adventure EXP</span>
                    <span className="flex items-center gap-1">🪙 {selectedQuest.rewards.gold} Aeravian Mora</span>
                    {selectedQuest.rewards.items?.map((it) => (
                      <span key={it.name} className="flex items-center gap-1">
                        🎁 {it.name} x{it.count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
