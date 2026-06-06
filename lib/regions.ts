import { Region } from '../types';

export const REGIONS: Region[] = [
  // Special Municipalities (直轄市)
  { id: 'taipei-city', nameZh: '台北市', osmRelationId: 1293250, type: 'city' },
  { id: 'new-taipei-city', nameZh: '新北市', osmRelationId: 1527220, type: 'city' },
  { id: 'taoyuan-city', nameZh: '桃園市', osmRelationId: 2770986, type: 'city' },
  { id: 'taichung-city', nameZh: '台中市', osmRelationId: 2921154, type: 'city' },
  { id: 'tainan-city', nameZh: '台南市', osmRelationId: 2418506, type: 'city' },
  { id: 'kaohsiung-city', nameZh: '高雄市', osmRelationId: 2127079, type: 'city' },

  // Provincial Cities (市)
  { id: 'keelung-city', nameZh: '基隆市', osmRelationId: 1296154, type: 'city' },
  { id: 'hsinchu-city', nameZh: '新竹市', osmRelationId: 2849488, type: 'city' },
  { id: 'chiayi-city', nameZh: '嘉義市', osmRelationId: 2790418, type: 'city' },

  // Counties (縣)
  { id: 'hsinchu-county', nameZh: '新竹縣', osmRelationId: 2912613, type: 'county' },
  { id: 'miaoli-county', nameZh: '苗栗縣', osmRelationId: 2915592, type: 'county' },
  { id: 'changhua-county', nameZh: '彰化縣', osmRelationId: 2917549, type: 'county' },
  { id: 'nantou-county', nameZh: '南投縣', osmRelationId: 2497975, type: 'county' },
  { id: 'yunlin-county', nameZh: '雲林縣', osmRelationId: 2915930, type: 'county' },
  { id: 'chiayi-county', nameZh: '嘉義縣', osmRelationId: 2908173, type: 'county' },
  { id: 'pingtung-county', nameZh: '屏東縣', osmRelationId: 2775815, type: 'county' },
  { id: 'yilan-county', nameZh: '宜蘭縣', osmRelationId: 2912630, type: 'county' },
  { id: 'hualien-county', nameZh: '花蓮縣', osmRelationId: 2921156, type: 'county' },
  { id: 'taitung-county', nameZh: '台東縣', osmRelationId: 2921155, type: 'county' },
  { id: 'penghu-county', nameZh: '澎湖縣', osmRelationId: 3339738, type: 'county' },
  { id: 'kinmen-county', nameZh: '金門縣', osmRelationId: 3339695, type: 'county' },
  { id: 'lienchiang-county', nameZh: '連江縣', osmRelationId: 3777249, type: 'county' }
];