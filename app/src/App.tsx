import { Loader2 } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { RequireRole } from '@/auth/RequireRole'
import { AppShell } from '@/components/AppShell'

const Login = lazy(() => import('@/pages/Login'))
const MerchantsPage = lazy(() => import('@/pages/MerchantsPage'))
const TicketsQueuePage = lazy(() => import('@/pages/TicketsQueuePage'))
const TasksHomePage = lazy(() => import('@/pages/TasksHomePage'))
const AdminUsersPage = lazy(() => import('@/pages/AdminUsersPage'))
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

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/merchants" replace />} />
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
            <Route path="403" element={<Forbidden />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
