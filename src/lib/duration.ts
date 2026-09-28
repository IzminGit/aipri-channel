/** ISO 8601 の期間（YouTube Data API の contentDetails.duration, 例 "PT2M9S"）を秒に変換 */
export function parseIsoDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso)
  if (!m) throw new Error(`Invalid ISO 8601 duration: ${iso}`)
  const [, d = '0', h = '0', min = '0', s = '0'] = m
  return Math.round(Number(d) * 86400 + Number(h) * 3600 + Number(min) * 60 + Number(s))
}
