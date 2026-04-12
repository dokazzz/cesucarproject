'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, Clock, User, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavbarProps {
  userType: 'passenger' | 'driver'
}

export function Navbar({ userType }: NavbarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const basePath = userType === 'driver' ? '/driver' : '/passenger'
  
  const navItems = [
    { href: `${basePath}/home`, label: 'Início', icon: Home },
    { href: `${basePath}/chat`, label: 'Chat', icon: MessageCircle },
    { href: `${basePath}/history`, label: 'Histórico', icon: Clock },
    { href: `${basePath}/profile`, label: 'Perfil', icon: User },
  ]

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 hidden border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href={`${basePath}/home`}>
            <Logo size="sm" />
          </Link>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'gap-2',
                      isActive && 'bg-secondary'
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {userType === 'driver' ? 'Motorista' : 'Passageiro'}
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon size={22} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <Logo size="sm" />
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
          {userType === 'driver' ? 'Motorista' : 'Passageiro'}
        </span>
      </header>
    </>
  )
}
