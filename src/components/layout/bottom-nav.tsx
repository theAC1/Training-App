'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Dumbbell, ListTodo, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  trainerOnly?: boolean
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Start',
    icon: <Home className="h-6 w-6" />,
  },
  {
    href: '/exercises',
    label: 'Übungen',
    icon: <Dumbbell className="h-6 w-6" />,
  },
  {
    href: '/plan',
    label: 'Planung',
    icon: <ListTodo className="h-6 w-6" />,
    trainerOnly: true,
  },
  {
    href: '/athletes',
    label: 'Athleten',
    icon: <Users className="h-6 w-6" />,
    trainerOnly: true,
  },
  {
    href: '/settings',
    label: 'Mehr',
    icon: <Settings className="h-6 w-6" />,
  },
]

interface BottomNavProps {
  userRole: 'trainer' | 'athlete'
}

export function BottomNav({ userRole }: BottomNavProps) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(
    (item) => !item.trainerOnly || userRole === 'trainer'
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background safe-area-bottom">
      <div className="flex items-center justify-around">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
