import React, { useState } from 'react';
import { CharacterData, CharacterId } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface CharacterMenuProps {
  party: Record<CharacterId, CharacterData>;
  activeCharId: CharacterId;
  onLevelUp: (id: CharacterId) => void;
  onClose: () => void;
}

export const CharacterMenu: React.FC<CharacterMenuProps> = ({
  party,
  activeCharId,
  onLevelUp,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<CharacterId>(activeCharId);
  const char = party[selectedId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md font-sans">
      <div className="relative flex h-[90vh] w-[95vw] max-w-6xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950/95 shadow-2xl">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/70">
          <div className="flex items-center gap-3">
            {(['kael', 'lyra', 'orion'] as CharacterId[]).map((id) => {
              const c = party[id];
              const isSel = id === selectedId;
              return (
                <button
                  key={id}
                  onClick={() => {
                    soundManager.playUIClick();
                    setSelectedId(id);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    isSel
                      ? 'border border-amber-400 bg-amber-500/20 text-amber-300 shadow-md'
                      : 'border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{c.portraitIcon}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => { soundManager.playUIClick(); onClose(); }}
            className="rounded-xl border border-white/10 bg-slate-800/80 px-4 py-1.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
          >
            ✕ Close
          </button>
        </div>

        {/* Content Body */}
        <div className="grid flex-1 grid-cols-1 md:grid-cols-3 gap-6 p-6 overflow-y-auto">
          {/* Column 1: Character Hero Visual & Lore */}
          <div className="flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950 p-6">
            <div className="flex flex-col items-center text-center">
              <div
                className="flex h-28 w-28 items-center justify-center rounded-3xl border-2 text-6xl shadow-2xl"
                style={{ borderColor: char.color, backgroundColor: `${char.color}22` }}
              >
                {char.portraitIcon}
              </div>
              <h2 className="mt-4 font-serif text-2xl font-bold text-white">{char.name}</h2>
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                {char.title}
              </span>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white uppercase" style={{ backgroundColor: char.color }}>
                  {char.element}
                </span>
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                  {char.role}
                </span>
              </div>
            </div>

            <p className="mt-6 text-xs text-slate-300 leading-relaxed text-center italic">
              "{char.lore}"
            </p>

            <button
              onClick={() => {
                soundManager.playReactionSound('LEVEL_UP');
                onLevelUp(selectedId);
              }}
              className="mt-6 w-full rounded-xl border border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-600 py-3 text-xs font-bold text-slate-950 shadow-lg transition-all hover:brightness-110 active:scale-95"
            >
              ⭐ Level Up (Lv. {char.stats.level} → {char.stats.level + 1})
            </button>
          </div>

          {/* Column 2: Detailed Attributes & Stats */}
          <div className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/50 p-6">
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-amber-300 mb-4">
              Base Attributes & Combat Stats
            </h3>

            <div className="space-y-3 flex-1 text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Character Level</span>
                <span className="font-bold text-white">Lv. {char.stats.level} / 80</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Max Health (HP)</span>
                <span className="font-bold text-emerald-400">{char.stats.maxHp}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Attack Power (ATK)</span>
                <span className="font-bold text-red-400">{char.stats.atk}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Defense (DEF)</span>
                <span className="font-bold text-blue-400">{char.stats.def}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Elemental Power</span>
                <span className="font-bold text-amber-300">+{char.stats.elementalPower}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Critical Hit Rate</span>
                <span className="font-bold text-yellow-400">{(char.stats.critRate * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Critical Damage</span>
                <span className="font-bold text-yellow-400">{(char.stats.critDmg * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Energy Recharge</span>
                <span className="font-bold text-cyan-400">{(char.stats.energyRecharge * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* EXP Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Experience (EXP)</span>
                <span>{char.stats.exp} / {char.stats.expToNextLevel}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (char.stats.exp / char.stats.expToNextLevel) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Column 3: Equipped Weapon & Talents */}
          <div className="flex flex-col gap-4">
            {/* Weapon Card */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-amber-300 mb-3">
                Equipped Weapon
              </h3>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-amber-500/30 text-2xl">
                  ⚔️
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{char.equippedWeapon.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-amber-400 font-medium mt-0.5">
                    <span>Base ATK: {char.equippedWeapon.baseAtk}</span>
                    <span>•</span>
                    <span>{char.equippedWeapon.subStat}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-slate-950/60 p-2.5 text-[11px] text-slate-300">
                <span className="font-bold text-amber-300">{char.equippedWeapon.passiveName}: </span>
                {char.equippedWeapon.passiveDesc}
              </div>
            </div>

            {/* Elemental Skill & Burst Details */}
            <div className="flex-1 rounded-2xl border border-white/10 bg-slate-900/50 p-5 space-y-3">
              <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-amber-300">
                Combat Talents
              </h3>

              <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Skill: {char.skillName} (E)</span>
                  <span className="text-amber-400">{char.skillCooldown}s CD</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                  {char.skillDesc}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Burst: {char.burstName} (Q)</span>
                  <span className="text-purple-400">{char.stats.maxEnergy} Energy</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                  {char.burstDesc}
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
                <div className="text-xs font-bold text-white">
                  Passive: {char.passiveName}
                </div>
                <p className="mt-1 text-[11px] text-slate-300 leading-relaxed">
                  {char.passiveDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
