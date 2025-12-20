export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <div className="mx-auto max-w-4xl px-8 py-12">
        <h1 className="text-3xl font-semibold tracking-tight font-[var(--font-heading)] text-[var(--color-primary-900)]">
          WellTech Clinic Core
        </h1>

        <p className="mt-2 text-[var(--color-neutral-700)]">
          Foundation running. Design tokens and fonts locked.
        </p>

        <div className="mt-8 rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-6">
          <h2 className="text-lg font-semibold font-[var(--font-heading)]">
            Next
          </h2>
          <ul className="mt-3 list-disc pl-5 text-[var(--color-neutral-700)]">
            <li>App shell (nav + page layout)</li>
            <li>Auth route stubs</li>
            <li>RBAC role map scaffolding</li>
          </ul>

          <div className="mt-6 flex gap-3">
            <button className="h-10 rounded-lg bg-[var(--color-primary-900)] px-4 text-white">
              Primary
            </button>
            <button className="h-10 rounded-lg border border-[var(--color-primary-300)] bg-white px-4 text-[var(--color-primary-900)]">
              Secondary
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
