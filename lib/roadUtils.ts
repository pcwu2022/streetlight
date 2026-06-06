import { RoadFeature, RoadType } from '../types';

export function normalizeRoadName(input: string): string {
  // Convert full-width characters to half-width, trim spaces
  let str = input.trim();
  str = str.replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  // Remove inner spaces too, though standard road names shouldn't have them
  return str.replace(/\s+/g, '');
}

/**
 * 檢查輸入的台灣道路名稱是否為主要幹道
 * （保留：路、街、大道、國道、省道/快速道路主線）
 * （過濾：巷、弄、自行車道、地下道、匝道、高架/聯絡道之支線、便道、步道等）
 * 
 * @param roadName 道路名稱（例如："忠孝東路四段"、"中山路二段100巷"、"國道一號"）
 * @returns boolean 如果是合法的主幹道則返回 true，否則返回 false
 */
export function isMainRoad(roadName: string): boolean {
  if (!roadName || typeof roadName !== 'string') return false;

  const trimmedName = roadName.trim();

  // 1. 嚴格排除清單：只要包含這些關鍵字，直接判定為非主要主幹道
  const excludeKeywords = [
    '巷', '弄', '衖',               // 基礎毛細道路
    '自行車道', '單車道', '鐵馬道',    // 休閒專用道
    '匝道', '聯絡道', '交流道',       // 高快公路的銜接/分支結構
    '便道', '替代道路',             // 臨時或輔助道路
    '步道', '健行道', '登山步道',     // 人行專用
    '高架道路',                     // 排除單純的高架道路（除非是名為xx橋，我們下面會處理）
    '防汛道路', '產業道路',          // 特定功能性非都市道路
    '地下街'                        // 排除地下街
  ];

  const hasInvalidKeyword = excludeKeywords.some(keyword => trimmedName.includes(keyword));
  if (hasInvalidKeyword) {
    return false;
  }

  // 2. 允許的主幹道正則表達式
  // 匹配群組說明：
  // - (?:...段)? : 允許結尾帶有「段」或「幾路幾段」
  // - (國道|省道|縣道|市道|快速道路|快速公路)... : 允許公路主線系統
  const mainRoadRegex = /^(?:.*(?:路|街|大道|橋|地下道|隧道)(?:\d+段|第\d+段|.[段])?|(?:國道|省道|縣道|市道|快速道路|快速公路|快速道路|台\d+線|縣\d+線).*[號線]?)$/;

  return mainRoadRegex.test(trimmedName);
}

export function getMatchingRoads(query: string, roads: RoadFeature[]): RoadFeature[] {
  const normalizedQuery = normalizeRoadName(query);
  if (normalizedQuery.length < 2) return [];

  const seenNames = new Set<string>();
  const matches: RoadFeature[] = [];

  for (const road of roads) {
    if (road.name.includes(normalizedQuery) && !seenNames.has(road.name)) {
      seenNames.add(road.name);
      matches.push(road);
    }
  }

  return matches.sort((a, b) => a.name.length - b.name.length).slice(0, 8);
}

export interface Stats {
  total: number;
  found: number;
  foundKm: number;
  totalKm: number;
  byType: Record<RoadType, { total: number; found: number }>;
  longestFound: { name: string; km: number } | null;
  shortestFound: { name: string; km: number } | null;
  recentlyFound: string[];
}

export function computeStats(roads: RoadFeature[], foundNames: Set<string>, recentHistory: string[] = []): Stats {
  const stats: Stats = {
    total: 0,
    found: 0,
    foundKm: 0,
    totalKm: 0,
    byType: {
      '路': { total: 0, found: 0 },
      '街': { total: 0, found: 0 },
      '大道': { total: 0, found: 0 },
      '高速公路': { total: 0, found: 0 },
      '快速道路': { total: 0, found: 0 },
      '橋': { total: 0, found: 0 },
      '地下道': { total: 0, found: 0 },
      '隧道': { total: 0, found: 0 },
      'other': { total: 0, found: 0 },
    },
    longestFound: null,
    shortestFound: null,
    recentlyFound: recentHistory.slice(-5).reverse(), // Assuming recentHistory is appended-to
  };

  // Group by name completely inside stats so we don't double count length and totals
  // Wait, if a road has multiple segments, we must sum their lengths.
  const nameToLength = new Map<string, number>();
  const nameToType = new Map<string, RoadType>();

  if (!roads || !Array.isArray(roads)) {
    return stats;
  }

  for (const road of roads) {
    nameToLength.set(road.name, (nameToLength.get(road.name) || 0) + road.lengthKm);
    nameToType.set(road.name, road.type);
  }

  stats.total = nameToLength.size;

  for (const [name, length] of nameToLength.entries()) {
    const type = nameToType.get(name) || 'other';
    // Fallback if the type was deprecated or is otherwise missing from the stats map
    const targetType = stats.byType[type] ? type : 'other';
    
    stats.totalKm += length;
    stats.byType[targetType].total += 1;

    if (foundNames.has(name)) {
      stats.found += 1;
      stats.foundKm += length;
      stats.byType[targetType].found += 1;

      if (!stats.longestFound || length > stats.longestFound.km) {
        stats.longestFound = { name, km: length };
      }
      if (!stats.shortestFound || length < stats.shortestFound.km) {
        stats.shortestFound = { name, km: length };
      }
    }
  }

  return stats;
}
