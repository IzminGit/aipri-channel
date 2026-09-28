import { useSyncExternalStore } from 'react'

/**
 * 全コンポーネントで共有する「現在時刻」。秒の境界に合わせて 1 秒ごとに更新する。
 * テストや確認用に ?now=2026-09-29T21:00:00%2B09:00 で時刻をずらせる。
 */
const offset = (() => {
  const param = new URLSearchParams(location.search).get('now')
  const t = param ? Date.parse(param) : NaN
  return Number.isNaN(t) ? 0 : t - Date.now()
})()

let now = Date.now() + offset
const listeners = new Set<() => void>()
let timer: number | undefined

function tick() {
  now = Date.now() + offset
  for (const l of listeners) l()
  timer = window.setTimeout(tick, 1000 - (now % 1000) + 5)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) tick()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.clearTimeout(timer)
  }
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now)
}

export function currentTime(): number {
  return Date.now() + offset
}
