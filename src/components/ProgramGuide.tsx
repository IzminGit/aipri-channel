import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Channel } from '../schema'
import { channelStyle } from '../lib/colors'
import { cellId, FAVORITES, moveCursor, samePosition, type Position } from '../lib/playlist'
import { GuideCell } from './GuideCell'
import { StarIcon } from './Icons'

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

interface SeriesGroup {
  name: string
  span: number
  color: Channel['color']
}

/** 隣り合う同じシリーズの列をまとめる（見出し帯用） */
function groupSeries(columns: Channel[]): SeriesGroup[] {
  const groups: SeriesGroup[] = []
  for (const c of columns) {
    const last = groups.at(-1)
    if (last && last.name === c.series) last.span++
    else groups.push({ name: c.series, span: 1, color: c.color })
  }
  return groups
}

/**
 * 番組表。チャンネル（プレイリスト）を縦の列に、曲を 1 曲目・2 曲目…の行に並べる。
 * シリーズ名の帯・列見出し・曲番号は固定し、この領域だけがスクロールする。
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
  const dragRef = useRef(drag)
  useEffect(() => {
    dragRef.current = drag
  })

  const navigable = useMemo(() => columns.filter((c) => c.videos.length > 0), [columns])
  const groups = useMemo(() => groupSeries(columns), [columns])
  const seriesStarts = useMemo(() => {
    const starts = new Set<number>()
    columns.forEach((c, i) => {
      if (i > 0 && c.series !== columns[i - 1].series) starts.add(c.number)
    })
    return starts
  }, [columns])
  const rows = Math.max(1, ...columns.map((c) => c.videos.length))
  const cursorValid = navigable.some((c) => c.number === cursor.channel && cursor.index < c.videos.length)
  const tabStop = cursorValid ? cursor : navigable[0] ? { channel: navigable[0].number, index: 0 } : null
  const favorites = columns.find((c) => c.number === FAVORITES)

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

  const onFocusCell = useCallback(
    (pos: Position) => {
      setCursor(pos)
      onPreview(pos)
    },
    [onPreview],
  )
  const onDragStartRow = useCallback((row: number) => setDrag({ from: row, over: row }), [])
  const onDragOverRow = useCallback(
    (row: number) => setDrag((d) => (d && d.over !== row ? { ...d, over: row } : d)),
    [],
  )
  const onDropRow = useCallback(
    (row: number) => {
      const d = dragRef.current
      if (d) onMoveFavorite(d.from, row)
      setDrag(null)
    },
    [onMoveFavorite],
  )
  const onDragEnd = useCallback(() => setDrag(null), [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!tabStop || e.ctrlKey || e.metaKey || e.altKey) return

    // Shift+↑↓: お気に入りの並び替え
    if (tabStop.channel === FAVORITES && favorites && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
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
        {/* シリーズ名の帯（色だけに頼らず名前で区別する） */}
        <div
          aria-hidden="true"
          className="sticky top-0 left-0 z-40 row-span-2 flex items-end justify-center border-r border-b border-line bg-raised pb-3 text-oln-14N-100 text-muted"
        >
          曲
        </div>
        {groups.map((g, i) => (
          <div
            key={`${g.name}-${i}`}
            aria-hidden="true"
            className={`ch-scope sticky top-0 z-20 flex h-6 items-center border-b border-line bg-(--ch-bg) text-oln-14B-100 text-(--ch) ${
              i > 0 ? 'border-l-2 border-l-line-strong' : ''
            }`}
            style={{ ...channelStyle(g.color), gridColumn: `span ${g.span}` }}
          >
            <span className="sticky left-[var(--gut)] truncate px-2">{g.name}</span>
          </div>
        ))}

        {/* 列見出し */}
        <div role="row" className="contents">
          {columns.map((ch) => {
            const isFav = ch.number === FAVORITES
            const isPlayingCh = ch.number === playing.channel
            return (
              <div
                key={ch.number}
                role="columnheader"
                className={`ch-scope sticky top-6 z-20 flex h-11 items-center gap-2 border-r border-b border-line bg-raised px-2 shadow-[inset_0_3px_0_var(--ch)] ${
                  seriesStarts.has(ch.number) ? 'border-l-2 border-l-line-strong' : ''
                }`}
                style={channelStyle(ch.color)}
                title={ch.name}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-4 text-oln-14B-100 tabular-nums ${
                    isPlayingCh ? 'bg-(--ch) text-bg' : 'bg-(--ch-bg) text-(--ch)'
                  }`}
                >
                  {isFav ? <StarIcon filled size={16} /> : ch.number}
                </span>
                <span className="line-clamp-2 min-w-0 flex-1 text-dns-14B-120 text-fg">{ch.shortName}</span>
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
                    className={`border-r border-b border-line ${isFavColumn ? 'bg-raised' : 'bg-past'} ${
                      seriesStarts.has(ch.number) ? 'border-l-2 border-l-line-strong' : ''
                    }`}
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
              const dropMark =
                isFavColumn && drag && drag.over === row && drag.from !== row
                  ? drag.from > row
                    ? 'above'
                    : 'below'
                  : null
              return (
                <GuideCell
                  key={ch.number}
                  channel={ch}
                  video={video}
                  row={row}
                  isFavColumn={isFavColumn}
                  isPlaying={samePosition(pos, playing)}
                  isPreview={samePosition(pos, preview)}
                  isFavorite={favoriteIds.has(video.id)}
                  isTabStop={samePosition(pos, tabStop)}
                  seriesStart={seriesStarts.has(ch.number)}
                  canMoveUp={isFavColumn && row > 0}
                  canMoveDown={isFavColumn && row < ch.videos.length - 1}
                  dropMark={dropMark}
                  dragging={isFavColumn && drag?.from === row}
                  onPlay={onPlay}
                  onPreview={onPreview}
                  onFocusCell={onFocusCell}
                  onToggleFavorite={onToggleFavorite}
                  onMoveFavorite={onMoveFavorite}
                  onDragStartRow={onDragStartRow}
                  onDragOverRow={onDragOverRow}
                  onDropRow={onDropRow}
                  onDragEnd={onDragEnd}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
