// app/(shell)/layout.tsx
import type { ReactNode } from "react"
import ShellSidebar from "./ShellSidebar"

export default async function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-neutral-50)]">
      <aside className="w-64 border-r border-[var(--color-neutral-200)] bg-white">
        <ShellSidebar />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-[var(--color-neutral-200)] bg-white px-6">
          <span className="text-sm text-[var(--color-neutral-700)]">Clinic Core</span>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
