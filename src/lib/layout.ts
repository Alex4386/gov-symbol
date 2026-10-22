import { Font as OTFont, Glyph as OTGlyph, Path as OTPath, type Font, type Glyph } from 'opentype.js'

import {
  COLORS,
  EMBLEM_BLUE,
  EMBLEM_INK,
  EMBLEM_RED,
  EMBLEM_SOLID_A,
  EMBLEM_SOLID_B,
  OUTLINE_RADIUS,
} from './emblem'
import { koreanHanjaMap, PRETENDARD_JP_CSS } from './fonts'

// 모든 치수는 「정부상징 디자인 가이드」의 r 단위(정부상징 문양 반지름 R = 10r)를 따른다.
// 내부 좌표는 1r = 10 단위 (문양 반지름 = 100).
const r = (v: number) => v * 10

/* ───────────────────────────── 옵션 ───────────────────────────── */

export type Orientation = 'emblem' | 'vertical' | 'horizontal'
export type Lang = 'ko' | 'en' | 'ko-en'
export type Style = 'color' | 'twotone' | 'solid'
export type Tone = 'black' | 'blue' | 'gold' | 'silver'
export type ParentType = 'A' | 'B' | 'C'

export interface SymbolOptions {
  orientation: Orientation
  lang: Lang
  /** 국문(또는 한문) 기관명. 줄바꿈(\n)으로 2행 지정 */
  nameKo: string
  /** 영문 기관명. 줄바꿈(\n)으로 행 지정, 비우면 자동 줄바꿈 */
  nameEn: string
  /** 본부(상위기관) 병기 — 국문 전용 */
  parentKo: string
  parentType: ParentType
  /** 영문 약칭 조합 (예: KoFIU) */
  enAbbr: boolean
  /** 국영문 혼용: A = 영문 2행, B = 영문 1행 */
  bilingualType: 'A' | 'B'
  /** 영문 자동 줄바꿈 (25자 이하 1행 / 35자 이하 2행 / 그 이상 3행) */
  enAutoWrap: boolean
  /** 3자 이하 기관명 글자 사이 간격 (r, 최대 2.5r) */
  shortGap: number
  style: Style
  tone: Tone
  /** 테두리형 (배경이 있는 경우 백색 테두리) */
  outline: boolean
  /** 네거티브 (단색형 반전) */
  negative: boolean
  /** 배경색, null 이면 투명 */
  background: string | null
  /** 보호공간(Clear Space) 포함 */
  clearSpace: boolean
  /** 워터마크 농도 (1 = 원본) */
  opacity: number
}

export const DEFAULT_OPTIONS: SymbolOptions = {
  orientation: 'horizontal',
  lang: 'ko',
  nameKo: '대한민국정부',
  nameEn: 'The Government of the Republic of Korea',
  parentKo: '',
  parentType: 'A',
  enAbbr: false,
  bilingualType: 'A',
  enAutoWrap: true,
  shortGap: 2,
  style: 'color',
  tone: 'black',
  outline: false,
  negative: false,
  background: null,
  clearSpace: true,
  opacity: 1,
}

/* ─────────────────────────── 글꼴 측정 ─────────────────────────── */

// 대한민국 정부상징체(ROKG) 실측값 (unitsPerEm = 1000)
// 한글 잉크 높이: 기준선 위 0.761em ~ 아래 0.095em
const KO_TOP = 0.761
const KO_BOTTOM = -0.095
const KO_H = KO_TOP - KO_BOTTOM
// 영문 대문자 높이: 0.697em ~ 0.016em (기준선이 16 단위 올라가 있음)
const EN_TOP = 0.697
const EN_BOTTOM = 0.016
const EN_H = EN_TOP - EN_BOTTOM
// 가이드 원본에서 실측한 자간
const KO_TRACKING = -0.025
const EN_TRACKING = -0.015

type Script = 'ko' | 'en'
type FontKey = 'rokg' | 'hanja'

