export interface ParsedTitle {
  /** 曲名（「」『』内）。見つからなければ整形済みタイトル全体 */
  song: string
  /** 歌唱メンバーなど曲名以降の補足 */
  performers: string
}

const PREFIX = /^(?:【[^】]*CGライブ[^】]*】|🎀?公式CGライブ(?:[＃#]\d+)?)\s*/u

/** 「【公式CGライブ】「曲名」歌唱者」形式の動画タイトルを番組表向けに分解する */
export function parseTitle(raw: string): ParsedTitle {
  const title = raw.replace(PREFIX, '').trim()
  const m = /^[「『](.+?)[」』]\s*(.*)$/u.exec(title)
  if (!m) return { song: title, performers: '' }
  return { song: m[1].trim(), performers: m[2].replace(/\s+/gu, ' ').trim() }
}
