import { GameLocale, Region } from '../types';
import regionData from '../data/regions.json';

export const DEFAULT_LOCALE: GameLocale = 'en';

export const REGIONS_BY_LOCALE = regionData as Record<GameLocale, Region[]>;

export const REGIONS: Region[] = Object.values(REGIONS_BY_LOCALE).flat();

export function getRegionsForLocale(locale: GameLocale | string | undefined): Region[] {
  const normalizedLocale = locale === 'tw' ? 'tw' : 'en';
  return REGIONS_BY_LOCALE[normalizedLocale] || REGIONS_BY_LOCALE.en;
}

export function getRegionDisplayName(region: Region, locale: GameLocale | string | undefined): string {
  const normalizedLocale = locale === 'tw' ? 'tw' : 'en';
  if (normalizedLocale === 'tw') return region.nameZh || region.name || region.nameEn || '';
  return region.nameEn || region.name || region.nameZh || '';
}

export function isLocale(value: string | undefined): value is GameLocale {
  return value === 'tw' || value === 'en';
}