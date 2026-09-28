import { useEffect, useRef } from 'react'
import { CloseIcon } from './Icons'

const shortcuts: [keys: string[], description: string][] = [
  [['↑', '↓', '←', '→'], '番組表の中を移動（Enter で再生）'],
  [['F'], 'フォーカス中（または再生中）の曲をお気に入りに追加／解除'],
  [['Shift', '↑', '↓'], 'お気に入り列で曲の順番を入れ替え'],
  [['N', 'P'], '次の曲 / 前の曲'],
  [['PgUp', 'PgDn'], '前 / 次のチャンネル（リモコンのチャンネル±も可）'],
  [['1', '〜', '9'], 'チャンネル番号の 1 曲目から再生'],
  [['M'], 'ミュートの切替'],
  [['T'], '表示テーマの切替'],
  [['Esc'], 'プレビューをやめて再生中の曲の詳細に戻る'],
  [['?'], 'このヘルプを表示'],
]

export function ShortcutsDialog({
  open,
  generatedAt,
  onClose,
}: {
  open: boolean
  generatedAt: string
  onClose(): void
}) {
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
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] rounded-12 border border-line bg-raised p-0 text-fg shadow-6 backdrop:bg-black/50"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="shortcuts-title" className="text-std-20B-150">
              アイプリチャンネル
            </h2>
            <p className="text-oln-14N-100 text-muted">CGライブ番組表 ・ 操作ガイド</p>
          </div>
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
              <dt className="flex w-36 shrink-0 flex-wrap items-center gap-1">
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
          曲の ☆ でお気に入り列に追加できます。お気に入り列ではドラッグ、▲▼ ボタン、Shift+↑↓
          で順番を変えられます。動画の上をクリックした直後は YouTube
          プレーヤーが操作を受け取るため、番組表をクリックしてからキー操作してください。
        </p>
        <p className="mt-4 border-t border-line pt-4 text-dns-14N-130 text-muted">
          本サイトは非公式のファンサイトです。映像は各公式 YouTube
          チャンネルが公開している動画を埋め込みで再生しており、権利は各権利者に帰属します。 番組データ更新：
          <time dateTime={generatedAt}>{new Date(generatedAt).toLocaleDateString('ja-JP')}</time>
        </p>
      </div>
    </dialog>
  )
}
