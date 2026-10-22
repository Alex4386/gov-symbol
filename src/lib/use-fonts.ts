import { useEffect, useState } from 'react'

import { loadHanja, loadRokg } from './fonts'
import type { Fonts } from './layout'

/**
 * 정부상징체는 바로, 한문용 Pretendard JP 는 jsDelivr 에서 뒤이어 불러온다.
 * 한자 글꼴이 도착하기 전까지 한자는 정부상징체 글리프로 임시 표시된다.
 */
export function useFonts() {
  const [fonts, setFonts] = useState<Fonts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hanjaError, setHanjaError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadRokg().then(
      (rokg) => {
        if (!alive) return
        setFonts((f) => ({ rokg, hanja: f?.hanja ?? null }))
        loadHanja().then(
          (hanja) => alive && setFonts({ rokg, hanja }),
          (e: Error) => alive && setHanjaError(e.message),
        )
      },
      (e: Error) => alive && setError(e.message),
    )
    return () => {
      alive = false
    }
  }, [])
  return { fonts, error, hanjaError, hanjaLoading: !!fonts && !fonts.hanja && !hanjaError }
}
