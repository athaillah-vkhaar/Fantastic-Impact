import React, { useRef, useState, useEffect } from 'react';
import { CharacterData, CharacterId, DamageNumber, EnemyStats, Quest, WeatherType } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface HUDProps {
  party: Record<CharacterId, CharacterData>;
  activeCharId: CharacterId;
  onSwitchCharacter: (id: CharacterId) => void;
  stamina: number;
  maxStamina: number;
  activeBoss: EnemyStats | null;
  interactionPrompt: string | null;
  onInteract: () => void;
  onJoystickMove: (x: number, y: number, isSprint: boolean) => void;
  onRotateCamera: (dx: number, dy: number) => void;
  onAttackStart: () => void;
  onAttackEnd: () => void;
  onTriggerSkill: () => void;
  onTriggerBurst: () => void;
  onTriggerDodge: () => void;
  onTriggerJump: () => void;
  onTriggerSprintToggle: (sprint: boolean) => void;
  activeQuests: Quest[];
  timeOfDay: number;
  weather: WeatherType;
  isInDungeon: boolean;
  damageNumbers: DamageNumber[];
  onOpenMap: () => void;
  onOpenCharacters: () => void;
  onOpenInventory: () => void;
  onOpenQuests: () => void;
  onOpenCodex: () => void;
  onOpenSettings: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  party,
  activeCharId,
  onSwitchCharacter,
  stamina,
  maxStamina,
  activeBoss,
  interactionPrompt,
  onInteract,
  onJoystickMove,
  onRotateCamera,
  onAttackStart,
  onAttackEnd,
  onTriggerSkill,
  onTriggerBurst,
  onTriggerDodge,
  onTriggerJump,
  onTriggerSprintToggle,
  activeQuests,
  timeOfDay,
  weather,
  isInDungeon,
  damageNumbers,
  onOpenMap,
  onOpenCharacters,
  onOpenInventory,
  onOpenQuests,
  onOpenCodex,
  onOpenSettings,
}) => {
  const activeChar = party[activeCharId];
  const hpPercent = Math.max(0, Math.min(100, (activeChar.stats.currentHp / activeChar.stats.maxHp) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
  const burstPercent = Math.max(0, Math.min(100, (activeChar.stats.currentEnergy / activeChar.stats.maxEnergy) * 100));
  const isBurstReady = activeChar.stats.currentEnergy >= activeChar.stats.maxEnergy;

  // Format time of day
  const hour = Math.floor(timeOfDay);
  const minute = Math.floor((timeOfDay % 1) * 60);
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  const currentMainQuest = activeQuests.find((q) => !q.isCompleted && q.category === 'MAIN') || activeQuests[0];

  // --- MOBILE VIRTUAL JOYSTICK STATE ---
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const joystickTouchIdRef = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoySprint, setIsJoySprint] = useState<boolean>(false);
  const [isManualSprint, setIsManualSprint] = useState<boolean>(false);

  // --- MOBILE CAMERA TOUCH SWIPE STATE ---
  const cameraTouchIdRef = useRef<number | null>(null);
  const lastCameraPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Orientation Check
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // --- JOYSTICK TOUCH HANDLERS ---
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;

    updateJoystickPosition(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        updateJoystickPosition(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setKnobPos({ x: 0, y: 0 });
        setIsJoySprint(false);
        onJoystickMove(0, 0, isManualSprint);
        break;
      }
    }
  };

  const updateJoystickPosition = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const maxRadius = 52; // max stick travel radius
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    let finalX = dx;
    let finalY = dy;

    if (dist > maxRadius) {
      finalX = (dx / dist) * maxRadius;
      finalY = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: finalX, y: finalY });

    // Normalized vector (-1 to 1)
    const normX = finalX / maxRadius;
    const normY = -(finalY / maxRadius); // Inverted Y: up on screen is forward

    const sprintThreshold = 0.88;
    const sprintActive = dist / maxRadius >= sprintThreshold || isManualSprint;
    setIsJoySprint(sprintActive);

    onJoystickMove(normX, normY, sprintActive);
  };

  // --- CAMERA TOUCH SWIPE HANDLERS ---
  const handleCameraTouchStart = (e: React.TouchEvent) => {
    if (cameraTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    cameraTouchIdRef.current = touch.identifier;
    lastCameraPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleCameraTouchMove = (e: React.TouchEvent) => {
    if (cameraTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === cameraTouchIdRef.current) {
        const deltaX = touch.clientX - lastCameraPosRef.current.x;
        const deltaY = touch.clientY - lastCameraPosRef.current.y;

        onRotateCamera(deltaX, deltaY);

        lastCameraPosRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  const handleCameraTouchEnd = (e: React.TouchEvent) => {
    if (cameraTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === cameraTouchIdRef.current) {
        cameraTouchIdRef.current = null;
        break;
      }
    }
  };

  return (
    <div className="absolute inset-0 select-none overflow-hidden font-sans pointer-events-none touch-none">
      {/* --- CAMERA ROTATION SWIPE REGION (Right half background) --- */}
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 w-3/5 z-0"
        onTouchStart={handleCameraTouchStart}
        onTouchMove={handleCameraTouchMove}
        onTouchEnd={handleCameraTouchEnd}
        onTouchCancel={handleCameraTouchEnd}
      />

      {/* --- PORTRAIT ORIENTATION NOTICE --- */}
      {isPortrait && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center backdrop-blur-md">
          <span className="text-5xl animate-bounce mb-4">🔄</span>
          <h2 className="font-serif text-xl font-bold text-amber-300">Rotate Device to Landscape</h2>
          <p className="mt-2 text-xs text-slate-300 max-w-xs leading-relaxed">
            Fantastic Impact is crafted for mobile landscape orientation for an expansive field of view and comfortable controls.
          </p>
        </div>
      )}

      {/* --- TOP BAR --- */}
      <div className="absolute top-3 left-4 right-4 flex items-start justify-between z-10">
        {/* Left: Mini-Radar & Region Info */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { soundManager.playUIClick(); onOpenMap(); }}
            className="pointer-events-auto relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-amber-400/80 bg-slate-900/85 shadow-lg backdrop-blur-md transition-transform active:scale-95"
            aria-label="World Map"
          >
            <div className="absolute inset-1 rounded-full border border-dashed border-sky-400/40"></div>
            <span className="text-lg">🧭</span>
            <span className="absolute -top-1 text-[9px] font-black text-amber-300">N</span>
          </button>

          <div className="rounded-xl border border-white/10 bg-slate-950/75 px-3 py-1.5 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-wider text-amber-400">
                {isInDungeon ? 'THE FORGOTTEN TEMPLE' : 'VERDANTIA'}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
              <span>🕒 {timeStr}</span>
              <span>•</span>
              <span>{weather === 'SUNNY' ? '☀️ Clear' : '🌧️ Mist'}</span>
            </div>
          </div>
        </div>

        {/* Center: Boss Bar (if active) */}
        {activeBoss && (
          <div className="pointer-events-auto flex flex-col items-center">
            <div className="flex items-center gap-2 rounded-t-lg bg-slate-950/85 px-3 py-0.5 text-[11px] font-bold tracking-wider text-amber-300 border-t border-x border-amber-500/30">
              <span>⚠️ {activeBoss.name.toUpperCase()}</span>
              {activeBoss.phase && (
                <span className="rounded bg-red-600/90 px-1 text-[9px] text-white">
                  PHASE {activeBoss.phase}
                </span>
              )}
            </div>
            <div className="relative h-3.5 w-64 sm:w-80 rounded-b-lg border border-amber-500/50 bg-slate-900/90 p-0.5 shadow-2xl">
              <div
                className="h-full rounded transition-all duration-300 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400"
                style={{ width: `${Math.max(0, (activeBoss.currentHp / activeBoss.maxHp) * 100)}%` }}
              ></div>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">
                {activeBoss.currentHp} / {activeBoss.maxHp}
              </span>
            </div>
          </div>
        )}

        {/* Right: Quick Action Navigation Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onClick={() => { soundManager.playUIClick(); onOpenCodex(); }}
            className="flex h-11 items-center gap-1 rounded-xl border border-amber-400/70 bg-gradient-to-r from-amber-600/70 to-purple-700/70 px-3 text-xs font-bold text-white shadow-lg backdrop-blur-md active:scale-95"
            aria-label="Ancient Codex"
          >
            <span>✨</span>
            <span className="hidden sm:inline">Codex</span>
          </button>

          <button
            onClick={() => { soundManager.playUIClick(); onOpenQuests(); }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900/85 text-base text-slate-200 shadow-lg backdrop-blur-md active:scale-95"
            aria-label="Quest Journal"
          >
            📜
          </button>

          <button
            onClick={() => { soundManager.playUIClick(); onOpenCharacters(); }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900/85 text-base text-slate-200 shadow-lg backdrop-blur-md active:scale-95"
            aria-label="Characters & Party"
          >
            👤
          </button>

          <button
            onClick={() => { soundManager.playUIClick(); onOpenInventory(); }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900/85 text-base text-slate-200 shadow-lg backdrop-blur-md active:scale-95"
            aria-label="Inventory"
          >
            🎒
          </button>

          <button
            onClick={() => { soundManager.playUIClick(); onOpenSettings(); }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-900/85 text-base text-slate-200 shadow-lg backdrop-blur-md active:scale-95"
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* --- TOP-LEFT COMPACT QUEST TRACKER --- */}
      {currentMainQuest && (
        <div className="absolute top-20 left-4 max-w-[200px] sm:max-w-xs rounded-xl border border-white/10 bg-slate-950/60 p-2.5 shadow-lg backdrop-blur-md z-10">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <span>🔹</span>
            <span className="truncate">{currentMainQuest.title}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-200 line-clamp-2">
            {currentMainQuest.objective}
          </div>
        </div>
      )}

      {/* --- RIGHT SIDE: TOUCH CHARACTER SWITCHING BUTTONS --- */}
      <div className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
        {(['kael', 'lyra', 'orion'] as CharacterId[]).map((id) => {
          const char = party[id];
          const isActive = id === activeCharId;
          const charHpPct = (char.stats.currentHp / char.stats.maxHp) * 100;
          const isBurstFull = char.stats.currentEnergy >= char.stats.maxEnergy;

          return (
            <button
              key={id}
              onClick={(e) => {
                e.stopPropagation();
                soundManager.playUIClick();
                onSwitchCharacter(id);
              }}
              className={`group relative flex items-center gap-2 rounded-2xl border p-1.5 transition-all active:scale-95 ${
                isActive
                  ? 'border-amber-400 bg-slate-900/90 shadow-xl shadow-amber-500/20 translate-x-[-4px] w-28 sm:w-32'
                  : 'border-white/15 bg-slate-950/75 w-24 sm:w-28 opacity-85'
              }`}
            >
              {/* Element Avatar Icon */}
              <div
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg shadow-inner"
                style={{ backgroundColor: `${char.color}33`, borderColor: char.color }}
              >
                <span>{char.portraitIcon}</span>
                {isBurstFull && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 animate-ping rounded-full bg-amber-400"></span>
                )}
              </div>

              {/* Character Name & HP Bar */}
              <div className="flex flex-1 flex-col text-left overflow-hidden">
                <span className={`text-[11px] font-bold truncate ${isActive ? 'text-amber-300' : 'text-white'}`}>
                  {char.name}
                </span>
                <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${charHpPct}%`,
                      backgroundColor: char.color,
                    }}
                  ></div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* --- CONTEXTUAL TOUCH INTERACTION BUTTON --- */}
      {interactionPrompt && (
        <div className="pointer-events-auto absolute bottom-44 right-24 sm:right-32 z-20 animate-fade-in">
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundManager.playUIClick();
              onInteract();
            }}
            className="flex items-center gap-2 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 px-4 py-2.5 font-bold text-slate-950 shadow-2xl backdrop-blur-md active:scale-95 animate-pulse"
          >
            <span className="text-lg">✦</span>
            <span className="text-xs font-black tracking-wide">{interactionPrompt}</span>
          </button>
        </div>
      )}

      {/* --- FLOATING DAMAGE NUMBERS & REACTIONS --- */}
      {damageNumbers.map((num) => {
        let col = '#ffffff';
        if (num.element === 'EMBER') col = '#ff4500';
        else if (num.element === 'AQUA') col = '#00d2ff';
        else if (num.element === 'VOLT') col = '#c084fc';

        return (
          <div
            key={num.id}
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 animate-bounce flex flex-col items-center z-10"
            style={{ left: num.x, top: num.y }}
          >
            {num.reaction && (
              <span className="text-[11px] font-black tracking-wider text-amber-300 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                ★ {num.reaction} ★
              </span>
            )}
            <span
              className={`font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
                num.isCrit ? 'text-xl text-amber-300 scale-125' : 'text-base'
              }`}
              style={{ color: col }}
            >
              {num.damage}
            </span>
          </div>
        );
      })}

      {/* --- BOTTOM-CENTER: ACTIVE HEALTH & STAMINA --- */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-slate-950/80 px-1.5 py-0.5 border border-white/10 text-[10px] font-bold text-amber-400">
            Lv. {activeChar.stats.level}
          </div>
          <div className="relative h-3.5 w-56 sm:w-64 rounded-full border border-white/20 bg-slate-950/80 p-0.5 shadow-xl backdrop-blur-md">
            <div
              className="h-full rounded-full transition-all duration-200 bg-gradient-to-r from-emerald-500 to-green-400"
              style={{ width: `${hpPercent}%` }}
            ></div>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">
              {activeChar.stats.currentHp} / {activeChar.stats.maxHp}
            </span>
          </div>
        </div>

        {/* Stamina Bar */}
        <div className="h-1.5 w-36 rounded-full bg-slate-950/70 overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-150"
            style={{ width: `${staminaPercent}%` }}
          ></div>
        </div>
      </div>

      {/* --- BOTTOM-LEFT: VIRTUAL JOYSTICK --- */}
      <div className="pointer-events-auto absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-20 touch-none">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          onTouchCancel={handleJoystickTouchEnd}
          className={`relative flex h-36 w-36 items-center justify-center rounded-full border-2 transition-colors ${
            isJoySprint || isManualSprint
              ? 'border-amber-400/90 bg-amber-500/10 shadow-lg shadow-amber-500/20'
              : 'border-white/25 bg-slate-950/50 backdrop-blur-sm'
          }`}
        >
          {/* Outer Directional Marks */}
          <div className="absolute top-1 text-[9px] font-bold text-white/40">▲</div>
          <div className="absolute bottom-1 text-[9px] font-bold text-white/40">▼</div>
          <div className="absolute left-1 text-[9px] font-bold text-white/40">◀</div>
          <div className="absolute right-1 text-[9px] font-bold text-white/40">▶</div>

          {/* Inner Sprint Ring Indicator */}
          <div className="absolute inset-3 rounded-full border border-dashed border-white/20"></div>

          {/* Draggable Knob */}
          <div
            className="absolute flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-300 bg-gradient-to-br from-amber-400/90 to-orange-500/90 shadow-xl transition-transform"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="h-4 w-4 rounded-full bg-slate-950/40"></div>
          </div>
        </div>
      </div>

      {/* --- BOTTOM-RIGHT: TOUCH COMBAT CLUSTER --- */}
      <div className="pointer-events-auto absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 touch-none">
        <div className="relative h-44 w-44 sm:h-48 sm:w-48">
          {/* 1. SPRINT / DASH TOGGLE BUTTON */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.playUIClick();
              const nextSprint = !isManualSprint;
              setIsManualSprint(nextSprint);
              onTriggerSprintToggle(nextSprint);
            }}
            className={`absolute bottom-1 left-2 flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-lg backdrop-blur-md active:scale-90 transition-all ${
              isManualSprint || isJoySprint
                ? 'border-amber-400 bg-amber-500 text-slate-950 font-bold scale-105'
                : 'border-white/25 bg-slate-900/80 text-white'
            }`}
            aria-label="Sprint"
          >
            <span className="text-lg">🏃</span>
          </button>

          {/* 2. DODGE BUTTON */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.playUIClick();
              onTriggerDodge();
            }}
            className="absolute bottom-1 right-20 sm:right-22 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 bg-slate-900/85 text-white shadow-xl backdrop-blur-md active:scale-90"
            aria-label="Dodge"
          >
            <span className="text-xl">💨</span>
          </button>

          {/* 3. JUMP / GLIDE BUTTON */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.playUIClick();
              onTriggerJump();
            }}
            className="absolute top-20 left-1 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/30 bg-slate-900/85 text-white shadow-xl backdrop-blur-md active:scale-90"
            aria-label="Jump / Glide"
          >
            <span className="text-xl">🪽</span>
          </button>

          {/* 4. ELEMENTAL SKILL BUTTON */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.playUIClick();
              onTriggerSkill();
            }}
            disabled={activeChar.currentSkillCooldown > 0}
            className={`absolute top-2 left-10 flex h-13 w-13 items-center justify-center rounded-full border-2 shadow-xl backdrop-blur-md active:scale-90 ${
              activeChar.currentSkillCooldown > 0
                ? 'border-white/10 bg-slate-950/70 opacity-60'
                : 'border-cyan-400/80 bg-gradient-to-br from-slate-900/90 to-cyan-950/90'
            }`}
            aria-label="Elemental Skill"
          >
            <span className="text-xl">{activeChar.portraitIcon}</span>
            {activeChar.currentSkillCooldown > 0 && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                {activeChar.currentSkillCooldown.toFixed(1)}s
              </span>
            )}
          </button>

          {/* 5. ELEMENTAL BURST (ULTIMATE) BUTTON */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.playUIClick();
              onTriggerBurst();
            }}
            disabled={!isBurstReady}
            className={`absolute top-1 right-3 flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-2xl backdrop-blur-md active:scale-90 ${
              isBurstReady
                ? 'border-amber-400 bg-gradient-to-br from-amber-500 via-red-600 to-purple-600 animate-pulse text-white'
                : 'border-white/20 bg-slate-950/80 opacity-70 text-slate-400'
            }`}
            aria-label="Elemental Burst"
          >
            <span className="text-2xl">⚡</span>
            {!isBurstReady && (
              <div
                className="absolute inset-0 rounded-full border-2 border-amber-400/50"
                style={{
                  clipPath: `inset(${100 - burstPercent}% 0 0 0)`,
                }}
              ></div>
            )}
          </button>

          {/* 6. MAIN ATTACK BUTTON (Largest, central focus) */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              soundManager.playUIClick();
              onAttackStart();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onAttackEnd();
            }}
            className="absolute bottom-0 right-0 flex h-18 w-18 items-center justify-center rounded-full border-3 border-amber-400/90 bg-gradient-to-br from-slate-900/95 via-amber-950/80 to-slate-900/95 shadow-2xl backdrop-blur-md active:scale-90"
            aria-label="Attack"
          >
            <span className="text-3xl">⚔️</span>
          </button>
        </div>
      </div>
    </div>
  );
};
