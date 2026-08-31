'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchRoadsForRegion } from '../../lib/overpass';
import { loadOsmCache, saveOsmCache, loadGame, saveGame, clearLegacyStorage, isValidOsmCache } from '../../lib/storage';
import { RoadFeature, GameSave, Region } from '../../types';
import { computeStats, isMainRoad } from '../../lib/roadUtils';
import { getRegionDisplayName } from '../../lib/regions';
import { MapCanvas } from './MapCanvas';
import { Sidebar } from './Sidebar';
import { InputBar } from './InputBar';
import { Tooltip } from './Tooltip';
import { useToast } from '../ui/Toast';
import Link from 'next/link';

interface GameClientProps {
  regionId: string;
  region: Region | undefined;
}

export function GameClient({ regionId, region }: GameClientProps) {
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
      setError('Region not found');
      setIsLoading(false);
      return;
    }

    async function loadData() {
      try {
        // Clear old storage first
        await clearLegacyStorage();
        
        const cache = await loadOsmCache(regionId);
        let fetchedRoads: RoadFeature[];

        if (cache && isValidOsmCache(cache)) {
          fetchedRoads = cache.roads;
        } else {
          const locale = region?.locale ?? 'tw';
          fetchedRoads = await fetchRoadsForRegion(region!.osmRelationId, locale);
          if (!Array.isArray(fetchedRoads) || fetchedRoads.length === 0) {
            throw new Error(region?.locale === 'en' ? 'No roads were returned for this region.' : '這個區域沒有可載入的道路資料。');
          }
          await saveOsmCache(regionId, { fetchedAt: new Date().toISOString(), roads: fetchedRoads });
        }

        setRoads(fetchedRoads.filter(r => isMainRoad(r.name, region?.locale ?? 'tw')));

        const save = loadGame(regionId);
        if (save) {
          setFoundNames(new Set(save.foundRoads));
          setRecentHistory(save.foundRoads.slice(-5));
        }

      } catch (err: any) {
        console.error(err);
        setError(err.message || (region?.locale === 'en' ? 'Load failed' : '載入失敗'));
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
      regionName: getRegionDisplayName(region, region.locale),
      foundRoads: Array.from(foundNames),
      startedAt: loadGame(regionId)?.startedAt || new Date().toISOString(),
      lastPlayedAt: new Date().toISOString(),
      percentage: roads.length > 0 ? (foundNames.size / new Set(roads.map(r => r.name)).size) * 100 : 0
    };
    saveGame(save);
  }, [foundNames, isLoading, error, region, regionId, roads]);

  const stats = useMemo(() => computeStats(roads, foundNames, recentHistory, region?.locale ?? 'tw'), [roads, foundNames, recentHistory, region]);

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
      addToast(region?.locale === 'en' ? `Lit up "${names[0]}"!` : `點亮「${names[0]}」！`, 'success');
    } else {
      addToast(region?.locale === 'en' ? `Lit up ${names.length} roads containing this name!` : `同時點亮了 ${names.length} 條包含此名稱的道路！`, 'success');
    }
  }, [addToast, region?.locale]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen">
        <h2 className="text-xl text-magenta mb-4">{region?.locale === 'en' ? 'Unable to load data' : '無法載入資料'}</h2>
        <p className="text-text-muted mb-6">{error}</p>
        <Link href={region?.locale === 'en' ? '/en' : '/tw'} className="px-4 py-2 border border-border rounded hover:bg-surface">
          {region?.locale === 'en' ? 'Back to home' : '返回首頁'}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg relative min-h-screen">
        <div className="text-4xl animate-pulse delay-75 mb-6 text-cyan">🗺️</div>
        <div className="text-xl font-mono text-cyan animate-pulse">
          {region?.locale === 'en' ? 'Loading road data…' : '正在載入道路資料…'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden relative bg-bg">
      <header className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-surface z-10 justify-between">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <Link href={region?.locale === 'en' ? '/en' : '/tw'} className="text-text-muted hover:text-cyan transition-colors" title={region?.locale === 'en' ? 'Back' : '返回'}>
            ←
          </Link>
          <h1 className="text-base md:text-lg font-serif font-bold text-cyan truncate">{region ? getRegionDisplayName(region, region.locale) : ''}</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="text-xs md:text-sm font-mono text-text-muted bg-bg px-2 py-1 rounded">
             {stats.found} / {stats.total}
          </div>
          <button 
            onClick={() => setResetZoomTrigger(prev => prev + 1)}
            className="text-xs md:text-sm text-text-muted hover:text-cyan border border-border px-2 py-1 rounded whitespace-nowrap"
          >
            <span className="hidden md:inline">{region?.locale === 'en' ? 'Reset zoom' : '重置縮放'}</span>
            <span className="md:hidden">{region?.locale === 'en' ? 'Reset' : '重置'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar stats={stats} locale={region?.locale ?? 'tw'} />
        
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
        locale={region?.locale ?? 'tw'}
      />

      <Tooltip road={hoveredRoad} />
    </div>
  );
}
