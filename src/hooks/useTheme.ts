import { useEffect } from 'react'
import type { ThemePreference } from '../components/Toolbar'
import { useStoredState } from './useStoredState'

const media = window.matchMedia('(prefers-color-scheme: dark)')

function apply(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && media.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1a1a1a' : '#ffffff')
}

/** 表示テーマ（自動 / ライト / ダーク）。index.html のインラインスクリプトと同じ規則で適用する */
export function useTheme() {
  const [theme, setTheme] = useStoredState<ThemePreference>('theme', 'system')

  useEffect(() => {
    apply(theme)
    if (theme !== 'system') return
    const onChange = () => apply('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  return [theme, setTheme] as const
}
