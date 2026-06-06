import { RoadFeature, RoadType } from '../types';
import { haversineKm } from './geo';
import { isMainRoad } from './roadUtils';

export function getRoadType(name: string): RoadType {
  // Check for specialized highway types first
  // Exceptions for specific National Highway branches/rings
  const highwayExceptions = /桃園環線|機場支線|台中環線|台南支線|高雄支線/;
  
  if (/(?:國道|高速公路)/.test(name) || highwayExceptions.test(name)) return '高速公路';
  if (/(?:省道|縣道|市道|快速道路|快速公路|台\d+線|縣\d+線)/.test(name)) return '快速道路';

  // Use regex to check for suffixes, accounting for optional section numbers like "一段"
  if (/(?:大道)(?:\d+段|第\d+段|.[段])?$/.test(name)) return '大道';
  if (/(?:街)(?:\d+段|第\d+段|.[段])?$/.test(name)) return '街';
  if (/(?:路)(?:\d+段|第\d+段|.[段])?$/.test(name)) return '路';
  if (/(?:橋)$/.test(name)) return '橋';
  if (/(?:地下道)$/.test(name)) return '地下道';
  if (/(?:隧道)$/.test(name)) return '隧道';
  return 'other';
}

export async function fetchRoadsForRegion(osmRelationId: number): Promise<RoadFeature[]> {
  const query = `
[out:json][timeout:90];
area(${3600000000 + osmRelationId})->.searchArea;
(
  way["highway"]["name"~"路|街|道|橋|地下道|隧道"](area.searchArea);
);
out geom;
  `.trim();

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.statusText}`);
  }

  const data = await response.json();
  const roadsMap = new Map<string, RoadFeature>();

  for (const element of data.elements) {
    if (element.type !== 'way') continue;
    
    const name: string = element.tags?.name;
    if (!name || !isMainRoad(name)) continue;

    const coordinates: [number, number][] = element.geometry.map((g: { lat: number; lon: number }) => [g.lon, g.lat]);
    let lengthKm = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        lengthKm += haversineKm(coordinates[i], coordinates[i+1]);
    }

    // Overpass "way"s are often fragments of a single road. We should group them by name.
    if (roadsMap.has(name)) {
      const existing = roadsMap.get(name)!;
      // Ideally we would merge the geometries, but for rendering polyline fragments,
      // it's easier to keep them separate. However, the spec says "return array of RoadFeature".
      // Let's just create multiple fragments but group by name logic later, OR we can combine them.
      // Wait, the easiest way to render disconnected ways of the same road is to have `coordinates` be `[number, number][][]`.
      // But the spec says `coordinates: [number, number][]`. 
      // If we just keep each way as a separate RoadFeature, it has ID.
      // Let's just push them directly, and sum them in stats. 
      // Wait! The autocomplete and stats might want unique names. 
      // Spec: "Parse returned way elements: extract name tag + geometry" + "validate name exists".
      // Let's keep them as separate ways in the array, but they share the same name.
    }

    const type = getRoadType(name);
    
    roadsMap.set(`${element.id}`, {
      id: element.id,
      name,
      type,
      coordinates,
      lengthKm
    });
  }

  return Array.from(roadsMap.values());
}
