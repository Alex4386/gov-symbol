import { useMemo, useState } from 'react'
import {
  ClipboardCopyIcon,
  DownloadIcon,
  FileCodeIcon,
  ImageIcon,
  InfoIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/reui/alert'
import { Badge } from '@/components/reui/badge'
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerFields,
  ColorPickerPanel,
  ColorPickerSlider,
  ColorPickerSwatches,
  ColorPickerTrigger,
} from '@/components/reui/color-picker'
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from '@/components/reui/frame'
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/reui/number-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Toaster } from '@/components/ui/sonner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { COLORS, EMBLEM_BLUE, EMBLEM_RED } from '@/lib/emblem'
import {
  copyPNG,
  copySVG,
  downloadRaster,
  downloadSVG,
  safeName,
  type RasterFormat,
} from '@/lib/export'
import {
  DEFAULT_OPTIONS,
  isDarkBackground,
  renderSVG,
  type Lang,
  type Orientation,
  type ParentType,
  type RenderResult,
  type Style,
  type SymbolOptions,
  type Tone,
} from '@/lib/layout'
import { PRESETS } from '@/lib/presets'
import { useFonts } from '@/lib/use-fonts'

const ORIENTATION_LABEL: Record<Orientation, string> = {
  emblem: '문양',
  vertical: '세로조합',
  horizontal: '가로조합',
}
const STYLE_LABEL: Record<Style, string> = {
  color: '기본형',
  twotone: '단색형1',
  solid: '단색형2',
}

const BACKGROUNDS: { value: string; label: string; color: string | null }[] = [
  { value: 'none', label: '투명', color: null },
  { value: 'white', label: '백색', color: COLORS.white },
  { value: 'blue', label: '정부청색', color: COLORS.blue },
  { value: 'black', label: '검정', color: COLORS.black },
]

