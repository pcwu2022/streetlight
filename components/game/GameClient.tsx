'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchRoadsForRegion } from '../../lib/overpass';
import { loadOsmCache, saveOsmCache, loadGame, saveGame, clearLegacyStorage, isValidOsmCache } from '../../lib/storage';
import { RoadFeature, GameSave, Region, GameLocale } from '../../types';
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
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [roads, setRoads] = useState<RoadFeature[]>([]);
  const [foundNames, setFoundNames] = useState<Set<string>>(new Set());
  const [recentHistory, setRecentHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRoad, setHoveredRoad] = useState<RoadFeature | null>(null);
  const [resetZoomTrigger, setResetZoomTrigger] = useState(0);

  const { addToast } = useToast();

  useEffect(() => {
    let active = true;

    async function loadData() {
      // Defer state updates until this effect's async load begins.
      await Promise.resolve();
      if (!active) return;
      setIsLoading(true);
      setError(null);
      if (!region) {
        setError('Region not found');
        setIsLoading(false);
        return;
      }
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

        if (!active) return;
        setRoads(fetchedRoads.filter(r => isMainRoad(r.name, region?.locale ?? 'tw')));

        const save = loadGame(regionId);
        if (save) {
          setFoundNames(new Set(save.foundRoads));
          setRecentHistory(save.foundRoads.slice(-5));
        }

      } catch (err: unknown) {
        if (!active) return;
        setError((err instanceof Error ? err.message : '') || (region?.locale === 'en' ? 'Load failed' : '載入失敗'));
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [region, regionId, loadAttempt]);

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
        <button
          onClick={() => setLoadAttempt(attempt => attempt + 1)}
          className="px-4 py-2 mb-4 border border-border rounded hover:bg-surface"
        >
          {region?.locale === 'en' ? 'Try again' : '重試'}
        </button>
        <Link href={region?.locale === 'en' ? '/en' : '/tw'} className="px-4 py-2 border border-border rounded hover:bg-surface">
          {region?.locale === 'en' ? 'Back to home' : '返回首頁'}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <RoadLoadingProgress key={`${regionId}:${loadAttempt}`} locale={region?.locale ?? 'tw'} />;
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

// Overpass does not report query progress; this is a time-based estimate.
const ESTIMATED_LOAD_SECONDS = 30;

function RoadLoadingProgress({ locale }: { locale: GameLocale }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const progress = Math.min(95, Math.round((elapsedSeconds / ESTIMATED_LOAD_SECONDS) * 100));
  const remaining = Math.max(0, ESTIMATED_LOAD_SECONDS - elapsedSeconds);
  const isEnglish = locale === 'en';
  const estimate = remaining > 0
    ? (isEnglish ? `About ${remaining}s remaining` : `預估還需 ${remaining} 秒`)
    : (isEnglish ? 'Taking longer than estimated. Still loading…' : '載入時間超出預估，仍在載入中…');

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg relative min-h-screen px-6">
      <div className="text-4xl animate-pulse delay-75 mb-6 text-cyan" aria-hidden="true">🗺️</div>
      <h2 id="road-loading-label" className="text-xl font-mono text-cyan animate-pulse">
        {isEnglish ? 'Loading road data…' : '正在載入道路資料…'}
      </h2>
      <div className="w-full max-w-xs mt-6">
        <div
          role="progressbar"
          aria-labelledby="road-loading-label"
          aria-describedby="road-loading-estimate"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={isEnglish ? `Estimated progress: ${progress}%` : `預估進度：${progress}%`}
          className="h-2 overflow-hidden rounded-full bg-surface border border-border"
        >
          <div
            className="h-full rounded-full bg-cyan transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p id="road-loading-estimate" className="mt-3 text-sm text-text-muted text-center">
          {estimate}
        </p>
        <p className="mt-2 text-xs text-text-muted text-center">
          {isEnglish ? `Elapsed: ${elapsedSeconds}s · Time is approximate` : `已等待 ${elapsedSeconds} 秒・時間僅供參考`}
        </p>
      </div>
    </div>
  );
}
