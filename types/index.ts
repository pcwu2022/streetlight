export type RoadType = '路' | '街' | '大道' | '高速公路' | '快速道路' | '橋' | '地下道' | '隧道' | 'other';

export interface RoadFeature {
  id: number;
  name: string;
  type: RoadType;
  coordinates: [number, number][]; // [lng, lat]
  lengthKm: number;
}

export interface GameSave {
  regionId: string;
  regionName: string;
  foundRoads: string[];
  startedAt: string;
  lastPlayedAt: string;
  percentage?: number;
}

export interface OsmCache {
  fetchedAt: string;
  roads: RoadFeature[];
}

export interface Region {
  id: string;          // slugified, e.g. "hsinchu-city"
  nameZh: string;      // e.g. "新竹市"
  osmRelationId: number;
  type: 'city' | 'town' | 'district' | 'county';
}
