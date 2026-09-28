/**
 * channels.config.json のプレイリストを YouTube Data API v3 で取得し、
 * public/data/catalog.json を生成する。
 *
 *   YOUTUBE_API_KEY=xxxx npm run fetch-data
 *
 * - API キーがない場合は何もせず終了（既存の catalog.json をそのまま使う）
 * - 取得に失敗したチャンネルは前回のデータを維持する
 * - 非公開・削除済み・埋め込み不可の動画は除外する
 * - 動画は公開日の古い順に並べる
 * - 内容に変化がなければファイルを書き換えない（無駄なコミットを防ぐ）
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseIsoDuration } from '../src/lib/duration.ts'
import {
  catalogSchema,
  channelsConfigSchema,
  type Catalog,
  type Channel,
  type ChannelConfig,
  type Video,
} from '../src/schema.ts'

const ROOT = resolve(import.meta.dirname, '..')
const CONFIG_PATH = resolve(ROOT, 'channels.config.json')
const CATALOG_PATH = resolve(ROOT, 'public/data/catalog.json')
const API = 'https://www.googleapis.com/youtube/v3'

const apiKey = process.env.YOUTUBE_API_KEY

async function api<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${path}`)
  for (const [k, v] of Object.entries({ ...params, key: apiKey! })) url.searchParams.set(k, v)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`)
  return (await res.json()) as T
}

interface PlaylistItemsResponse {
  nextPageToken?: string
  items: { contentDetails: { videoId: string } }[]
}
interface VideosResponse {
  items: {
    id: string
    snippet: { title: string; description: string; publishedAt: string }
    contentDetails: { duration: string }
    status: { privacyStatus: string; embeddable: boolean; uploadStatus: string }
  }[]
}
interface PlaylistsResponse {
  items: { snippet: { title: string; publishedAt: string } }[]
}

async function fetchChannel(config: ChannelConfig): Promise<Channel> {
  const ids: string[] = []
  let pageToken: string | undefined
  do {
    const page = await api<PlaylistItemsResponse>('playlistItems', {
      part: 'contentDetails',
      playlistId: config.playlistId,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })
    ids.push(...page.items.map((i) => i.contentDetails.videoId))
    pageToken = page.nextPageToken
  } while (pageToken)

  const details = new Map<string, VideosResponse['items'][number]>()
  for (let i = 0; i < ids.length; i += 50) {
    const res = await api<VideosResponse>('videos', {
      part: 'snippet,contentDetails,status',
      id: ids.slice(i, i + 50).join(','),
    })
    for (const v of res.items) details.set(v.id, v)
  }

  const videos: Video[] = []
  for (const id of ids) {
    const v = details.get(id)
    if (!v) continue // 削除済み・非公開
    if (v.status.privacyStatus === 'private' || !v.status.embeddable) continue
    if (v.status.uploadStatus !== 'processed') continue
    const durationSec = parseIsoDuration(v.contentDetails.duration)
    if (durationSec <= 0) continue // ライブ配信・プレミア公開待ちなど
    videos.push({
      id,
      title: v.snippet.title,
      durationSec,
      publishedAt: v.snippet.publishedAt,
      description: v.snippet.description,
    })
  }

  // 番組表は公開日の古い順に並べる
  videos.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))

  const playlist = await api<PlaylistsResponse>('playlists', { part: 'snippet', id: config.playlistId })
  return {
    ...config,
    playlistTitle: playlist.items[0]?.snippet.title ?? config.name,
    // プレイリストの作成日（番組表ではシリーズ内をこの新しい順に並べる）
    playlistCreatedAt: playlist.items[0]?.snippet.publishedAt ?? new Date(0).toISOString(),
    videos,
  }
}

async function readPrevious(): Promise<Catalog | null> {
  try {
    return catalogSchema.parse(JSON.parse(await readFile(CATALOG_PATH, 'utf8')))
  } catch {
    return null
  }
}

async function main() {
  if (!apiKey) {
    console.warn('YOUTUBE_API_KEY が未設定のため、既存の catalog.json を使用します。')
    return
  }

  const config = channelsConfigSchema.parse(JSON.parse(await readFile(CONFIG_PATH, 'utf8')))
  const previous = await readPrevious()

  const channels: Channel[] = []
  let failures = 0
  for (const ch of [...config.channels].sort((a, b) => a.number - b.number)) {
    try {
      const fetched = await fetchChannel(ch)
      console.log(`✔ ${ch.number} ${ch.name}: ${fetched.videos.length} 本`)
      channels.push(fetched)
    } catch (err) {
      failures++
      console.error(`✘ ${ch.number} ${ch.name}:`, err)
      const prev = previous?.channels.find((p) => p.playlistId === ch.playlistId)
      if (prev) channels.push({ ...prev, ...ch })
    }
  }
  if (failures === config.channels.length) throw new Error('すべてのチャンネルの取得に失敗しました')

  const unchanged =
    previous &&
    JSON.stringify(previous.channels) === JSON.stringify(channels) &&
    JSON.stringify(previous.series) === JSON.stringify(config.series)
  if (unchanged) {
    console.log('変更なし')
    return
  }

  const catalog = catalogSchema.parse({ generatedAt: new Date().toISOString(), series: config.series, channels })
  await writeFile(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`)
  console.log(`catalog.json を更新しました (${channels.length} チャンネル)`)
}

await main()
