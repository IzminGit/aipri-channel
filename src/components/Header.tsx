import { formatClockSec } from '../lib/format'
import { AutoThemeIcon, GuideIcon, KeyboardIcon, LogoMark, MoonIcon, SunIcon } from './Icons'

export type ThemePreference = 'system' | 'light' | 'dark'

interface Props {
  now: number
  guideOpen: boolean
  theme: ThemePreference
  onToggleGuide(): void
  onThemeChange(theme: ThemePreference): void
  onShowShortcuts(): void
}

const themes = [
  { value: 'system', label: '自動', Icon: AutoThemeIcon },
  { value: 'light', label: 'ライト', Icon: SunIcon },
  { value: 'dark', label: 'ダーク', Icon: MoonIcon },
] as const

const iconButton =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-8 px-2 text-oln-14B-100 text-fg hover:bg-surface hover:underline hover:underline-offset-4 focus-ring'

export function Header({ now, guideOpen, theme, onToggleGuide, onThemeChange, onShowShortcuts }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 lg:px-6">
        <a href="./" className="flex items-center gap-3 rounded-4 focus-ring">
          <LogoMark size={36} />
          <span className="flex flex-col">
            <span className="text-std-16B-170 leading-tight whitespace-nowrap text-fg sm:text-std-20B-150">
              アイプリチャンネル
            </span>
            <span className="text-oln-14N-100 text-muted max-sm:hidden">CGライブ番組表</span>
          </span>
        </a>

        <time
          className="ml-auto text-mono-16B-150 text-fg tabular-nums max-sm:hidden"
          dateTime={new Date(now).toISOString()}
          aria-label="現在時刻"
        >
          {formatClockSec(now)}
        </time>

        <div className="flex items-center gap-1 max-sm:ml-auto">
          <button type="button" onClick={onToggleGuide} aria-pressed={guideOpen} className={iconButton}>
            <GuideIcon size={22} />
            <span className="max-md:sr-only">番組表</span>
          </button>
          <button type="button" onClick={onShowShortcuts} className={`${iconButton} max-md:hidden`}>
            <KeyboardIcon size={22} />
            <span className="sr-only">キーボード操作</span>
          </button>

          <fieldset className="ml-1 flex rounded-8 border border-line-strong p-0.5">
            <legend className="sr-only">表示テーマ</legend>
            {themes.map(({ value, label, Icon }) => (
              <label
                key={value}
                title={label}
                className="flex size-9 cursor-pointer items-center justify-center rounded-6 text-muted hover:text-fg has-checked:bg-accent has-checked:text-accent-fg has-checked:hover:text-accent-fg has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--app-focus-outline)"
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={theme === value}
                  onChange={() => onThemeChange(value)}
                  className="sr-only"
                />
                <Icon size={20} />
                <span className="sr-only">{label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </div>
    </header>
  )
}
