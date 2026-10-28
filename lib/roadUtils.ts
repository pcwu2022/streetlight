import { GameLocale, RoadFeature, RoadType } from '../types';

export const MAX_MATCHING_ROADS = 20;

export function normalizeRoadName(input: string, locale: GameLocale = 'tw'): string {
  let str = input.trim();
  str = str.replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  if (locale === 'en') {
    return str.replace(/\s+/g, ' ').trim();
  }
  return str.replace(/\s+/g, '');
}

export function isMainRoad(roadName: string, locale: GameLocale = 'tw'): boolean {
  if (!roadName || typeof roadName !== 'string') return false;

  const trimmedName = roadName.trim();

  if (locale === 'en') {
    const excludedWords = [
      'alley', 'lane', 'trail', 'walkway', 'path', 'tunnel', 'bridge', 'underpass', 'ramp',
      'service road', 'bypass', 'motorway link', 'elevated', 'pedestrian', 'footpath'
    ];
    if (excludedWords.some(word => trimmedName.toLowerCase().includes(word))) return false;
    return /[A-Za-z]/.test(trimmedName) && !/\d+/.test(trimmedName.split(' ').at(-1) || '') ? true : /[A-Za-z]/.test(trimmedName);
  }

  const excludeKeywords = [
    '巷', '弄', '衖',
    '自行車道', '單車道', '鐵馬道',
    '匝道', '聯絡道', '交流道',
    '便道', '替代道路',
    '步道', '健行道', '登山步道',
    '高架道路',
    '防汛道路', '產業道路',
    '地下街'
  ];

  const hasInvalidKeyword = excludeKeywords.some(keyword => trimmedName.includes(keyword));
  if (hasInvalidKeyword) return false;

  const mainRoadRegex = /^(?:.*(?:路|街|大道|橋|地下道|隧道)(?:\d+段|第\d+段|.[段])?|(?:國道|省道|縣道|市道|快速道路|快速公路|快速道路|台\d+線|縣\d+線).*[號線]?)$/;
  return mainRoadRegex.test(trimmedName);
}

export function getMatchingRoads(query: string, roads: RoadFeature[], locale: GameLocale = 'tw'): RoadFeature[] {
  const normalizedQuery = normalizeRoadName(query, locale);
  if (normalizedQuery.length < 2) return [];

  const seenNames = new Set<string>();
  const matches: RoadFeature[] = [];

  for (const road of roads) {
    const name = normalizeRoadName(road.name, locale);
    const queryToMatch = locale === 'en' ? normalizedQuery.toLowerCase() : normalizedQuery;
    const nameToMatch = locale === 'en' ? name.toLowerCase() : name;
    const isMatch = locale === 'en'
      ? nameToMatch === queryToMatch ||
        nameToMatch.startsWith(`${queryToMatch} `) ||
        nameToMatch.startsWith(`${queryToMatch}-`) ||
        nameToMatch.includes(` ${queryToMatch} `) ||
        nameToMatch.includes(`-${queryToMatch} `) ||
        nameToMatch.includes(`/${queryToMatch} `)
      : nameToMatch.startsWith(queryToMatch);

    if (isMatch && !seenNames.has(road.name)) {
      seenNames.add(road.name);
      matches.push(road);
    }
  }

  return matches.sort((a, b) => a.name.length - b.name.length);
}

export function matchRoadGuess(query: string, roads: RoadFeature[], locale: GameLocale = 'tw') {
  const normalized = normalizeRoadName(query, locale);
  const reservedWords = locale === 'en'
    ? new Set(['avenue', 'street', 'road', 'boulevard', 'drive', 'lane', 'place', 'way', 'court', 'circle', 'square', 'terrace', 'parkway', 'highway', 'expressway', 'freeway', 'st', 'rd', 'ave', 'blvd', 'dr', 'ln', 'pl', 'ct', 'cir', 'sq', 'ter', 'pkwy', 'hwy'])
    : new Set(['路', '街', '大道', '橋', '地下道', '隧道', '高速公路', '快速道路', '快速公路', '國道', '環線', '支線', '省道', '縣道', '市道', '大道一段', '大道二段', '大道三段', '大道四段', '大道五段', '大道六段', '大道七段', '大道八段', '大道九段', '大道十段']);
  if (reservedWords.has(normalized.toLowerCase().replace(/\.$/, ''))) {
    return { status: 'reserved' as const, matches: [] };
  }
  const matches = getMatchingRoads(normalized, roads, locale);
  return { status: matches.length > MAX_MATCHING_ROADS ? 'too-broad' as const : 'matched' as const, matches };
}

export interface Stats {
  total: number;
  found: number;
  foundKm: number;
  totalKm: number;
  byType: Record<string, { total: number; found: number }>;
  longestFound: { name: string; km: number } | null;
  shortestFound: { name: string; km: number } | null;
  recentlyFound: string[];
}

export function computeStats(roads: RoadFeature[], foundNames: Set<string>, recentHistory: string[] = [], locale: GameLocale = 'tw'): Stats {
  const stats: Stats = {
    total: 0,
    found: 0,
    foundKm: 0,
    totalKm: 0,
    byType: {},
    longestFound: null,
    shortestFound: null,
    recentlyFound: recentHistory.slice(-5).reverse(),
  };

  const nameToLength = new Map<string, number>();
  const nameToType = new Map<string, RoadType>();

  if (!roads || !Array.isArray(roads)) {
    return stats;
  }

  for (const road of roads) {
    nameToLength.set(road.name, (nameToLength.get(road.name) || 0) + road.lengthKm);
    nameToType.set(road.name, road.type);
    if (!stats.byType[road.type]) {
      stats.byType[road.type] = { total: 0, found: 0 };
    }
  }

  stats.total = nameToLength.size;

  for (const [name, length] of nameToLength.entries()) {
    const type = nameToType.get(name) || (locale === 'en' ? 'Other' : 'other');
    const targetType = stats.byType[type] ? type : 'other';

    if (!stats.byType[targetType]) {
      stats.byType[targetType] = { total: 0, found: 0 };
    }

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