/** 사용 글꼴: 대한민국 정부상징체 + 한문용 Pretendard JP Medium (한국 한자 표기 모드 ss05 적용) */
export interface Fonts {
  rokg: Font
  hanja: Font | null
}

// Pretendard JP 한자 잉크 높이 실측값: 기준선 위 0.800em ~ 아래 0.066em.
// 한자는 한글과 같은 잉크 상자(높이·위 끝)에 맞춘다 (BS 3-1: 한문 기관명 조합도 동일한 규칙).
const HANJA_TOP = 0.8
const HANJA_BOTTOM = -0.066
const HANJA_H = HANJA_TOP - HANJA_BOTTOM

const isHanja = (cp: number) =>
  (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff)

interface PlacedGlyph {
  glyph: Glyph
  char: string
  font: FontKey
  /** 원점 기준 x */
  x: number
  /** 기준선 보정 (한자) */
  dy: number
  size: number
}

interface Line {
  glyphs: PlacedGlyph[]
  /** 기준선 0, 원점 0 기준 잉크 영역 */
  ink: Box
  /** 글자상자 기준 폭 (원점 ~ 마지막 글자 advance) */
  advance: number
  script: Script
  /** 줄 상자의 위 끝(기준선 기준, 음수) */
  top: number
  height: number
}

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

const emptyBox = (): Box => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity })
const unionBox = (a: Box, b: Box): Box => ({
  x0: Math.min(a.x0, b.x0),
  y0: Math.min(a.y0, b.y0),
  x1: Math.max(a.x1, b.x1),
  y1: Math.max(a.y1, b.y1),
})
const shiftBox = (b: Box, dx: number, dy: number): Box => ({
  x0: b.x0 + dx,
  y0: b.y0 + dy,
  x1: b.x1 + dx,
  y1: b.y1 + dy,
})

/**
 * 한 줄을 조판한다.
 * @param height 가이드가 지정한 글자 높이 (한글: 잉크 높이, 영문: 대문자 높이), 내부 단위
 * @param inkGap 지정 시 글자 잉크 사이 간격을 고정 (3자 이하 기관명)
 */
function setLine(fonts: Fonts, text: string, script: Script, height: number, inkGap?: number): Line {
  const fontSize = height / (script === 'ko' ? KO_H : EN_H)
  const top = -(script === 'ko' ? KO_TOP : EN_TOP) * fontSize
  const hanjaSize = height / HANJA_H
  // 한자 잉크 위 끝을 한글 잉크 위 끝에 맞춘다
  const hanjaDy = top + HANJA_TOP * hanjaSize
  const glyphs: PlacedGlyph[] = []
  const ink = emptyBox()
  let x = 0
  let prev: PlacedGlyph | null = null
  let prevInkRight: number | null = null
  for (const ch of Array.from(text)) {
    let key: FontKey = 'rokg'
    let glyph = fonts.rokg.charToGlyph(ch)
    if (fonts.hanja && isHanja(ch.codePointAt(0)!)) {
      const g = fonts.hanja.charToGlyph(ch)
      if (g.index !== 0) {
        key = 'hanja'
        const kor = koreanHanjaMap(fonts.hanja).get(g.index)
        glyph = kor !== undefined ? fonts.hanja.glyphs.get(kor) : g
      }
    }
    const font = key === 'hanja' ? fonts.hanja! : fonts.rokg
    const size = key === 'hanja' ? hanjaSize : fontSize
    const dy = key === 'hanja' ? hanjaDy : 0
    const scale = size / font.unitsPerEm
    const tracking = (script === 'ko' ? KO_TRACKING : EN_TRACKING) * size
    const bb = glyph.getBoundingBox()
    const hasInk = bb.x2 > bb.x1
    if (inkGap !== undefined && hasInk && prevInkRight !== null) {
      x = prevInkRight + inkGap - bb.x1 * scale
    } else if (prev && prev.font === key) {
      x += (font.getKerningValue(prev.glyph, glyph) || 0) * scale
    }
    const placed: PlacedGlyph = { glyph, char: ch, font: key, x, dy, size }
    glyphs.push(placed)
    if (hasInk) {
      ink.x0 = Math.min(ink.x0, x + bb.x1 * scale)
      ink.x1 = Math.max(ink.x1, x + bb.x2 * scale)
      ink.y0 = Math.min(ink.y0, dy - bb.y2 * scale)
      ink.y1 = Math.max(ink.y1, dy - bb.y1 * scale)
      prevInkRight = x + bb.x2 * scale
    } else if (inkGap !== undefined && prevInkRight !== null) {
      // 공백은 간격을 한 번 더 둔다
      prevInkRight += inkGap
    }
    x += (glyph.advanceWidth ?? 0) * scale + tracking
    prev = placed
  }
  if (!glyphs.length) Object.assign(ink, { x0: 0, x1: 0, y0: 0, y1: 0 })
  return { glyphs, ink, advance: x, script, top, height }
}

