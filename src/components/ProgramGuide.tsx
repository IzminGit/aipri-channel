import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Channel } from '../schema'
import { channelStyle } from '../lib/colors'
import { cellId, moveCursor, samePosition, type Position } from '../lib/playlist'
import { parseTitle } from '../lib/title'
import { thumbnailUrl } from '../lib/youtube'
import { PlayingIcon, StarIcon } from './Icons'

interface Props {
  columns: Channel[]
  playing: Position
  preview: Position | null
  favorites: number[]
  onPlay(pos: Position): void
  onPreview(pos: Position): void
  onPreviewEnd(): void
  onToggleFavorite(channel: number): void
}

const MOVE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'] as const

/**
 * 番組表。チャンネル（プレイリスト）を縦の列に、曲を 1 曲目・2 曲目…の行に並べる。
 * 列見出しと曲番号は固定し、この領域だけがスクロールする。
 */
export function ProgramGuide({
  columns,
  playing,
  preview,
  favorites,
  onPlay,
  onPreview,
  onPreviewEnd,
  onToggleFavorite,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  // キーボード操作のカーソル（roving tabindex）
  const [cursor, setCursor] = useState<Position>(playing)
  const rows = Math.max(0, ...columns.map((c) => c.videos.length))
  const cursorVisible = columns.some((c) => c.number === cursor.channel && cursor.index < c.videos.length)
  const tabStop = cursorVisible ? cursor : columns[0] ? { channel: columns[0].number, index: 0 } : null

  // 再生曲が変わったら（連続再生を含む）その曲が見えるようにスクロール
  useEffect(() => {
    document
      .getElementById(cellId(playing))
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [playing])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const key = MOVE_KEYS.find((k) => k === e.key)
    if (!key || !tabStop) return
    e.preventDefault()
    e.stopPropagation()
    const next = moveCursor(columns, tabStop, key)
    setCursor(next)
    document.getElementById(cellId(next))?.focus()
  }

  return (
    <div
      ref={rootRef}
      onKeyDown={onKeyDown}
      onPointerLeave={onPreviewEnd}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) onPreviewEnd()
      }}
      className="guide-scroll relative min-h-0 flex-1 overflow-auto overscroll-contain bg-surface"
    >
      {columns.length === 0 ? (
        <p className="p-8 text-center text-std-16N-170 text-muted">
          お気に入りのチャンネルはまだありません。列見出しの ☆ で追加できます。
        </p>
      ) : (
        <div
          role="grid"
          aria-label="番組表"
          aria-rowcount={rows + 1}
          aria-colcount={columns.length + 1}
          className="grid [--col:10.5rem] [--gut:2rem] sm:[--col:15rem] sm:[--gut:3rem]"
          style={{
            // 列は最低幅を保ちつつ、画面に余裕があれば均等に広げる
            gridTemplateColumns: `var(--gut) repeat(${columns.length}, minmax(0, 1fr))`,
            width: `max(100%, calc(var(--gut) + ${columns.length} * var(--col)))`,
          }}
        >
          {/* 列見出し */}
          <div role="row" className="contents">
            <div
              role="columnheader"
              className="sticky top-0 left-0 z-30 flex items-end justify-center border-r border-b border-line bg-raised pb-2 text-oln-14N-100 text-muted"
            >
              曲
            </div>
            {columns.map((ch) => {
              const isFav = favorites.includes(ch.number)
              const isPlayingCh = ch.number === playing.channel
              return (
                <div
                  key={ch.number}
                  role="columnheader"
                  className="ch-scope sticky top-0 z-20 flex h-16 items-center gap-2 border-r border-b border-line bg-raised px-2 shadow-[inset_0_4px_0_var(--ch)] sm:px-3"
                  style={channelStyle(ch.color)}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-4 text-oln-16B-100 tabular-nums ${
                      isPlayingCh ? 'bg-(--ch) text-bg' : 'bg-(--ch-bg) text-(--ch)'
                    }`}
                  >
                    {ch.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-dns-14B-130 text-fg sm:line-clamp-1">{ch.shortName}</span>
                    <span className="block text-oln-14N-100 text-muted max-sm:hidden">
                      {ch.series} ・ 全{ch.videos.length}曲
                    </span>
                  </span>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => onToggleFavorite(ch.number)}
                    aria-pressed={isFav}
                    aria-label={`${ch.name}をお気に入り${isFav ? 'から外す' : 'に追加'}`}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-6 focus-ring hover:bg-surface ${
                      isFav ? 'text-yellow-700 dark:text-yellow-300' : 'text-muted hover:text-fg'
                    }`}
                  >
                    <StarIcon filled={isFav} size={20} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* 1 曲目, 2 曲目 … */}
          {Array.from({ length: rows }, (_, row) => (
            <div role="row" key={row} className="contents">
              <div
                role="rowheader"
                className="sticky left-0 z-10 flex items-center justify-center border-r border-b border-line bg-raised text-oln-14B-100 text-muted tabular-nums"
              >
                {row + 1}
              </div>
              {columns.map((ch) => {
                const video = ch.videos[row]
                if (!video) {
                  return <div key={ch.number} role="gridcell" className="border-r border-b border-line bg-past" />
                }
                const pos = { channel: ch.number, index: row }
                const isPlaying = samePosition(pos, playing)
                const isPreview = samePosition(pos, preview)
                const { song, performers } = parseTitle(video.title)
                return (
                  <div key={ch.number} role="gridcell" className="border-r border-b border-line">
                    <button
                      type="button"
                      id={cellId(pos)}
                      tabIndex={samePosition(pos, tabStop) ? 0 : -1}
                      aria-current={isPlaying ? 'true' : undefined}
                      aria-label={`${ch.number}ch ${row + 1}曲目 ${song}${performers ? ` ${performers}` : ''}${isPlaying ? '（再生中）' : ''}`}
                      onClick={() => onPlay(pos)}
                      onPointerEnter={() => onPreview(pos)}
                      onFocus={() => {
                        setCursor(pos)
                        onPreview(pos)
                      }}
                      className={`ch-scope group flex h-full min-h-20 w-full scroll-mt-16 scroll-ml-8 flex-col items-stretch gap-2 p-2 text-left focus-ring focus-visible:relative focus-visible:z-10 sm:scroll-ml-12 sm:flex-row sm:items-center sm:gap-3 ${
                        isPlaying
                          ? 'bg-(--ch-bg) shadow-[inset_4px_0_0_var(--ch)]'
                          : isPreview
                            ? 'bg-accent-subtle'
                            : 'bg-raised hover:bg-accent-subtle'
                      }`}
                      style={channelStyle(ch.color)}
                    >
                      <span className="relative shrink-0">
                        <img
                          src={thumbnailUrl(video.id)}
                          alt=""
                          loading="lazy"
                          className="aspect-video w-full rounded-4 bg-surface object-cover sm:w-24"
                        />
                        {isPlaying && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-4 bg-black/55 text-white">
                            <PlayingIcon size={22} className="animate-pulse" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`line-clamp-2 text-dns-14B-130 ${isPlaying ? 'text-(--ch)' : 'text-fg'} group-hover:underline group-hover:underline-offset-2`}
                        >
                          {song}
                        </span>
                        {performers && (
                          <span className="mt-0.5 block truncate text-dns-14N-120 text-muted">{performers}</span>
                        )}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
