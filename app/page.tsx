'use client';

import { useState, useEffect } from 'react';
import { REGIONS } from '../lib/regions';
import { listGames, deleteGame } from '../lib/storage';
import { GameSave } from '../types';
import { RegionCard } from '../components/gallery/RegionCard';
import { Modal } from '../components/ui/Modal';
import Link from 'next/link';

export default function Home() {
  const [saves, setSaves] = useState<GameSave[]>([]);
  const [search, setSearch] = useState('');
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setSaves(listGames());
  }, []);

  const handleReset = (regionId: string) => {
    deleteGame(regionId);
    setSaves(listGames());
    setResetTarget(null);
  };

  const filteredRegions = search 
    ? REGIONS.filter(r => r.nameZh.includes(search))
    : REGIONS;
  
  const showDropdown = isFocused || search.length > 0;

  return (
    <main className="flex-1 flex flex-col items-center justify-start p-8 relative min-h-screen">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--color-border)_1px,transparent_1.5px)] bg-[size:24px_24px] pointer-events-none -z-10" />

      <header className="mt-16 mb-12 text-center">
        <h1 className="text-5xl md:text-7xl font-serif text-cyan font-bold tracking-widest drop-shadow-[0_0_15px_rgba(0,229,255,0.4)]">
          路名記憶
        </h1>
        <p className="mt-4 text-text-muted text-lg font-mono tracking-widest">
          你還記得幾條路？
        </p>
      </header>

      <div className="w-full max-w-lg mb-16 relative z-20">
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay blur slightly to allow Link clicks
            setTimeout(() => setIsFocused(false), 200);
          }}
          placeholder="輸入城市或地區…" 
          className="w-full p-4 bg-surface border-2 border-border focus:border-cyan outline-none rounded-xl text-lg font-sans transition-colors"
        />
        {showDropdown && (
          <ul className="absolute top-full left-0 w-full mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
            {search.length === 0 && (
              <li className="p-3 bg-bg/50 text-xs font-mono text-text-muted border-b border-border">建議區域</li>
            )}
            {filteredRegions.length === 0 && (
              <li className="p-4 text-text-muted text-center font-mono">找不到相關區域</li>
            )}
            {filteredRegions.map(r => {
              const hasSave = saves.some(s => s.regionId === r.id);
              return (
                <li key={r.id}>
                  <Link 
                    href={`/game/${r.id}`}
                    className="flex justify-between items-center p-4 hover:bg-cyan/10 transition-colors border-b border-border last:border-0"
                  >
                    <span className="font-bold">{r.nameZh}</span>
                    {hasSave && <span className="text-xs bg-amber px-2 py-1 rounded text-bg font-bold">繼續</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="w-full max-w-5xl z-10">
        <h2 className="text-2xl font-serif mb-6 text-text-muted border-b border-border pb-4">
          遊戲紀錄
        </h2>
        
        {saves.length === 0 ? (
          <div className="text-center py-20 bg-surface/50 border border-border rounded-2xl border-dashed">
            <div className="text-6xl mb-4 opacity-50">🗺️</div>
            <p className="text-text-muted font-mono">還沒有開始任何城市</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {saves.map(save => {
              const region = REGIONS.find(r => r.id === save.regionId);
              if (!region) return null;
              return (
                <RegionCard 
                  key={save.regionId} 
                  region={region} 
                  save={save} 
                  onReset={() => setResetTarget(save.regionId)} 
                />
              );
            })}
          </div>
        )}
      </div>

      <Modal 
        isOpen={!!resetTarget} 
        onClose={() => setResetTarget(null)} 
        title="重新開始？"
      >
        <p className="mb-6 opacity-80">
          這將會清除您在這個城市所有的道路記憶進度，確定要繼續嗎？
        </p>
        <div className="flex justify-end gap-3">
          <button 
            className="px-4 py-2 border border-border text-text-muted rounded hover:text-white"
            onClick={() => setResetTarget(null)}
          >
            取消
          </button>
          <button 
            className="px-4 py-2 bg-magenta text-white font-bold rounded hover:opacity-90"
            onClick={() => resetTarget ? handleReset(resetTarget) : undefined}
          >
            確定清除
          </button>
        </div>
      </Modal>
    </main>
  );
}
