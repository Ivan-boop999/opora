import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router'

import { RootLayout } from './root-layout'

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: lazyRouteComponent(() => import('./pages'), 'NotFoundPage'),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }),
  component: lazyRouteComponent(() => import('./pages'), 'HomePage'),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: returnToSearch,
  component: lazyRouteComponent(() => import('./pages'), 'LoginPage'),
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  validateSearch: returnToSearch,
  component: lazyRouteComponent(() => import('./pages'), 'SignupPage'),
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: lazyRouteComponent(() => import('./pages'), 'ForgotPasswordPage'),
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: lazyRouteComponent(() => import('./pages'), 'ResetPasswordPage'),
})

const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/welcome',
  component: lazyRouteComponent(() => import('./pages'), 'WelcomePage'),
})

const appWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'appWorkspace',
  component: lazyRouteComponent(() => import('./pages'), 'AppWorkspaceLayout'),
})

const todayRoute = createRoute({
  getParentRoute: () => appWorkspaceRoute,
  path: '/app',
  component: lazyRouteComponent(() => import('./pages'), 'TodayPage'),
})

const practicesRoute = createRoute({
  getParentRoute: () => appWorkspaceRoute,
  path: '/app/practices',
  component: lazyRouteComponent(() => import('./pages'), 'PracticesPage'),
})

const practiceDetailRoute = createRoute({
  getParentRoute: () => appWorkspaceRoute,
  path: '/app/practices/$code',
  component: lazyRouteComponent(() => import('./pages'), 'PracticeDetailPage'),
})

const gardenRoute = createRoute({
  getParentRoute: () => appWorkspaceRoute,
  path: '/app/garden',
  component: lazyRouteComponent(() => import('./pages'), 'GardenPage'),
})

const journalRoute = createRoute({
  getParentRoute: () => appWorkspaceRoute,
  path: '/app/journal',
  component: lazyRouteComponent(() => import('./pages'), 'JournalPage'),
})

const meRoute = createRoute({
  getParentRoute: () => appWorkspaceRoute,
  path: '/app/me',
  component: lazyRouteComponent(() => import('./pages'), 'MePage'),
})

const supportRoute = createRoute({
  getParentRoute: () => appWorkspaceRoute,
  path: '/app/support',
  component: lazyRouteComponent(() => import('./pages'), 'SupportPage'),
})

const focusRoute = createRoute({
  getParentRoute: () => appWorkspaceRoute,
  path: '/app/focus',
  component: lazyRouteComponent(() => import('./pages'), 'FocusPage'),
})

const programsRoute = createRoute({
  getParentRoute: () => appWorkspaceRoute,
  path: '/app/programs',
  component: lazyRouteComponent(() => import('./pages'), 'ProgramsPage'),
})

const insightsRoute = createRoute({
  getParentRoute: () => appWorkspaceRoute,
  path: '/app/insights',
  component: lazyRouteComponent(() => import('./pages'), 'InsightsPage'),
})

const adminWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'adminWorkspace',
  component: lazyRouteComponent(() => import('./pages'), 'AdminWorkspaceLayout'),
})

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin',
  component: lazyRouteComponent(() => import('./pages'), 'AdminDashboardPage'),
})

const adminUsersRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/users',
  component: lazyRouteComponent(() => import('./pages'), 'AdminUsersPage'),
})

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/settings',
  component: lazyRouteComponent(() => import('./pages'), 'AdminSettingsPage'),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  welcomeRoute,
  appWorkspaceRoute.addChildren([
    todayRoute,
    practicesRoute,
    practiceDetailRoute,
    gardenRoute,
    journalRoute,
    meRoute,
    supportRoute,
    focusRoute,
    programsRoute,
    insightsRoute,
  ]),
  adminWorkspaceRoute.addChildren([
    adminDashboardRoute,
    adminUsersRoute,
    adminSettingsRoute,
  ]),
])

export const router = createRouter({ routeTree })

function returnToSearch(search: Record<string, unknown>) {
  return {
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
