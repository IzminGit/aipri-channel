import { memo } from 'react'
import type { Channel, Video } from '../schema'
import { channelStyle } from '../lib/colors'
import { cellId, type Position } from '../lib/playlist'
import { parseTitle } from '../lib/title'
import { thumbnailUrl } from '../lib/youtube'
import { ChevronIcon, PlayingIcon, StarIcon } from './Icons'

/** 小さな操作ボタン（お気に入り・並び替え）。キーボードでは F / Shift+↑↓ で操作するためタブ移動の対象外 */
const miniButton =
  'flex size-6 items-center justify-center rounded-4 bg-raised/90 text-muted shadow-1 focus-ring hover:bg-surface hover:text-fg'
/** マウスでは行にカーソルを合わせたときだけ表示し、タッチ端末では常に表示 */
const revealOnHover =
  'opacity-0 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100 [@media(hover:none)]:opacity-100'

export interface GuideCellProps {
  channel: Pick<Channel, 'number' | 'shortName' | 'color'>
  video: Video
  row: number
  isFavColumn: boolean
  isPlaying: boolean
  isPreview: boolean
  isFavorite: boolean
  isTabStop: boolean
  /** シリーズの境目（左に区切り線を引く） */
  seriesStart: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  /** ドラッグ中の挿入位置の表示 */
  dropMark: 'above' | 'below' | null
  dragging: boolean
  onPlay(pos: Position): void
  onPreview(pos: Position): void
  onFocusCell(pos: Position): void
  onToggleFavorite(videoId: string): void
  onMoveFavorite(from: number, to: number): void
  onDragStartRow(row: number): void
  onDragOverRow(row: number): void
  onDropRow(row: number): void
  onDragEnd(): void
}

/**
 * 番組表の 1 セル。番組表は数千セルになるため memo 化し、
 * プレビューや再生中の曲が変わったときは関係するセルだけ再描画する
 */
export const GuideCell = memo(function GuideCell({
  channel,
  video,
  row,
  isFavColumn,
  isPlaying,
  isPreview,
  isFavorite,
  isTabStop,
  seriesStart,
  canMoveUp,
  canMoveDown,
  dropMark,
  dragging,
  onPlay,
  onPreview,
  onFocusCell,
  onToggleFavorite,
  onMoveFavorite,
  onDragStartRow,
  onDragOverRow,
  onDropRow,
  onDragEnd,
}: GuideCellProps) {
  const pos = { channel: channel.number, index: row }
  const { song, performers } = parseTitle(video.title)
  return (
    <div
      role="gridcell"
      className={`group/cell relative border-r border-b border-line ${seriesStart ? 'border-l-2 border-l-line-strong' : ''} ${
        dropMark === 'above'
          ? 'shadow-[inset_0_3px_0_var(--app-accent)]'
          : dropMark === 'below'
            ? 'shadow-[inset_0_-3px_0_var(--app-accent)]'
            : ''
      } ${dragging ? 'opacity-50' : ''}`}
      draggable={isFavColumn}
      onDragStart={
        isFavColumn
          ? (e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', video.id)
              onDragStartRow(row)
            }
          : undefined
      }
      onDragOver={
        isFavColumn
          ? (e) => {
              e.preventDefault()
              onDragOverRow(row)
            }
          : undefined
      }
      onDrop={
        isFavColumn
          ? (e) => {
              e.preventDefault()
              onDropRow(row)
            }
          : undefined
      }
      onDragEnd={isFavColumn ? onDragEnd : undefined}
    >
      <button
        type="button"
        id={cellId(pos)}
        tabIndex={isTabStop ? 0 : -1}
        aria-current={isPlaying ? 'true' : undefined}
        aria-label={`${channel.shortName} ${row + 1}曲目 ${song}${performers ? ` ${performers}` : ''}${
          isFavorite ? '（お気に入り）' : ''
        }${isPlaying ? '（再生中）' : ''}`}
        onClick={() => onPlay(pos)}
        onPointerEnter={() => onPreview(pos)}
        onFocus={() => onFocusCell(pos)}
        className={`ch-scope group flex h-full min-h-14 w-full scroll-mt-[4.25rem] scroll-ml-7 items-center gap-2 py-1.5 pr-7 pl-1.5 text-left focus-ring focus-visible:relative focus-visible:z-10 sm:scroll-ml-10 sm:pr-9 ${
          isPlaying
            ? 'bg-(--ch-bg) shadow-[inset_3px_0_0_var(--ch)]'
            : isPreview
              ? 'bg-accent-subtle'
              : 'bg-raised hover:bg-accent-subtle'
        } ${isFavColumn ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={channelStyle(channel.color)}
      >
        <span className="relative shrink-0">
          <img
            src={thumbnailUrl(video.id)}
            alt=""
            loading="lazy"
            decoding="async"
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
          {performers && <span className="block truncate text-dns-14N-120 text-muted max-sm:hidden">{performers}</span>}
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
          className={`${miniButton} ${isFavorite ? 'text-yellow-700 opacity-100 dark:text-yellow-300' : revealOnHover}`}
        >
          <StarIcon filled={isFavorite} size={16} />
        </button>
        {isFavColumn && (
          <div className={`flex gap-0.5 ${revealOnHover}`}>
            {canMoveUp && (
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
            {canMoveDown && (
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
})