interface PlacedLine {
  line: Line
  /** 원점 x */
  x: number
  /** 기준선 y */
  y: number
}

/** 줄 상자의 위 끝이 top 이 되도록 기준선 y 를 구한다 */
const baselineFor = (line: Line, top: number) => top - line.top

function lineInk(p: PlacedLine): Box {
  return shiftBox(p.line.ink, p.x, p.y)
}

// opentype.js 의 toPathData 는 1e-14 같은 소수부에서 NaN 을 내므로 직접 직렬화한다.
function linePath(p: PlacedLine): string {
  const out: string[] = []
  for (const { glyph, x, dy, size } of p.line.glyphs) {
    for (const c of glyph.getPath(p.x + x, p.y + dy, size).commands) {
      switch (c.type) {
        case 'M':
        case 'L':
          out.push(`${c.type}${fmt(c.x)} ${fmt(c.y)}`)
          break
        case 'Q':
          out.push(`Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}`)
          break
        case 'C':
          out.push(`C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}`)
          break
        case 'Z':
          out.push('Z')
          break
      }
    }
  }
  return out.join('')
}

const fmt = (n: number) => {
  const v = Math.round(n * 100) / 100
  return Object.is(v, -0) ? '0' : String(v)
}

/* ─────────────────────────── 줄 나누기 ─────────────────────────── */

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 영문 기관명을 n 행으로 균형 있게 나눈다 */
function wrapBalanced(text: string, n: number): string[] {
  const words = text.trim().split(/\s+/)
  if (n <= 1 || words.length <= 1) return [words.join(' ')]
  let best: string[] = [text]
  let bestScore = Infinity
  // 단어 경계 조합 완전 탐색 (기관명 길이에서는 충분히 작다)
  const rec = (start: number, k: number, acc: string[]) => {
    if (k === 1) {
      const lines = [...acc, words.slice(start).join(' ')]
      const lens = lines.map((l) => l.length)
      // 가장 긴 줄이 짧을수록, 'the'/'and' 앞에서 끊을수록 좋다 (가이드 예시: "The Government of / the Republic of Korea")
      const bonus = lines.slice(1).filter((l) => /^(the|and)\b/i.test(l)).length * 5
      const score = Math.max(...lens) - bonus + (lens[0] < lens[lens.length - 1] ? 0.1 : 0)
      if (score < bestScore) {
        bestScore = score
        best = lines
      }
      return
    }
    for (let i = start + 1; i <= words.length - k + 1; i++) {
      rec(i, k - 1, [...acc, words.slice(start, i).join(' ')])
    }
  }
  rec(0, Math.min(n, words.length), [])
  return best
}

export function englishLines(text: string, auto: boolean, forceLines?: number): string[] {
  const manual = splitLines(text)
  if (!auto || manual.length > 1) return manual
  const t = manual[0] ?? ''
  // 25자 이하 1행, 50자 미만 2행, 50자 이상 3행 (BS 3-1-05)
  const n = forceLines ?? (t.length <= 25 ? 1 : t.length < 50 ? 2 : 3)
  return wrapBalanced(t, n)
}

const hangulCount = (s: string) => Array.from(s.replace(/\s/g, '')).length

/* ─────────────────────────── 조합 규정 ─────────────────────────── */

