'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" />
        <rect x="13" y="3" width="8" height="8" rx="1" fill="currentColor" />
        <rect x="3" y="13" width="8" height="8" rx="1" fill="currentColor" />
        <rect x="13" y="13" width="8" height="8" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="7" r="4" fill="currentColor" />
        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4h16l-4 7h-8l-4-7z" fill="currentColor" />
        <path d="M8 11h8l2 4H6l2-4z" fill="currentColor" />
        <path d="M10 15h4l1 3H9l1-3z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="12" width="4" height="9" fill="currentColor" />
        <rect x="10" y="7" width="4" height="14" fill="currentColor" />
        <rect x="17" y="3" width="4" height="18" fill="currentColor" />
      </svg>
    ),
  },
]

export default function Nav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex fixed left-0 top-0 h-full w-[240px] flex-col z-50"
        style={{ background: '#1A2C4E' }}
      >
        <div className="px-6 py-6">
          <span className="text-white font-semibold" style={{ fontSize: '18px' }}>
            YL CRM
          </span>
        </div>
        <div className="flex flex-col">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 h-12 transition-colors ${
                  active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 w-full z-50"
        style={{
          background: '#1A2C4E',
          height: '64px',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-around items-center w-full h-full">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full"
                style={{ color: active ? '#B8540A' : 'rgba(255,255,255,0.7)' }}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span style={{ fontSize: '11px', marginTop: '4px' }}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
