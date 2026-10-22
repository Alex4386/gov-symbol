import { parse, type Font } from 'opentype.js'

// 대한민국 정부상징체: 로컬 TTF(ROKG_R.ttf)를 웹폰트로 변환해 번들한다.
// woff2 는 CSS(@font-face, index.css)용, woff 는 opentype.js 윤곽선 추출용 (opentype.js 는 woff2 미지원).
import rokgWoff from '@/assets/fonts/ROKG_R.woff?url'

// 한문: Pretendard JP (jsDelivr). 한국 한자 표기 모드는 'ss05' 기능.
export const PRETENDARD_JP_CSS =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-jp.min.css'
const PRETENDARD_JP_WOFF =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard-jp/dist/web/static/woff/PretendardJP-Medium.woff'

async function fetchFont(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`글꼴을 불러오지 못했습니다: ${url} (${res.status})`)
  return parse(await res.arrayBuffer())
}

let rokg: Promise<Font> | null = null
let hanja: Promise<Font> | null = null

export const loadRokg = () => (rokg ??= fetchFont(rokgWoff))
export const loadHanja = () => (hanja ??= fetchFont(PRETENDARD_JP_WOFF))

const korMaps = new WeakMap<Font, Map<number, number>>()

/** Pretendard JP 의 한국 한자 표기 모드(ss05, hani/KOR) 대체표: 글리프 번호 → 한국형 글리프 번호 */
export function koreanHanjaMap(font: Font): Map<number, number> {
  let m = korMaps.get(font)
  if (!m) {
    m = new Map()
    const subst = (font as unknown as {
      substitution: { getFeature: (f: string, s: string, l: string) => { sub: number; by: number }[] }
    }).substitution
    for (const { sub, by } of subst.getFeature('ss05', 'hani', 'KOR ')) {
      if (typeof sub === 'number' && typeof by === 'number') m.set(sub, by)
    }
    korMaps.set(font, m)
  }
  return m
}
