import { Region, RoadFeature } from '../types';
import { haversineKm } from './geo';
import { isMainRoad } from './roadUtils';
import { getRoadType } from './roadTypes';

interface StoredRoad {
  id: number;
  name: string;
  coordinates: [number, number][];
}

const pendingRequests = new Map<string, Promise<RoadFeature[]>>();

export function loadRoadsForRegion(region: Region): Promise<RoadFeature[]> {
  const pending = pendingRequests.get(region.id);
  if (pending) return pending;
  const request = loadStoredRoads(region).finally(() => pendingRequests.delete(region.id));
  pendingRequests.set(region.id, request);
  return request;
}

async function loadStoredRoads(region: Region): Promise<RoadFeature[]> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const response = await fetch(`${basePath}/data/roads/${region.id}.json`);
  if (!response.ok) throw new Error(`Unable to load stored map for ${region.name} (HTTP ${response.status}).`);
  const data: { region: string; roads: StoredRoad[] } = await response.json();
  if (data.region !== region.id || !Array.isArray(data.roads) || data.roads.length === 0) {
    throw new Error(`Stored map for ${region.name} is missing or empty.`);
  }

  const roads = data.roads.filter(road => isMainRoad(road.name, region.locale)).map(road => {
    if (!Number.isFinite(road.id) || !Array.isArray(road.coordinates) || road.coordinates.length < 2 ||
      road.coordinates.some(point => !Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite))) {
      throw new Error(`Stored map for ${region.name} contains invalid geometry.`);
    }
    let lengthKm = 0;
    for (let i = 1; i < road.coordinates.length; i++) {
      lengthKm += haversineKm(road.coordinates[i - 1], road.coordinates[i]);
    }
    return { ...road, type: getRoadType(road.name, region.locale), lengthKm };
  });
  if (roads.length === 0) throw new Error(`Stored map for ${region.name} has no playable roads.`);
  return roads;
}
