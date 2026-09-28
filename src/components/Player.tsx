import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { loadYouTubeApi, PlayerState, thumbnailUrl, watchUrl, type YTPlayer } from '../lib/youtube'
import { PlayIcon, VolumeOffIcon } from './Icons'

export interface PlayerHandle {
  toggleMute(): void
}

interface Props {
  videoId: string
  title: string
  /** ユーザー操作で視聴が開始されたか（音声付き自動再生にはユーザー操作が必要） */
  active: boolean
  onActivate(): void
  /** 再生終了、または再生できずスキップするとき */
  onEnded(): void
  ref?: Ref<PlayerHandle>
}

/** 再生できない動画を自動でスキップするまでの待ち時間 */
const SKIP_DELAY = 4000

export function Player({ videoId, title, active, onActivate, onEnded, ref }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const videoIdRef = useRef(videoId)
  const loadedRef = useRef<string | null>(null)
  const onEndedRef = useRef(onEnded)
  const [ready, setReady] = useState(false)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<{ videoId: string; message: string } | null>(null)

  useEffect(() => {
    videoIdRef.current = videoId
    onEndedRef.current = onEnded
  })

  // 視聴開始（ユーザー操作後）にプレーヤーを生成する
  useEffect(() => {
    if (!active || !hostRef.current) return
    let disposed = false
    let autoplayCheck: number | undefined
    const mount = document.createElement('div')
    hostRef.current.replaceChildren(mount)

    loadYouTubeApi()
      .then((YT) => {
        if (disposed) return
        new YT.Player(mount, {
          host: 'https://www.youtube-nocookie.com',
          width: '100%',
          height: '100%',
          videoId: videoIdRef.current,
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, origin: location.origin },
          events: {
            onReady: ({ target }) => {
              if (disposed) return target.destroy()
              playerRef.current = target
              loadedRef.current = videoIdRef.current
              setReady(true)
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
              if (data === PlayerState.PLAYING) setMuted(target.isMuted())
            },
            onError: ({ data }) => {
              setError({
                videoId: videoIdRef.current,
                message:
                  data === 101 || data === 150
                    ? 'この動画は埋め込み再生が許可されていません。'
                    : data === 100
                      ? 'この動画は削除されたか非公開になりました。'
                      : 'この動画を再生できませんでした。',
              })
            },
          },
        })
      })
      .catch((e: Error) => setError({ videoId: videoIdRef.current, message: e.message }))

    return () => {
      disposed = true
      window.clearTimeout(autoplayCheck)
      playerRef.current?.destroy()
      playerRef.current = null
      loadedRef.current = null
      setReady(false)
    }
  }, [active])

  // 曲が切り替わったら読み込み直す
  useEffect(() => {
    const player = playerRef.current
    if (!ready || !player || loadedRef.current === videoId) return
    loadedRef.current = videoId
    player.loadVideoById({ videoId })
  }, [ready, videoId])

  // 再生できない動画は少し待って次の曲へ
  const currentError = error?.videoId === videoId ? error : null
  useEffect(() => {
    if (!currentError) return
    const id = window.setTimeout(() => onEndedRef.current(), SKIP_DELAY)
    return () => window.clearTimeout(id)
  }, [currentError])

  const toggleMute = () => {
    const player = playerRef.current
    if (!player) return
    if (player.isMuted()) player.unMute()
    else player.mute()
    setMuted(player.isMuted())
  }

  useImperativeHandle(ref, () => ({ toggleMute }))

  return (
    <div className="relative size-full overflow-hidden bg-black">
      <div ref={hostRef} className="absolute inset-0 [&_iframe]:size-full" />

      {!active && (
        <button
          type="button"
          onClick={onActivate}
          className="group absolute inset-0 flex flex-col items-center justify-center gap-4 text-white focus-ring"
        >
          <img
            src={thumbnailUrl(videoId, 'hq')}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-55 transition group-hover:opacity-45"
          />
          <span className="relative flex size-16 items-center justify-center rounded-full bg-key-900 shadow-3 transition group-hover:scale-105 group-hover:bg-key-1000 sm:size-20">
            <PlayIcon size={40} className="translate-x-0.5" />
          </span>
          <span className="relative rounded-8 bg-black/70 px-4 py-2 text-std-16B-170">クリックして視聴を開始</span>
          <span className="sr-only">{title}</span>
        </button>
      )}

      {active && muted && (
        <button
          type="button"
          onClick={toggleMute}
          className="absolute top-3 left-3 flex items-center gap-2 rounded-8 bg-white px-3 py-2 text-oln-14B-100 text-solid-gray-900 shadow-2 focus-ring hover:bg-solid-gray-100"
        >
          <VolumeOffIcon size={18} />
          ミュート中・クリックで音声オン
        </button>
      )}

      {currentError && (
        <div
          role="alert"
          className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-8 bg-black/85 p-3 text-dns-16N-130 text-white"
        >
          <span>{currentError.message}次の曲へ移ります…</span>
          <a
            href={watchUrl(videoId)}
            target="_blank"
            rel="noreferrer"
            className="text-key-300 underline underline-offset-4 hover:decoration-2"
          >
            YouTube で開く
          </a>
        </div>
      )}
    </div>
  )
}
