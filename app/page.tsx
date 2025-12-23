// app/(shell)/page.tsx
import Link from "next/link"
import { requireSignedIn } from "@/app/lib/require-signed-in"

export default async function DashboardPage() {
  // Phase 0: keep your existing signed-in check
  await requireSignedIn()

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Phase 0 placeholder. This page must not redirect anywhere.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/reception"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Reception
          </Link>

          <Link
            href="/consultation"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Consultation
          </Link>

          <Link
            href="/consultation/history"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Consultation History
          </Link>

          <Link
            href="/billing"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Billing
          </Link>

          <Link
            href="/pharmacy"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Pharmacy
          </Link>
        </div>
      </div>
    </div>
  )
}
