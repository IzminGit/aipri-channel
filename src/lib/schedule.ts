import type { Channel, Video } from '../schema'

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/**
 * 放送日の区切り。テレビ番組表にならい、毎日 5:00 (JST) に各チャンネルの
 * プレイリスト先頭から放送を開始する。5:00 JST = 20:00 UTC。
 */
const DAY_START_OFFSET = 20 * HOUR

export interface Slot {
  channelNumber: number
  video: Video
  /** プレイリスト内の位置 */
  index: number
  start: number
  end: number
}

/** 時刻 t を含む放送日の開始時刻（epoch ms） */
export function broadcastDayStart(t: number): number {
  return Math.floor((t - DAY_START_OFFSET) / DAY) * DAY + DAY_START_OFFSET
}

function playable(channel: Channel): Video[] {
  return channel.videos.filter((v) => v.durationSec > 0)
}

/** 時刻 t に放送中の番組。動画がないチャンネルは null */
export function slotAt(channel: Channel, t: number): Slot | null {
  const videos = playable(channel)
  if (videos.length === 0) return null

  const dayStart = broadcastDayStart(t)
  const dayEnd = dayStart + DAY
  const loop = videos.reduce((sum, v) => sum + v.durationSec * 1000, 0)
  const elapsed = t - dayStart
  const loopStart = dayStart + Math.floor(elapsed / loop) * loop

  let start = loopStart
  for (const [index, video] of videos.entries()) {
    const end = start + video.durationSec * 1000
    if (t < end) {
      return { channelNumber: channel.number, video, index, start, end: Math.min(end, dayEnd) }
    }
    start = end
  }
  // 浮動小数点誤差などで到達した場合の保険
  const last = videos.length - 1
  return {
    channelNumber: channel.number,
    video: videos[last],
    index: last,
    start: loopStart + loop - videos[last].durationSec * 1000,
    end: Math.min(loopStart + loop, dayEnd),
  }
}

/** [from, to) に重なる番組を時系列で列挙する（放送日をまたいでもよい） */
export function slotsBetween(channel: Channel, from: number, to: number): Slot[] {
  const slots: Slot[] = []
  let t = from
  while (t < to) {
    const slot = slotAt(channel, t)
    if (!slot) break
    slots.push(slot)
    t = slot.end
  }
  return slots
}

/** 時刻 t の番組と、それに続く count 件の番組 */
export function upcoming(channel: Channel, t: number, count: number): Slot[] {
  const slots: Slot[] = []
  let cursor = t
  for (let i = 0; i <= count; i++) {
    const slot = slotAt(channel, cursor)
    if (!slot) break
    slots.push(slot)
    cursor = slot.end
  }
  return slots
}
