import type { Channel } from '../schema'
import { channelStyle } from '../lib/colors'
import { formatClock, formatDuration } from '../lib/format'
import type { Slot } from '../lib/schedule'
import { parseTitle } from '../lib/title'
import { watchUrl } from '../lib/youtube'
import { ExternalIcon, StarIcon } from './Icons'

interface Props {
  channel: Channel
  /** 画面に表示中の番組（オンデマンド時はその動画） */
  current: Slot
  isVod: boolean
  now: number
  favorite: boolean
  onToggleFavorite(): void
}

export function NowPlaying({ channel, current, isVod, now, favorite, onToggleFavorite }: Props) {
  const { song, performers } = parseTitle(current.video.title)
  const total = current.end - current.start
  const elapsed = Math.min(Math.max(now - current.start, 0), total)

  return (
    <section aria-labelledby="now-title" className="ch-scope mt-4" style={channelStyle(channel.color)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-4 bg-(--ch-bg) px-2 py-1 text-oln-14B-100 text-(--ch)">
          <span className="tabular-nums">{channel.number}ch</span>
          <span>{channel.name}</span>
        </span>
        <span className="text-oln-14N-100 text-muted">
          {isVod ? 'オンデマンド再生中' : `${formatClock(current.start)} – ${formatClock(current.end)}`}
        </span>
      </div>

      <h1 id="now-title" className="mt-3 text-std-24B-150 text-fg sm:text-std-28B-150">
        {song}
      </h1>
      {performers && <p className="mt-1 text-std-16N-170 text-muted">{performers}</p>}

      {!isVod && (
        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label="放送の進行状況"
            aria-valuemin={0}
            aria-valuemax={Math.round(total / 1000)}
            aria-valuenow={Math.round(elapsed / 1000)}
          >
            <div className="h-full rounded-full bg-(--ch)" style={{ width: `${(elapsed / total) * 100}%` }} />
          </div>
          <span className="text-mono-14N-150 text-muted tabular-nums">
            {formatDuration(elapsed)} / {formatDuration(total)}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          className="inline-flex min-h-11 items-center gap-2 rounded-8 border border-accent px-4 text-oln-16B-100 text-accent focus-ring hover:bg-accent-subtle hover:underline hover:underline-offset-4"
        >
          <StarIcon filled={favorite} size={20} />
          {favorite ? 'お気に入り登録済み' : 'お気に入りに追加'}
        </button>
        <a
          href={watchUrl(current.video.id, channel.playlistId)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-8 px-2 text-oln-16N-100 text-link underline underline-offset-4 focus-ring hover:decoration-2"
        >
          YouTube で見る
          <ExternalIcon size={18} />
          <span className="sr-only">（新しいタブで開きます）</span>
        </a>
      </div>
    </section>
  )
}
