'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  label: string
  href: string
  match?: (pathname: string) => boolean
  children?: NavItem[]
}

const nav: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Reception', href: '/reception' },
  {
    label: 'Consultation',
    href: '/consultation',
    match: pathname => pathname.startsWith('/consultation'),
    children: [
      { label: 'Consultation History', href: '/consultation/history' },
    ],
  },
  { label: 'Pharmacy', href: '/pharmacy' },
  { label: 'Billing', href: '/billing' },
]

function isExact(pathname: string, href: string) {
  return pathname === href
}

function NavLink({
  href,
  label,
  active,
  indent = false,
}: {
  href: string
  label: string
  active: boolean
  indent?: boolean
}) {
  return (
    <Link
      href={href}
      className={[
        'block rounded-md px-3 py-2 text-sm transition',
        indent ? 'pl-8' : '',
        active
          ? 'bg-[var(--color-neutral-100)] font-medium text-black'
          : 'text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}

export default function ShellSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-[var(--color-neutral-200)] bg-white">
      <div className="p-4 font-semibold font-[var(--font-heading)] text-[var(--color-primary-900)]">
        WellTech
      </div>

      <nav className="px-2">
        <ul className="space-y-1">
          {nav.map(item => {
            const isActive = item.match
              ? item.match(pathname)
              : isExact(pathname, item.href)

            return (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  active={isActive}
                />

                {item.children && (
                  <ul className="mt-1 space-y-1">
                    {item.children.map(child => (
                      <li key={child.href}>
                        <NavLink
                          href={child.href}
                          label={child.label}
                          active={isExact(pathname, child.href)}
                          indent
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