export interface Composition {
  lines: PlacedLine[]
  /** 문양 + 글자 잉크 영역 */
  content: Box
  /** 보호공간 */
  clear: { top: number; right: number; bottom: number; left: number }
  /** 규정 안내 (UI 표시용) */
  notes: string[]
}

const EMBLEM_BOX: Box = {
  x0: EMBLEM_INK.left,
  y0: EMBLEM_INK.top,
  x1: EMBLEM_INK.right,
  y1: EMBLEM_INK.bottom,
}

/** 세로조합: 줄들을 문양 아래에 중앙정렬로 쌓는다. spec = [간격, 높이, 간격, 높이 ...] */
function stackVertical(items: { line: Line; gapBefore: number }[]): PlacedLine[] {
  let y = EMBLEM_INK.bottom
  return items.map(({ line, gapBefore }) => {
    const top = y + gapBefore
    const baseline = baselineFor(line, top)
    y = top + line.height
    const cx = (line.ink.x0 + line.ink.x1) / 2
    return { line, x: -cx, y: baseline }
  })
}

/** 가로조합: 문양 위 끝(-R)을 기준으로 위 여백부터 줄들을 쌓는다 */
function stackHorizontal(
  items: { line: Line; gapBefore: number }[],
  startY: number,
  originX: number,
  alignInk: boolean,
): PlacedLine[] {
  let y = startY
  return items.map(({ line, gapBefore }) => {
    const top = y + gapBefore
    y = top + line.height
    const x = alignInk ? originX - line.ink.x0 : originX
    return { line, x, y: baselineFor(line, top) }
  })
}

