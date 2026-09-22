import { Outlet, useLocation, useRouter, useSearch } from '@tanstack/react-router'
import type { UserDto, UserRole } from '@opora/contracts'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import {
  NotFoundSection,
  SessionErrorSection,
  SessionLoadingSection,
} from '@/components/WebRouteSections'
import { WorkspaceShell } from '@/components/WorkspaceShell'
import { AdminDashboard, AdminSettings, AdminUsers } from '@/features/admin'
import {
  AuthPageShell,
  clearPasswordResetTokenHash,
  ForgotPasswordForm,
  LoginForm,
  RegisterForm,
  readPasswordResetToken,
  ResetPasswordForm,
  useAuth,
} from '@/features/auth'
import { homePathForRole, safeReturnPath } from '@/features/navigation'
import { UserHome, UserProfile, UserSettings } from '@/features/users'

export function HomePage() {
  const auth = useAuth()
  const { returnTo } = useSearch({ from: '/' })

  if (auth.isBootstrapping) return <SessionLoadingSection />
  if (auth.sessionError && !auth.user) {
    return <SessionErrorSection retry={auth.retrySession} detail={auth.sessionError?.message} />
  }
  if (auth.user) {
    return (
      <HrefRedirect
        href={safeReturnPath(auth.user.role, returnTo) ?? homePathForRole(auth.user.role)}
      />
    )
  }
  const destination = returnTo
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : '/login'
  return <HrefRedirect href={destination} />
}

export function LoginPage() {
  const { returnTo } = useSearch({ from: '/login' })
  return (
    <GuestAuthPage returnTo={returnTo}>
      <AuthPageShell>
        <LoginForm returnTo={returnTo} />
      </AuthPageShell>
    </GuestAuthPage>
  )
}

export function SignupPage() {
  const { returnTo } = useSearch({ from: '/signup' })
  return (
    <GuestAuthPage returnTo={returnTo}>
      <AuthPageShell>
        <RegisterForm returnTo={returnTo} />
      </AuthPageShell>
    </GuestAuthPage>
  )
}

export function ForgotPasswordPage() {
  return (
    <GuestAuthPage>
      <AuthPageShell>
        <ForgotPasswordForm />
      </AuthPageShell>
    </GuestAuthPage>
  )
}

export function ResetPasswordPage() {
  const auth = useAuth()
  const token = usePasswordResetToken()
  if (auth.isBootstrapping) return <SessionLoadingSection />

  return (
    <AuthPageShell>
      <ResetPasswordForm token={token} />
    </AuthPageShell>
  )
}

export function UserHomePage() {
  const user = useWorkspaceUser('user')
  return <UserHome user={user} />
}

export function UserProfilePage() {
  const user = useWorkspaceUser('user')
  return <UserProfile user={user} />
}

export function UserSettingsPage() {
  const auth = useAuth()
  return <UserSettings onLogout={auth.logout} />
}

export function AdminDashboardPage() {
  return <AdminDashboard />
}

export function AdminUsersPage() {
  const user = useWorkspaceUser('admin')
  return <AdminUsers currentUser={user} />
}

export function AdminSettingsPage() {
  const user = useWorkspaceUser('admin')
  return <AdminSettings user={user} />
}

export function UserWorkspaceLayout() {
  return <WorkspaceRoute role="user" />
}

export function AdminWorkspaceLayout() {
  return <WorkspaceRoute role="admin" />
}

export function NotFoundPage() {
  const auth = useAuth()

  if (auth.isBootstrapping) return <SessionLoadingSection />
  if (auth.sessionError && !auth.user) {
    return <SessionErrorSection retry={auth.retrySession} detail={auth.sessionError?.message} />
  }

  const destination = auth.user ? homePathForRole(auth.user.role) : '/login'
  return <NotFoundSection destination={destination} />
}

function WorkspaceRoute({ role }: { role: UserRole }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.isBootstrapping) return <SessionLoadingSection />
  if (auth.sessionError && !auth.user) {
    return <SessionErrorSection retry={auth.retrySession} detail={auth.sessionError?.message} />
  }
  if (!auth.user) {
    const returnTo = `${location.pathname}${location.searchStr}`
    return <HrefRedirect href={`/login?returnTo=${encodeURIComponent(returnTo)}`} />
  }
  if (auth.user.role !== role) {
    return <HrefRedirect href={homePathForRole(auth.user.role)} />
  }

  return (
    <WorkspaceShell onLogout={auth.logout} user={auth.user}>
      <Outlet />
    </WorkspaceShell>
  )
}

