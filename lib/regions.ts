import { GameLocale, Region } from '../types';

export const DEFAULT_LOCALE: GameLocale = 'en';

export const REGIONS_BY_LOCALE: Record<GameLocale, Region[]> = {
  tw: [
    // Special Municipalities (直轄市)
    { id: 'taipei-city', nameZh: '台北市', name: '台北市', osmRelationId: 1293250, type: 'city', locale: 'tw' },
    { id: 'new-taipei-city', nameZh: '新北市', name: '新北市', osmRelationId: 1527220, type: 'city', locale: 'tw' },
    { id: 'taoyuan-city', nameZh: '桃園市', name: '桃園市', osmRelationId: 2770986, type: 'city', locale: 'tw' },
    { id: 'taichung-city', nameZh: '台中市', name: '台中市', osmRelationId: 2921154, type: 'city', locale: 'tw' },
    { id: 'tainan-city', nameZh: '台南市', name: '台南市', osmRelationId: 2418506, type: 'city', locale: 'tw' },
    { id: 'kaohsiung-city', nameZh: '高雄市', name: '高雄市', osmRelationId: 2127079, type: 'city', locale: 'tw' },

    // Provincial Cities (市)
    { id: 'keelung-city', nameZh: '基隆市', name: '基隆市', osmRelationId: 1296154, type: 'city', locale: 'tw' },
    { id: 'hsinchu-city', nameZh: '新竹市', name: '新竹市', osmRelationId: 2849488, type: 'city', locale: 'tw' },
    { id: 'chiayi-city', nameZh: '嘉義市', name: '嘉義市', osmRelationId: 2790418, type: 'city', locale: 'tw' },

    // Counties (縣)
    { id: 'hsinchu-county', nameZh: '新竹縣', name: '新竹縣', osmRelationId: 2912613, type: 'county', locale: 'tw' },
    { id: 'miaoli-county', nameZh: '苗栗縣', name: '苗栗縣', osmRelationId: 2915592, type: 'county', locale: 'tw' },
    { id: 'changhua-county', nameZh: '彰化縣', name: '彰化縣', osmRelationId: 2917549, type: 'county', locale: 'tw' },
    { id: 'nantou-county', nameZh: '南投縣', name: '南投縣', osmRelationId: 2497975, type: 'county', locale: 'tw' },
    { id: 'yunlin-county', nameZh: '雲林縣', name: '雲林縣', osmRelationId: 2915930, type: 'county', locale: 'tw' },
    { id: 'chiayi-county', nameZh: '嘉義縣', name: '嘉義縣', osmRelationId: 2908173, type: 'county', locale: 'tw' },
    { id: 'pingtung-county', nameZh: '屏東縣', name: '屏東縣', osmRelationId: 2775815, type: 'county', locale: 'tw' },
    { id: 'yilan-county', nameZh: '宜蘭縣', name: '宜蘭縣', osmRelationId: 2912630, type: 'county', locale: 'tw' },
    { id: 'hualien-county', nameZh: '花蓮縣', name: '花蓮縣', osmRelationId: 2921156, type: 'county', locale: 'tw' },
    { id: 'taitung-county', nameZh: '台東縣', name: '台東縣', osmRelationId: 2921155, type: 'county', locale: 'tw' },
    { id: 'penghu-county', nameZh: '澎湖縣', name: '澎湖縣', osmRelationId: 3339738, type: 'county', locale: 'tw' },
    { id: 'kinmen-county', nameZh: '金門縣', name: '金門縣', osmRelationId: 3339695, type: 'county', locale: 'tw' },
    { id: 'lienchiang-county', nameZh: '連江縣', name: '連江縣', osmRelationId: 3777249, type: 'county', locale: 'tw' }
  ],
  en: [
    { id: 'london', nameEn: 'London', name: 'London', osmRelationId: 175342, type: 'city', locale: 'en' },
    { id: 'paris', nameEn: 'Paris', name: 'Paris', osmRelationId: 7444, type: 'city', locale: 'en' },
    { id: 'new-york', nameEn: 'New York', name: 'New York', osmRelationId: 175905, type: 'city', locale: 'en' },
    { id: 'madrid', nameEn: 'Madrid', name: 'Madrid', osmRelationId: 367106, type: 'city', locale: 'en' },
    { id: 'berlin', nameEn: 'Berlin', name: 'Berlin', osmRelationId: 62422, type: 'city', locale: 'en' },
    { id: 'munich', nameEn: 'Munich', name: 'Munich', osmRelationId: 62463, type: 'city', locale: 'en' },
    { id: 'barcelona', nameEn: 'Barcelona', name: 'Barcelona', osmRelationId: 349514, type: 'city', locale: 'en' },
    { id: 'rome', nameEn: 'Rome', name: 'Rome', osmRelationId: 41787, type: 'city', locale: 'en' },
    { id: 'milan', nameEn: 'Milan', name: 'Milan', osmRelationId: 152812, type: 'city', locale: 'en' },
    { id: 'venice', nameEn: 'Venice', name: 'Venice', osmRelationId: 42746, type: 'city', locale: 'en' },
    { id: 'toronto', nameEn: 'Toronto', name: 'Toronto', osmRelationId: 324939, type: 'city', locale: 'en' },
    { id: 'vancouver', nameEn: 'Vancouver', name: 'Vancouver', osmRelationId: 374935, type: 'city', locale: 'en' },
    { id: 'los-angeles', nameEn: 'Los Angeles', name: 'Los Angeles', osmRelationId: 207708, type: 'city', locale: 'en' },
    { id: 'san-francisco', nameEn: 'San Francisco', name: 'San Francisco', osmRelationId: 1423609, type: 'city', locale: 'en' },
    { id: 'seattle', nameEn: 'Seattle', name: 'Seattle', osmRelationId: 189714, type: 'city', locale: 'en' },
    { id: 'dallas', nameEn: 'Dallas', name: 'Dallas', osmRelationId: 111326, type: 'city', locale: 'en' },
    { id: 'washington-dc', nameEn: 'Washington, DC', name: 'Washington, DC', osmRelationId: 133512, type: 'city', locale: 'en' },
    { id: 'pittsburgh', nameEn: 'Pittsburgh', name: 'Pittsburgh', osmRelationId: 188553, type: 'city', locale: 'en' },
    { id: 'atlanta', nameEn: 'Atlanta', name: 'Atlanta', osmRelationId: 128065, type: 'city', locale: 'en' }
  ]
};

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