export function compose(font: Fonts, o: SymbolOptions): Composition {
  const notes: string[] = []
  let lines: PlacedLine[] = []
  const vertical = o.orientation === 'vertical'
  const horizontal = o.orientation === 'horizontal'

  const ko = splitLines(o.nameKo)
  const parent = o.parentKo.trim()
  const hasParent = o.lang === 'ko' && parent.length > 0

  if (o.orientation !== 'emblem') {
    if (o.lang === 'ko' && hasParent) {
      /* BS 3-3-05 본부 병기형 */
      const org = ko.join(' ')
      if (vertical) {
        notes.push('BS 3-3-05 본부 병기형 세로조합: 3.5r · 3.25r · 2r · 3.9r')
        lines = stackVertical([
          { line: setLine(font, parent, 'ko', r(3.25)), gapBefore: r(3.5) },
          { line: setLine(font, org, 'ko', r(3.9)), gapBefore: r(2) },
        ])
      } else if (o.parentType === 'C') {
        notes.push('BS 3-3-05 본부 병기형 가로조합 C: 10r 1행, 기관명 사이 5r')
        const a = setLine(font, parent, 'ko', r(10))
        const b = setLine(font, org, 'ko', r(10))
        const ox = EMBLEM_INK.right + r(5.5)
        const y = baselineFor(a, -r(5))
        lines = [
          { line: a, x: ox, y },
          { line: b, x: ox + a.ink.x1 + r(5) - b.ink.x0, y },
        ]
      } else {
        const [m, ph, g, oh] =
          o.parentType === 'A' ? [2.3, 5.5, 2.4, 7.5] : [1.7, 7, 2.6, 7]
        notes.push(
          `BS 3-3-05 본부 병기형 가로조합 ${o.parentType}: ${m}r · ${ph}r · ${g}r · ${oh}r · ${m}r`,
        )
        lines = stackHorizontal(
          [
            { line: setLine(font, parent, 'ko', r(ph)), gapBefore: r(m) },
            { line: setLine(font, org, 'ko', r(oh)), gapBefore: r(g) },
          ],
          -r(10),
          EMBLEM_INK.right + r(5.5),
          false,
        )
      }
    } else if (o.lang === 'ko') {
      /* BS 3-1-02 ~ 3-1-04 국문/한문 */
      const count = hangulCount(ko.join(''))
      const short = count > 0 && count <= 3 && ko.length === 1
      const long = count >= 10
      const gap = short ? r(Math.min(2.5, Math.max(0, o.shortGap))) : undefined
      if (vertical) {
        if (short) {
          notes.push('BS 3-1-03 3자 이하 세로: 기관명 110% 확대, 글자 사이 최대 2.5r')
          lines = stackVertical([{ line: setLine(font, ko[0], 'ko', r(5.75 * 1.1), gap), gapBefore: r(5) }])
        } else if (long) {
          notes.push('BS 3-1-04 10자 이상 세로: 기관명 85% 축소 (4.9r), 2행 시 행간 1.8r')
          lines = stackVertical(
            ko.map((t, i) => ({ line: setLine(font, t, 'ko', r(4.9)), gapBefore: r(i ? 1.8 : 5) })),
          )
        } else {
          notes.push('BS 3-1-02 기본형 세로조합: 간격 5r, 기관명 5.75r, 중앙정렬')
          lines = stackVertical(
            ko.map((t, i) => ({ line: setLine(font, t, 'ko', r(5.75)), gapBefore: r(i ? 1.8 : 5) })),
          )
        }
      } else if (horizontal) {
        const ox = EMBLEM_INK.right + r(5.5)
        if (ko.length >= 2) {
          notes.push('BS 3-1-04 10자 이상 2행 가로: 70% 축소 (7r), 1.7r · 7r · 2.6r · 7r · 1.7r')
          lines = stackHorizontal(
            ko.slice(0, 2).map((t, i) => ({ line: setLine(font, t, 'ko', r(7)), gapBefore: r(i ? 2.6 : 1.7) })),
            -r(10),
            ox,
            false,
          )
        } else {
          notes.push(
            short
              ? 'BS 3-1-03 3자 이하 가로: 기본 크기(10r) 유지, 글자 사이 최대 2.5r'
              : 'BS 3-1-02 기본형 가로조합: 간격 5.5r, 기관명 10r (5r · 10r · 5r), 좌측정렬',
          )
          lines = stackHorizontal([{ line: setLine(font, ko[0] ?? '', 'ko', r(10), gap), gapBefore: r(5) }], -r(10), ox, false)
        }
      }
    } else if (o.lang === 'en') {
      /* BS 3-1-05 / 3-1-06 영문 */
      const en = o.enAbbr ? [splitLines(o.nameEn).join(' ')] : englishLines(o.nameEn, o.enAutoWrap)
      const n = en.length
      if (vertical) {
        if (o.enAbbr) {
          notes.push('BS 3-1-05 영문약칭 세로: 간격 4.5r, 5.5r')
          lines = stackVertical([{ line: setLine(font, en[0], 'en', r(5.5)), gapBefore: r(4.5) }])
        } else if (n === 1) {
          notes.push('BS 3-1-05 영문 25자 이하 세로: 간격 4.5r, 3.5r 1행')
          lines = stackVertical([{ line: setLine(font, en[0], 'en', r(3.5)), gapBefore: r(4.5) }])
        } else {
          notes.push(`BS 3-1-05 영문 ${n}행 세로: 간격 4.5r, 행간 2.27r`)
          lines = stackVertical(en.map((t, i) => ({ line: setLine(font, t, 'en', r(2.99)), gapBefore: r(i ? 2.27 : 4.5) })))
        }
      } else if (horizontal) {
        const ox = EMBLEM_INK.right + r(5)
        if (o.enAbbr) {
          notes.push('BS 3-1-06 영문약칭 가로: 6r · 8r · 6r')
          lines = stackHorizontal([{ line: setLine(font, en[0], 'en', r(8)), gapBefore: r(6) }], -r(10), ox, true)
        } else if (n === 1) {
          notes.push('BS 3-1-06 영문 25자 이하 가로: 7.25r · 5.5r · 7.25r')
          lines = stackHorizontal([{ line: setLine(font, en[0], 'en', r(5.5)), gapBefore: r(7.25) }], -r(10), ox, true)
        } else {
          notes.push(`BS 3-1-06 영문 ${n}행 가로: 위 여백 3.5r, 행간 3.3r, 좌측정렬`)
          lines = stackHorizontal(
            en.map((t, i) => ({ line: setLine(font, t, 'en', r(4.85)), gapBefore: r(i ? 3.3 : 3.5) })),
            -r(10),
            ox,
            true,
          )
        }
      }
    } else {
      /* BS 3-03 / 3-04 국영문·한영문 혼용 */
      const typeA = o.bilingualType === 'A'
      const koText = ko.join(' ')
      const en = typeA ? englishLines(o.nameEn, true, 2) : [splitLines(o.nameEn).join(' ')]
      if (vertical) {
        if (typeA) {
          notes.push('BS 3-03 국영문 혼용 Type A 세로: 5r · 5.75r · 3.25r · 영문 2행(행간 1.73r)')
          lines = stackVertical([
            { line: setLine(font, koText, 'ko', r(5.75)), gapBefore: r(5) },
            ...en.map((t, i) => ({ line: setLine(font, t, 'en', r(2.26)), gapBefore: r(i ? 1.73 : 3.25) })),
          ])
        } else {
          notes.push('BS 3-03 국영문 혼용 Type B 세로: 5r · 5.75r · 2.75r · 2.25r')
          lines = stackVertical([
            { line: setLine(font, koText, 'ko', r(5.75)), gapBefore: r(5) },
            { line: setLine(font, en[0] ?? '', 'en', r(2.25)), gapBefore: r(2.75) },
          ])
        }
      } else if (horizontal) {
        notes.push(
          typeA
            ? 'BS 3-03 국영문 혼용 Type A 가로: 2.75r · 8.5r · 3r · 3r · 2.75r · 3r'
            : 'BS 3-03 국영문 혼용 Type B 가로: 2.75r · 8.5r · 3r · 3r · 2.75r',
        )
        lines = stackHorizontal(
          [
            { line: setLine(font, koText, 'ko', r(8.5)), gapBefore: r(2.75) },
            ...en.map((t, i) => ({ line: setLine(font, t, 'en', r(3)), gapBefore: r(i ? 2.75 : 3) })),
          ],
          -r(10),
          EMBLEM_INK.right + r(5),
          true,
        )
      }
    }
  } else {
    notes.push('BS 1-04 정부상징 문양 단독 사용')
  }

  // 빈 줄 제거
  lines = lines.filter((p) => p.line.glyphs.length > 0)

  let content = EMBLEM_BOX
  if (o.outline) {
    content = unionBox(content, {
      x0: -OUTLINE_RADIUS,
      y0: -OUTLINE_RADIUS,
      x1: OUTLINE_RADIUS,
      y1: OUTLINE_RADIUS,
    })
  }
  for (const p of lines) content = unionBox(content, lineInk(p))

  // BS 1-01 보호공간: 세로 5r, 가로 좌우 8r · 상하 5r
  const clear =
    o.orientation === 'horizontal'
      ? { top: r(5), right: r(8), bottom: r(5), left: r(8) }
      : { top: r(5), right: r(5), bottom: r(5), left: r(5) }

  return { lines, content, clear, notes }
}

