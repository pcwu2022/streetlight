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

export async function fetchRoadsForRegion(osmRelationId: number, locale: GameLocale = 'tw'): Promise<RoadFeature[]> {
  const areaId = 3600000000 + osmRelationId;
  const query = locale === 'en'
    ? `
[out:json][timeout:90];
area(${areaId})->.searchArea;
(
  way["highway"]["name"~"Avenue|Ave|Road|Rd|Street|St|Boulevard|Blvd|Drive|Lane|Place|Parkway|Way|Court|Circle|Terrace|Square"](area.searchArea);
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

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) throw new Error(`Overpass API error: ${response.statusText}`);

  const data = await response.json();
  const roadsMap = new Map<string, RoadFeature>();

  for (const element of data.elements) {
    if (element.type !== 'way') continue;

    const name: string = element.tags?.name;
    if (!name || !isMainRoad(name, locale)) continue;

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
