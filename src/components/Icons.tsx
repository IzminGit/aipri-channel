import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const PlayIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.9-6.86a1 1 0 0 0 0-1.7L9.52 4.3A1 1 0 0 0 8 5.14Z" />
  </Svg>
)

export const StarIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p}>
    {filled ? (
      <path d="m12 17.27 5.18 3.13a.75.75 0 0 0 1.12-.81l-1.37-5.9 4.58-3.97a.75.75 0 0 0-.43-1.31l-6.03-.52-2.36-5.57a.75.75 0 0 0-1.38 0L8.95 7.89l-6.03.52a.75.75 0 0 0-.43 1.31l4.58 3.97-1.37 5.9a.75.75 0 0 0 1.12.81L12 17.27Z" />
    ) : (
      <path d="m8.85 16.83 3.15-1.9 3.15 1.93-.83-3.6 2.78-2.4-3.65-.33L12 7.13l-1.45 3.4-3.65.32 2.78 2.43-.83 3.55ZM12 17.27l-5.18 3.13a.75.75 0 0 1-1.12-.81l1.37-5.9L2.5 9.72a.75.75 0 0 1 .43-1.31l6.03-.52 2.36-5.57a.75.75 0 0 1 1.38 0l2.36 5.57 6.03.52a.75.75 0 0 1 .43 1.31l-4.58 3.97 1.37 5.9a.75.75 0 0 1-1.12.81L12 17.27Z" />
    )}
  </Svg>
)

export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21q-.83 0-1.41-.59Q3 19.83 3 19V5q0-.83.59-1.41Q4.17 3 5 3h7v2H5v14h14v-7h2v7q0 .83-.59 1.41Q19.83 21 19 21H5Zm4.7-5.3-1.4-1.4L17.6 5H14V3h7v7h-2V6.4l-9.3 9.3Z" />
  </Svg>
)

export const GuideIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm2 0v3h14V5H5Zm0 5v4h5v-4H5Zm7 0v4h7v-4h-7Zm-7 6v3h8v-3H5Zm10 0v3h4v-3h-4Z" />
  </Svg>
)

export const KeyboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19q-.83 0-1.41-.59Q2 17.83 2 17V7q0-.83.59-1.41Q3.17 5 4 5h16q.83 0 1.41.59Q22 6.17 22 7v10q0 .83-.59 1.41Q20.83 19 20 19H4Zm0-2h16V7H4v10Zm4-1h8v-2H8v2Zm-3-3h2v-2H5v2Zm3 0h2v-2H8v2Zm3 0h2v-2h-2v2Zm3 0h2v-2h-2v2Zm3 0h2v-2h-2v2ZM5 10h2V8H5v2Zm3 0h2V8H8v2Zm3 0h2V8h-2v2Zm3 0h2V8h-2v2Zm3 0h2V8h-2v2Z" />
  </Svg>
)

export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM11 1h2v3h-2V1Zm0 19h2v3h-2v-3ZM1 11h3v2H1v-2Zm19 0h3v2h-3v-2ZM4.22 5.64l1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12Zm12.02 12.02 1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12ZM4.22 18.36l2.12-2.12 1.42 1.42-2.12 2.12-1.42-1.42ZM16.24 6.34l2.12-2.12 1.42 1.42-2.12 2.12-1.42-1.42Z" />
  </Svg>
)

export const MoonIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21q-3.75 0-6.38-2.63Q3 15.75 3 12q0-3.75 2.62-6.38Q8.25 3 12 3q.35 0 .69.03.34.02.66.07-1.03.72-1.64 1.89Q11.1 6.15 11.1 7.5q0 2.25 1.58 3.83Q14.25 12.9 16.5 12.9q1.38 0 2.53-.61 1.15-.61 1.87-1.64.05.33.07.66.03.34.03.69 0 3.75-2.63 6.38Q15.75 21 12 21Zm0-2q2.2 0 3.95-1.21 1.75-1.22 2.55-3.17-.5.13-1 .2-.5.08-1 .08-3.08 0-5.24-2.16Q9.1 10.58 9.1 7.5q0-.5.08-1t.2-1Q7.43 6.3 6.21 8.05 5 9.8 5 12q0 2.9 2.05 4.95Q9.1 19 12 19Z" />
  </Svg>
)

export const AutoThemeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm1-2.07A8 8 0 0 0 13 4.07v15.86Z" />
  </Svg>
)

export const VolumeOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m19.8 22.6-3.03-3.03q-.62.4-1.33.69-.7.29-1.44.46v-2.05q.35-.13.69-.25.34-.12.64-.3L12 14.8V20l-5-5H3V9h3.2L1.4 4.2l1.4-1.4 18.4 18.4-1.4 1.4Zm-.2-5.8-1.45-1.45q.43-.78.64-1.63.21-.85.21-1.75 0-2.35-1.37-4.2Q16.25 5.93 14 5.25V3.2q3.1.7 5.05 3.14Q21 8.78 21 11.95q0 1.33-.36 2.55-.37 1.23-1.04 2.3Zm-3.35-3.35L14 11.2V7.95q1.18.55 1.84 1.65.66 1.1.66 2.4 0 .38-.06.74-.07.36-.19.71ZM12 9.2 9.4 6.6 12 4v5.2Z" />
  </Svg>
)

export const NowIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.3-3.3L11 12.4V7h2v4.6l3.7 3.7-1.4 1.4Z" />
  </Svg>
)

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19Z" />
  </Svg>
)

/** サイトのロゴマーク（テレビ + きらめき） */
export const LogoMark = (p: IconProps) => (
  <svg viewBox="0 0 32 32" width={p.size ?? 32} height={p.size ?? 32} aria-hidden="true" {...p}>
    <rect x="2" y="7" width="28" height="20" rx="5" fill="#3460fb" />
    <path d="M11 2.5 16 7l5-4.5" fill="none" stroke="#3460fb" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M16 11.2c.5 2.6 1.6 3.7 4.2 4.2-2.6.5-3.7 1.6-4.2 4.2-.5-2.6-1.6-3.7-4.2-4.2 2.6-.5 3.7-1.6 4.2-4.2Z"
      fill="#fff"
    />
    <circle cx="23.5" cy="21.5" r="1.6" fill="#ff8eff" />
    <circle cx="9" cy="12" r="1.1" fill="#ff8eff" />
  </svg>
)

/** 再生中インジケーター（イコライザー） */
export const PlayingIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z" />
  </Svg>
)

/** 上向きの山形（下向きは rotate-180 で使う） */
export const ChevronIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 8.6-6 6 1.4 1.4 4.6-4.6 4.6 4.6 1.4-1.4-6-6Z" />
  </Svg>
)
