/**
 * Telegram WebApp SDK wrapper. Feature detection first: the app also runs in
 * a plain browser (development, admin), where every capability reports
 * "unsupported" instead of throwing.
 */
type TelegramWebApp = {
  initData: string
  initDataUnsafe?: Record<string, unknown>
  version?: string
  platform?: string
  colorScheme?: 'light' | 'dark'
  isExpanded?: boolean
  viewportStableHeight?: number
  ready: () => void
  expand: () => void
  close: () => void
  enableClosingConfirmation?: () => void
  disableVerticalSwipes?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  onEvent?: (event: string, handler: () => void) => void
  offEvent?: (event: string, handler: () => void) => void
  BackButton?: {
    show: () => void
    hide: () => void
    onClick: (handler: () => void) => void
    offClick: (handler: () => void) => void
  }
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void
  showAlert?: (message: string) => void
}

function webApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  const candidate = (window as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp
  return candidate && typeof candidate.initData === 'string' ? candidate : null
}

export const telegram = {
  get isAvailable() {
    return webApp() !== null
  },

  get initData() {
    return webApp()?.initData ?? ''
  },

  get colorScheme(): 'light' | 'dark' | null {
    const scheme = webApp()?.colorScheme
    return scheme === 'dark' || scheme === 'light' ? scheme : null
  },

  get platform() {
    return webApp()?.platform ?? null
  },

  get version() {
    return webApp()?.version ?? null
  },

  ready() {
    webApp()?.ready()
  },

  expand() {
    webApp()?.expand()
  },

  setHeaderColors(background: string) {
    try {
      webApp()?.setHeaderColor?.(background)
      webApp()?.setBackgroundColor?.(background)
    } catch {
      // Older clients reject unknown colors; the page still works.
    }
  },

  haptic(style: 'light' | 'medium' | 'soft' = 'light') {
    try {
      webApp()?.HapticFeedback?.impactOccurred(style)
    } catch {
      // Haptics are always optional.
    }
  },

  notify(type: 'success' | 'warning' | 'error') {
    try {
      webApp()?.HapticFeedback?.notificationOccurred(type)
    } catch {
      // optional
    }
  },

  openLink(url: string) {
    const app = webApp()
    if (app?.openLink) {
      app.openLink(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  },

  /** Wires the Telegram back button; returns a disposer. */
  onBackButton(handler: (() => void) | null) {
    const app = webApp()
    if (!app?.BackButton) return () => {}
    const button = app.BackButton
    let bound: (() => void) | null = null
    if (handler) {
      bound = handler
      button.onClick(bound)
      button.show()
    } else {
      button.hide()
    }
    return () => {
      if (bound) button.offClick(bound)
      button.hide()
    }
  },
}