function GuestAuthPage({
  children,
  returnTo,
}: {
  children: ReactNode
  returnTo?: string
}) {
  const auth = useAuth()

  if (auth.isBootstrapping) return <SessionLoadingSection />
  if (auth.sessionError && !auth.user) {
    return <SessionErrorSection retry={auth.retrySession} detail={auth.sessionError?.message} />
  }
  if (auth.user) {
    return (
      <HrefRedirect
        href={safeReturnPath(auth.user.role, returnTo) ?? homePathForRole(auth.user.role)}
      />
    )
  }

  return children
}

function usePasswordResetToken() {
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return ''
    return readPasswordResetToken(window.location)
  })

  useEffect(() => {
    const captureToken = () => {
      const nextToken = readPasswordResetToken(window.location)
      if (!nextToken) return
      setToken(nextToken)
      clearPasswordResetTokenHash(window.location, window.history)
    }

    captureToken()
    window.addEventListener('hashchange', captureToken)
    return () => window.removeEventListener('hashchange', captureToken)
  }, [])

  return token
}

function useWorkspaceUser(role: UserRole): UserDto {
  const user = useAuth().user
  if (!user || user.role !== role) {
    throw new Error(`${role} workspace page rendered outside its guarded layout`)
  }
  return user
}

function HrefRedirect({ href }: { href: string }) {
  const router = useRouter()
  const hasRedirected = useRef(false)
  useEffect(() => {
    if (hasRedirected.current) return
    hasRedirected.current = true
    router.history.replace(href)
  }, [href, router])
  return null
}

// =============================================================================
// Wellness product pages
// =============================================================================

import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { AppShell } from '@/app/shell'
import { useWellnessApi } from '@/features/wellness'
import {
  AdminContentPage as AdminContentScreen,
  EveningPage as EveningScreen,
  FocusPage as FocusScreen,
  GardenPage as GardenScreen,
  InsightsPage as InsightsScreen,
  JournalPage as JournalScreen,
  MePage as MeScreen,
  OnboardingPage as OnboardingScreen,
  PracticeDetailPage as PracticeDetailScreen,
  PracticesPage as PracticesScreen,
  ProgramsPage as ProgramsScreen,
  SupportPage as SupportScreen,
  TodayPage as TodayScreen,
  ScrollPausePage as ScrollPauseScreen,
} from '@/features/wellness'

export function AppWorkspaceLayout() {
  const auth = useAuth()
  const location = useLocation()
  const wellness = useWellnessApi()
  const preferences = useQuery({
    queryKey: ['wellness', 'preferences'],
    queryFn: () => wellness.preferences(),
    enabled: Boolean(auth.user),
  })

  if (auth.isBootstrapping) return <SessionLoadingSection />
  if (auth.sessionError && !auth.user) {
    return <SessionErrorSection retry={auth.retrySession} detail={auth.sessionError?.message} />
  }
  if (!auth.user) {
    const returnTo = `${location.pathname}${location.searchStr}`
    return <HrefRedirect href={`/login?returnTo=${encodeURIComponent(returnTo)}`} />
  }
  // Новых пользователей встречает короткое знакомство; его можно пройти позже с нуля.
  if (preferences.data && !preferences.data.onboardingDone) {
    return <HrefRedirect href="/welcome" />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export function TodayPage() {
  return <TodayScreen />
}

export function PracticesPage() {
  return <PracticesScreen />
}

export function PracticeDetailPage() {
  const params = useParams({ strict: false })
  const code = String(params.code ?? '')
  return <PracticeDetailScreen code={code} />
}

export function GardenPage() {
  return <GardenScreen />
}

export function JournalPage() {
  return <JournalScreen />
}

export function MePage() {
  return <MeScreen />
}

export function SupportPage() {
  return <SupportScreen />
}

export function FocusPage() {
  return <FocusScreen />
}

export function ProgramsPage() {
  return <ProgramsScreen />
}

export function InsightsPage() {
  return <InsightsScreen />
}

export function WelcomePage() {
  const auth = useAuth()

  if (auth.isBootstrapping) return <SessionLoadingSection />
  if (!auth.user) {
    // В Telegram вход происходит автоматически; в браузере — обычная страница входа.
    return <HrefRedirect href="/login" />
  }
  return <OnboardingScreen />
}

export function EveningPage() {
  return <EveningScreen />
}

export function ScrollPausePage() {
  return <ScrollPauseScreen />
}

export function AdminContentPage() {
  return <AdminContentScreen />
}
