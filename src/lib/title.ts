export interface ParsedTitle {
  /** 曲名（最後の「」『』の中身）。見つからなければ整形済みタイトル全体 */
  song: string
  /** 歌唱メンバーや OP/ED などの補足 */
  performers: string
}

/** 先頭の飾り（【公式MV】、🎀公式CGライブ＃01、【公式】ワッチャプリマジ！CGライブステージ01 など） */
const PREFIX =
  /^(?:\s*(?:【[^】]*】|🎀?公式CGライブ(?:[＃#]\d+)?|TVアニメ|ワッチャプリマジ！CGライブステージ\d*|アイカツ[^『「]*?ミュージックビデオ)\s*)+/u
/** 末尾の決まり文句 */
const SUFFIX = /\s*(?:をお届け♪?|(?:Official\s+)?Lyric\s+Video)\s*$/iu
/** 曲名の直前にある「オープニング主題歌」などの区分 */
const KIND = /(?:後期)?(?:オープニング|エンディング|挿入歌)(?:主題歌)?|ノンクレジット(?:OP|ED)映像/u

const clean = (s: string) =>
  s
    .replace(/\s+/gu, ' ')
    .replace(/^[\s/／・、]+|[\s/／・、]+$/gu, '')
    .trim()

/** 動画タイトルを番組表向けに「曲名」と「補足」に分解する */
export function parseTitle(raw: string): ParsedTitle {
  let title = raw.trim()
  const notes: string[] = []
  if (title.includes('【スマートフォン用】')) {
    title = title.replace('【スマートフォン用】', '')
    notes.push('スマートフォン用')
  }
  title = title.replace(PREFIX, '').replace(SUFFIX, '').trim()

  // 最後の「」または『』を曲名とみなす
  const matches = [...title.matchAll(/[「『]([^「」『』]+)[」』]/gu)]
  const last = matches.at(-1)
  if (!last || last.index === undefined) {
    // （うた：〇〇）形式の歌唱者
    const singer = /[（(]うた[：:]([^）)]+)[）)]\s*$/u.exec(title)
    if (singer) {
      return {
        song: clean(title.slice(0, singer.index)),
        performers: clean([singer[1], ...notes].join(' ')),
      }
    }
    return { song: clean(title) || raw, performers: notes.join(' ') }
  }

  const before = title.slice(0, last.index)
  const after = title.slice(last.index + last[0].length).replace(SUFFIX, '')
  const kind = KIND.exec(before)?.[0]
  return {
    song: clean(last[1]),
    performers: clean([kind, after, ...notes].filter(Boolean).join(' ')),
  }
}
