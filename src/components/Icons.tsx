import type { ReactNode } from 'react'

function Svg({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const IconDiary = () => (
  <Svg>
    <rect x="5" y="3.5" width="14" height="17" rx="3" />
    <path d="M9 8.5h6M9 12.5h6M9 16.5h3" />
  </Svg>
)
export const IconChart = () => (
  <Svg>
    <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
  </Svg>
)
export const IconUser = () => (
  <Svg>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c.8-3.6 3.5-5.4 7-5.4s6.2 1.8 7 5.4" />
  </Svg>
)
export const IconPlus = () => (
  <Svg size={26}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const IconLeft = () => (
  <Svg size={20}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Svg>
)
export const IconRight = () => (
  <Svg size={20}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Svg>
)
export const IconClose = () => (
  <Svg size={20}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)
export const IconTrash = () => (
  <Svg size={18}>
    <path d="M5 7h14M10 7V4.5h4V7M7 7l.8 12h8.4L17 7" />
  </Svg>
)
export const IconFlame = () => (
  <Svg size={16}>
    <path d="M12 3c.5 3-2.5 4.5-2.5 7.5A2.5 2.5 0 0 0 12 13c0-1.5 1.3-2.3 2-3.5 2 1.3 3.5 3.2 3.5 5.8A5.5 5.5 0 0 1 12 21a5.5 5.5 0 0 1-5.5-5.5C6.5 11 11 8.5 12 3Z" />
  </Svg>
)
export const IconBolt = () => (
  <Svg size={16}>
    <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />
  </Svg>
)
