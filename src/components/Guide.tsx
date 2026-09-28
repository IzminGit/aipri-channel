import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { currentTime } from '../hooks/useNow'
import type { Channel } from '../schema'
import { channelStyle } from '../lib/colors'
import { formatClock, formatDate } from '../lib/format'
import { broadcastDayStart, DAY, MINUTE, slotsBetween, type Slot } from '../lib/schedule'
import { parseTitle } from '../lib/title'
import { NowIcon, StarIcon } from './Icons'

interface Props {
  channels: Channel[]
  selected: number
  favorites: number[]
  now: number
  onTune(number: number): void
  onPlayVod(slot: Slot): void
}

/** 1 分あたりの横幅（px） */
const PX_PER_MIN = 44
const px = (ms: number) => (ms / MINUTE) * PX_PER_MIN
const ROW_H = 88
const RULER_H = 36
/** 画面外に余分に描画する幅 */
const OVERSCAN = 600

export function Guide({ channels, selected, favorites, now, onTune, onPlayVod }: Props) {
  const dayStart = broadcastDayStart(now)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ left: 0, width: 1200 })

  // 放送日（5:00〜翌5:00）ぶんの番組をチャンネルごとに算出
  const rows = useMemo(
    () => channels.map((ch) => ({ channel: ch, slots: slotsBetween(ch, dayStart, dayStart + DAY) })),
    [channels, dayStart],
  )

  const scrollToNow = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, px(currentTime() - dayStart) - Math.min(160, el.clientWidth / 4)), behavior })
  }

  // 表示時と放送日が変わったときに現在時刻へスクロール
  useLayoutEffect(() => scrollToNow('instant'), [dayStart]) // eslint-disable-line react-hooks/exhaustive-deps

  // 可視範囲の追跡（仮想スクロール）
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setView({ left: el.scrollLeft, width: el.clientWidth }))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  const visibleFrom = dayStart + ((view.left - OVERSCAN) / PX_PER_MIN) * MINUTE
  const visibleTo = dayStart + ((view.left + view.width + OVERSCAN) / PX_PER_MIN) * MINUTE
  const totalWidth = px(DAY)
  const nowX = px(now - dayStart)

  const ticks = useMemo(() => {
    const list: number[] = []
    const step = 10 * MINUTE
    const first = Math.max(dayStart, Math.floor(visibleFrom / step) * step)
    for (let t = first; t < Math.min(visibleTo, dayStart + DAY); t += step) list.push(t)
    return list
  }, [dayStart, visibleFrom, visibleTo])

  return (
    <section aria-labelledby="guide-title" className="mx-auto max-w-[1440px] px-4 pb-10 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-6">
        <div>
          <h2 id="guide-title" className="text-std-24B-150 text-fg">
            番組表
          </h2>
          <p className="mt-1 text-std-16N-170 text-muted">
            {formatDate(dayStart)} 5:00 〜 翌5:00。放送中の枠でチャンネル切替、それ以外の枠はオンデマンド再生します。
          </p>
        </div>
        <button
          type="button"
          onClick={() => scrollToNow()}
          className="inline-flex min-h-11 items-center gap-2 rounded-8 border border-accent px-4 text-oln-16B-100 text-accent focus-ring hover:bg-accent-subtle hover:underline hover:underline-offset-4"
        >
          <NowIcon size={20} />
          現在時刻へ
        </button>
      </div>

      <div className="mt-4 flex overflow-hidden rounded-8 border border-line bg-raised">
        {/* チャンネル名の列 */}
        <div className="z-10 w-20 shrink-0 border-r border-line bg-raised sm:w-44">
          <div style={{ height: RULER_H }} className="border-b border-line bg-surface" />
          {rows.map(({ channel }) => {
            const isSelected = channel.number === selected
            return (
              <button
                key={channel.number}
                type="button"
                onClick={() => onTune(channel.number)}
                aria-current={isSelected ? 'true' : undefined}
                style={{ ...channelStyle(channel.color), height: ROW_H }}
                className={`ch-scope flex w-full items-center gap-2 border-b border-line px-2 text-left focus-ring last:border-b-0 sm:px-3 ${
                  isSelected ? 'bg-(--ch-bg)' : 'hover:bg-surface'
                }`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-4 text-oln-16B-100 tabular-nums ${
                    isSelected ? 'bg-(--ch) text-bg' : 'text-(--ch)'
                  }`}
                >
                  {channel.number}
                </span>
                <span className="min-w-0 text-dns-14B-130 text-fg max-sm:sr-only">
                  <span className="line-clamp-2">{channel.shortName}</span>
                </span>
                {favorites.includes(channel.number) && (
                  <StarIcon
                    filled
                    size={16}
                    className="ml-auto shrink-0 text-yellow-700 max-sm:hidden dark:text-yellow-300"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* 時間軸 */}
        <div ref={scrollRef} className="guide-scroll relative flex-1 overflow-x-auto overscroll-x-contain">
          <div className="relative" style={{ width: totalWidth, height: RULER_H + ROW_H * rows.length }}>
            <div className="sticky top-0 border-b border-line bg-surface" style={{ height: RULER_H }}>
              {ticks.map((t) => {
                const isHour = new Date(t).getMinutes() === 0
                return (
                  <span
                    key={t}
                    className={`absolute top-0 flex h-full items-center border-l pl-2 tabular-nums ${
                      isHour ? 'border-line-strong text-oln-14B-100 text-fg' : 'border-line text-oln-14N-100 text-muted'
                    }`}
                    style={{ left: px(t - dayStart) }}
                  >
                    {formatClock(t)}
                  </span>
                )
              })}
            </div>

            {rows.map(({ channel, slots }, row) => (
              <div
                key={channel.number}
                className="ch-scope absolute left-0 border-b border-line last:border-b-0"
                style={{ ...channelStyle(channel.color), top: RULER_H + row * ROW_H, height: ROW_H, width: totalWidth }}
              >
                {slots
                  .filter((s) => s.end > visibleFrom && s.start < visibleTo)
                  .map((slot) => (
                    <GuideCell
                      key={slot.start}
                      slot={slot}
                      left={px(slot.start - dayStart)}
                      width={px(slot.end - slot.start)}
                      state={slot.end <= now ? 'past' : slot.start <= now ? 'onair' : 'future'}
                      onClick={() => (slot.start <= now && now < slot.end ? onTune(channel.number) : onPlayVod(slot))}
                    />
                  ))}
              </div>
            ))}

            {/* 現在時刻ライン */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-live"
              style={{ transform: `translateX(${nowX}px)` }}
              aria-hidden="true"
            >
              <span className="absolute top-1.5 -translate-x-1/2 rounded-4 bg-live px-1.5 py-1 text-oln-14B-100 text-bg tabular-nums">
                {formatClock(now)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function GuideCell({
  slot,
  left,
  width,
  state,
  onClick,
}: {
  slot: Slot
  left: number
  width: number
  state: 'past' | 'onair' | 'future'
  onClick(): void
}) {
  const { song, performers } = parseTitle(slot.video.title)
  const style =
    state === 'onair'
      ? 'bg-(--ch-bg) text-fg shadow-[inset_0_3px_0_var(--ch)]'
      : state === 'past'
        ? 'bg-past text-muted'
        : 'bg-raised text-fg hover:bg-surface'
  return (
    <button
      type="button"
      onClick={onClick}
      title={slot.video.title}
      aria-label={`${formatClock(slot.start)}から ${song}${performers ? ` ${performers}` : ''}${
        state === 'onair' ? '（放送中）' : ''
      }`}
      className={`absolute top-0 flex h-full flex-col justify-start gap-0.5 overflow-hidden border-r border-line px-2 py-2 text-left focus-ring focus-visible:z-20 ${style}`}
      style={{ left, width }}
    >
      <span className="flex items-center gap-1 text-mono-14N-150 leading-none tabular-nums opacity-80">
        {formatClock(slot.start)}
        {state === 'onair' && <span className="size-1.5 rounded-full bg-live" aria-hidden="true" />}
      </span>
      <span className="line-clamp-2 text-dns-14B-130">{song}</span>
      {performers && width > 120 && <span className="truncate text-dns-14N-120 text-muted">{performers}</span>}
    </button>
  )
}
