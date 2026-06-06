import { RoadFeature, RoadType } from '../types';
import { haversineKm } from './geo';
import { isMainRoad } from './roadUtils';

export function getRoadType(name: string): RoadType {
  if (name.includes('大道')) return '大道';
  if (name.includes('大路')) return '大路';
  if (name.includes('路')) return '路';
  if (name.includes('街')) return '街';
  if (name.includes('道')) return '道';
  return 'other';
}

export async function fetchRoadsForRegion(osmRelationId: number): Promise<RoadFeature[]> {
  const query = `
[out:json][timeout:90];
rel(${osmRelationId});
map_to_area->.searchArea;
(
  way["highway"]["name"~"路|街|道|段"](area.searchArea);
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
