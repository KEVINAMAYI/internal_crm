import { Loader2 } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { RequireRole } from '@/auth/RequireRole'
import { AppShell } from '@/components/AppShell'
import { landingRoute } from '@/lib/roles'

const Login = lazy(() => import('@/pages/Login'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const MerchantsPage = lazy(() => import('@/pages/MerchantsPage'))
const TicketsQueuePage = lazy(() => import('@/pages/TicketsQueuePage'))
const TasksHomePage = lazy(() => import('@/pages/TasksHomePage'))
const AdminUsersPage = lazy(() => import('@/pages/AdminUsersPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const Forbidden = lazy(() => import('@/pages/Forbidden'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function PageFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center py-24">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function IndexRedirect() {
  const { role } = useAuth()
  return <Navigate to={landingRoute(role)} replace />
}

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<IndexRedirect />} />
            <Route
              path="dashboard"
              element={
                <RequireRole roles={['admin', 'ops']} fallback={<Forbidden />}>
                  <DashboardPage />
                </RequireRole>
              }
            />
            <Route path="merchants" element={<MerchantsPage />} />
            <Route path="merchants/:id" element={<MerchantsPage />} />
            <Route path="tickets" element={<TicketsQueuePage />} />
            <Route path="tasks" element={<TasksHomePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route
              path="admin/users"
              element={
                <RequireRole roles={['admin']} fallback={<Forbidden />}>
                  <AdminUsersPage />
                </RequireRole>
              }
            />
            <Route
              path="settings"
              element={
                <RequireRole roles={['admin']} fallback={<Forbidden />}>
                  <SettingsPage />
                </RequireRole>
              }
            />
            <Route path="403" element={<Forbidden />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
