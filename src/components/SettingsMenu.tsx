import React from 'react';
import { WorldSettings } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface SettingsMenuProps {
  settings: WorldSettings;
  onUpdateSettings: (newSettings: Partial<WorldSettings>) => void;
  onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md font-sans">
      <div className="relative flex h-[85vh] w-[95vw] max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/70">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="font-serif text-lg font-bold text-amber-300">GAMEPLAY & GRAPHICS SETTINGS</h2>
          </div>
          <button
            onClick={() => { soundManager.playUIClick(); onClose(); }}
            className="rounded-xl border border-white/10 bg-slate-800/80 px-4 py-1.5 text-xs font-bold text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
          >
            ✕ Close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Graphics Presets */}
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
            <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] mb-3">
              Graphics Preset
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    soundManager.playUIClick();
                    onUpdateSettings({ graphicsPreset: preset });
                  }}
                  className={`rounded-xl py-2.5 font-bold transition-all ${
                    settings.graphicsPreset === preset
                      ? 'border border-amber-400 bg-amber-500/20 text-amber-300 shadow-md'
                      : 'border border-white/10 bg-slate-950/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Sliders */}
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-4">
            <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
              Audio Volume
            </h3>
            <div>
              <div className="flex justify-between mb-1">
                <span>Master Volume</span>
                <span className="font-bold text-white">{Math.round(settings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings({ masterVolume: val });
                  soundManager.setVolumes(val, settings.musicVolume, settings.sfxVolume);
                }}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Music Volume</span>
                <span className="font-bold text-white">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings({ musicVolume: val });
                  soundManager.setVolumes(settings.masterVolume, val, settings.sfxVolume);
                }}
                className="w-full accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>SFX Volume</span>
                <span className="font-bold text-white">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateSettings({ sfxVolume: val });
                  soundManager.setVolumes(settings.masterVolume, settings.musicVolume, val);
                }}
                className="w-full accent-amber-400"
              />
            </div>
          </div>

          {/* Camera & Game Feel */}
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-4">
            <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
              Camera & Combat Feel
            </h3>
            <div className="flex items-center justify-between">
              <span>Screen Shake on Impact</span>
              <input
                type="checkbox"
                checked={settings.screenShake}
                onChange={(e) => onUpdateSettings({ screenShake: e.target.checked })}
                className="h-4 w-4 accent-amber-400"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Camera Orbit Sensitivity</span>
                <span className="font-bold text-white">{(settings.cameraSensitivity * 1000).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.008"
                step="0.0005"
                value={settings.cameraSensitivity}
                onChange={(e) => onUpdateSettings({ cameraSensitivity: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>
          </div>

          {/* Mobile Touch Controls Guide */}
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
            <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] mb-3">
              Mobile Touch Controls
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-300">
              <div><strong className="text-white">Virtual Joystick:</strong> Drag bottom-left stick to walk, run, or sprint</div>
              <div><strong className="text-white">Camera Swipe:</strong> Swipe on right screen area to rotate 360° camera</div>
              <div><strong className="text-white">Attack (⚔️):</strong> Tap for combo, hold & release for charged attack</div>
              <div><strong className="text-white">Dodge (💨):</strong> Swift dash with invincibility frames</div>
              <div><strong className="text-white">Jump (🪽):</strong> Jump or deploy Aeravian wind glider in mid-air</div>
              <div><strong className="text-white">Skill & Ultimate:</strong> Tap dedicated elemental combat buttons</div>
              <div><strong className="text-white">Party Avatars:</strong> Tap character cards on right side to switch</div>
              <div><strong className="text-white">Interaction (✦):</strong> Tap contextual pop-up for chests & waypoints</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
