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
    <div className="bg-surface border border-border p-4 rounded-xl flex flex-col gap-4 shadow-lg hover:border-cyan transition-colors">
      <div className="flex justify-between items-start">
        <h3 className="text-2xl font-serif text-cyan">{region.nameZh}</h3>
        <ProgressRing percentage={comp || (foundCount > 0 ? 1 : 0)} size={40} color="var(--color-cyan)" strokeWidth={3} />
      </div>
      
      <div className="h-24 bg-bg rounded-md flex items-center justify-center opacity-50 relative overflow-hidden">
        {/* Placeholder for SVG minimap */}
        <span className="text-sm font-mono text-text-muted">{foundCount} 條路已點亮</span>
      </div>

      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-text-muted font-mono">
          上次遊戲: {daysAgo === 0 ? '今天' : `${daysAgo}天前`}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onReset}
            className="px-3 py-1.5 text-sm bg-transparent border border-border rounded text-text-muted hover:text-magenta hover:border-magenta hover:bg-magenta/10 transition-colors"
          >
            重新開始
          </button>
          <Link 
            href={`/game/${region.id}`}
            className="px-3 py-1.5 text-sm bg-cyan text-bg font-bold rounded hover:bg-white transition-colors"
          >
            繼續遊戲
          </Link>
        </div>
      </div>
    </div>
  );
}
