import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChannelList } from './components/ChannelList'
import { Guide } from './components/Guide'
import { Header, type ThemePreference } from './components/Header'
import { NowPlaying } from './components/NowPlaying'
import { Player, type PlayerHandle, type PlayerSource } from './components/Player'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { UpNext } from './components/UpNext'
import { currentTime, useNow } from './hooks/useNow'
import { useStoredState } from './hooks/useStoredState'
import { useTheme } from './hooks/useTheme'
import { loadCatalog } from './lib/catalog'
import { slotAt, upcoming, type Slot } from './lib/schedule'
import { parseTitle } from './lib/title'

interface VodState {
  channelNumber: number
  slot: Slot
  origin: number
}

const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark']

function readChannelParam(): number | null {
  const n = Number(new URLSearchParams(location.search).get('ch'))
  return Number.isInteger(n) && n > 0 ? n : null
}

export default function App() {
  const catalog = use(loadCatalog())
  const now = useNow()
  const [theme, setTheme] = useTheme()
  const [favorites, setFavorites] = useStoredState<number[]>('favorites', [])
  const [guideOpen, setGuideOpen] = useStoredState('guide-open', true)
  const [lastChannel, setLastChannel] = useStoredState<number | null>('last-channel', null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [vod, setVod] = useState<VodState | null>(null)
  const playerRef = useRef<PlayerHandle>(null)

  // お気に入りを先頭に、それ以外はチャンネル番号順
  const channels = useMemo(() => {
    const fav = new Set(favorites)
    return [...catalog.channels].sort(
      (a, b) => Number(fav.has(b.number)) - Number(fav.has(a.number)) || a.number - b.number,
    )
  }, [catalog.channels, favorites])

  const exists = (n: number | null) => n !== null && catalog.channels.some((c) => c.number === n)
  const [selected, setSelected] = useState<number>(() => {
    const fromUrl = readChannelParam()
    if (exists(fromUrl)) return fromUrl!
    if (exists(lastChannel)) return lastChannel!
    return channels[0].number
  })

  const channel = catalog.channels.find((c) => c.number === selected) ?? channels[0]
  const liveSlot = slotAt(channel, now)
  const activeVod = vod?.channelNumber === channel.number ? vod : null
  const displaySlot = activeVod?.slot ?? liveSlot

  // URL（?ch=）と最後に見たチャンネルを同期
  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set('ch', String(selected))
    history.replaceState(null, '', url)
    setLastChannel(selected)
  }, [selected, setLastChannel])

  const liveVideoId = liveSlot?.video.id
  const liveStart = liveSlot?.start
  const source = useMemo<PlayerSource | null>(() => {
    if (activeVod) return { mode: 'vod', videoId: activeVod.slot.video.id, origin: activeVod.origin }
    if (!liveVideoId || liveStart === undefined) return null
    return { mode: 'live', videoId: liveVideoId, origin: liveStart }
  }, [activeVod, liveVideoId, liveStart])

  useEffect(() => {
    if (!displaySlot) return
    const { song } = parseTitle(displaySlot.video.title)
    document.title = `${song} - ${channel.number}ch ${channel.shortName} | アイプリチャンネル`
  }, [displaySlot, channel])

  const tune = useCallback((n: number) => {
    setSelected(n)
    setVod(null)
  }, [])

  const playVod = useCallback((slot: Slot) => {
    setSelected(slot.channelNumber)
    setVod({ channelNumber: slot.channelNumber, slot, origin: currentTime() })
  }, [])

  const toggleFavorite = useCallback(
    (n: number) => setFavorites(favorites.includes(n) ? favorites.filter((f) => f !== n) : [...favorites, n]),
    [favorites, setFavorites],
  )

  // キーボード / テレビのリモコン操作
  const digitBuffer = useRef({ value: '', timer: 0 })
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      const target = e.target
      if (
        target instanceof Element &&
        target.closest('input:not([type=radio]), textarea, select, [contenteditable=true]')
      )
        return
      if (shortcutsOpen && e.key !== '?') return

      const step = (dir: 1 | -1) => {
        const i = channels.findIndex((c) => c.number === selected)
        tune(channels[(i + dir + channels.length) % channels.length].number)
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'ChannelUp':
        case 'PageUp':
          step(-1)
          break
        case 'ArrowDown':
        case 'ChannelDown':
        case 'PageDown':
          step(1)
          break
        case 'g':
        case 'G':
        case 'Guide':
          setGuideOpen(!guideOpen)
          break
        case 'f':
        case 'F':
          toggleFavorite(selected)
          break
        case 'm':
        case 'M':
        case 'AudioVolumeMute':
          playerRef.current?.toggleMute()
          break
        case 'l':
        case 'L':
        case 'Live':
          playerRef.current?.syncToLive()
          break
        case 't':
        case 'T':
          setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length])
          break
        case '?':
          setShortcutsOpen((o) => !o)
          break
        default: {
          if (!/^\d$/.test(e.key)) return
          // 複数桁のチャンネル番号入力（1.2 秒以内に続けて押す）
          const buf = digitBuffer.current
          window.clearTimeout(buf.timer)
          buf.value = (buf.value + e.key).slice(-3)
          const n = Number(buf.value)
          const exact = catalog.channels.some((c) => c.number === n)
          const longer = catalog.channels.some((c) => String(c.number).startsWith(buf.value) && c.number !== n)
          const commit = () => {
            if (catalog.channels.some((c) => c.number === Number(buf.value))) tune(Number(buf.value))
            buf.value = ''
          }
          if (exact && !longer) commit()
          else buf.timer = window.setTimeout(commit, 1200)
          break
        }
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    catalog.channels,
    channels,
    guideOpen,
    selected,
    setGuideOpen,
    setTheme,
    shortcutsOpen,
    theme,
    toggleFavorite,
    tune,
  ])

  const nextSlots = liveSlot ? upcoming(channel, now, 4).slice(1) : []

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-8 bg-accent px-4 py-3 text-accent-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        本文へスキップ
      </a>
      <Header
        now={now}
        guideOpen={guideOpen}
        theme={theme}
        onToggleGuide={() => setGuideOpen(!guideOpen)}
        onThemeChange={setTheme}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      <main
        id="main"
        className="mx-auto grid max-w-[1440px] grid-cols-1 gap-x-8 gap-y-8 px-4 py-4 [grid-template-areas:'now'_'channels'_'next'] sm:py-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr] lg:px-6 lg:[grid-template-areas:'now_channels'_'next_channels']"
      >
        <div className="min-w-0 [grid-area:now]">
          {source && displaySlot ? (
            <>
              <Player
                ref={playerRef}
                source={source}
                title={displaySlot.video.title}
                onEnded={() => setVod(null)}
                onReturnToLive={() => setVod(null)}
              />
              <NowPlaying
                channel={channel}
                current={displaySlot}
                isVod={activeVod !== null}
                now={now}
                favorite={favorites.includes(channel.number)}
                onToggleFavorite={() => toggleFavorite(channel.number)}
              />
            </>
          ) : (
            <p className="rounded-8 bg-surface p-8 text-center text-std-16N-170 text-muted">
              このチャンネルは現在放送していません。
            </p>
          )}
        </div>
        <div className="min-w-0 [grid-area:next]">
          <UpNext upcoming={nextSlots} onPlayVod={playVod} />
        </div>
        <div className="[grid-area:channels]">
          <ChannelList
            channels={channels}
            selected={channel.number}
            favorites={favorites}
            now={now}
            onSelect={tune}
            onToggleFavorite={toggleFavorite}
          />
        </div>
      </main>

      {guideOpen && (
        <Guide
          channels={channels}
          selected={channel.number}
          favorites={favorites}
          now={now}
          onTune={tune}
          onPlayVod={playVod}
        />
      )}

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1440px] space-y-2 px-4 py-8 text-std-16N-170 text-muted lg:px-6">
          <p>
            本サイトは非公式のファンサイトです。映像は各公式 YouTube
            チャンネルが公開している動画を埋め込みで再生しており、 権利は各権利者に帰属します。
          </p>
          <p>
            番組データ更新：
            <time dateTime={catalog.generatedAt}>{new Date(catalog.generatedAt).toLocaleString('ja-JP')}</time>
          </p>
        </div>
      </footer>

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  )
}
