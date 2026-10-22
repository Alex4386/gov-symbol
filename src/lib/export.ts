export type RasterFormat = 'png' | 'jpeg' | 'webp'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadSVG(svg: string, filename: string) {
  download(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n', svg], { type: 'image/svg+xml' }), filename)
}

function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

/**
 * SVG 를 래스터 이미지로 변환한다. 글자는 이미 윤곽선(path)이므로 글꼴 로딩이 필요 없다.
 * @param fill JPEG 처럼 투명도를 지원하지 않는 형식의 바탕색
 */
export async function rasterize(
  svg: string,
  width: number,
  height: number,
  format: RasterFormat,
  fill?: string,
): Promise<Blob> {
  const img = await loadImage(svg)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')!
  if (fill || format === 'jpeg') {
    ctx.fillStyle = fill ?? '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('이미지 변환 실패'))),
      `image/${format}`,
      0.95,
    ),
  )
}

export async function downloadRaster(
  svg: string,
  width: number,
  height: number,
  format: RasterFormat,
  filename: string,
  fill?: string,
) {
  download(await rasterize(svg, width, height, format, fill), filename)
}

export async function copySVG(svg: string) {
  await navigator.clipboard.writeText(svg)
}

export async function copyPNG(svg: string, width: number, height: number) {
  const blob = await rasterize(svg, width, height, 'png')
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

/** 파일명에 쓸 수 없는 문자 제거 */
export function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|\n\r]+/g, ' ').replace(/\s+/g, '_').slice(0, 80) || '정부상징'
}
