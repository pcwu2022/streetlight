import { GameLocale, RoadType } from '../types';

export function getRoadType(name: string, locale: GameLocale = 'tw'): RoadType {
  if (locale === 'en') {
    const types: [RegExp, RoadType][] = [
      [/\b(?:avenue|ave|av)\b/i, 'Avenue'],
      [/\b(?:boulevard|blvd|bd)\b/i, 'Boulevard'],
      [/\b(?:street|st)\b/i, 'Street'],
      [/\b(?:road|rd)\b/i, 'Road'],
      [/\b(?:highway|hwy|expressway|freeway)\b/i, 'Highway'],
      [/\b(?:drive|dr)\b/i, 'Drive'],
      [/\b(?:lane|ln)\b/i, 'Lane'],
      [/\b(?:place|pl)\b/i, 'Place'],
      [/\bway\b/i, 'Way'],
      [/\b(?:court|ct)\b/i, 'Court'],
      [/\b(?:circle|cir)\b/i, 'Circle'],
      [/\b(?:square|sq)\b/i, 'Square'],
      [/\b(?:terrace|ter)\b/i, 'Terrace'],
      [/\b(?:parkway|pkwy)\b/i, 'Parkway'],
    ];
    for (const [pattern, type] of types) {
      if (pattern.test(name)) return type;
    }
    if (/\bbroadway\b/i.test(name)) return 'Broadway';
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

// Shared by the statistics sidebar and lit road segments.
export const ROAD_TYPE_COLORS: Record<string, string> = {
  Road: 'var(--road-road)',
  Street: 'var(--road-street)',
  Avenue: 'var(--road-boulevard)',
  Boulevard: 'var(--road-highway)',
  Highway: 'var(--road-express)',
  Broadway: 'var(--road-boulevard)',
  Drive: 'var(--road-road)',
  Lane: 'var(--road-street)',
  Place: 'var(--road-bridge)',
  Way: 'var(--road-road)',
  Court: 'var(--road-bridge)',
  Circle: 'var(--road-bridge)',
  Square: 'var(--road-bridge)',
  Terrace: 'var(--road-street)',
  Parkway: 'var(--road-express)',
  Other: 'var(--road-road)',
  路: 'var(--road-road)',
  街: 'var(--road-street)',
  大道: 'var(--road-boulevard)',
  高速公路: 'var(--road-highway)',
  快速道路: 'var(--road-express)',
  橋: 'var(--road-bridge)',
  地下道: 'var(--road-underpass)',
  隧道: 'var(--road-underpass)',
  other: 'var(--road-road)',
};
