import type { ChannelColor } from '../schema'

/** DADS プリミティブカラー（ライト: 800 / ダーク: 300 / 背景: 50） */
const palette: Record<ChannelColor, { strong: string; soft: string; tint: string }> = {
  blue: { strong: '#0031d8', soft: '#9db7f9', tint: '#e8f1fe' },
  'light-blue': { strong: '#0066be', soft: '#97d3ff', tint: '#f0f9ff' },
  cyan: { strong: '#008299', soft: '#79e2f2', tint: '#e9f7f9' },
  green: { strong: '#197a4b', soft: '#71c598', tint: '#e6f5ec' },
  lime: { strong: '#618e00', soft: '#ade830', tint: '#ebfad9' },
  yellow: { strong: '#a58000', soft: '#ffd43d', tint: '#fbf5e0' },
  orange: { strong: '#c74700', soft: '#ffa66d', tint: '#ffeee2' },
  red: { strong: '#ec0000', soft: '#ff9696', tint: '#fdeeee' },
  magenta: { strong: '#aa00aa', soft: '#ff8eff', tint: '#f3e5f4' },
  purple: { strong: '#5c10be', soft: '#cda6ff', tint: '#f1eafa' },
}

/**
 * チャンネル色を CSS 変数として渡す。
 * 使用側は `text-(--ch) bg-(--ch-tint)` のように参照し、ダーク時は index.css で切替。
 */
export function channelStyle(color: ChannelColor): React.CSSProperties {
  const c = palette[color]
  return {
    '--ch-strong': c.strong,
    '--ch-soft': c.soft,
    '--ch-tint': c.tint,
  } as React.CSSProperties
}
