'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Target, BarChart3, Package, MoreHorizontal } from 'lucide-react'

const desktopNavItems = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={22} /> },
  { label: 'Clients',   href: '/clients',   icon: <Users size={22} /> },
  { label: 'Leads',     href: '/leads',     icon: <Target size={22} /> },
  { label: 'Reports',   href: '/reports',   icon: <BarChart3 size={22} /> },
  { label: 'Products',  href: '/products',  icon: <Package size={22} /> },
]

const mobileNavItems = [
  { label: 'Dashboard', href: '/',       icon: <LayoutDashboard size={22} /> },
  { label: 'Clients',   href: '/clients', icon: <Users size={22} /> },
  { label: 'Leads',     href: '/leads',   icon: <Target size={22} /> },
  { label: 'More',      href: '/more',    icon: <MoreHorizontal size={22} /> },
]

export default function Nav() {
  const pathname = usePathname()

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex fixed left-0 top-0 h-full w-[240px] flex-col z-50"
        style={{ background: 'linear-gradient(to bottom, #1A2C4E, #2A4A7A)' }}
      >
        <div className="px-6 py-6">
          <p className="text-white text-xl font-bold leading-tight">CRM</p>
          <p className="text-white text-sm font-normal leading-snug">Laurent Roure</p>
          <p className="text-white text-sm font-normal leading-snug">Terra Training Ltd</p>
        </div>
        <div className="flex flex-col">
          {desktopNavItems.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 h-12 transition-colors ${
                  active ? 'bg-white/20 text-white border-l-2 border-white' : 'text-white/75 hover:text-white hover:bg-white/10'
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
          {mobileNavItems.map(item => {
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
