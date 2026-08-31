export type GameLocale = 'tw' | 'en';
export type RoadType = string;

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
  id: string;          // slugified, e.g. "hsinchu-city" or "london"
  nameZh?: string;     // e.g. "新竹市"
  nameEn?: string;     // e.g. "London"
  name?: string;       // generic label for shared UI
  osmRelationId: number;
  type: 'city' | 'town' | 'district' | 'county';
  locale: GameLocale;
}
