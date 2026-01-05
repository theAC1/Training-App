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

    <div className="fixed bottom-6 left-4 right-4 z-50">
      <nav className="mx-auto max-w-md rounded-2xl border border-white/10 bg-card/80 p-2 shadow-floating backdrop-blur-lg dark:bg-card/90 safe-area-bottom">
        <ul className="flex items-center justify-around">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)

            // Highlight specific items? For now we keep it consistent

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 p-2 text-xs font-medium transition-colors hover:text-primary rounded-xl",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <div className={cn("transition-transform duration-200", isActive && "scale-110 -translate-y-1")}>
                    {item.icon}
                  </div>
                  <span className={cn("transition-opacity", isActive ? "opacity-100 font-semibold" : "opacity-70")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
