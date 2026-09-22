import { Link, useLocation } from '@tanstack/react-router'
import { useEffect, type PropsWithChildren, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { telegram } from '@/platform/telegram'
import { cn } from '@/lib/utils'

type Tab = {
  path: string
  label: string
  icon: ReactNode
  match: (pathname: string) => boolean
}

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {iconPaths(name)}
    </svg>
  )
}

function iconPaths(name: string): ReactNode {
  switch (name) {
    case 'today':
      return (
        <>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7" />
        </>
      )
    case 'practices':
      return (
        <>
          <path d="M5 4.5h10.5a3 3 0 0 1 3 3V19a1.5 1.5 0 0 0-1.5-1.5H5Z" />
          <path d="M8.5 8.5h6M8.5 12h4" />
        </>
      )
    case 'garden':
      return (
        <>
          <path d="M12 20.5v-7" />
          <path d="M12 13.5c0-3-2.2-5-5-5 0 3 2.2 5 5 5Z" />
          <path d="M12 13.5c0-3 2.2-5 5-5 0 3-2.2 5-5 5Z" />
          <path d="M6 20.5h12" />
        </>
      )
    case 'journal':
      return (
        <>
          <path d="M6 3.8h9.2L19 7.6v12.6H6Z" />
          <path d="M9 11h7M9 14.5h5" />
        </>
      )
    case 'me':
      return (
        <>
          <circle cx="12" cy="8.4" r="3.4" />
          <path d="M5.5 20c.8-3.2 3.4-4.8 6.5-4.8s5.7 1.6 6.5 4.8" />
        </>
      )
    case 'support':
      return (
        <>
          <path d="M4.6 11.4c0 4.4 3.3 7.4 7.4 8.6 4.1-1.2 7.4-4.2 7.4-8.6V6.8c-2.4 0-4.8-1-6.2-2.4-1.4 1.4-3.8 2.4-6.2 2.4Z" />
        </>
      )
    default:
      return null
  }
}

const tabs: Tab[] = [
  { path: '/app', label: 'Сегодня', icon: <Icon name="today" className="size-[22px]" />, match: (p) => p === '/app' },
  {
    path: '/app/practices',
    label: 'Практики',
    icon: <Icon name="practices" className="size-[22px]" />,
    match: (p) => p.startsWith('/app/practices') || p.startsWith('/app/focus') || p.startsWith('/app/programs'),
  },
  {
    path: '/app/garden',
    label: 'Сад',
    icon: <Icon name="garden" className="size-[22px]" />,
    match: (p) => p.startsWith('/app/garden'),
  },
  {
    path: '/app/journal',
    label: 'Дневник',
    icon: <Icon name="journal" className="size-[22px]" />,
    match: (p) => p.startsWith('/app/journal'),
  },
  {
    path: '/app/me',
    label: 'Я',
    icon: <Icon name="me" className="size-[22px]" />,
    match: (p) => p.startsWith('/app/me') || p.startsWith('/app/insights'),
  },
]

/**
 * Product shell: five tabs at the bottom on phones, a quiet sidebar on wide
 * screens. The support entry stays visible on every screen — it must never hide
 * behind progress.
 */
export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation()

  useEffect(() => {
    telegram.ready()
    telegram.expand()
    telegram.setHeaderColors(
      document.documentElement.classList.contains('dark') ? '#111B18' : '#F5F3ED',
    )
  }, [])

  return (
    <div className="min-h-dvh bg-background">
      {/* Mobile */}
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col md:hidden">
        <main className="flex-1 px-5 pb-[calc(84px+env(safe-area-inset-bottom,0px))] pt-[max(14px,env(safe-area-inset-top))]">
          {children}
        </main>
        <nav
          className="glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-border"
          aria-label="Основная навигация"
        >
          <div className="mx-auto flex max-w-[520px] items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom,0px)] pt-1.5">
            {tabs.map((tab) => {
              const active = tab.match(location.pathname)
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={cn(
                    'press flex min-w-[56px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-soft',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {tab.icon}
                  <span className="text-[11px] font-medium leading-none">{tab.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Desktop */}
      <div className="hidden min-h-dvh md:flex">
        <aside className="sticky top-0 flex h-dvh w-[248px] shrink-0 flex-col gap-1 border-r border-border bg-sidebar px-4 py-6">
          <div className="mb-4 px-2">
            <div className="font-heading text-[19px] font-bold text-foreground">ТвояОпора</div>
            <div className="text-[12.5px] text-muted-foreground">Место, где можно выдохнуть</div>
          </div>
          {tabs.map((tab) => {
            const active = tab.match(location.pathname)
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-soft',
                  active
                    ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60',
                )}
              >
                {tab.icon}
                {tab.label}
              </Link>
            )
          })}
          <div className="mt-auto px-1">
            <SupportButton />
          </div>
        </aside>
        <main className="mx-auto w-full max-w-[860px] px-8 py-8">
          <div className="mx-auto max-w-[620px]">{children}</div>
        </main>
      </div>
    </div>
  )
}

export function SupportButton({ className }: { className?: string }) {
  return (
    <Button
      variant="outline"
      className={cn(
        'h-11 w-full gap-2 rounded-2xl border-border text-[14px] text-foreground',
        className,
      )}
      onClick={() => {
        window.location.assign('/app/support')
      }}
    >
      <Icon name="support" className="size-[18px] text-warm-strong" />
      Нужна поддержка
    </Button>
  )
}

export function MobileSupportLink() {
  return (
    <Link
      to="/app/support"
      className="press inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13.5px] text-foreground transition-soft"
    >
      <Icon name="support" className="size-4 text-warm-strong" />
      Нужна поддержка
    </Link>
  )
}

export { Icon }
