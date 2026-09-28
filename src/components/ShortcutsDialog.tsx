import { useEffect, useRef } from 'react'
import { CloseIcon } from './Icons'

const shortcuts: [keys: string[], description: string][] = [
  [['↑', '↓'], 'チャンネルを切り替える（リモコンのチャンネル＋/−も可）'],
  [['1', '〜', '9'], 'チャンネル番号を直接選ぶ'],
  [['G'], '番組表の表示／非表示'],
  [['F'], '視聴中のチャンネルをお気に入りに追加／解除'],
  [['M'], 'ミュートの切替'],
  [['L'], '放送位置に戻る'],
  [['T'], '表示テーマの切替'],
  [['?'], 'このヘルプを表示'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="shortcuts-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-12 border border-line bg-raised p-0 text-fg shadow-6 backdrop:bg-black/50"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="shortcuts-title" className="text-std-20B-150">
            キーボード操作
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mt-2 -mr-2 flex size-11 items-center justify-center rounded-8 focus-ring hover:bg-surface"
          >
            <CloseIcon size={24} />
            <span className="sr-only">閉じる</span>
          </button>
        </div>
        <dl className="mt-4 divide-y divide-line">
          {shortcuts.map(([keys, description]) => (
            <div key={description} className="flex items-center gap-4 py-3">
              <dt className="flex w-28 shrink-0 items-center gap-1">
                {keys.map((k) =>
                  k === '〜' ? (
                    <span key={k} className="text-muted">
                      〜
                    </span>
                  ) : (
                    <kbd
                      key={k}
                      className="inline-flex min-w-8 justify-center rounded-4 border border-line-strong bg-surface px-2 py-1 text-mono-14B-150 leading-none"
                    >
                      {k}
                    </kbd>
                  ),
                )}
              </dt>
              <dd className="text-std-16N-170">{description}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-std-16N-170 text-muted">
          動画の上をクリックした直後は YouTube
          プレーヤーが操作を受け取るため、画面の余白をクリックしてから操作してください。
        </p>
      </div>
    </dialog>
  )
}
