'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin',             icon: '▦',  label: 'Dashboard' },
  { href: '/admin/startups',    icon: '🚀', label: 'Startups' },
  { href: '/admin/partners',    icon: '🤝', label: 'Partners' },
  { href: '/admin/initiatives', icon: '🏛️', label: 'Initiatives' },
  { href: '/admin/matches',     icon: '✨', label: 'Matches' },
  { href: '/admin/linkages',    icon: '🔗', label: 'Linkages' },
]

export default function SideNav() {
  const pathname = usePathname()

  return (
    <aside className="admin-sidebar">
      <div className="sidenav-brand">
        <div className="sidenav-brand-name">Cradle Portal</div>
        <div className="sidenav-brand-sub">Ecosystem Manager</div>
      </div>
      <nav className="sidenav-nav">
        <div className="sidenav-section-label">Navigation</div>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidenav-item${pathname === item.href ? ' active' : ''}`}
          >
            <span className="sidenav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