/** Base UI ToggleGroup 은 배열 값을 쓰므로 단일 선택으로 감싼다 */
function Segmented<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T
  onChange: (v: T) => void
  items: { value: T; label: string; disabled?: boolean }[]
  className?: string
}) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as T)}
      className={className ?? 'w-full'}
    >
      {items.map((it) => (
        <ToggleGroupItem key={it.value} value={it.value} disabled={it.disabled} className="flex-1">
          {it.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  )
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-start justify-between gap-3 py-0.5">
      <span className="grid gap-0.5">
        <span className="text-sm">{label}</span>
        {hint && <span className="text-[11px] leading-snug text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  )
}

/** 미리보기용: 보호공간·중심축 가이드를 덧그린다 */
function withGuides(res: RenderResult, o: SymbolOptions) {
  const { x, y, w, h } = res.viewBox
  const c = res.composition.content
  const stroke = 'stroke="#00AEEF" fill="none" vector-effect="non-scaling-stroke"'
  const guide = [
    // 보호공간 (Clear Space)
    o.clearSpace
      ? `<path fill="#00AEEF" fill-opacity="0.12" fill-rule="evenodd" d="M${x} ${y}h${w}v${h}h${-w}Z M${c.x0} ${c.y0}V${c.y1}H${c.x1}V${c.y0}Z"/>`
      : '',
    `<rect x="${c.x0}" y="${c.y0}" width="${c.x1 - c.x0}" height="${c.y1 - c.y0}" ${stroke} stroke-dasharray="4 3" stroke-width="1"/>`,
    // 문양 원 · 중심축
    `<circle cx="0" cy="0" r="100" ${stroke} stroke-width="1" stroke-dasharray="2 2"/>`,
    `<line x1="0" y1="${y}" x2="0" y2="${y + h}" ${stroke} stroke-width="1" stroke-dasharray="2 2"/>`,
    `<line x1="${x}" y1="0" x2="${x + w}" y2="0" ${stroke} stroke-width="1" stroke-dasharray="2 2"/>`,
  ].join('')
  return res.svg.replace('</svg>', `<g pointer-events="none">${guide}</g></svg>`)
}

function SvgView({ svg, className }: { svg: string; className?: string }) {
  return (
    <div
      className={className}
      // 직접 생성한 SVG 문자열 (사용자 입력은 윤곽선 path 로만 들어간다)
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default function App() {
  const { fonts: font, error, hanjaError, hanjaLoading } = useFonts()
  const [o, setO] = useState<SymbolOptions>(DEFAULT_OPTIONS)
  const [showGuides, setShowGuides] = useState(false)
  const [exportWidth, setExportWidth] = useState(2000)
  const [rasterFormat, setRasterFormat] = useState<RasterFormat>('png')
  const [svgExpand, setSvgExpand] = useState(true)
  const [bgCustom, setBgCustom] = useState<string>('#E9EEF9')

  const set = <K extends keyof SymbolOptions>(k: K, v: SymbolOptions[K]) => setO((p) => ({ ...p, [k]: v }))

  const title = useMemo(() => {
    if (o.orientation === 'emblem') return '정부상징'
    if (o.lang === 'en') return o.nameEn.replace(/\n/g, ' ')
    return [o.lang === 'ko' ? o.parentKo : '', o.nameKo.replace(/\n/g, ' ')].filter(Boolean).join(' ')
  }, [o])

  const result = useMemo(() => (font ? renderSVG(font, o, title) : null), [font, o, title])

  const thumbs = useMemo(() => {
    if (!font) return []
    return (['vertical', 'horizontal', 'emblem'] as Orientation[]).map((orientation) => ({
      orientation,
      svg: renderSVG(font, { ...o, orientation, clearSpace: true }, title).svg,
    }))
  }, [font, o, title])

  /** 내보내기용 SVG (미리보기·이미지 변환은 항상 윤곽선 버전을 쓴다) */
  const exportSvg = () => {
    if (!font) throw new Error('글꼴을 불러오는 중입니다')
    return renderSVG(font, o, title, { expand: svgExpand }).svg
  }

  const bgValue = BACKGROUNDS.find((b) => b.color === o.background)?.value ?? (o.background ? 'custom' : 'none')
  const dark = isDarkBackground(o.background)
  const hasHanja = o.lang !== 'en' && /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(o.nameKo + o.parentKo)
  const needsOutline =
    !!o.background && o.background.toUpperCase() !== COLORS.white && o.style !== 'solid' && !o.outline

  const exportHeight = result ? Math.round((exportWidth * result.height) / result.width) : 0
  const emblemPx = result ? exportWidth * result.emblemRatio : 0
  const baseName = `${safeName(title)}_${ORIENTATION_LABEL[o.orientation]}_${STYLE_LABEL[o.style]}`

  const run = async (fn: () => Promise<void> | void, ok: string) => {
    try {
      await fn()
      toast.success(ok)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  const applyPreset = (label: string) => {
    const p = PRESETS.find((x) => x.label === label)
    if (p) setO((prev) => ({ ...prev, ...p.options }))
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <svg viewBox="-102 -102 204 204" className="size-8 shrink-0" aria-hidden>
            <path fill={COLORS.blue} d={EMBLEM_BLUE} />
            <path fill={COLORS.red} d={EMBLEM_RED} />
          </svg>
          <div className="min-w-0">
            <h1 className="font-rokg text-lg leading-tight">정부상징 생성기</h1>
            <p className="truncate text-xs text-muted-foreground">
              「대한민국 정부상징체계 디자인 가이드」(2017 개정판) 기본체계 규정에 따라 기관상징 조합을 생성합니다
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setO(DEFAULT_OPTIONS)}
          >
            <RotateCcwIcon /> 초기화
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* ───────────── 설정 ───────────── */}
        <div className="grid content-start gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>기관명</CardTitle>
              <CardDescription>국문·영문은 대한민국 정부상징체, 한문은 Pretendard JP(한국 한자 표기)로 표기합니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field label="가이드 예시">
                <Select value={null} onValueChange={(v) => v && applyPreset(v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="예시 불러오기…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((p) => (
                      <SelectItem key={p.label} value={p.label}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="표기 언어">
                <Segmented<Lang>
                  value={o.lang}
                  onChange={(v) => set('lang', v)}
                  items={[
                    { value: 'ko', label: '국문·한문' },
                    { value: 'en', label: '영문' },
                    { value: 'ko-en', label: '국영문 혼용' },
                  ]}
                />
              </Field>

              {o.lang !== 'en' && (
                <Field
                  label="국문(한문) 기관명"
                  hint={
                    o.lang === 'ko'
                      ? '3자 이하는 확대·자간 확장, 10자 이상은 85% 축소됩니다. 줄바꿈으로 2행 조합.'
                      : undefined
                  }
                >
                  <Textarea
                    rows={2}
                    value={o.nameKo}
                    onChange={(e) => set('nameKo', e.target.value)}
                    className="font-rokg text-base"
                  />
                </Field>
              )}

              {o.lang === 'ko' && (
                <Field label="본부(상위기관) 병기" hint="소속기관인 경우 본부명을 입력하면 본부 병기형(BS 3-3-05)으로 조합합니다.">
                  <Input
                    value={o.parentKo}
                    placeholder="예: 문화체육관광부"
                    onChange={(e) => set('parentKo', e.target.value)}
                    className="font-rokg"
                  />
                </Field>
              )}

              {o.lang !== 'ko' && (
                <Field
                  label="영문 기관명"
                  hint={
                    o.lang === 'en'
                      ? '25자 이하 1행, 50자 미만 2행, 50자 이상 3행 (자동). 직접 줄바꿈하면 그대로 사용합니다.'
                      : 'Type A는 2행, Type B는 1행으로 표기합니다.'
                  }
                >
                  <Textarea
                    rows={2}
                    value={o.nameEn}
                    onChange={(e) => set('nameEn', e.target.value)}
                    className="font-rokg"
                  />
                </Field>
              )}

              {o.lang === 'en' && (
                <SwitchRow
                  label="영문약칭 조합"
                  hint="KoFIU 처럼 약칭을 크게 표기 (BS 3-1-05/06)"
                  checked={o.enAbbr}
                  onChange={(v) => set('enAbbr', v)}
                />
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>조합</CardTitle>
              <CardDescription>정부상징 문양 반지름 R = 10r 기준 비례</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field label="조합 방식">
                <Segmented<Orientation>
                  value={o.orientation}
                  onChange={(v) => set('orientation', v)}
                  items={[
                    { value: 'vertical', label: '세로조합' },
                    { value: 'horizontal', label: '가로조합' },
                    { value: 'emblem', label: '문양만' },
                  ]}
                />
              </Field>

              {o.lang === 'ko-en' && o.orientation !== 'emblem' && (
                <Field label="국영문 혼용 유형">
                  <Segmented<'A' | 'B'>
                    value={o.bilingualType}
                    onChange={(v) => set('bilingualType', v)}
                    items={[
                      { value: 'A', label: 'Type A (영문 2행)' },
                      { value: 'B', label: 'Type B (영문 1행)' },
                    ]}
                  />
                </Field>
              )}

              {o.lang === 'ko' && o.parentKo.trim() && o.orientation === 'horizontal' && (
                <Field
                  label="본부 병기형 가로조합"
                  hint="A: 본부명 작게 · B: 같은 크기 2행 · C: 1행"
                >
                  <Segmented<ParentType>
                    value={o.parentType}
                    onChange={(v) => set('parentType', v)}
                    items={[
                      { value: 'A', label: 'A type' },
                      { value: 'B', label: 'B type' },
                      { value: 'C', label: 'C type' },
                    ]}
                  />
                </Field>
              )}

              {o.lang === 'ko' &&
                !o.parentKo.trim() &&
                o.orientation !== 'emblem' &&
                Array.from(o.nameKo.replace(/\s/g, '')).length <= 3 && (
                  <Field label={`글자 사이 간격: ${o.shortGap.toFixed(1)}r`} hint="3자 이하 기관명 (최대 2.5r)">
                    <Slider
                      min={0}
                      max={2.5}
                      step={0.1}
                      value={[o.shortGap]}
                      onValueChange={(v) => set('shortGap', Array.isArray(v) ? v[0] : (v as number))}
                    />
                  </Field>
                )}

              <SwitchRow
                label="보호공간 포함"
                hint="세로·문양 5r, 가로 좌우 8r · 상하 5r 여백 (BS 1-01)"
                checked={o.clearSpace}
                onChange={(v) => set('clearSpace', v)}
              />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>색상 · 표현</CardTitle>
              <CardDescription>BS 1-03 ~ 1-08, BS 3-5-07</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field label="문양 유형">
                <Segmented<Style>
                  value={o.style}
                  onChange={(v) =>
                    setO((p) => ({
                      ...p,
                      style: v,
                      tone: v === 'twotone' && (p.tone === 'gold' || p.tone === 'silver') ? 'black' : p.tone,
                    }))
                  }
                  items={[
                    { value: 'color', label: '기본형' },
                    { value: 'twotone', label: '단색 투톤' },
                    { value: 'solid', label: '단색 솔리드' },
                  ]}
                />
              </Field>

              {o.style !== 'color' && (
                <Field label="단색 색상">
                  <Segmented<Tone>
                    value={o.tone}
                    onChange={(v) => set('tone', v)}
                    items={[
                      { value: 'black', label: 'Black' },
                      { value: 'blue', label: '정부청색' },
                      ...(o.style === 'solid'
                        ? [
                            { value: 'gold' as Tone, label: '금색' },
                            { value: 'silver' as Tone, label: '은색' },
                          ]
                        : []),
                    ]}
                  />
                </Field>
              )}

              <Field label="배경">
                <div className="flex items-center gap-2">
                  <Segmented<string>
                    className="flex-1"
                    value={bgValue}
                    onChange={(v) => {
                      if (v === 'custom') return set('background', bgCustom)
                      set('background', BACKGROUNDS.find((b) => b.value === v)?.color ?? null)
                    }}
                    items={[
                      ...BACKGROUNDS.map((b) => ({ value: b.value, label: b.label })),
                      { value: 'custom', label: '지정' },
                    ]}
                  />
                  <ColorPicker
                    value={bgCustom}
                    format="hex"
                    onValueChange={(v) => {
                      if (!v) return
                      setBgCustom(v)
                      set('background', v)
                    }}
                  >
                    <ColorPickerTrigger size="icon-sm" aria-label="배경색 지정" />
                    <ColorPickerContent>
                      <ColorPickerPanel>
                        <ColorPickerArea />
                        <ColorPickerSlider channel="hue" />
                        <ColorPickerFields />
                        <ColorPickerSwatches
                          colors={[COLORS.blue, COLORS.red, COLORS.gray, '#E9EEF9', COLORS.gold, COLORS.silver]}
                        />
                      </ColorPickerPanel>
                    </ColorPickerContent>
                  </ColorPicker>
                </div>
              </Field>

              {o.style !== 'solid' ? (
                <SwitchRow
                  label="테두리형"
                  hint="배경이 있는 경우 0.6r 백색 테두리를 사용 (BS 1-04)"
                  checked={o.outline}
                  onChange={(v) => set('outline', v)}
                />
              ) : (
                <SwitchRow
                  label="네거티브 (백색)"
                  hint="어두운 배경 위 백색 솔리드 표현"
                  checked={o.negative}
                  onChange={(v) => set('negative', v)}
                />
              )}

              <Field
                label={`농도: ${Math.round(o.opacity * 100)}%`}
                hint="워터마크는 단색형 2를 명도대비 20% 이하로 사용 (BS 3-5-07)"
              >
                <div className="flex items-center gap-3">
                  <Slider
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={[o.opacity]}
                    onValueChange={(v) => set('opacity', Array.isArray(v) ? v[0] : (v as number))}
                  />
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setO((p) => ({ ...p, style: 'solid', opacity: 0.2, negative: false }))}
                  >
                    워터마크
                  </Button>
                </div>
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* ───────────── 미리보기 · 내보내기 ───────────── */}
        <div className="grid min-w-0 content-start gap-4">
          {error && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertTitle>글꼴 로딩 실패</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {hasHanja && (hanjaLoading || hanjaError) && (
            <Alert variant={hanjaError ? 'warning' : 'info'}>
              {hanjaError ? <TriangleAlertIcon /> : <InfoIcon />}
              <AlertTitle>
                {hanjaError ? '한문 글꼴(Pretendard JP)을 불러오지 못했습니다' : '한문 글꼴(Pretendard JP)을 불러오는 중…'}
              </AlertTitle>
              <AlertDescription>
                {hanjaError ?? 'jsDelivr 에서 받는 동안 한자는 정부상징체 글리프로 임시 표시됩니다.'}
              </AlertDescription>
            </Alert>
          )}

          <Frame>
            <FrameHeader className="flex flex-row flex-wrap items-center gap-2">
              <div className="mr-auto">
                <FrameTitle>미리보기</FrameTitle>
                <FrameDescription>
                  {ORIENTATION_LABEL[o.orientation]} · {STYLE_LABEL[o.style]}
                  {o.outline && o.style !== 'solid' ? ' (테두리형)' : ''}
                </FrameDescription>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                규정 가이드 표시
                <Switch size="sm" checked={showGuides} onCheckedChange={setShowGuides} />
              </label>
            </FrameHeader>
            <FramePanel className="bg-checker flex min-h-[360px] items-center justify-center overflow-hidden p-6 sm:p-10">
              {result ? (
                <SvgView
                  svg={showGuides ? withGuides(result, o) : result.svg}
                  className="w-full max-w-3xl [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-h-[52vh] [&>svg]:w-auto [&>svg]:max-w-full"
                />
              ) : (
                <p className="text-sm text-muted-foreground">대한민국 정부상징체를 불러오는 중…</p>
              )}
            </FramePanel>
            <FrameFooter className="flex flex-wrap gap-1.5">
              {result?.composition.notes.map((n) => (
                <Badge key={n} variant="outline" size="lg">
                  {n}
                </Badge>
              ))}
            </FrameFooter>
          </Frame>

          {needsOutline && (
            <Alert variant="info">
              <InfoIcon />
              <AlertTitle>배경이 있는 경우 테두리형을 사용합니다</AlertTitle>
              <AlertDescription>
                정부상징 문양은 백색배경 사용이 원칙이며, 다른 배경색 위에서는 테두리형으로 명시도를 확보합니다 (BS 1-05).
                {dark && ' 명도대비 40% 이상의 배경이므로 기관명은 백색으로 표시됩니다.'}
              </AlertDescription>
              <AlertAction>
                <Button size="xs" onClick={() => set('outline', true)}>
                  테두리형 적용
                </Button>
              </AlertAction>
            </Alert>
          )}

          <Card size="sm">
            <CardHeader>
              <CardTitle>내보내기</CardTitle>
              <CardDescription>벡터(SVG)는 인쇄물에, 이미지(PNG/JPG/WebP)는 화면용으로 사용합니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1 rounded-lg border p-3">
                <SwitchRow
                  label="Expand (윤곽선 변환)"
                  hint={
                    svgExpand
                      ? '글자를 도형(path)으로 변환합니다. 글꼴 없이 어디서나 동일하게 보이며 편집은 불가합니다.'
                      : '글자를 <text> 요소로 유지합니다. 정부상징체는 사용한 글자만 SVG 안에 웹폰트로 포함하고, 한문은 jsDelivr 의 Pretendard JP(ss05)를 불러옵니다.'
                  }
                  checked={svgExpand}
                  onChange={setSvgExpand}
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <Button
                  disabled={!result}
                  onClick={() => run(() => downloadSVG(exportSvg(), `${baseName}${svgExpand ? '' : '_text'}.svg`), 'SVG를 저장했습니다')}
                >
                  <FileCodeIcon /> SVG 다운로드
                </Button>
                <Button
                  variant="outline"
                  disabled={!result}
                  onClick={() => run(() => copySVG(exportSvg()), 'SVG 코드를 복사했습니다')}
                >
                  <ClipboardCopyIcon /> SVG 복사
                </Button>
              </div>

              <Separator />

              <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-end">
                <Field label="형식">
                  <Segmented<RasterFormat>
                    className="w-auto"
                    value={rasterFormat}
                    onChange={setRasterFormat}
                    items={[
                      { value: 'png', label: 'PNG' },
                      { value: 'jpeg', label: 'JPG' },
                      { value: 'webp', label: 'WebP' },
                    ]}
                  />
                </Field>
                <Field label="가로 크기 (px)">
                  <NumberField
                    value={exportWidth}
                    min={20}
                    max={16000}
                    step={100}
                    onValueChange={(v) => v != null && setExportWidth(Math.round(v))}
                    className="w-40"
                  >
                    <NumberFieldGroup>
                      <NumberFieldDecrement />
                      <NumberFieldInput />
                      <NumberFieldIncrement />
                    </NumberFieldGroup>
                  </NumberField>
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {[512, 1024, 2048, 4096].map((wpx) => (
                    <Button
                      key={wpx}
                      size="xs"
                      variant={exportWidth === wpx ? 'secondary' : 'ghost'}
                      onClick={() => setExportWidth(wpx)}
                    >
                      {wpx}
                    </Button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                출력 크기 {exportWidth} × {exportHeight}px · 문양 지름 약 {Math.round(emblemPx)}px
                {rasterFormat === 'jpeg' && !o.background && ' · JPG는 투명 배경을 지원하지 않아 백색으로 채웁니다'}
              </p>

              {emblemPx > 0 && emblemPx < 20 && (
                <Alert variant="warning">
                  <TriangleAlertIcon />
                  <AlertTitle>최소크기 미만</AlertTitle>
                  <AlertDescription>
                    화면용 정부상징 문양은 20px 이상이어야 합니다 (BS 1-01 최소크기: 화면 20px / 인쇄 8mm).
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={!result}
                  onClick={() =>
                    result &&
                    run(
                      () =>
                        downloadRaster(
                          result.svg,
                          exportWidth,
                          exportHeight,
                          rasterFormat,
                          `${baseName}_${exportWidth}px.${rasterFormat === 'jpeg' ? 'jpg' : rasterFormat}`,
                        ),
                      '이미지를 저장했습니다',
                    )
                  }
                >
                  <DownloadIcon /> {rasterFormat.toUpperCase()} 다운로드
                </Button>
                <Button
                  variant="outline"
                  disabled={!result}
                  onClick={() =>
                    result && run(() => copyPNG(result.svg, exportWidth, exportHeight), 'PNG 이미지를 복사했습니다')
                  }
                >
                  <ImageIcon /> PNG 복사
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>다른 조합</CardTitle>
              <CardDescription>클릭하면 해당 조합으로 전환합니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {thumbs.map((t) => (
                <button
                  key={t.orientation}
                  type="button"
                  onClick={() => set('orientation', t.orientation)}
                  data-active={o.orientation === t.orientation || undefined}
                  className="group grid gap-2 rounded-lg border bg-checker p-3 text-left transition hover:border-ring data-active:border-primary data-active:ring-2 data-active:ring-primary/20"
                >
                  <SvgView
                    svg={t.svg}
                    className="flex h-28 items-center justify-center [&>svg]:h-auto [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:max-w-full"
                  />
                  <span className="text-xs text-muted-foreground">{ORIENTATION_LABEL[t.orientation]}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
            정부상징 문양 벡터와 조합 비례는 「대한민국 정부상징체계 디자인 가이드」(2017 개정판)에서 추출했습니다. 한문(한자)은
            Pretendard JP Medium 의 한국 한자 표기 모드(ss05) 글리프로 표기합니다. 정부상징의 사용은 관련
            법령과 규정을 따르십시오.
          </p>
        </div>
      </main>
      <Toaster position="bottom-center" />
    </div>
  )
}
