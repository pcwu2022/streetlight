import { Stats } from '../../lib/roadUtils';
import { StatCounter } from './StatCounter';

interface Props {
  stats: Stats;
}

export function Sidebar({ stats }: Props) {
  return (
    <div className="w-full md:w-64 bg-surface border-r border-border p-6 flex flex-col gap-6 overflow-y-auto hidden md:flex h-full">
      <div>
        <h2 className="text-text-muted text-sm font-mono mb-1 tracking-widest">總進度</h2>
        <div className="text-3xl font-serif text-cyan font-bold">
          <StatCounter value={stats.found} /> 
          <span className="text-xl text-text-muted font-mono"> / {stats.total}</span>
        </div>
        <div className="h-1 bg-bg mt-3 rounded overflow-hidden">
          <div 
            className="h-full bg-cyan transition-all duration-500 ease-out"
            style={{ width: `${stats.total > 0 ? (stats.found / stats.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div>
        <h2 className="text-text-muted text-sm font-mono mb-1 tracking-widest">總長度 (km)</h2>
        <div className="text-lg font-mono">
          <StatCounter value={stats.foundKm} decimals={1} /> 
          <span className="text-text-muted"> / {stats.totalKm.toFixed(1)}</span>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-text-muted text-sm font-mono mb-4 tracking-widest">類型統計</h2>
        <div className="flex flex-col gap-4">
          <TypeRow label="路" color="var(--road-road)" found={stats.byType['路'].found} total={stats.byType['路'].total} />
          <TypeRow label="街" color="var(--road-street)" found={stats.byType['街'].found} total={stats.byType['街'].total} />
          <TypeRow label="大道" color="var(--road-boulevard)" found={stats.byType['大道'].found} total={stats.byType['大道'].total} />
          <TypeRow label="高速公路" color="var(--road-highway)" found={stats.byType['高速公路'].found} total={stats.byType['高速公路'].total} />
          <TypeRow label="快速道路" color="var(--road-express)" found={stats.byType['快速道路'].found} total={stats.byType['快速道路'].total} />
          <TypeRow label="橋" color="var(--road-bridge)" found={stats.byType['橋'].found} total={stats.byType['橋'].total} />
          <TypeRow label="地下道" color="var(--road-underpass)" found={stats.byType['地下道'].found} total={stats.byType['地下道'].total} />
          <TypeRow label="隧道" color="var(--road-underpass)" found={stats.byType['隧道'].found} total={stats.byType['隧道'].total} />
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="text-text-muted text-sm font-mono mb-4 tracking-widest">最長與最短</h2>
        <div className="flex flex-col gap-3">
          <div className="bg-bg p-3 rounded border border-border">
            <div className="text-xs text-text-muted mb-1">最長的道路</div>
            <div className="font-bold text-cyan">{stats.longestFound ? stats.longestFound.name : '-'}</div>
            <div className="text-xs font-mono text-text-muted">{stats.longestFound ? `${stats.longestFound.km.toFixed(2)} km` : ''}</div>
          </div>
          <div className="bg-bg p-3 rounded border border-border">
            <div className="text-xs text-text-muted mb-1">最短的道路</div>
            <div className="font-bold text-amber">{stats.shortestFound ? stats.shortestFound.name : '-'}</div>
            <div className="text-xs font-mono text-text-muted">{stats.shortestFound ? `${stats.shortestFound.km.toFixed(2)} km` : ''}</div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-border pt-6 flex-1">
        <h2 className="text-text-muted text-sm font-mono mb-4 tracking-widest">最近找到</h2>
        <ul className="flex flex-col gap-2">
          {stats.recentlyFound.map((name, i) => (
             <li key={i} className="flex justify-between items-center text-sm p-2 bg-bg rounded animate-in fade-in slide-in-from-left-2">
               <span>{name}</span>
             </li>
          ))}
          {stats.recentlyFound.length === 0 && <li className="text-text-muted text-sm">尚未找到道路</li>}
        </ul>
      </div>
    </div>
  );
}

function TypeRow({ label, color, found, total }: { label: string; color: string; found: number; total: number }) {
  const percent = total > 0 ? (found / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="font-mono text-xs">{found} / {total}</span>
      </div>
      <div className="h-1.5 bg-bg rounded overflow-hidden">
        <div 
          className="h-full transition-all duration-500" 
          style={{ width: `${percent}%`, backgroundColor: color }} 
        />
      </div>
    </div>
  );
}
