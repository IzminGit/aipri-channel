import type { Channel } from '../schema'
import { channelStyle } from '../lib/colors'
import { slotAt } from '../lib/schedule'
import { parseTitle } from '../lib/title'
import { thumbnailUrl } from '../lib/youtube'
import { StarIcon } from './Icons'

interface Props {
  channels: Channel[]
  selected: number
  favorites: number[]
  now: number
  onSelect(number: number): void
  onToggleFavorite(number: number): void
}

export function ChannelList({ channels, selected, favorites, now, onSelect, onToggleFavorite }: Props) {
  return (
    <nav aria-labelledby="channels-title">
      <div className="flex items-baseline justify-between">
        <h2 id="channels-title" className="text-std-18B-160 text-fg">
          チャンネル
        </h2>
        <span className="text-oln-14N-100 text-muted max-md:hidden">↑↓ で切替</span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {channels.map((ch) => {
          const slot = slotAt(ch, now)
          const title = slot ? parseTitle(slot.video.title) : null
          const isSelected = ch.number === selected
          const isFavorite = favorites.includes(ch.number)
          const progress = slot ? (now - slot.start) / (slot.end - slot.start) : 0
          return (
            <li
              key={ch.number}
              className={`ch-scope relative flex overflow-hidden rounded-8 border transition-colors ${
                isSelected ? 'border-(--ch) bg-(--ch-bg)' : 'border-line bg-raised hover:border-line-strong'
              }`}
              style={channelStyle(ch.color)}
            >
              <button
                type="button"
                onClick={() => onSelect(ch.number)}
                aria-current={isSelected ? 'true' : undefined}
                className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left focus-ring"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-6 text-std-18B-160 tabular-nums ${
                    isSelected ? 'bg-(--ch) text-bg' : 'bg-surface text-(--ch)'
                  }`}
                >
                  {ch.number}
                </span>
                {slot && (
                  <img
                    src={thumbnailUrl(slot.video.id)}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-16 shrink-0 rounded-4 bg-surface object-cover max-sm:hidden"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-dns-14B-130 text-(--ch)">{ch.shortName}</span>
                  <span className="mt-0.5 block truncate text-dns-16B-130 text-fg">{title?.song ?? '放送休止中'}</span>
                  {title?.performers && (
                    <span className="block truncate text-dns-14N-130 text-muted">{title.performers}</span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onToggleFavorite(ch.number)}
                aria-pressed={isFavorite}
                aria-label={`${ch.name}をお気に入り${isFavorite ? 'から外す' : 'に追加'}`}
                className={`flex w-11 shrink-0 items-center justify-center focus-ring ${
                  isFavorite ? 'text-yellow-700 dark:text-yellow-300' : 'text-muted hover:text-fg'
                }`}
              >
                <StarIcon filled={isFavorite} size={22} />
              </button>
              <span
                className="absolute bottom-0 left-0 h-1 bg-(--ch) opacity-70"
                style={{ width: `${progress * 100}%` }}
                aria-hidden="true"
              />
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
