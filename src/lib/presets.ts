import type { SymbolOptions } from './layout'

export interface Preset {
  label: string
  options: Partial<SymbolOptions>
}

// 「정부상징 디자인 가이드」(2017)에 수록된 예시
export const PRESETS: Preset[] = [
  {
    label: '대한민국정부',
    options: {
      lang: 'ko',
      nameKo: '대한민국정부',
      nameEn: 'The Government of the Republic of Korea',
      parentKo: '',
      enAbbr: false,
    },
  },
  {
    label: '대한민국정부 (국영문)',
    options: {
      lang: 'ko-en',
      nameKo: '대한민국정부',
      nameEn: 'The Government of the Republic of Korea',
      parentKo: '',
      enAbbr: false,
    },
  },
  {
    label: '문화체육관광부',
    options: {
      lang: 'ko',
      nameKo: '문화체육관광부',
      nameEn: 'Ministry of Culture, Sports and Tourism',
      parentKo: '',
      enAbbr: false,
    },
  },
  {
    label: '법제처 (3자 이하)',
    options: {
      lang: 'ko',
      nameKo: '법제처',
      nameEn: 'Ministry of Government Legislation',
      parentKo: '',
      enAbbr: false,
    },
  },
  {
    label: '국립중앙박물관 (본부 병기)',
    options: {
      lang: 'ko',
      nameKo: '국립중앙박물관',
      nameEn: 'National Museum of Korea',
      parentKo: '문화체육관광부',
      enAbbr: false,
    },
  },
  {
    label: 'National Museum of Korea',
    options: {
      lang: 'en',
      nameKo: '국립중앙박물관',
      nameEn: 'National Museum of Korea',
      parentKo: '',
      enAbbr: false,
    },
  },
  {
    label: 'KoFIU (영문약칭)',
    options: {
      lang: 'en',
      nameKo: '금융정보분석원',
      nameEn: 'KoFIU',
      parentKo: '',
      enAbbr: true,
    },
  },
  {
    label: '文化體育觀光部 (한문)',
    options: {
      lang: 'ko',
      nameKo: '文化體育觀光部',
      nameEn: 'Ministry of Culture, Sports and Tourism',
      parentKo: '',
      enAbbr: false,
    },
  },
]
