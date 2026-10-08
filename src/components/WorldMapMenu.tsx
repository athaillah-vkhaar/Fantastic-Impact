import React, { useState } from 'react';
import { TeleportWaypoint } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface WorldMapMenuProps {
  playerPos: [number, number, number];
  waypoints: TeleportWaypoint[];
  onTeleport: (pos: [number, number, number]) => void;
  onClose: () => void;
}

export const WorldMapMenu: React.FC<WorldMapMenuProps> = ({
  playerPos,
  waypoints,
  onTeleport,
  onClose,
}) => {
  const [selectedWaypoint, setSelectedWaypoint] = useState<TeleportWaypoint | null>(null);

  // Map world coordinates (-400 to 400) to SVG canvas (0 to 800)
  const toMapX = (x: number) => ((x + 400) / 800) * 100;
  const toMapY = (z: number) => ((z + 400) / 800) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md font-sans">
      <div className="relative flex h-[90vh] w-[95vw] max-w-6xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <h2 className="font-serif text-lg font-bold text-amber-300">CONTINENT OF AERAVIA</h2>
              <p className="text-xs text-slate-400">Region: Verdantia (The Whispering Valleys)</p>
            </div>
          </div>
          <button
            onClick={() => { soundManager.playUIClick(); onClose(); }}
            className="rounded-xl border border-white/10 bg-slate-800/80 px-4 py-1.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
          >
            ✕ Close
          </button>
        </div>

        {/* Map Body & Canvas */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Stylized SVG Fantasy Map */}
          <div className="relative flex-1 bg-[#1a2e26] overflow-hidden">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a2b" />
                  <stop offset="50%" stopColor="#244a36" />
                  <stop offset="100%" stopColor="#1b3628" />
                </linearGradient>
                <radialGradient id="lakeGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0077b6" />
                  <stop offset="100%" stopColor="#023e8a" />
                </radialGradient>
              </defs>

              {/* Base Landmass */}
              <rect width="100" height="100" fill="url(#grassGrad)" />

              {/* Northern Mountain Ridge */}
              <path
                d="M 10 15 Q 30 5, 50 12 T 90 10 L 90 25 Q 50 35, 10 25 Z"
                fill="#374151"
                opacity="0.8"
              />

              {/* Whispering Lake Basin */}
              <ellipse cx="68" cy="58" rx="14" ry="11" fill="url(#lakeGrad)" opacity="0.9" />

              {/* Whispering River */}
              <path
                d="M 50 20 Q 55 40, 65 52"
                stroke="#0096c7"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />

              {/* Oakhaven Village Region */}
              <circle cx="40" cy="55" r="7" fill="#854d0e" opacity="0.3" stroke="#ca8a04" strokeWidth="0.5" strokeDasharray="1,1" />

              {/* Colossus Plateau Ring */}
              <circle cx="50" cy="15" r="6" fill="#991b1b" opacity="0.3" stroke="#ef4444" strokeWidth="0.8" />
            </svg>

            {/* Landmarks Labels */}
            <div className="absolute top-[12%] left-[45%] text-[11px] font-extrabold text-red-400 drop-shadow">
              👑 Colossus Sanctuary
            </div>
            <div className="absolute top-[53%] left-[34%] text-[11px] font-bold text-amber-200 drop-shadow">
              🏡 Oakhaven Village
            </div>
            <div className="absolute top-[56%] left-[65%] text-[11px] font-bold text-cyan-200 drop-shadow">
              🌊 Whispering Lake
            </div>
            <div className="absolute top-[38%] left-[53%] text-[11px] font-bold text-purple-300 drop-shadow">
              🏛️ The Forgotten Temple
            </div>

            {/* Teleport Waypoint Markers */}
            {waypoints.map((wp) => {
              const mx = toMapX(wp.position[0]);
              const my = toMapY(wp.position[2]);
              const isSelected = selectedWaypoint?.id === wp.id;

              return (
                <button
                  key={wp.id}
                  onClick={() => {
                    soundManager.playUIClick();
                    setSelectedWaypoint(wp);
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all ${
                    isSelected ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                  }`}
                  style={{ left: `${mx}%`, top: `${my}%` }}
                  title={wp.name}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-lg backdrop-blur-md ${
                      wp.isUnlocked
                        ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300'
                        : 'border-slate-500 bg-slate-900/80 text-slate-500'
                    }`}
                  >
                    <span className="text-xs">🔷</span>
                  </div>
                </button>
              );
            })}

            {/* Player Location Marker */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-30"
              style={{
                left: `${toMapX(playerPos[0])}%`,
                top: `${toMapY(playerPos[2])}%`,
              }}
            >
              <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 border-2 border-white shadow-xl animate-pulse">
                <span className="text-[10px]">🧍</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Selected Waypoint & Teleport details */}
          <div className="w-80 border-l border-white/10 bg-slate-900/90 p-5 flex flex-col justify-between">
            {selectedWaypoint ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔷</span>
                  <h3 className="font-serif text-base font-bold text-amber-300">
                    {selectedWaypoint.name}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-400">{selectedWaypoint.region}</p>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-3">
                  <div className="text-xs font-semibold text-slate-300">Status</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        selectedWaypoint.isUnlocked ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    ></span>
                    <span className="text-xs font-medium text-white">
                      {selectedWaypoint.isUnlocked ? 'Attuned (Fast Travel Available)' : 'Locked (Discover in world)'}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-300 leading-relaxed">
                  An ancient Aeravian conduit connecting subterranean leylines. Attuned travelers can traverse space instantly.
                </p>

                {selectedWaypoint.isUnlocked ? (
                  <button
                    onClick={() => {
                      onTeleport(selectedWaypoint.position);
                      onClose();
                    }}
                    className="mt-6 w-full rounded-xl border border-cyan-400 bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-xs font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
                  >
                    ⚡ Teleport Here
                  </button>
                ) : (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-3 text-center text-xs text-slate-500">
                    Explore near this location to attune this waypoint.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-slate-400 mt-20">
                <span className="text-4xl mb-3">📍</span>
                <p className="text-sm font-semibold text-slate-300">Select a Waypoint</p>
                <p className="mt-1 text-xs text-slate-500">
                  Click on any attuned blue conduit marker on the map to fast travel across Verdantia.
                </p>
              </div>
            )}

            {/* Quick Map Legend */}
            <div className="border-t border-white/10 pt-4 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span> Current Player Position
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400"></span> Attuned Teleport Waypoint
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400"></span> World Boss (The Colossus)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
