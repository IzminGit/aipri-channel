import { describe, expect, it } from 'vitest'
import type { Channel, Video } from '../schema'
import { parseIsoDuration } from './duration'
import { splitLinks } from './format'
import {
  arrangeChannels,
  buildFavorites,
  FAVORITES,
  moveCursor,
  moveItem,
  nextInChannel,
  originOf,
  prevInChannel,
  sortByPublished,
  toggleId,
} from './playlist'
import { parseTitle } from './title'

const video = (id: string, publishedAt: string): Video => ({
  id: id.padEnd(11, 'x'),
  title: id,
  durationSec: 120,
  publishedAt,
  description: '',
})

const channel = (number: number, count: number): Channel => ({
  number,
  slug: `ch${number}`,
  name: `ch${number}`,
  shortName: `ch${number}`,
  series: 'テスト',
  playlistCreatedAt: '2026-01-01T00:00:00Z',
  color: 'magenta',
  playlistId: 'PLx',
  playlistTitle: 'x',
  videos: Array.from({ length: count }, (_, i) =>
    video(`v${number}-${i}`, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
  ),
})

describe('nextInChannel / prevInChannel', () => {
  const ch = channel(1, 3)
  it('次の曲へ進み、最終曲の次は 1 曲目に戻る', () => {
    expect(nextInChannel(ch, 0)).toBe(1)
    expect(nextInChannel(ch, 2)).toBe(0)
  })
  it('前の曲へ戻り、1 曲目の前は最終曲', () => {
    expect(prevInChannel(ch, 1)).toBe(0)
    expect(prevInChannel(ch, 0)).toBe(2)
  })
})

describe('sortByPublished', () => {
  it('公開日の古い順に並べる', () => {
    const ch = {
      ...channel(1, 0),
      videos: [
        video('new', '2026-09-10T09:00:25Z'),
        video('old', '2024-05-17T01:00:00Z'),
        video('mid', '2025-01-01T00:00:00Z'),
      ],
    }
    expect(sortByPublished(ch).videos.map((v) => v.title)).toEqual(['old', 'mid', 'new'])
  })
})

describe('moveCursor', () => {
  const cols = [channel(1, 5), channel(2, 2), channel(3, 4)]
  it('上下は同じチャンネル内で端に止まる', () => {
    expect(moveCursor(cols, { channel: 1, index: 0 }, 'ArrowUp')).toEqual({ channel: 1, index: 0 })
    expect(moveCursor(cols, { channel: 1, index: 3 }, 'ArrowDown')).toEqual({ channel: 1, index: 4 })
    expect(moveCursor(cols, { channel: 1, index: 4 }, 'ArrowDown')).toEqual({ channel: 1, index: 4 })
  })
  it('左右は隣のチャンネル。曲数が少なければ最終曲', () => {
    expect(moveCursor(cols, { channel: 1, index: 4 }, 'ArrowRight')).toEqual({ channel: 2, index: 1 })
    expect(moveCursor(cols, { channel: 2, index: 1 }, 'ArrowRight')).toEqual({ channel: 3, index: 1 })
    expect(moveCursor(cols, { channel: 3, index: 1 }, 'ArrowRight')).toEqual({ channel: 3, index: 1 })
    expect(moveCursor(cols, { channel: 1, index: 2 }, 'ArrowLeft')).toEqual({ channel: 1, index: 2 })
  })
  it('Home / End', () => {
    expect(moveCursor(cols, { channel: 3, index: 2 }, 'Home')).toEqual({ channel: 3, index: 0 })
    expect(moveCursor(cols, { channel: 3, index: 0 }, 'End')).toEqual({ channel: 3, index: 3 })
  })
})

describe('splitLinks', () => {
  it('URL を分割する', () => {
    expect(splitLinks('HP\nhttps://aipri.jp/anime/\n以上')).toEqual([
      { text: 'HP\n' },
      { text: 'https://aipri.jp/anime/', href: 'https://aipri.jp/anime/' },
      { text: '\n以上' },
    ])
  })
  it('URL がなければそのまま', () => expect(splitLinks('説明')).toEqual([{ text: '説明' }]))
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

  it('プリキュア主題歌（最後の「」が曲名、区分を補足に）', () => {
    expect(
      parseTitle('「名探偵プリキュア！」オープニング主題歌「ハートにヒント！名探偵プリキュア！」(ノンテロップver)'),
    ).toEqual({ song: 'ハートにヒント！名探偵プリキュア！', performers: 'オープニング主題歌 (ノンテロップver)' })
  })

  it('Lyric Video', () => {
    expect(parseTitle('「キミからのEcho」/ 響カイト(CV：佐久間大介) Lyric Video')).toEqual({
      song: 'キミからのEcho',
      performers: '響カイト(CV：佐久間大介)',
    })
    expect(parseTitle('【アイカツアカデミー！】「AMBITION!」Official Lyric Video')).toEqual({
      song: 'AMBITION!',
      performers: '',
    })
  })

  it('アイカツ！MV', () => {
    expect(parseTitle('【スマートフォン用】アイカツスターズ！ミュージックビデオ『スタートライン！』をお届け♪')).toEqual(
      { song: 'スタートライン！', performers: 'スマートフォン用' },
    )
  })

  it('（うた：〇〇）形式', () => {
    expect(parseTitle('【公式MV】レッツ！アイプリ（うた：ひまり）')).toEqual({
      song: 'レッツ！アイプリ',
      performers: 'ひまり',
    })
  })

  it('想定外の形式はそのまま', () => {
    expect(parseTitle('特別編')).toEqual({ song: '特別編', performers: '' })
  })
})

describe('お気に入り', () => {
  const chs = [channel(1, 3), channel(2, 2)]
  const id = (c: number, i: number) => `v${c}-${i}`.padEnd(11, 'x')

  it('ID の並び順で列を組み立て、存在しない動画は除く', () => {
    const fav = buildFavorites(chs, [id(2, 1), 'missingxxxx', id(1, 0)])
    expect(fav.number).toBe(FAVORITES)
    expect(fav.videos.map((v) => v.id)).toEqual([id(2, 1), id(1, 0)])
  })

  it('元のチャンネルの位置を引ける', () => {
    expect(originOf(chs, id(2, 1))).toEqual({ channel: 2, index: 1 })
    expect(originOf(chs, 'missingxxxx')).toBeNull()
  })

  it('追加と解除', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('並び替え', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(moveItem(['a', 'b'], 1, 9)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 0, 9)).toEqual(['b', 'a'])
  })
})

describe('arrangeChannels', () => {
  const ch = (number: number, series: string, created: string) => ({
    ...channel(number, 0),
    series,
    playlistCreatedAt: created,
  })
  it('シリーズ順 → シリーズ内は作成日の新しい順に並べ、番号を振り直す', () => {
    const out = arrangeChannels(
      [
        ch(10, 'アイカツ', '2024-01-01T00:00:00Z'),
        ch(11, 'プリキュア', '2023-01-01T00:00:00Z'),
        ch(12, 'プリティー', '2022-01-01T00:00:00Z'),
        ch(13, 'プリキュア', '2025-01-01T00:00:00Z'),
        ch(14, 'プリティー', '2026-01-01T00:00:00Z'),
      ],
      ['プリティー', 'プリキュア', 'アイカツ'],
    )
    expect(out.map((c) => c.slug)).toEqual(['ch14', 'ch12', 'ch13', 'ch11', 'ch10'])
    expect(out.map((c) => c.number)).toEqual([1, 2, 3, 4, 5])
  })
})
