import { describe, expect, it } from 'vitest'
import type { Channel } from '../schema'
import { parseIsoDuration } from './duration'
import { broadcastDayStart, DAY, slotAt, slotsBetween, upcoming } from './schedule'
import { parseTitle } from './title'

const channel: Channel = {
  number: 1,
  slug: 'test',
  name: 'テスト',
  shortName: 'テスト',
  color: 'magenta',
  playlistId: 'PLx',
  playlistTitle: 'x',
  videos: [
    { id: 'aaaaaaaaaaa', title: 'A', durationSec: 100 },
    { id: 'bbbbbbbbbbb', title: 'B', durationSec: 50 },
    { id: 'ccccccccccc', title: 'C', durationSec: 150 },
  ],
}

// 2026-09-29 05:00 JST
const dayStart = Date.parse('2026-09-29T05:00:00+09:00')

describe('broadcastDayStart', () => {
  it('5:00 JST で日付が切り替わる', () => {
    expect(broadcastDayStart(dayStart)).toBe(dayStart)
    expect(broadcastDayStart(dayStart - 1)).toBe(dayStart - DAY)
    expect(broadcastDayStart(Date.parse('2026-09-30T04:59:59+09:00'))).toBe(dayStart)
  })
})

describe('slotAt', () => {
  it('放送日の開始はプレイリスト先頭', () => {
    const s = slotAt(channel, dayStart)!
    expect(s.video.title).toBe('A')
    expect(s.start).toBe(dayStart)
    expect(s.end).toBe(dayStart + 100_000)
  })

  it('再生時間に従って番組が進み、ループする', () => {
    expect(slotAt(channel, dayStart + 100_000)!.video.title).toBe('B')
    expect(slotAt(channel, dayStart + 149_999)!.video.title).toBe('B')
    expect(slotAt(channel, dayStart + 150_000)!.video.title).toBe('C')
    const loop = slotAt(channel, dayStart + 300_000 + 10_000)!
    expect(loop.video.title).toBe('A')
    expect(loop.start).toBe(dayStart + 300_000)
  })

  it('放送日の終わりで番組は打ち切られる', () => {
    const s = slotAt(channel, dayStart + DAY - 1)!
    expect(s.end).toBe(dayStart + DAY)
    expect(slotAt(channel, dayStart + DAY)!.start).toBe(dayStart + DAY)
  })

  it('動画がなければ null', () => {
    expect(slotAt({ ...channel, videos: [] }, dayStart)).toBeNull()
  })
})

describe('slotsBetween / upcoming', () => {
  it('隙間なく連続した番組を返す', () => {
    const slots = slotsBetween(channel, dayStart + 50_000, dayStart + 700_000)
    expect(slots[0].start).toBe(dayStart)
    for (let i = 1; i < slots.length; i++) expect(slots[i].start).toBe(slots[i - 1].end)
    expect(slots.at(-1)!.end).toBeGreaterThanOrEqual(dayStart + 700_000)
  })

  it('放送日をまたいでも先頭から再開する', () => {
    const slots = slotsBetween(channel, dayStart + DAY - 60_000, dayStart + DAY + 1)
    expect(slots.at(-1)!.video.title).toBe('A')
    expect(slots.at(-1)!.start).toBe(dayStart + DAY)
  })

  it('upcoming は現在 + count 件', () => {
    const list = upcoming(channel, dayStart + 10_000, 3)
    expect(list.map((s) => s.video.title)).toEqual(['A', 'B', 'C', 'A'])
  })
})

describe('parseIsoDuration', () => {
  it.each([
    ['PT2M9S', 129],
    ['PT1H', 3600],
    ['PT45S', 45],
    ['P1DT1S', 86401],
    ['PT0S', 0],
  ])('%s → %i', (iso, sec) => expect(parseIsoDuration(iso)).toBe(sec))

  it('不正な値は例外', () => expect(() => parseIsoDuration('2:09')).toThrow())
})

describe('parseTitle', () => {
  it('アイプリ形式', () => {
    expect(parseTitle('【公式CGライブ】「TOP POWER」熱海ナナ、望永エマ')).toEqual({
      song: 'TOP POWER',
      performers: '熱海ナナ、望永エマ',
    })
  })

  it('プリパラ形式', () => {
    expect(parseTitle('🎀公式CGライブ＃01『OPENDREAMLAND!』ノンテロップVer　SoLaMi♡SMILE')).toEqual({
      song: 'OPENDREAMLAND!',
      performers: 'ノンテロップVer SoLaMi♡SMILE',
    })
    expect(parseTitle('🎀公式CGライブ『ポォロン♪あまやどりのうた』')).toEqual({
      song: 'ポォロン♪あまやどりのうた',
      performers: '',
    })
  })

  it('想定外の形式はそのまま', () => {
    expect(parseTitle('特別編')).toEqual({ song: '特別編', performers: '' })
  })
})
