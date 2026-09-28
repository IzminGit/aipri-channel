import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { InfoPanel } from './components/InfoPanel'
import { Player, type PlayerHandle } from './components/Player'
import { ProgramGuide } from './components/ProgramGuide'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { Toolbar, type ThemePreference } from './components/Toolbar'
import { useStoredState } from './hooks/useStoredState'
import { useTheme } from './hooks/useTheme'
import { loadCatalog } from './lib/catalog'
import {
  buildFavorites,
  cellId,
  FAVORITES,
  moveItem,
  nextInChannel,
  originOf,
  prevInChannel,
  samePosition,
  toggleId,
  type Position,
} from './lib/playlist'
import { parseTitle } from './lib/title'

const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark']
/** 番組表からマウスが離れてから、詳細表示を再生中の曲に戻すまでの時間 */
const PREVIEW_LINGER = 900

function readUrlPosition(): { channel: number | null; index: number } {
  const params = new URLSearchParams(location.search)
  const ch = params.get('ch')
  const n = Number(params.get('n'))
  return {
    channel: ch !== null && /^\d+$/.test(ch) ? Number(ch) : null,
    index: Number.isInteger(n) && n > 0 ? n - 1 : 0,
  }
}

export default function App() {
  const catalog = use(loadCatalog())
  const [theme, setTheme] = useTheme()
  const [storedFavorites, setStoredFavorites] = useStoredState<string[]>('favorite-songs', [])
  const [lastPosition, setLastPosition] = useStoredState<Position | null>('last-position', null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [active, setActive] = useState(false)
  const [preview, setPreview] = useState<Position | null>(null)
  const playerRef = useRef<PlayerHandle>(null)
  const lingerTimer = useRef(0)

  // お気に入り列（曲単位・並び順あり）。先頭の列として表示する
  const favorites = useMemo(
    () => buildFavorites(catalog.channels, storedFavorites),
    [catalog.channels, storedFavorites],
  )
  const favoriteIds = useMemo(() => new Set(favorites.videos.map((v) => v.id)), [favorites])
  const columns = useMemo(() => [favorites, ...catalog.channels], [favorites, catalog.channels])

  const findChannel = useCallback(
    (n: number) => (n === FAVORITES ? favorites : catalog.channels.find((c) => c.number === n)),
    [favorites, catalog.channels],
  )
  const isValid = useCallback(
    (p: Position | null): p is Position => !!p && (findChannel(p.channel)?.videos.length ?? 0) > p.index,
    [findChannel],
  )

  const [playing, setPlaying] = useState<Position>(() => {
    const url = readUrlPosition()
    if (url.channel !== null) {
      if (isValid({ channel: url.channel, index: url.index })) return { channel: url.channel, index: url.index }
      if (isValid({ channel: url.channel, index: 0 })) return { channel: url.channel, index: 0 }
    }
    if (isValid(lastPosition)) return lastPosition
    const first = catalog.channels.find((c) => c.videos.length > 0) ?? catalog.channels[0]
    return { channel: first.number, index: 0 }
  })

  const playingChannel = findChannel(playing.channel)!
  const playingVideo = playingChannel.videos[playing.index]
  const shown = isValid(preview) ? preview : playing
  const shownChannel = findChannel(shown.channel)!
  const shownVideo = shownChannel.videos[shown.index]

  // URL（?ch=&n=）と最後に再生した位置を同期（お気に入り列は ch=0）
  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set('ch', String(playing.channel))
    url.searchParams.set('n', String(playing.index + 1))
    history.replaceState(null, '', url)
    setLastPosition(playing)
  }, [playing, setLastPosition])

  useEffect(() => {
    const { song } = parseTitle(playingVideo.title)
    document.title = `${song} - ${playingChannel.shortName} | アイプリチャンネル`
  }, [playingVideo, playingChannel])

  const play = useCallback((pos: Position) => {
    window.clearTimeout(lingerTimer.current)
    setPlaying(pos)
    setPreview(null)
    setActive(true)
  }, [])

  const step = useCallback(
    (dir: 1 | -1) =>
      setPlaying((p) => {
        const ch = findChannel(p.channel)!
        return { ...p, index: dir === 1 ? nextInChannel(ch, p.index) : prevInChannel(ch, p.index) }
      }),
    [findChannel],
  )

  /**
   * お気に入りを更新する。お気に入り列を再生中なら、同じ曲を指し続けるよう位置を合わせ、
   * 列から外れた場合は元のチャンネルでの位置に切り替える（再生は途切れない）
   */
  const updateFavorites = useCallback(
    (next: string[]) => {
      setStoredFavorites(next)
      setPreview(null)
      if (playing.channel !== FAVORITES) return
      const id = playingVideo.id
      const index = buildFavorites(catalog.channels, next).videos.findIndex((v) => v.id === id)
      const pos = index !== -1 ? { channel: FAVORITES, index } : originOf(catalog.channels, id)
      if (pos && !samePosition(pos, playing)) setPlaying(pos)
    },
    [catalog.channels, playing, playingVideo.id, setStoredFavorites],
  )
  const currentIds = useMemo(() => favorites.videos.map((v) => v.id), [favorites])
  const toggleFavorite = useCallback(
    (videoId: string) => updateFavorites(toggleId(currentIds, videoId)),
    [currentIds, updateFavorites],
  )
  const moveFavorite = useCallback(
    (from: number, to: number) => updateFavorites(moveItem(currentIds, from, to)),
    [currentIds, updateFavorites],
  )

  const startPreview = useCallback((pos: Position) => {
    window.clearTimeout(lingerTimer.current)
    setPreview(pos)
  }, [])
  const endPreview = useCallback(() => {
    window.clearTimeout(lingerTimer.current)
    lingerTimer.current = window.setTimeout(() => setPreview(null), PREVIEW_LINGER)
  }, [])
  const holdPreview = useCallback(() => window.clearTimeout(lingerTimer.current), [])

  // キーボード / テレビのリモコン操作（番組表内の矢印・F・Shift+↑↓ は ProgramGuide が処理）
  const digitBuffer = useRef({ value: '', timer: 0 })
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      const target = e.target
      if (target instanceof Element) {
        if (target.closest('input:not([type=radio]), textarea, select, [contenteditable=true]')) return
        if (target.closest('[role=grid]') && e.key.startsWith('Arrow')) return
      }
      if (shortcutsOpen && e.key !== '?') return

      const switchChannel = (dir: 1 | -1) => {
        const list = columns.filter((c) => c.videos.length > 0)
        const i = list.findIndex((c) => c.number === playing.channel)
        const next = list[(i + dir + list.length) % list.length]
        if (next) play({ channel: next.number, index: 0 })
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          const first = columns.find((c) => c.videos.length > 0)
          const cell =
            document.getElementById(cellId(playing)) ??
            (first ? document.getElementById(cellId({ channel: first.number, index: 0 })) : null)
          cell?.focus()
          break
        }
        case 'PageUp':
        case 'ChannelUp':
          switchChannel(-1)
          break
        case 'PageDown':
        case 'ChannelDown':
          switchChannel(1)
          break
        case 'n':
        case 'N':
        case 'MediaTrackNext':
          step(1)
          break
        case 'p':
        case 'P':
        case 'MediaTrackPrevious':
          step(-1)
          break
        case 'f':
        case 'F':
          toggleFavorite(playingVideo.id)
          break
        case 'm':
        case 'M':
        case 'AudioVolumeMute':
          playerRef.current?.toggleMute()
          break
        case 't':
        case 'T':
          setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length])
          break
        case '?':
          setShortcutsOpen((o) => !o)
          break
        case 'Escape':
          window.clearTimeout(lingerTimer.current)
          setPreview(null)
          return
        default: {
          if (!/^\d$/.test(e.key)) return
          // チャンネル番号の直接入力（複数桁は 1.2 秒以内に続けて押す）
          const buf = digitBuffer.current
          window.clearTimeout(buf.timer)
          buf.value = (buf.value + e.key).slice(-3)
          const exists = (n: number) => catalog.channels.some((c) => c.number === n && c.videos.length > 0)
          const longer = catalog.channels.some(
            (c) => String(c.number).startsWith(buf.value) && String(c.number) !== buf.value,
          )
          const commit = () => {
            if (exists(Number(buf.value))) play({ channel: Number(buf.value), index: 0 })
            buf.value = ''
          }
          if (exists(Number(buf.value)) && !longer) commit()
          else buf.timer = window.setTimeout(commit, 1200)
          break
        }
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [catalog.channels, columns, playing, playingVideo.id, play, setTheme, shortcutsOpen, step, theme, toggleFavorite])

  const toolbar = <Toolbar theme={theme} onThemeChange={setTheme} onShowShortcuts={() => setShortcutsOpen(true)} />

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <a
        href="#guide"
        className="sr-only z-50 rounded-8 bg-accent px-4 py-3 text-accent-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        番組表へスキップ
      </a>
      <h1 className="sr-only">アイプリチャンネル — CGライブ番組表</h1>

      {/* 上段：プレーヤー（左）と番組の詳細（右）。番組表をスクロールしても固定 */}
      <section
        aria-label="プレーヤー"
        className="grid shrink-0 lg:h-[min(44dvh,calc((100vw-26rem)*0.5625))] lg:grid-cols-[minmax(0,1fr)_26rem] 2xl:h-[min(48dvh,calc((100vw-30rem)*0.5625))] 2xl:grid-cols-[minmax(0,1fr)_30rem]"
      >
        <div className="aspect-video lg:aspect-auto lg:h-full">
          <Player
            ref={playerRef}
            videoId={playingVideo.id}
            title={playingVideo.title}
            active={active}
            onActivate={() => setActive(true)}
            onEnded={() => step(1)}
          />
        </div>
        <div className="min-h-0 max-lg:hidden">
          <InfoPanel
            channel={shownChannel}
            video={shownVideo}
            index={shown.index}
            isPlaying={samePosition(shown, playing)}
            favorite={favoriteIds.has(shownVideo.id)}
            toolbar={toolbar}
            onPlay={() => play(shown)}
            onToggleFavorite={() => toggleFavorite(shownVideo.id)}
            onPointerEnter={holdPreview}
            onPointerLeave={endPreview}
          />
        </div>
      </section>
      <div className="lg:hidden">
        <InfoPanel
          compact
          channel={playingChannel}
          video={playingVideo}
          index={playing.index}
          isPlaying
          favorite={favoriteIds.has(playingVideo.id)}
          toolbar={toolbar}
          onPlay={() => play(playing)}
          onToggleFavorite={() => toggleFavorite(playingVideo.id)}
        />
      </div>

      {/* 下段：番組表（ここだけスクロール） */}
      <main id="guide" className="flex min-h-0 flex-1 flex-col border-t border-line">
        <ProgramGuide
          columns={columns}
          playing={playing}
          preview={isValid(preview) ? preview : null}
          favoriteIds={favoriteIds}
          onPlay={play}
          onPreview={startPreview}
          onPreviewEnd={endPreview}
          onToggleFavorite={toggleFavorite}
          onMoveFavorite={moveFavorite}
        />
      </main>

      <ShortcutsDialog open={shortcutsOpen} generatedAt={catalog.generatedAt} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
