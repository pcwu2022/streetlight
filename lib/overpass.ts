import { GameLocale, RoadFeature, RoadType } from '../types';
import { haversineKm } from './geo';
import { isMainRoad } from './roadUtils';

export function getRoadType(name: string, locale: GameLocale = 'tw'): RoadType {
  if (locale === 'en') {
    const lower = name.toLowerCase();
    if (/(?:avenue|ave|av\.)/i.test(lower)) return 'Avenue';
    if (/(?:boulevard|blvd|bd\.)/i.test(lower)) return 'Boulevard';
    if (/(?:street|st\.|st)/i.test(lower)) return 'Street';
    if (/(?:road|rd\.|rd)/i.test(lower)) return 'Road';
    if (/(?:drive|dr\.)/i.test(lower)) return 'Drive';
    if (/(?:lane|ln\.)/i.test(lower)) return 'Lane';
    if (/(?:place|pl\.)/i.test(lower)) return 'Place';
    return 'Other';
  }

  const highwayExceptions = /桃園環線|機場支線|台中環線|台南支線|高雄支線/;

  if (/(?:國道|高速公路)/.test(name) || highwayExceptions.test(name)) return '高速公路';
  if (/(?:省道|縣道|市道|快速道路|快速公路|台\d+線|縣\d+線)/.test(name)) return '快速道路';

  if (/(?:大道)(?:\d+段|第\d+段|.[段])?$/.test(name)) return '大道';
  if (/(?:街)(?:\d+段|第\d+段|.[段])?$/.test(name)) return '街';
  if (/(?:路)(?:\d+段|第\d+段|.[段])?$/.test(name)) return '路';
  if (/(?:橋)$/.test(name)) return '橋';
  if (/(?:地下道)$/.test(name)) return '地下道';
  if (/(?:隧道)$/.test(name)) return '隧道';
  return 'other';
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

interface OverpassData {
  remark?: string;
  elements: {
    type: string;
    id: number;
    tags?: { name?: string };
    geometry?: { lat: number; lon: number }[];
  }[];
}

async function fetchOverpassData(query: string): Promise<OverpassData> {
  const failures: string[] = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    // Allow the server's 90-second query timeout plus network overhead.
    const timeout = setTimeout(() => controller.abort(), 100_000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`);
      }
      const data: OverpassData = await response.json();
      // Overpass can return HTTP 200 with partial results and a runtime error.
      if (data.remark) throw new Error(data.remark);
      if (!Array.isArray(data.elements)) throw new Error('Invalid road data response');
      return data;
    } catch (error) {
      const reason = controller.signal.aborted
        ? 'Request timed out'
        : error instanceof Error ? error.message : 'Request failed';
      failures.push(`${new URL(endpoint).hostname}: ${reason}`);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Unable to load roads from Overpass. Please try again. (${failures.join('; ')})`);
}

// Share concurrent loads, including React development-mode effect replays.
const pendingRequests = new Map<string, Promise<RoadFeature[]>>();

export function fetchRoadsForRegion(osmRelationId: number, locale: GameLocale = 'tw'): Promise<RoadFeature[]> {
  const key = `${osmRelationId}:${locale}`;
  const pending = pendingRequests.get(key);
  if (pending) return pending;
  const request = loadRoadsForRegion(osmRelationId, locale).finally(() => {
    pendingRequests.delete(key);
  });
  pendingRequests.set(key, request);
  return request;
}

async function loadRoadsForRegion(osmRelationId: number, locale: GameLocale): Promise<RoadFeature[]> {
  const areaId = 3600000000 + osmRelationId;
  const query = locale === 'en'
    ? `
[out:json][timeout:90];
area(${areaId})->.searchArea;
(
  way["highway"]["name"](area.searchArea);
);
out geom;
  `.trim()
    : `
[out:json][timeout:90];
area(${areaId})->.searchArea;
(
  way["highway"]["name"~"路|街|道|橋|地下道|隧道"](area.searchArea);
);
out geom;
  `.trim();

  const data = await fetchOverpassData(query);
  const roadsMap = new Map<string, RoadFeature>();

  for (const element of data.elements) {
    if (element.type !== 'way') continue;

    const name = element.tags?.name;
    if (!name || !isMainRoad(name, locale) || !Array.isArray(element.geometry) || element.geometry.length < 2) continue;

    const coordinates: [number, number][] = element.geometry.map((g: { lat: number; lon: number }) => [g.lon, g.lat]);
    let lengthKm = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      lengthKm += haversineKm(coordinates[i], coordinates[i + 1]);
    }

    const type = getRoadType(name, locale);

    roadsMap.set(`${element.id}`, {
      id: element.id,
      name,
      type,
      coordinates,
      lengthKm,
    });
  }

  return Array.from(roadsMap.values());
}
