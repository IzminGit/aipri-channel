import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Channel } from '../schema'
import { channelStyle } from '../lib/colors'
import { cellId, FAVORITES, moveCursor, samePosition, type Position } from '../lib/playlist'
import { parseTitle } from '../lib/title'
import { thumbnailUrl } from '../lib/youtube'
import { ChevronIcon, PlayingIcon, StarIcon } from './Icons'

interface Props {
  /** 先頭はお気に入り列 */
  columns: Channel[]
  playing: Position
  preview: Position | null
  favoriteIds: ReadonlySet<string>
  onPlay(pos: Position): void
  onPreview(pos: Position): void
  onPreviewEnd(): void
  onToggleFavorite(videoId: string): void
  onMoveFavorite(from: number, to: number): void
}

const MOVE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'] as const

/** 小さな操作ボタン（お気に入り・並び替え）。キーボードでは F / Shift+↑↓ で操作するためタブ移動の対象外 */
const miniButton =
  'flex size-6 items-center justify-center rounded-4 bg-raised/90 text-muted shadow-1 focus-ring hover:bg-surface hover:text-fg'
/** マウスでは行にカーソルを合わせたときだけ表示し、タッチ端末では常に表示 */
const revealOnHover =
  'opacity-0 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100 [@media(hover:none)]:opacity-100'

/**
 * 番組表。チャンネル（プレイリスト）を縦の列に、曲を 1 曲目・2 曲目…の行に並べる。
 * 列見出しと曲番号は固定し、この領域だけがスクロールする。
 */
