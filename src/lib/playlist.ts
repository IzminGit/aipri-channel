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

/**
 * 番組表の列の並び：シリーズ順（左から）→ 同じシリーズ内はプレイリスト作成日の新しい順。
 * チャンネル番号は並べた順に 1 から振り直す（番組表・キーボード操作の番号と一致させる）
 */
export function arrangeChannels(channels: Channel[], seriesOrder: string[]): Channel[] {
  const rank = (s: string) => {
    const i = seriesOrder.indexOf(s)
    return i === -1 ? seriesOrder.length : i
  }
  return [...channels]
    .sort(
      (a, b) =>
        rank(a.series) - rank(b.series) ||
        Date.parse(b.playlistCreatedAt) - Date.parse(a.playlistCreatedAt) ||
        a.number - b.number,
    )
    .map((c, i) => ({ ...c, number: i + 1 }))
}

/** 公開日の古い順 */
export function sortByPublished(channel: Channel): Channel {
  return {
    ...channel,
    videos: [...channel.videos].sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt)),
  }
}

/** お気に入り列のチャンネル番号（実在のチャンネルは 1 以上） */
export const FAVORITES = 0

/** お気に入り（動画 ID の並び）から番組表の列を組み立てる。カタログにない動画は除く */
export function buildFavorites(channels: Channel[], ids: string[]): Channel {
  const byId = new Map(channels.flatMap((c) => c.videos.map((v) => [v.id, v] as const)))
  return {
    number: FAVORITES,
    slug: 'favorites',
    name: 'お気に入り',
    shortName: 'お気に入り',
    series: 'お気に入り',
    color: 'yellow',
    playlistId: '',
    playlistTitle: 'お気に入り',
    playlistCreatedAt: '1970-01-01T00:00:00Z',
    videos: ids.flatMap((id) => byId.get(id) ?? []),
  }
}

/** 動画が属するチャンネル（お気に入り列ではなく元のプレイリスト）の位置 */
export function originOf(channels: Channel[], videoId: string): Position | null {
  for (const c of channels) {
    const index = c.videos.findIndex((v) => v.id === videoId)
    if (index !== -1) return { channel: c.number, index }
  }
  return null
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

/** 並び替え（from 番目を to 番目へ移動） */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item)
  return next
}
