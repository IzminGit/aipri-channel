import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header, type ThemePreference } from './components/Header'
import { InfoPanel } from './components/InfoPanel'
import { Player, type PlayerHandle } from './components/Player'
import { ProgramGuide } from './components/ProgramGuide'
import { ALL_TAB, FAVORITES_TAB, SeriesTabs } from './components/SeriesTabs'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { useStoredState } from './hooks/useStoredState'
import { useTheme } from './hooks/useTheme'
import { loadCatalog } from './lib/catalog'
import { cellId, nextInChannel, prevInChannel, samePosition, type Position } from './lib/playlist'
import { parseTitle } from './lib/title'

const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark']
/** 番組表からマウスが離れてから、詳細表示を再生中の曲に戻すまでの時間 */
const PREVIEW_LINGER = 900

function readUrlPosition(): { channel: number | null; index: number } {
  const params = new URLSearchParams(location.search)
  const ch = Number(params.get('ch'))
  const n = Number(params.get('n'))
  return {
    channel: Number.isInteger(ch) && ch > 0 ? ch : null,
    index: Number.isInteger(n) && n > 0 ? n - 1 : 0,
  }
}

export default function App() {
  const catalog = use(loadCatalog())
  const [theme, setTheme] = useTheme()
  const [favorites, setFavorites] = useStoredState<number[]>('favorites', [])
  const [tab, setTab] = useStoredState<string>('tab', ALL_TAB)
  const [lastPosition, setLastPosition] = useStoredState<Position | null>('last-position', null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [active, setActive] = useState(false)
  const [preview, setPreview] = useState<Position | null>(null)
  const playerRef = useRef<PlayerHandle>(null)
  const lingerTimer = useRef(0)

  const findChannel = useCallback((n: number) => catalog.channels.find((c) => c.number === n), [catalog.channels])
  const isValid = useCallback(
    (p: Position | null): p is Position => !!p && (findChannel(p.channel)?.videos.length ?? 0) > p.index,
    [findChannel],
  )

  const [playing, setPlaying] = useState<Position>(() => {
    const url = readUrlPosition()
    if (url.channel !== null) {
      const candidate = { channel: url.channel, index: url.index }
      if (isValid(candidate)) return candidate
      if (isValid({ channel: url.channel, index: 0 })) return { channel: url.channel, index: 0 }
    }
    if (isValid(lastPosition)) return lastPosition
    const first = catalog.channels.find((c) => c.videos.length > 0) ?? catalog.channels[0]
    return { channel: first.number, index: 0 }
  })

  // お気に入りを先頭に、それ以外はチャンネル番号順
  const ordered = useMemo(() => {
    const fav = new Set(favorites)
    return [...catalog.channels].sort(
      (a, b) => Number(fav.has(b.number)) - Number(fav.has(a.number)) || a.number - b.number,
    )
  }, [catalog.channels, favorites])

  const series = useMemo(() => [...new Set(catalog.channels.map((c) => c.series))], [catalog.channels])
  const currentTab = tab === ALL_TAB || tab === FAVORITES_TAB || series.includes(tab) ? tab : ALL_TAB
  const columns = useMemo(
    () =>
      ordered.filter((c) =>
        currentTab === ALL_TAB
          ? true
          : currentTab === FAVORITES_TAB
            ? favorites.includes(c.number)
            : c.series === currentTab,
      ),
    [ordered, currentTab, favorites],
  )

  const playingChannel = findChannel(playing.channel)!
  const playingVideo = playingChannel.videos[playing.index]
  const shown = isValid(preview) ? preview : playing
  const shownChannel = findChannel(shown.channel)!
  const shownVideo = shownChannel.videos[shown.index]

  // URL（?ch=&n=）と最後に再生した位置を同期
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

  const startPreview = useCallback((pos: Position) => {
    window.clearTimeout(lingerTimer.current)
    setPreview(pos)
  }, [])
  const endPreview = useCallback(() => {
    window.clearTimeout(lingerTimer.current)
    lingerTimer.current = window.setTimeout(() => setPreview(null), PREVIEW_LINGER)
  }, [])
  const holdPreview = useCallback(() => window.clearTimeout(lingerTimer.current), [])

  const toggleFavorite = useCallback(
    (n: number) => setFavorites(favorites.includes(n) ? favorites.filter((f) => f !== n) : [...favorites, n]),
    [favorites, setFavorites],
  )

  // キーボード / テレビのリモコン操作（番組表内の矢印キーは ProgramGuide が処理）
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
        const list = columns.some((c) => c.number === playing.channel) ? columns : ordered
        const i = list.findIndex((c) => c.number === playing.channel)
        const next = list[(i + dir + list.length) % list.length]
        if (next?.videos.length) play({ channel: next.number, index: 0 })
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          const cell =
            document.getElementById(cellId(playing)) ??
            (columns[0] ? document.getElementById(cellId({ channel: columns[0].number, index: 0 })) : null)
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
          toggleFavorite(playing.channel)
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
  }, [catalog.channels, columns, ordered, playing, play, setTheme, shortcutsOpen, step, theme, toggleFavorite])

  const infoProps = {
    channel: shownChannel,
    video: shownVideo,
    index: shown.index,
    isPlaying: samePosition(shown, playing),
    favorite: favorites.includes(shownChannel.number),
    onPlay: () => play(shown),
    onToggleFavorite: () => toggleFavorite(shownChannel.number),
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <a
        href="#guide"
        className="sr-only z-50 rounded-8 bg-accent px-4 py-3 text-accent-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        番組表へスキップ
      </a>
      <Header theme={theme} onThemeChange={setTheme} onShowShortcuts={() => setShortcutsOpen(true)} />

      {/* 上段：プレーヤー（左）と番組の詳細（右）。番組表をスクロールしても固定 */}
      <section
        aria-label="プレーヤー"
        className="grid shrink-0 lg:h-[min(46dvh,calc((100vw-26rem)*0.5625))] lg:grid-cols-[minmax(0,1fr)_26rem] 2xl:h-[min(50dvh,calc((100vw-30rem)*0.5625))] 2xl:grid-cols-[minmax(0,1fr)_30rem]"
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
          <InfoPanel {...infoProps} onPointerEnter={holdPreview} onPointerLeave={endPreview} />
        </div>
      </section>
      <div className="lg:hidden">
        <InfoPanel
          {...infoProps}
          channel={playingChannel}
          video={playingVideo}
          index={playing.index}
          isPlaying
          compact
        />
      </div>

      <SeriesTabs series={series} value={currentTab} favoriteCount={favorites.length} onChange={setTab} />

      {/* 下段：番組表（ここだけスクロール） */}
      <main id="guide" className="flex min-h-0 flex-1 flex-col">
        <ProgramGuide
          columns={columns}
          playing={playing}
          preview={isValid(preview) ? preview : null}
          favorites={favorites}
          onPlay={play}
          onPreview={startPreview}
          onPreviewEnd={endPreview}
          onToggleFavorite={toggleFavorite}
        />
      </main>

      <footer className="shrink-0 truncate border-t border-line bg-bg px-3 py-1.5 text-oln-14N-100 text-muted lg:px-4">
        非公式ファンサイトです。映像の権利は各権利者に帰属します。 ・ 番組データ更新：
        <time dateTime={catalog.generatedAt}>{new Date(catalog.generatedAt).toLocaleDateString('ja-JP')}</time>
      </footer>

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
