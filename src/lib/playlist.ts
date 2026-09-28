import type { Channel } from '../schema'

export interface Position {
  channel: number
  index: number
}

/** 番組表のセルの DOM id */
export const cellId = (p: Position) => `cell-${p.channel}-${p.index}`

export const samePosition = (a: Position | null, b: Position | null) =>
  !!a && !!b && a.channel === b.channel && a.index === b.index

/** 同じチャンネルの次の曲。最終曲の次は 1 曲目に戻る */
export function nextInChannel(channel: Channel, index: number): number {
  return channel.videos.length === 0 ? 0 : (index + 1) % channel.videos.length
}

export function prevInChannel(channel: Channel, index: number): number {
  const n = channel.videos.length
  return n === 0 ? 0 : (index - 1 + n) % n
}

/**
 * 番組表内のカーソル移動。上下は同じチャンネル内（端で止まる）、
 * 左右は隣のチャンネル（曲数が少なければその最終曲）
 */
export function moveCursor(
  columns: Channel[],
  from: Position,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End',
): Position {
  const col = columns.findIndex((c) => c.number === from.channel)
  if (col === -1) return columns[0] ? { channel: columns[0].number, index: 0 } : from
  const last = (c: Channel) => Math.max(0, c.videos.length - 1)
  switch (key) {
    case 'ArrowUp':
      return { ...from, index: Math.max(0, from.index - 1) }
    case 'ArrowDown':
      return { ...from, index: Math.min(last(columns[col]), from.index + 1) }
    case 'Home':
      return { ...from, index: 0 }
    case 'End':
      return { ...from, index: last(columns[col]) }
    case 'ArrowLeft':
    case 'ArrowRight': {
      const target = columns[Math.min(columns.length - 1, Math.max(0, col + (key === 'ArrowLeft' ? -1 : 1)))]
      return { channel: target.number, index: Math.min(from.index, last(target)) }
    }
  }
}

/** 公開日の古い順 */
export function sortByPublished(channel: Channel): Channel {
  return {
    ...channel,
    videos: [...channel.videos].sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt)),
  }
}
