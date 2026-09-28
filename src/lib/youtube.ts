/** YouTube IFrame Player API の必要最小限の型定義 */
export interface YTPlayer {
  loadVideoById(args: { videoId: string; startSeconds?: number }): void
  cueVideoById(args: { videoId: string; startSeconds?: number }): void
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  mute(): void
  unMute(): void
  isMuted(): boolean
  getCurrentTime(): number
  getPlayerState(): number
  getVideoData(): { video_id?: string }
  destroy(): void
}

export const PlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      host?: string
      videoId?: string
      width?: string | number
      height?: string | number
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (e: { target: YTPlayer }) => void
        onStateChange?: (e: { data: number; target: YTPlayer }) => void
        onError?: (e: { data: number; target: YTPlayer }) => void
      }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTNamespace> | undefined

export function loadYouTubeApi(): Promise<YTNamespace> {
  apiPromise ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT!)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      apiPromise = undefined
      reject(new Error('YouTube プレーヤーを読み込めませんでした'))
    }
    document.head.append(script)
  })
  return apiPromise
}

export const thumbnailUrl = (videoId: string, size: 'mq' | 'hq' | 'maxres' = 'mq') =>
  `https://i.ytimg.com/vi/${videoId}/${size === 'maxres' ? 'maxresdefault' : `${size}default`}.jpg`

export const watchUrl = (videoId: string, playlistId?: string) =>
  `https://www.youtube.com/watch?v=${videoId}${playlistId ? `&list=${playlistId}` : ''}`
