import React, { useEffect, useRef, useState } from 'react';
import { GameDirector } from './engine/gameDirector';
import { CharacterId, InventoryItem, Quest, WorldSettings } from './types/game';
import { HUD } from './components/HUD';
import { WorldMapMenu } from './components/WorldMapMenu';
import { CharacterMenu } from './components/CharacterMenu';
import { InventoryMenu } from './components/InventoryMenu';
import { QuestMenu } from './components/QuestMenu';
import { CodexOracleModal } from './components/CodexOracleModal';
import { SettingsMenu } from './components/SettingsMenu';
import { soundManager } from './audio/soundManager';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const directorRef = useRef<GameDirector | null>(null);

  // Game UI State
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [activeMenu, setActiveMenu] = useState<'MAP' | 'CHARACTERS' | 'INVENTORY' | 'QUESTS' | 'CODEX' | 'SETTINGS' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synced State from Engine for React HUD
  const [party, setParty] = useState(directorRef.current?.party);
  const [activeCharId, setActiveCharId] = useState<CharacterId>('kael');
  const [stamina, setStamina] = useState<number>(100);
  const [timeOfDay, setTimeOfDay] = useState<number>(10.0);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);
  const [activeBoss, setActiveBoss] = useState(directorRef.current?.enemyManager.activeBoss?.stats || null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [damageNumbers, setDamageNumbers] = useState(directorRef.current?.damageNumbers || []);
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([-65, 5, 40]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const director = new GameDirector(canvasRef.current);
    directorRef.current = director;

    setParty({ ...director.party });
    setQuests([...director.quests]);

    // Fast state sync loop for UI
    const syncInterval = setInterval(() => {
      if (!director) return;
      setActiveCharId(director.activeCharId);
      setStamina(director.stamina);
      setTimeOfDay(director.timeOfDay);
      setInteractionPrompt(director.currentInteractionPrompt);
      setParty({ ...director.party });
      setQuests([...director.quests]);
      setDamageNumbers([...director.damageNumbers]);
      setPlayerPos([
        director.playerGroup.position.x,
        director.playerGroup.position.y,
        director.playerGroup.position.z,
      ]);

      if (director.enemyManager.activeBoss && !director.enemyManager.activeBoss.isDead) {
        setActiveBoss({ ...director.enemyManager.activeBoss.stats });
      } else {
        setActiveBoss(null);
      }
    }, 80);

    return () => {
      clearInterval(syncInterval);
      director.destroy();
    };
  }, [isGameStarted]);

  const handleStartGame = () => {
    setIsGameStarted(true);
    soundManager.startMusic('EXPLORATION');
    soundManager.playReactionSound('START');
    showToast('Welcome to Verdantia! Explore the valleys and unlock ancient waypoints.');
  };

  const handleSwitchCharacter = (id: CharacterId) => {
    if (directorRef.current) {
      directorRef.current.switchCharacter(id);
      setActiveCharId(id);
    }
  };

  const handleLevelUp = (id: CharacterId) => {
    if (directorRef.current) {
      const char = directorRef.current.party[id];
      char.stats.level += 1;
      char.stats.maxHp += 180;
      char.stats.currentHp = char.stats.maxHp;
      char.stats.atk += 25;
      char.stats.def += 15;
      char.stats.exp = 0;
      char.stats.expToNextLevel += 500;
      directorRef.current.saveState();
      setParty({ ...directorRef.current.party });
      showToast(`${char.name} reached Level ${char.stats.level}! Stats increased.`);
    }
  };

  const handleUseItem = (item: InventoryItem) => {
    if (!directorRef.current) return;
    const char = directorRef.current.party[directorRef.current.activeCharId];

    if (item.category === 'FOOD') {
      char.stats.currentHp = Math.min(char.stats.maxHp, char.stats.currentHp + 600);
      showToast(`Consumed ${item.name}. Restored 600 HP to ${char.name}!`);
    } else if (item.category === 'CONSUMABLES') {
      directorRef.current.stamina = Math.min(directorRef.current.maxStamina, directorRef.current.stamina + 80);
      showToast(`Consumed ${item.name}. Restored 80 Stamina!`);
    }

    item.count -= 1;
    if (item.count <= 0) {
      directorRef.current.inventory = directorRef.current.inventory.filter((i) => i.id !== item.id);
    }
    directorRef.current.saveState();
    setParty({ ...directorRef.current.party });
  };

  const handleTeleport = (pos: [number, number, number]) => {
    if (directorRef.current) {
      directorRef.current.teleportTo(pos);
      showToast('Teleported to attuned waypoint!');
    }
  };

  const handleUpdateSettings = (newSettings: Partial<WorldSettings>) => {
    if (directorRef.current) {
      directorRef.current.settings = { ...directorRef.current.settings, ...newSettings };
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="h-full w-full block cursor-crosshair" />

      {/* Title / Start Screen Overlay */}
      {!isGameStarted && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950/80 via-slate-900/90 to-slate-950 p-6 text-center">
          <div className="relative mb-6">
            <h1 className="font-serif text-5xl sm:text-7xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              FANTASTIC IMPACT
            </h1>
            <p className="mt-2 text-sm sm:text-base font-semibold tracking-widest uppercase text-amber-200/90">
              Chronicles of Aeravia • Region 1: Verdantia
            </p>
          </div>

          <p className="max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed mb-8">
            Embark on an open-world fantasy adventure. Master real-time elemental combat with{' '}
            <strong className="text-red-400">Kael (Ember)</strong>,{' '}
            <strong className="text-cyan-400">Lyra (Aqua)</strong>, and{' '}
            <strong className="text-purple-400">Orion (Volt)</strong>. Traverse vast forests, glide across skies, conquer the Forgotten Temple, and challenge The Ancient Colossus.
          </p>

          <button
            onClick={handleStartGame}
            className="group relative flex items-center gap-3 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 px-8 py-4 font-serif text-base font-bold text-slate-950 shadow-2xl transition-all hover:scale-105 active:scale-95"
          >
            <span>⚔️ Embark into Aeravia</span>
            <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
          </button>

          {/* Mobile Touch Quick Instructions badge */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-400 max-w-2xl">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-2">
              <strong className="text-white block">🕹️ Virtual Joystick</strong> Move, Walk & Sprint
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-2">
              <strong className="text-white block">🎥 Touch Swipe</strong> 360° Camera Look
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-2">
              <strong className="text-white block">⚔️ Combat Buttons</strong> Attack, Skill, Burst
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-2">
              <strong className="text-white block">👤 Party Avatars</strong> Touch Character Switch
            </div>
          </div>
        </div>
      )}

      {/* In-Game Mobile Touch HUD */}
      {isGameStarted && party && (
        <HUD
          party={party}
          activeCharId={activeCharId}
          onSwitchCharacter={handleSwitchCharacter}
          stamina={stamina}
          maxStamina={100}
          activeBoss={activeBoss}
          interactionPrompt={interactionPrompt}
          onInteract={() => directorRef.current?.triggerInteraction()}
          onJoystickMove={(x, y, isSprint) => directorRef.current?.setJoystickInput(x, y, isSprint)}
          onRotateCamera={(dx, dy) => directorRef.current?.rotateCamera(dx, dy)}
          onAttackStart={() => directorRef.current?.startAttack()}
          onAttackEnd={() => directorRef.current?.releaseChargedAttack()}
          onTriggerDodge={() => directorRef.current?.triggerDodge()}
          onTriggerJump={() => directorRef.current?.triggerJumpOrGlide()}
          onTriggerSkill={() => directorRef.current?.useElementalSkill()}
          onTriggerBurst={() => directorRef.current?.useElementalBurst()}
          onTriggerSprintToggle={(sprint) => directorRef.current?.setSprintActive(sprint)}
          activeQuests={quests}
          timeOfDay={timeOfDay}
          weather={directorRef.current?.weather || 'SUNNY'}
          isInDungeon={directorRef.current?.isInDungeon || false}
          damageNumbers={damageNumbers}
          onOpenMap={() => setActiveMenu('MAP')}
          onOpenCharacters={() => setActiveMenu('CHARACTERS')}
          onOpenInventory={() => setActiveMenu('INVENTORY')}
          onOpenQuests={() => setActiveMenu('QUESTS')}
          onOpenCodex={() => setActiveMenu('CODEX')}
          onOpenSettings={() => setActiveMenu('SETTINGS')}
        />
      )}

      {/* Notification Toast */}
      {toastMessage && (
        <div className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-full border border-amber-400/80 bg-slate-950/95 px-6 py-2 shadow-2xl backdrop-blur-md animate-fade-in">
          <span className="text-xs font-bold text-amber-300 drop-shadow">
            ✦ {toastMessage}
          </span>
        </div>
      )}

      {/* Modals & Fullscreen Menus */}
      {activeMenu === 'MAP' && directorRef.current && (
        <WorldMapMenu
          playerPos={playerPos}
          waypoints={directorRef.current.waypoints}
          onTeleport={handleTeleport}
          onClose={() => setActiveMenu(null)}
        />
      )}

      {activeMenu === 'CHARACTERS' && party && (
        <CharacterMenu
          party={party}
          activeCharId={activeCharId}
          onLevelUp={handleLevelUp}
          onClose={() => setActiveMenu(null)}
        />
      )}

      {activeMenu === 'INVENTORY' && directorRef.current && (
        <InventoryMenu
          inventory={directorRef.current.inventory}
          onUseItem={handleUseItem}
          onClose={() => setActiveMenu(null)}
        />
      )}

      {activeMenu === 'QUESTS' && (
        <QuestMenu quests={quests} onClose={() => setActiveMenu(null)} />
      )}

      {activeMenu === 'CODEX' && (
        <CodexOracleModal
          activeCharId={activeCharId}
          onClose={() => setActiveMenu(null)}
        />
      )}

      {activeMenu === 'SETTINGS' && directorRef.current && (
        <SettingsMenu
          settings={directorRef.current.settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
}