/* ─────────────────────────── 색상 ─────────────────────────── */

export interface Palette {
  /** 청색 부분 */
  primary: string
  /** 적색 부분 (솔리드는 primary 와 동일) */
  secondary: string
  text: string
  outline: string | null
  solid: boolean
}

/** 상대 휘도 (sRGB) */
export function luminance(hex: string): number {
  const m = hex.replace('#', '')
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const [rr, gg, bb] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb
}

/** BS 1-05: 명도대비 40% 이상의 배경에서는 기관명을 백색으로 */
export function isDarkBackground(bg: string | null) {
  if (!bg) return false
  // 명도 60% 이하 ≒ 상대휘도 0.29 이하
  return luminance(bg) < 0.29
}

export function palette(o: SymbolOptions): Palette {
  const dark = isDarkBackground(o.background)
  const toneColor = {
    black: COLORS.black,
    blue: COLORS.blue,
    gold: COLORS.gold,
    silver: COLORS.silver,
  }[o.tone]

  if (o.style === 'solid') {
    if (o.negative) {
      return { primary: COLORS.white, secondary: COLORS.white, text: COLORS.white, outline: null, solid: true }
    }
    return { primary: toneColor, secondary: toneColor, text: toneColor, outline: null, solid: true }
  }
  const outline = o.outline ? COLORS.white : null
  if (o.style === 'twotone') {
    const isBlue = o.tone === 'blue'
    return {
      primary: isBlue ? COLORS.blue : COLORS.black,
      secondary: isBlue ? COLORS.blue40 : COLORS.black60,
      text: dark ? COLORS.white : isBlue ? COLORS.blue : COLORS.black,
      outline,
      solid: false,
    }
  }
  return {
    primary: COLORS.blue,
    secondary: COLORS.red,
    text: dark ? COLORS.white : COLORS.gray,
    outline,
    solid: false,
  }
}