export function ProgramGuide({
  columns,
  playing,
  preview,
  favoriteIds,
  onPlay,
  onPreview,
  onPreviewEnd,
  onToggleFavorite,
  onMoveFavorite,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  // キーボード操作のカーソル（roving tabindex）
  const [cursor, setCursor] = useState<Position>(playing)
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null)
  const navigable = columns.filter((c) => c.videos.length > 0)
  const rows = Math.max(1, ...columns.map((c) => c.videos.length))
  const cursorValid = navigable.some((c) => c.number === cursor.channel && cursor.index < c.videos.length)
  const tabStop = cursorValid ? cursor : navigable[0] ? { channel: navigable[0].number, index: 0 } : null

  // 再生曲が変わったら（連続再生を含む）その曲が見えるようにスクロール
  useEffect(() => {
    document
      .getElementById(cellId(playing))
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [playing])

  const focusCell = (pos: Position) => {
    setCursor(pos)
    // 並び替え直後は DOM の更新を待ってからフォーカスする
    requestAnimationFrame(() => document.getElementById(cellId(pos))?.focus())
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!tabStop || e.ctrlKey || e.metaKey || e.altKey) return
    const favorites = columns.find((c) => c.number === FAVORITES)
    const onFavorite = tabStop.channel === FAVORITES && !!favorites

    // Shift+↑↓: お気に入りの並び替え
    if (onFavorite && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      e.stopPropagation()
      const to = tabStop.index + (e.key === 'ArrowUp' ? -1 : 1)
      if (to < 0 || to >= favorites.videos.length) return
      onMoveFavorite(tabStop.index, to)
      focusCell({ channel: FAVORITES, index: to })
      return
    }
    // F: フォーカス中の曲をお気に入りに追加／解除
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault()
      e.stopPropagation()
      const video = columns.find((c) => c.number === tabStop.channel)?.videos[tabStop.index]
      if (video) onToggleFavorite(video.id)
      return
    }
    const key = MOVE_KEYS.find((k) => k === e.key)
    if (!key) return
    e.preventDefault()
    e.stopPropagation()
    focusCell(moveCursor(navigable, tabStop, key))
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
      <div
        role="grid"
        aria-label="番組表"
        aria-rowcount={rows + 1}
        aria-colcount={columns.length + 1}
        className="grid [--col:12rem] [--gut:1.75rem] sm:[--col:15rem] sm:[--gut:2.5rem]"
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
            className="sticky top-0 left-0 z-30 flex items-center justify-center border-r border-b border-line bg-raised text-oln-14N-100 text-muted"
          >
            曲
          </div>
          {columns.map((ch) => {
            const isFav = ch.number === FAVORITES
            const isPlayingCh = ch.number === playing.channel
            return (
              <div
                key={ch.number}
                role="columnheader"
                className="ch-scope sticky top-0 z-20 flex h-11 items-center gap-2 border-r border-b border-line bg-raised px-2 shadow-[inset_0_3px_0_var(--ch)]"
                style={channelStyle(ch.color)}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-4 text-oln-14B-100 tabular-nums ${
                    isPlayingCh ? 'bg-(--ch) text-bg' : 'bg-(--ch-bg) text-(--ch)'
                  }`}
                >
                  {isFav ? <StarIcon filled size={16} /> : ch.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-dns-14B-120 text-fg">{ch.shortName}</span>
                <span className="shrink-0 text-oln-14N-100 text-muted tabular-nums max-sm:hidden">
                  {ch.videos.length}曲
                </span>
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
              const isFavColumn = ch.number === FAVORITES
              const video = ch.videos[row]
              if (!video) {
                return (
                  <div
                    key={ch.number}
                    role="gridcell"
                    className={`border-r border-b border-line ${isFavColumn ? 'bg-raised' : 'bg-past'}`}
                    onDragOver={isFavColumn && drag ? (e) => e.preventDefault() : undefined}
                  >
                    {isFavColumn && row === 0 && (
                      <p className="flex h-full items-center gap-1.5 p-2 text-dns-14N-130 text-muted">
                        <StarIcon size={16} className="shrink-0" />
                        各曲の ☆ でここに追加できます
                      </p>
                    )}
                  </div>
                )
              }
              const pos = { channel: ch.number, index: row }
              const isPlaying = samePosition(pos, playing)
              const isPreview = samePosition(pos, preview)
              const isFavorite = favoriteIds.has(video.id)
              const { song, performers } = parseTitle(video.title)
              const dropTarget = isFavColumn && drag && drag.over === row && drag.from !== row
              return (
                <div
                  key={ch.number}
                  role="gridcell"
                  className={`group/cell relative border-r border-b border-line ${
                    dropTarget
                      ? drag.from > row
                        ? 'shadow-[inset_0_3px_0_var(--app-accent)]'
                        : 'shadow-[inset_0_-3px_0_var(--app-accent)]'
                      : ''
                  } ${isFavColumn && drag?.from === row ? 'opacity-50' : ''}`}
                  draggable={isFavColumn}
                  onDragStart={
                    isFavColumn
                      ? (e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', video.id)
                          setDrag({ from: row, over: row })
                        }
                      : undefined
                  }
                  onDragOver={
                    isFavColumn && drag
                      ? (e) => {
                          e.preventDefault()
                          if (drag.over !== row) setDrag({ ...drag, over: row })
                        }
                      : undefined
                  }
                  onDrop={
                    isFavColumn && drag
                      ? (e) => {
                          e.preventDefault()
                          onMoveFavorite(drag.from, row)
                          setDrag(null)
                        }
                      : undefined
                  }
                  onDragEnd={isFavColumn ? () => setDrag(null) : undefined}
                >
                  <button
                    type="button"
                    id={cellId(pos)}
                    tabIndex={samePosition(pos, tabStop) ? 0 : -1}
                    aria-current={isPlaying ? 'true' : undefined}
                    aria-label={`${ch.shortName} ${row + 1}曲目 ${song}${performers ? ` ${performers}` : ''}${
                      isFavorite ? '（お気に入り）' : ''
                    }${isPlaying ? '（再生中）' : ''}`}
                    onClick={() => onPlay(pos)}
                    onPointerEnter={() => onPreview(pos)}
                    onFocus={() => {
                      setCursor(pos)
                      onPreview(pos)
                    }}
                    className={`ch-scope group flex h-full min-h-14 w-full scroll-mt-11 scroll-ml-7 items-center gap-2 py-1.5 pr-7 pl-1.5 text-left focus-ring focus-visible:relative focus-visible:z-10 sm:scroll-ml-10 sm:pr-9 ${
                      isPlaying
                        ? 'bg-(--ch-bg) shadow-[inset_3px_0_0_var(--ch)]'
                        : isPreview
                          ? 'bg-accent-subtle'
                          : 'bg-raised hover:bg-accent-subtle'
                    } ${isFavColumn ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    style={channelStyle(ch.color)}
                  >
                    <span className="relative shrink-0">
                      <img
                        src={thumbnailUrl(video.id)}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        className="aspect-video w-14 rounded-4 bg-surface object-cover sm:w-20"
                      />
                      {isPlaying && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-4 bg-black/55 text-white">
                          <PlayingIcon size={18} className="animate-pulse" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`line-clamp-2 text-dns-14B-120 ${isPlaying ? 'text-(--ch)' : 'text-fg'} group-hover:underline group-hover:underline-offset-2`}
                      >
                        {song}
                      </span>
                      {performers && (
                        <span className="block truncate text-dns-14N-120 text-muted max-sm:hidden">{performers}</span>
                      )}
                    </span>
                  </button>

                  {/* お気に入り・並び替え */}
                  <div className="pointer-events-none absolute inset-y-1 right-1 flex flex-col items-end justify-between *:pointer-events-auto">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => onToggleFavorite(video.id)}
                      aria-pressed={isFavorite}
                      aria-label={`${song}をお気に入り${isFavorite ? 'から外す' : 'に追加'}`}
                      title={isFavorite ? 'お気に入りから外す（F）' : 'お気に入りに追加（F）'}
                      className={`${miniButton} ${
                        isFavorite ? 'text-yellow-700 opacity-100 dark:text-yellow-300' : revealOnHover
                      }`}
                    >
                      <StarIcon filled={isFavorite} size={16} />
                    </button>
                    {isFavColumn && (
                      <div className={`flex gap-0.5 ${revealOnHover}`}>
                        {row > 0 && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => onMoveFavorite(row, row - 1)}
                            aria-label={`${song}を上へ移動`}
                            title="上へ（Shift+↑）"
                            className={miniButton}
                          >
                            <ChevronIcon size={16} />
                          </button>
                        )}
                        {row < ch.videos.length - 1 && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => onMoveFavorite(row, row + 1)}
                            aria-label={`${song}を下へ移動`}
                            title="下へ（Shift+↓）"
                            className={miniButton}
                          >
                            <ChevronIcon size={16} className="rotate-180" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
