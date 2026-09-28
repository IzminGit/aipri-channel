import { AutoThemeIcon, KeyboardIcon, LogoMark, MoonIcon, SunIcon } from './Icons'

export type ThemePreference = 'system' | 'light' | 'dark'

interface Props {
  theme: ThemePreference
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

export function Header({ theme, onThemeChange, onShowShortcuts }: Props) {
  return (
    <header className="shrink-0 border-b border-line bg-bg">
      <div className="flex h-14 items-center gap-3 px-3 lg:px-4">
        <a href="./" className="flex items-center gap-2.5 rounded-4 focus-ring">
          <LogoMark size={32} />
          <span className="text-std-16B-170 leading-tight whitespace-nowrap text-fg sm:text-std-18B-160">
            アイプリチャンネル
          </span>
          <span className="text-oln-14N-100 text-muted max-sm:hidden">CGライブ番組表</span>
        </a>

        <div className="ml-auto flex items-center gap-1">
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
