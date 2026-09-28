import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { currentTime } from '../hooks/useNow'
import { loadYouTubeApi, PlayerState, thumbnailUrl, watchUrl, type YTPlayer } from '../lib/youtube'
import { PlayIcon, VolumeOffIcon } from './Icons'

export interface PlayerSource {
  mode: 'live' | 'vod'
  videoId: string
  /** 動画の 0 秒地点に相当する時刻（epoch ms）。現在時刻との差が再生位置になる */
  origin: number
}

export interface PlayerHandle {
  toggleMute(): void
  syncToLive(): void
}

interface Props {
  source: PlayerSource
  title: string
  onEnded(): void
  onReturnToLive(): void
  ref?: Ref<PlayerHandle>
}

/** 再生位置の許容ずれ（秒）。これを超えるとタイムシフト扱い */
const DRIFT_TOLERANCE = 8

const keyOf = (source: PlayerSource) => `${source.videoId}@${source.origin}`
const positionOf = (source: PlayerSource) => Math.max(0, (currentTime() - source.origin) / 1000)

export function Player({ source, title, onEnded, onReturnToLive, ref }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const sourceRef = useRef(source)
  const onEndedRef = useRef(onEnded)
  const loadedKeyRef = useRef<string | null>(null)
  const [activated, setActivated] = useState(false)
  const [ready, setReady] = useState(false)
  const [muted, setMuted] = useState(false)
  const [behind, setBehind] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sourceRef.current = source
    onEndedRef.current = onEnded
  })

  // 視聴開始（ユーザー操作後）にプレーヤーを生成する
  useEffect(() => {
    if (!activated || !hostRef.current) return
    let disposed = false
    let autoplayCheck: number | undefined
    const mount = document.createElement('div')
    hostRef.current.replaceChildren(mount)

    loadYouTubeApi()
      .then((YT) => {
        if (disposed) return
        const initial = sourceRef.current
        new YT.Player(mount, {
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          videoId: initial.videoId,
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            start: Math.floor(positionOf(initial)),
            origin: location.origin,
          },
          events: {
            onReady: ({ target }) => {
              if (disposed) return target.destroy()
              playerRef.current = target
              loadedKeyRef.current = keyOf(sourceRef.current)
              setReady(true)
              target.seekTo(positionOf(sourceRef.current), true)
              target.playVideo()
              // 音声付き自動再生がブロックされた場合はミュートで再生する
              autoplayCheck = window.setTimeout(() => {
                const state = target.getPlayerState()
                if (state !== PlayerState.PLAYING && state !== PlayerState.BUFFERING) {
                  target.mute()
                  target.playVideo()
                  setMuted(true)
                }
              }, 2500)
            },
            onStateChange: ({ data, target }) => {
              if (data === PlayerState.ENDED) onEndedRef.current()
              if (data === PlayerState.PLAYING) {
                setError(null)
                setMuted(target.isMuted())
              }
            },
            onError: ({ data }) => {
              setError(
                data === 101 || data === 150
                  ? 'この動画は埋め込み再生が許可されていません。'
                  : data === 100
                    ? 'この動画は削除されたか非公開になりました。'
                    : 'この動画を再生できませんでした。',
              )
            },
          },
        })
      })
      .catch((e: Error) => setError(e.message))

    return () => {
      disposed = true
      window.clearTimeout(autoplayCheck)
      playerRef.current?.destroy()
      playerRef.current = null
      setReady(false)
    }
  }, [activated])

  // 番組が切り替わったら読み込み直す
  useEffect(() => {
    const player = playerRef.current
    const current = sourceRef.current
    if (!ready || !player || loadedKeyRef.current === keyOf(current)) return
    loadedKeyRef.current = keyOf(current)
    setError(null)
    setBehind(false)
    player.loadVideoById({ videoId: current.videoId, startSeconds: positionOf(current) })
  }, [ready, source.videoId, source.origin])

  // ライブ視聴中は放送位置とのずれを監視する
  useEffect(() => {
    if (!ready || source.mode !== 'live') return
    const id = window.setInterval(() => {
      const player = playerRef.current
      if (!player) return
      const state = player.getPlayerState()
      if (state === PlayerState.PAUSED) return setBehind(true)
      if (state !== PlayerState.PLAYING) return
      setBehind(Math.abs(positionOf(sourceRef.current) - player.getCurrentTime()) > DRIFT_TOLERANCE)
    }, 2000)
    return () => window.clearInterval(id)
  }, [ready, source.mode])

  const syncToLive = () => {
    if (source.mode === 'vod') return onReturnToLive()
    const player = playerRef.current
    if (!player) return
    player.seekTo(positionOf(sourceRef.current), true)
    player.playVideo()
    setBehind(false)
  }

  const toggleMute = () => {
    const player = playerRef.current
    if (!player) return
    if (player.isMuted()) player.unMute()
    else player.mute()
    setMuted(!player.isMuted())
  }

  useImperativeHandle(ref, () => ({ toggleMute, syncToLive }))

  const isLive = source.mode === 'live' && !(behind && ready)

  return (
    <div className="overflow-hidden rounded-8 bg-black shadow-1">
      <div className="relative aspect-video">
        <div ref={hostRef} className="absolute inset-0 [&_iframe]:size-full" />

        {!activated && (
          <button
            type="button"
            onClick={() => setActivated(true)}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-4 text-white focus-ring"
          >
            <img
              src={thumbnailUrl(source.videoId, 'hq')}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-60 transition group-hover:opacity-50"
            />
            <span className="relative flex size-20 items-center justify-center rounded-full bg-key-900 shadow-3 transition group-hover:scale-105 group-hover:bg-key-1000 sm:size-24">
              <PlayIcon size={44} className="translate-x-0.5" />
            </span>
            <span className="relative rounded-8 bg-black/70 px-4 py-2 text-std-16B-170">タップして視聴を開始</span>
            <span className="sr-only">{title}</span>
          </button>
        )}

        {error && (
          <div
            role="alert"
            className="absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-8 bg-black/85 p-4 text-dns-16N-130 text-white"
          >
            <span>{error}</span>
            <a
              href={watchUrl(source.videoId)}
              target="_blank"
              rel="noreferrer"
              className="text-key-300 underline underline-offset-4 hover:decoration-2"
            >
              YouTube で開く
            </a>
          </div>
        )}
      </div>

      {activated && (
        <div className="flex min-h-12 items-center gap-3 bg-solid-gray-900 px-3 py-2 text-white">
          {source.mode === 'vod' ? (
            <span className="rounded-4 bg-solid-gray-700 px-2 py-1 text-oln-14B-100">オンデマンド</span>
          ) : isLive ? (
            <span className="flex items-center gap-2 rounded-4 bg-red-900 px-2 py-1 text-oln-14B-100">
              <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden="true" />
              LIVE
            </span>
          ) : (
            <span className="rounded-4 bg-solid-gray-700 px-2 py-1 text-oln-14B-100">タイムシフト</span>
          )}
          {(!isLive || source.mode === 'vod') && ready && (
            <button
              type="button"
              onClick={syncToLive}
              className="rounded-4 px-2 py-1 text-oln-14B-100 text-key-200 underline underline-offset-4 focus-ring hover:decoration-2"
            >
              {source.mode === 'vod' ? '放送に戻る' : '放送位置に戻る'}
              <kbd className="ml-2 font-sans text-solid-gray-300 no-underline max-md:hidden">L</kbd>
            </button>
          )}
          {muted && (
            <button
              type="button"
              onClick={toggleMute}
              className="ml-auto flex items-center gap-2 rounded-4 bg-white px-3 py-1.5 text-oln-14B-100 text-solid-gray-900 focus-ring hover:bg-solid-gray-100"
            >
              <VolumeOffIcon size={18} />
              ミュート中・タップで音声オン
            </button>
          )}
        </div>
      )}
    </div>
  )
}
