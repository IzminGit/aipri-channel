import { formatClock } from '../lib/format'
import type { Slot } from '../lib/schedule'
import { parseTitle } from '../lib/title'
import { thumbnailUrl } from '../lib/youtube'

/** 視聴中チャンネルのこの後の放送。クリックでオンデマンド再生 */
export function UpNext({ upcoming, onPlayVod }: { upcoming: Slot[]; onPlayVod(slot: Slot): void }) {
  if (upcoming.length === 0) return null
  return (
    <section aria-labelledby="upnext-title">
      <h2 id="upnext-title" className="text-std-18B-160 text-fg">
        この後の放送
      </h2>
      <ol className="mt-3 divide-y divide-line border-y border-line">
        {upcoming.map((slot) => {
          const t = parseTitle(slot.video.title)
          return (
            <li key={`${slot.start}`}>
              <button
                type="button"
                onClick={() => onPlayVod(slot)}
                className="group flex w-full items-center gap-3 py-3 text-left focus-ring hover:bg-surface"
                title="今すぐオンデマンド再生"
              >
                <span className="w-12 shrink-0 text-mono-14B-150 text-muted tabular-nums">
                  {formatClock(slot.start)}
                </span>
                <img
                  src={thumbnailUrl(slot.video.id)}
                  alt=""
                  loading="lazy"
                  className="aspect-video w-20 shrink-0 rounded-4 bg-surface object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-dns-16B-130 text-fg group-hover:underline group-hover:underline-offset-4">
                    {t.song}
                  </span>
                  {t.performers && (
                    <span className="mt-1 block truncate text-dns-14N-130 text-muted">{t.performers}</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
