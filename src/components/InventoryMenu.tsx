import React, { useState } from 'react';
import { InventoryItem } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface InventoryMenuProps {
  inventory: InventoryItem[];
  onUseItem: (item: InventoryItem) => void;
  onClose: () => void;
}

export const InventoryMenu: React.FC<InventoryMenuProps> = ({
  inventory,
  onUseItem,
  onClose,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(inventory[0] || null);

  const filteredItems = inventory.filter((item) => {
    if (filter === 'ALL') return true;
    return item.category === filter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md font-sans">
      <div className="relative flex h-[90vh] w-[95vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950/95 shadow-2xl">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/70">
          <div className="flex items-center gap-2">
            {['ALL', 'FOOD', 'MATERIALS', 'CONSUMABLES', 'WEAPONS'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  soundManager.playUIClick();
                  setFilter(cat);
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  filter === cat
                    ? 'border border-amber-400 bg-amber-500/20 text-amber-300'
                    : 'border border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
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

        {/* Inventory Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Grid of Items */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      soundManager.playUIClick();
                      setSelectedItem(item);
                    }}
                    className={`relative flex flex-col items-center justify-between rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/10 scale-105 shadow-lg'
                        : 'border-white/10 bg-slate-900/60 hover:border-white/30 hover:bg-slate-900'
                    }`}
                  >
                    <span className="text-3xl my-2">{item.icon}</span>
                    <span className="text-center text-[11px] font-bold text-slate-200 line-clamp-1">
                      {item.name}
                    </span>
                    <div className="mt-1 flex items-center justify-between w-full text-[10px] text-amber-400 font-bold">
                      <span>{'★'.repeat(item.rarity)}</span>
                      <span>x{item.count}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details Sidebar */}
          <div className="w-80 border-l border-white/10 bg-slate-900/80 p-6 flex flex-col justify-between">
            {selectedItem ? (
              <div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-6xl mb-3">{selectedItem.icon}</span>
                  <h3 className="font-serif text-base font-bold text-white">{selectedItem.name}</h3>
                  <span className="text-xs text-amber-400 font-semibold mt-1">
                    {'★'.repeat(selectedItem.rarity)} • {selectedItem.category}
                  </span>
                </div>

                <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/60 p-3.5 text-xs text-slate-300">
                  <p className="leading-relaxed">{selectedItem.description}</p>
                  {selectedItem.effectText && (
                    <div className="mt-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 p-2 text-emerald-300 font-bold">
                      ⚡ Effect: {selectedItem.effectText}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-between text-xs text-slate-400 border-t border-white/10 pt-3">
                  <span>Carried in Bag</span>
                  <span className="font-bold text-white">{selectedItem.count} pcs</span>
                </div>

                {(selectedItem.category === 'FOOD' || selectedItem.category === 'CONSUMABLES') && (
                  <button
                    onClick={() => {
                      soundManager.playReactionSound('HEAL');
                      onUseItem(selectedItem);
                    }}
                    className="mt-6 w-full rounded-xl border border-emerald-400 bg-gradient-to-r from-emerald-600 to-green-600 py-3 text-xs font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
                  >
                    🍴 Use / Consume Item
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-slate-400 mt-20">
                <span className="text-4xl mb-3">🎒</span>
                <p className="text-sm font-semibold text-slate-300">Select an Item</p>
                <p className="mt-1 text-xs text-slate-500">
                  Choose any item from your bag to view its properties and use consumables.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
