'use client';
import { GameSave, Region } from '../../types';
import { ProgressRing } from '../ui/ProgressRing';
import Link from 'next/link';

interface Props {
  region: Region;
  save: GameSave;
  onReset: () => void;
}

export function RegionCard({ region, save, onReset }: Props) {
  // Compute naive completion percentage (we don't have total roads in saves, usually would cache that too,
  // but for gallery thumbnail let's just display saved roads count, or cache completion percentage in save).
  // Without total roads, we'll pretend there's 100 for visual sake, or calculate if we have stats.
  // Wait, saving the overall progress in the save is a good idea. Let's assume we'll add `percentage: number` if missing, or default.
  const foundCount = save.foundRoads.length;
  // Fallback if we don't know total length in gallery
  const comp = (save as any).percentage || 0; 
  
  const daysAgo = Math.floor((new Date().getTime() - new Date(save.lastPlayedAt).getTime()) / (1000 * 3600 * 24));

  return (
    <div className="group bg-surface/40 backdrop-blur-sm border border-border p-6 rounded-2xl flex flex-col gap-5 shadow-xl hover:border-cyan/50 hover:shadow-cyan/5 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h3 className="text-2xl font-bold tracking-tight text-white group-hover:text-cyan transition-colors">
            {region.nameZh}
          </h3>
          <div className="text-sm font-mono text-cyan/80">
            {foundCount} 條路已點亮
          </div>
        </div>
        <ProgressRing 
          percentage={comp || (foundCount > 0 ? 1 : 0)} 
          size={48} 
          color="var(--road-road)" 
          strokeWidth={4} 
        />
      </div>
      
      <div className="flex flex-col gap-4 mt-auto">
        <div className="text-xs text-text-muted font-mono bg-bg/50 py-2 px-3 rounded-lg flex items-center gap-2">
          <span className="opacity-50">🕒</span>
          上次遊戲: {daysAgo === 0 ? '今天' : `${daysAgo} 天前`}
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onReset}
            className="flex-1 py-3 text-sm bg-bg border border-border rounded-xl text-text-muted hover:text-rose-400 hover:border-rose-400/50 hover:bg-rose-400/5 transition-all duration-200"
          >
            重新開始
          </button>
          <Link 
            href={`/game/${region.id}`}
            style={{ backgroundColor: 'var(--color-cyan)', color: 'var(--color-bg)' }}
            className="flex-[1.5] py-3 text-sm font-bold rounded-xl hover:bg-white text-center transition-all duration-200 shadow-lg shadow-cyan/20 cursor-pointer"
          >
            繼續遊戲
          </Link>
        </div>
      </div>
    </div>
  );
}
