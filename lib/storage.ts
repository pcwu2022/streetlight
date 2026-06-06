import { GameSave, OsmCache } from '../types';

export function saveGame(save: GameSave): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`game_${save.regionId}`, JSON.stringify(save));
}

export function loadGame(regionId: string): GameSave | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(`game_${regionId}`);
  if (!data) return null;
  try {
    return JSON.parse(data) as GameSave;
  } catch (e) {
    return null;
  }
}

export function deleteGame(regionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`game_${regionId}`);
}

export function listGames(): GameSave[] {
  if (typeof window === 'undefined') return [];
  const saves: GameSave[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('game_')) {
      try {
        const item = JSON.parse(localStorage.getItem(key) || '');
        saves.push(item as GameSave);
      } catch (e) {}
    }
  }
  return saves.sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime());
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('StreetlightDB', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('osmCache');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOsmCache(regionId: string, cache: OsmCache): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('osmCache', 'readwrite');
      const store = tx.objectStore('osmCache');
      const req = store.put(cache, `osmData_v3_${regionId}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to save to IndexedDB', e);
  }
}

export async function loadOsmCache(regionId: string): Promise<OsmCache | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('osmCache', 'readonly');
      const store = tx.objectStore('osmCache');
      const req = store.get(`osmData_v3_${regionId}`);
      req.onsuccess = () => {
        const cache = req.result as OsmCache | undefined;
        if (!cache) return resolve(null);
        
        const cacheAge = new Date().getTime() - new Date(cache.fetchedAt).getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (cacheAge > sevenDays) {
          const delTx = db.transaction('osmCache', 'readwrite');
          delTx.objectStore('osmCache').delete(`osmData_v3_${regionId}`);
          resolve(null);
        } else {
          resolve(cache);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Failed to load from IndexedDB', e);
    return null;
  }
}
