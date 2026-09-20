import {
  Building2,
  LayoutDashboard,
  LayoutGrid,
  Search,
  Settings as SettingsIcon,
  SquareCheck,
  Ticket,
  Users as UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { CommandPalette } from '@/components/CommandPalette'
import { UserMenu } from '@/components/UserMenu'
import { Button } from '@/components/ui/button'
import { canViewDashboard, isAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/merchants', label: 'Merchants', icon: Building2 },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/tasks', label: 'Tasks', icon: SquareCheck },
]

export function AppShell() {
  const { role } = useAuth()
  const [paletteOpen, setPaletteOpen] = useState(false)

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LayoutGrid className="size-4" />
          </div>
          <span className="font-semibold">Merchant CRM</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {canViewDashboard(role) && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <LayoutDashboard className="size-4" />
              Dashboard
            </NavLink>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
          {isAdmin(role) && (
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <UsersIcon className="size-4" />
              Users
            </NavLink>
          )}
          {isAdmin(role) && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )
              }
            >
              <SettingsIcon className="size-4" />
              Settings
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <Button
            variant="outline"
            className="h-8 w-72 max-w-sm justify-start gap-2 text-muted-foreground font-normal"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="size-4" />
            Search merchants, tickets, tasks…
            <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
              ⌘K
            </kbd>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <UserMenu />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
