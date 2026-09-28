import type { ReactNode } from 'react'
import type { Channel, Video } from '../schema'
import { channelStyle } from '../lib/colors'
import { formatDate, formatDuration, splitLinks } from '../lib/format'
import { FAVORITES } from '../lib/playlist'
import { parseTitle } from '../lib/title'
import { thumbnailUrl, watchUrl } from '../lib/youtube'
import { ExternalIcon, PlayIcon, PlayingIcon, StarIcon } from './Icons'

interface Props {
  channel: Channel
  video: Video
  index: number
  /** 再生中の曲を表示しているか（false はマウスオーバー中の曲のプレビュー） */
  isPlaying: boolean
  favorite: boolean
  compact?: boolean
  /** 右上に置く操作（キーボード操作ヘルプ・表示テーマ） */
  toolbar: ReactNode
  onPlay(): void
  onToggleFavorite(): void
  onPointerEnter?(): void
  onPointerLeave?(): void
}

/** 番組の詳細（プレーヤー右側）。スマホでは compact で 1 行表示 */
export function InfoPanel({
  channel,
  video,
  index,
  isPlaying,
  favorite,
  compact,
  toolbar,
  onPlay,
  onToggleFavorite,
  onPointerEnter,
  onPointerLeave,
}: Props) {
  const { song, performers } = parseTitle(video.title)
  const status = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-4 px-2 py-1 text-oln-14B-100 ${
        isPlaying ? 'bg-live text-bg' : 'bg-accent-subtle text-accent'
      }`}
    >
      {isPlaying && <PlayingIcon size={14} />}
      {isPlaying ? '再生中' : 'プレビュー'}
    </span>
  )
  const channelBadge = (
    <span className="inline-flex items-center gap-1.5 rounded-4 bg-(--ch-bg) px-2 py-1 text-oln-14B-100 text-(--ch)">
      {channel.number === FAVORITES ? (
        <StarIcon filled size={14} />
      ) : (
        <span className="tabular-nums">{channel.number}ch</span>
      )}
      <span className="truncate">{channel.shortName}</span>
    </span>
  )
  const position = (
    <span className="text-oln-14N-100 text-muted tabular-nums">
      {index + 1}曲目 / 全{channel.videos.length}曲
    </span>
  )

  if (compact) {
    return (
      <section
        aria-label="再生中の曲"
        className="ch-scope border-b border-line px-3 py-2"
        style={channelStyle(channel.color)}
      >
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            {status}
            {channelBadge}
            {position}
          </div>
          {toolbar}
        </div>
        <p className="mt-1.5 truncate text-dns-16B-130 text-fg">
          {song}
          {performers && <span className="ml-2 text-dns-14N-130 text-muted">{performers}</span>}
        </p>
      </section>
    )
  }

  return (
    <aside
      aria-label="番組の詳細"
      aria-live="polite"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className="ch-scope flex h-full min-h-0 flex-col border-l border-line bg-raised"
      style={channelStyle(channel.color)}
    >
      <div className="h-1 shrink-0 bg-(--ch)" aria-hidden="true" />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {status}
            {channelBadge}
            {position}
          </div>
          {toolbar}
        </div>

        <div className="mt-3 flex gap-4">
          <img
            src={thumbnailUrl(video.id)}
            alt=""
            className="aspect-video w-36 shrink-0 self-start rounded-6 bg-surface object-cover xl:w-44"
          />
          <div className="min-w-0">
            <h2 className="text-std-20B-150 text-fg">{song}</h2>
            {performers && <p className="mt-1 text-dns-16N-130 text-muted">{performers}</p>}
            <p className="mt-2 text-oln-14N-100 text-muted tabular-nums">
              {formatDate(video.publishedAt)} 公開 ・ {formatDuration(video.durationSec)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {!isPlaying && (
            <button
              type="button"
              onClick={onPlay}
              className="inline-flex min-h-10 items-center gap-2 rounded-8 bg-accent px-4 text-oln-16B-100 text-accent-fg focus-ring hover:bg-accent-hover hover:underline hover:underline-offset-4"
            >
              <PlayIcon size={18} />
              この曲を再生
            </button>
          )}
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            className="inline-flex min-h-10 items-center gap-2 rounded-8 border border-accent px-3 text-oln-14B-100 text-accent focus-ring hover:bg-accent-subtle"
          >
            <StarIcon filled={favorite} size={18} />
            {favorite ? 'お気に入り登録済み' : 'お気に入りに追加'}
          </button>
          <a
            href={watchUrl(video.id, channel.playlistId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-8 px-1 text-oln-14N-100 text-link underline underline-offset-4 focus-ring hover:decoration-2"
          >
            YouTube で見る
            <ExternalIcon size={16} />
            <span className="sr-only">（新しいタブで開きます）</span>
          </a>
        </div>

        {video.description && (
          <div className="mt-4 border-t border-line pt-3">
            <h3 className="sr-only">動画の説明</h3>
            <p className="text-dns-14N-130 leading-170 break-words whitespace-pre-line text-fg">
              {splitLinks(video.description).map((part, i) =>
                part.href ? (
                  <a
                    key={i}
                    href={part.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link underline underline-offset-2 hover:decoration-2"
                  >
                    {part.text}
                  </a>
                ) : (
                  part.text
                ),
              )}
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
