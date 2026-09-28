import { StarIcon } from './Icons'

export const ALL_TAB = 'all'
export const FAVORITES_TAB = 'favorites'

interface Props {
  series: string[]
  value: string
  favoriteCount: number
  onChange(tab: string): void
}

/** シリーズで番組表の列を絞り込むタブ（参考サイトの地域バーに相当） */
export function SeriesTabs({ series, value, favoriteCount, onChange }: Props) {
  const tabs = [
    { id: ALL_TAB, label: 'すべて' },
    ...series.map((s) => ({ id: s, label: s })),
    { id: FAVORITES_TAB, label: `お気に入り${favoriteCount ? ` (${favoriteCount})` : ''}` },
  ]
  return (
    <div className="flex items-center gap-4 border-y border-line bg-bg px-3 lg:px-4">
      <div role="tablist" aria-label="シリーズで絞り込み" className="flex min-w-0 gap-1 overflow-x-auto py-2">
        {tabs.map((t) => {
          const selected = t.id === value
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(t.id)}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-oln-14B-100 whitespace-nowrap focus-ring ${
                selected
                  ? 'bg-accent text-accent-fg'
                  : 'text-fg hover:bg-surface hover:underline hover:underline-offset-4'
              }`}
            >
              {t.id === FAVORITES_TAB && <StarIcon filled={selected} size={16} />}
              {t.label}
            </button>
          )
        })}
      </div>
      <p className="ml-auto shrink-0 text-oln-14N-100 text-muted max-lg:hidden">
        クリックで再生 ・ 同じチャンネルを順に連続再生
      </p>
    </div>
  )
}
