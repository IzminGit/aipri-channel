const dateLabel = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })

/** 公開日 2026/9/10 */
export const formatDate = (iso: string) => dateLabel.format(new Date(iso))

/** 再生時間 m:ss */
export function formatDuration(sec: number): string {
  const total = Math.max(0, Math.round(sec))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export type DescriptionPart = { text: string; href?: undefined } | { text: string; href: string }

/** 説明文の URL をリンクとして扱えるよう分割する */
export function splitLinks(text: string): DescriptionPart[] {
  const parts: DescriptionPart[] = []
  let last = 0
  for (const m of text.matchAll(/https?:\/\/[^\s<>"'（）「」、。]+/gu)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    parts.push({ text: m[0], href: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
