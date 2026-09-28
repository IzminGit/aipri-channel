import { useCallback, useRef, useSyncExternalStore } from 'react'

const PREFIX = 'aipri-channel:'
const listeners = new Map<string, Set<() => void>>()
const cache = new Map<string, { raw: string | null; value: unknown }>()
/** localStorage が使えない環境（プライベートモード等）用の退避先 */
const memory = new Map<string, string>()

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return memory.get(key) ?? null
  }
}

function notify(key: string) {
  for (const l of listeners.get(key) ?? []) l()
}

window.addEventListener('storage', (e) => {
  if (e.key?.startsWith(PREFIX)) notify(e.key.slice(PREFIX.length))
})

/** localStorage に永続化される state。タブ間でも同期する */
export function useStoredState<T>(key: string, fallback: T): [T, (value: T) => void] {
  // 既定値は初回のみ意味を持つため ref に固定する
  const fallbackRef = useRef(fallback)
  const subscribe = useCallback(
    (listener: () => void) => {
      const set = listeners.get(key) ?? new Set()
      set.add(listener)
      listeners.set(key, set)
      return () => set.delete(listener)
    },
    [key],
  )

  const getSnapshot = useCallback((): T => {
    const raw = read(key)
    const hit = cache.get(key)
    if (hit && hit.raw === raw) return hit.value as T
    let value: T = fallbackRef.current
    if (raw !== null) {
      try {
        value = JSON.parse(raw) as T
      } catch {
        /* 壊れた値は既定値に戻す */
      }
    }
    cache.set(key, { raw, value })
    return value
  }, [key])

  const value = useSyncExternalStore(subscribe, getSnapshot)

  const setValue = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(next))
      } catch {
        memory.set(key, JSON.stringify(next))
      }
      notify(key)
    },
    [key],
  )

  return [value, setValue]
}