/* ─────────────────────────── SVG 출력 ─────────────────────────── */

export interface RenderResult {
  svg: string
  viewBox: { x: number; y: number; w: number; h: number }
  /** viewBox 단위 크기 */
  width: number
  height: number
  /** 문양 지름이 차지하는 비율 (최소크기 검사용) */
  emblemRatio: number
  composition: Composition
}

export interface SvgOptions {
  /** true: 글자를 윤곽선(shape)으로 변환 / false: <text> 요소 + 웹폰트 */
  expand: boolean
}

export const DEFAULT_SVG_OPTIONS: SvgOptions = { expand: true }

const ROKG_FAMILY = '대한민국정부상징체'

interface TextRun {
  font: FontKey
  size: number
  y: number
  xs: number[]
  chars: string[]
}

/** 같은 글꼴·크기의 연속 글자를 묶는다. 공백은 다른 글꼴 사이에 있으면 앞 묶음에 붙인다. */
function textRuns(lines: PlacedLine[]): TextRun[] {
  const runs: TextRun[] = []
  for (const p of lines) {
    let cur: TextRun | null = null
    for (const g of p.line.glyphs) {
      if (!g.char.trim()) {
        if (cur) {
          cur.xs.push(p.x + g.x)
          cur.chars.push(g.char)
        }
        continue
      }
      const y = p.y + g.dy
      if (!cur || cur.font !== g.font || cur.size !== g.size || cur.y !== y) {
        cur = { font: g.font, size: g.size, y, xs: [], chars: [] }
        runs.push(cur)
      }
      cur.xs.push(p.x + g.x)
      cur.chars.push(g.char)
    }
  }
  return runs
}

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

/** 사용한 글자만 담은 OpenType(CFF) 서브셋을 만든다 */
export function subsetFont(font: Font, chars: Iterable<string>, family: string): ArrayBuffer {
  const byIndex = new Map<number, { glyph: Glyph; unicodes: number[] }>()
  for (const ch of new Set(chars)) {
    const g = font.charToGlyph(ch)
    if (!g.index) continue
    const e = byIndex.get(g.index) ?? { glyph: g, unicodes: [] }
    e.unicodes.push(ch.codePointAt(0)!)
    byIndex.set(g.index, e)
  }
  const notdef = font.glyphs.get(0)
  const glyphs = [
    new OTGlyph({ name: '.notdef', unicode: 0, advanceWidth: notdef.advanceWidth ?? font.unitsPerEm, path: new OTPath() }),
    ...Array.from(byIndex.values(), ({ glyph, unicodes }, i) =>
      new OTGlyph({
        name: `g${i + 1}`,
        unicode: unicodes[0],
        unicodes,
        advanceWidth: glyph.advanceWidth ?? 0,
        path: glyph.path,
      }),
    ),
  ]
  const sub = new OTFont({
    familyName: family,
    styleName: 'Regular',
    unitsPerEm: font.unitsPerEm,
    ascender: font.ascender,
    descender: font.descender,
    glyphs,
  })
  return sub.toArrayBuffer()
}

