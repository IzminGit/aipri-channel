import { AutoThemeIcon, KeyboardIcon, MoonIcon, SunIcon } from './Icons'

export type ThemePreference = 'system' | 'light' | 'dark'

const themes = [
  { value: 'system', label: '自動', Icon: AutoThemeIcon },
  { value: 'light', label: 'ライト', Icon: SunIcon },
  { value: 'dark', label: 'ダーク', Icon: MoonIcon },
] as const

interface Props {
  theme: ThemePreference
  onThemeChange(theme: ThemePreference): void
  onShowShortcuts(): void
}

/** 詳細パネル右上の操作群（キーボード操作ヘルプ・表示テーマ切替） */
export function Toolbar({ theme, onThemeChange, onShowShortcuts }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onShowShortcuts}
        title="キーボード操作とこのサイトについて"
        className="flex size-9 items-center justify-center rounded-6 text-muted focus-ring hover:bg-surface hover:text-fg"
      >
        <KeyboardIcon size={20} />
        <span className="sr-only">キーボード操作とこのサイトについて</span>
      </button>
      <fieldset className="flex rounded-8 border border-line-strong p-0.5">
        <legend className="sr-only">表示テーマ</legend>
        {themes.map(({ value, label, Icon }) => (
          <label
            key={value}
            title={label}
            className="flex size-8 cursor-pointer items-center justify-center rounded-6 text-muted hover:text-fg has-checked:bg-accent has-checked:text-accent-fg has-checked:hover:text-accent-fg has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--app-focus-outline)"
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => onThemeChange(value)}
              className="sr-only"
            />
            <Icon size={18} />
            <span className="sr-only">{label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  )
}
