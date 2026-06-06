'use client';
import { use, useEffect, useState, useMemo, useCallback } from 'react';
import { REGIONS } from '../../../lib/regions';
import { fetchRoadsForRegion } from '../../../lib/overpass';
import { loadOsmCache, saveOsmCache, loadGame, saveGame } from '../../../lib/storage';
import { RoadFeature, GameSave } from '../../../types';
import { computeStats, isMainRoad } from '../../../lib/roadUtils';
import { MapCanvas } from '../../../components/game/MapCanvas';
import { Sidebar } from '../../../components/game/Sidebar';
import { InputBar } from '../../../components/game/InputBar';
import { Tooltip } from '../../../components/game/Tooltip';
import { useToast } from '../../../components/ui/Toast';
import Link from 'next/link';

export default function GamePage({ params }: { params: Promise<{ regionId: string }> }) {
  // Use React.use() to unwrap async params
  const { regionId } = use(params);
  const region = REGIONS.find(r => r.id === regionId);
  
  const [roads, setRoads] = useState<RoadFeature[]>([]);
  const [foundNames, setFoundNames] = useState<Set<string>>(new Set());
  const [recentHistory, setRecentHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRoad, setHoveredRoad] = useState<RoadFeature | null>(null);
  const [resetZoomTrigger, setResetZoomTrigger] = useState(0);

  const { addToast } = useToast();

  useEffect(() => {
    if (!region) {
      setError('找不到該地區');
      setIsLoading(false);
      return;
    }

    async function loadData() {
      try {
        const cache = await loadOsmCache(regionId);
        let fetchedRoads: RoadFeature[];

        if (cache) {
          fetchedRoads = cache.roads;
        } else {
          fetchedRoads = await fetchRoadsForRegion(region!.osmRelationId);
          await saveOsmCache(regionId, { fetchedAt: new Date().toISOString(), roads: fetchedRoads });
        }

        setRoads(fetchedRoads.filter(r => isMainRoad(r.name)));

        const save = loadGame(regionId);
        if (save) {
          setFoundNames(new Set(save.foundRoads));
          setRecentHistory(save.foundRoads.slice(-5));
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message || '載入失敗');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [region, regionId]);

  useEffect(() => {
    if (isLoading || error || !region) return;
    
    // Auto-save
    const save: GameSave = {
      regionId,
      regionName: region.nameZh,
      foundRoads: Array.from(foundNames),
      startedAt: loadGame(regionId)?.startedAt || new Date().toISOString(),
      lastPlayedAt: new Date().toISOString(),
      percentage: roads.length > 0 ? (foundNames.size / new Set(roads.map(r => r.name)).size) * 100 : 0
    };
    saveGame(save);
  }, [foundNames, isLoading, error, region, regionId, roads]);

  const stats = useMemo(() => computeStats(roads, foundNames, recentHistory), [roads, foundNames, recentHistory]);

  const handleRoadsFound = useCallback((names: string[]) => {
    if (names.length === 0) return;
    setFoundNames(prev => {
      const next = new Set(prev);
      names.forEach(name => next.add(name));
      return next;
    });
    setRecentHistory(prev => {
      const combined = [...prev, ...names];
      return combined.slice(-5);
    });
    if (names.length === 1) {
      addToast(`點亮「${names[0]}」！`, 'success');
    } else {
      addToast(`同時點亮了 ${names.length} 條包含此名稱的道路！`, 'success');
    }
  }, [addToast]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen">
        <h2 className="text-xl text-magenta mb-4">無法載入資料</h2>
        <p className="text-text-muted mb-6">{error}</p>
        <Link href="/" className="px-4 py-2 border border-border rounded hover:bg-surface">
          返回首頁
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg relative min-h-screen">
        <div className="text-4xl animate-pulse delay-75 mb-6 text-cyan">🗺️</div>
        <div className="text-xl font-mono text-cyan animate-pulse">
          正在載入道路資料…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden relative bg-bg">
      <header className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-surface z-10 justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-text-muted hover:text-cyan transition-colors" title="返回">
            ←
          </Link>
          <h1 className="text-lg font-serif font-bold text-cyan">{region?.nameZh}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-text-muted bg-bg px-2 py-1 rounded">
            已找到 {stats.found} / {stats.total} 條道路
          </div>
          <button 
            onClick={() => setResetZoomTrigger(prev => prev + 1)}
            className="text-sm text-text-muted hover:text-cyan border border-border px-2 py-1 rounded"
          >
            重置縮放
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar stats={stats} />
        
        <div className="flex-1 relative outline-none bg-bg m-0 p-0">
          <MapCanvas 
            roads={roads} 
            foundRoads={foundNames} 
            onRoadHover={setHoveredRoad} 
            resetZoomTrigger={resetZoomTrigger}
          />
        </div>
      </div>

      <InputBar 
        roads={roads} 
        foundRoads={foundNames} 
        onRoadsFound={handleRoadsFound} 
      />

      <Tooltip road={hoveredRoad} />
    </div>
  );
}