/**
 * <text> 출력. 정부상징체는 사용한 글자만 담은 서브셋을 SVG 안에 웹폰트로 포함하고,
 * 한문은 jsDelivr 의 Pretendard JP 를 불러와 한국 한자 표기 모드(ss05)로 표시한다.
 */
function textElements(fonts: Fonts, lines: PlacedLine[], fill: string): string {
  const runs = textRuns(lines)
  if (!runs.length) return ''
  const used = new Set(runs.map((r) => r.font))
  const css: string[] = []
  if (used.has('hanja')) css.push(`@import url('${PRETENDARD_JP_CSS}');`)
  if (used.has('rokg')) {
    const chars = runs.filter((r) => r.font === 'rokg').flatMap((r) => r.chars)
    // 글꼴 내부 이름(CFF)은 ASCII 여야 한다. CSS font-family 는 별도로 지정.
    const data = toBase64(subsetFont(fonts.rokg, chars, 'ROKG'))
    css.push(`@font-face{font-family:'${ROKG_FAMILY}';src:url(data:font/otf;base64,${data}) format('opentype');}`)
    css.push(`.t-rokg{font-family:'${ROKG_FAMILY}';font-weight:normal;white-space:pre;}`)
  }
  if (used.has('hanja')) {
    css.push(`.t-hanja{font-family:'Pretendard JP';font-weight:500;font-feature-settings:'ss05';white-space:pre;}`)
  }
  const texts = runs.map(
    (r) =>
      `<text class="t-${r.font}" font-size="${fmt(r.size)}" x="${r.xs.map(fmt).join(' ')}" y="${fmt(r.y)}" xml:space="preserve">${escapeXml(r.chars.join(''))}</text>`,
  )
  return `<defs><style>${css.join('')}</style></defs><g fill="${fill}">${texts.join('')}</g>`
}

export function renderSVG(
  fonts: Fonts,
  o: SymbolOptions,
  title = '정부상징',
  svgOptions: SvgOptions = DEFAULT_SVG_OPTIONS,
): RenderResult {
  const comp = compose(fonts, o)
  const pal = palette(o)
  const pad = o.clearSpace ? comp.clear : { top: 0, right: 0, bottom: 0, left: 0 }
  const x0 = comp.content.x0 - pad.left
  const y0 = comp.content.y0 - pad.top
  const w = comp.content.x1 + pad.right - x0
  const h = comp.content.y1 + pad.bottom - y0

  const parts: string[] = []
  if (o.background) {
    parts.push(`<rect x="${fmt(x0)}" y="${fmt(y0)}" width="${fmt(w)}" height="${fmt(h)}" fill="${o.background}"/>`)
  }
  const g: string[] = []
  if (pal.outline) g.push(`<circle cx="0" cy="0" r="${OUTLINE_RADIUS}" fill="${pal.outline}"/>`)
  if (pal.solid) {
    g.push(`<path fill="${pal.primary}" d="${EMBLEM_SOLID_A}${EMBLEM_SOLID_B}"/>`)
  } else {
    g.push(`<path fill="${pal.primary}" d="${EMBLEM_BLUE}"/>`)
    g.push(`<path fill="${pal.secondary}" d="${EMBLEM_RED}"/>`)
  }
  if (svgOptions.expand) {
    const textPath = comp.lines.map(linePath).join('')
    if (textPath) g.push(`<path fill="${pal.text}" d="${textPath}"/>`)
  } else {
    g.push(textElements(fonts, comp.lines, pal.text))
  }
  const opacity = o.opacity < 1 ? ` opacity="${fmt(o.opacity)}"` : ''
  parts.push(`<g${opacity}>${g.join('')}</g>`)

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(x0)} ${fmt(y0)} ${fmt(w)} ${fmt(h)}" width="${fmt(w)}" height="${fmt(h)}">` +
    `<title>${escapeXml(title)}</title>` +
    parts.join('') +
    `</svg>`
  return { svg, viewBox: { x: x0, y: y0, w, h }, width: w, height: h, emblemRatio: 200 / w, composition: comp }
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)
}
