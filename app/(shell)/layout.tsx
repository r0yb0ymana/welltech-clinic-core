export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--color-neutral-50)]">
      <aside className="w-64 border-r border-[var(--color-neutral-200)] bg-white">
        <div className="p-4 font-semibold font-[var(--font-heading)] text-[var(--color-primary-900)]">
          WellTech
        </div>

        <nav className="px-2">
          <ul className="space-y-1 text-sm text-[var(--color-neutral-700)]">
            <li className="rounded-md px-3 py-2 hover:bg-[var(--color-neutral-50)]">Dashboard</li>
            <li className="rounded-md px-3 py-2 hover:bg-[var(--color-neutral-50)]">Reception</li>
            <li className="rounded-md px-3 py-2 hover:bg-[var(--color-neutral-50)]">Consultation</li>
            <li className="rounded-md px-3 py-2 hover:bg-[var(--color-neutral-50)]">Pharmacy</li>
            <li className="rounded-md px-3 py-2 hover:bg-[var(--color-neutral-50)]">Billing</li>
          </ul>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="h-14 border-b border-[var(--color-neutral-200)] bg-white px-6 flex items-center">
          <span className="text-sm text-[var(--color-neutral-700)]">Clinic Core</span>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
