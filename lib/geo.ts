import { RoadFeature } from '../types';

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371; // Earth's radius in km
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const dLon = (b[0] - a[0]) * Math.PI / 180;
  const lat1 = a[1] * Math.PI / 180;
  const lat2 = b[1] * Math.PI / 180;

  const aVal = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1-aVal)); 
  return R * c;
}

export interface BoundingBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export function getBoundingBox(roads: RoadFeature[]): BoundingBox {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const road of roads) {
    for (const [lng, lat] of road.coordinates) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return { minLng, maxLng, minLat, maxLat };
}

export interface ProjectionParams {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function projectToSVG(
  coords: [number, number][],
  bbox: BoundingBox,
  width: number,
  height: number,
  padding: number
): [number, number][] {
  const mapWidth = width - 2 * padding;
  const mapHeight = height - 2 * padding;
  
  const lonDiff = bbox.maxLng - bbox.minLng || 1;
  const latDiff = bbox.maxLat - bbox.minLat || 1;
  
  // Note: latitude goes up as you go north, but SVG Y goes down as you go south.
  // We need to invert the Y axis.
  const scaleX = mapWidth / lonDiff;
  const scaleY = mapHeight / latDiff;
  const scale = Math.min(scaleX, scaleY);
  
  const offsetX = padding + (mapWidth - lonDiff * scale) / 2;
  const offsetY = padding + (mapHeight - latDiff * scale) / 2;

  return coords.map(([lng, lat]) => [
    offsetX + (lng - bbox.minLng) * scale,
    offsetY + (bbox.maxLat - lat) * scale
  ]);
}
