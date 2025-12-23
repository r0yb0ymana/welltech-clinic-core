// app/(shell)/reception/page.tsx
import ReceptionForm from './ReceptionForm'
import { registerPatient, listQueuedVisitsWithPatients, startConsultation } from './action'
import Link from 'next/link'
import { requireSignedIn } from '@/app/lib/require-signed-in'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

interface QueuedVisit {
  visitId?: string
  patientId?: string
  fullName?: string
  chiefComplaint?: string
  checkInAt?: string
  status?: string
}

function getOne(sp: Record<string, unknown>, key: string) {
  const v = sp?.[key]
  if (Array.isArray(v)) return v[0]
  return typeof v === 'string' ? v : ''
}

export default async function ReceptionPage(props: { searchParams?: SearchParams }) {
  // Auth gate: must be signed in (cookie exists)
  await requireSignedIn()

  const sp = props.searchParams ? await props.searchParams : {}

  const ok = getOne(sp, 'ok') === '1'
  const error = getOne(sp, 'error')

  const requestId = crypto.randomUUID()

  // Server action will enforce reception/admin role
  const visits = await listQueuedVisitsWithPatients()

  return (
    <div className="max-w-3xl space-y-6">
      {(ok || error) && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            error
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-green-200 bg-green-50 text-green-900'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {error ? (
                <div className="font-semibold">Error: {error}</div>
              ) : (
                <div className="font-semibold">Saved.</div>
              )}
              <div className="mt-1 text-xs opacity-80">This message is from the URL query.</div>
            </div>

            <Link
              href="/reception"
              className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50"
            >
              Dismiss
            </Link>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-900">Reception – Register Patient</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Creates patient + queued visit (server-side). Role: reception.
        </p>

        <div className="mt-6">
          <ReceptionForm action={registerPatient} requestId={requestId} />
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Queue</h2>
        <p className="mt-1 text-sm text-neutral-700">Latest 20 queued visits for this clinic.</p>

        {visits.length === 0 ? (
          <div className="mt-4 text-sm text-neutral-600">No queued visits.</div>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200">
            {visits.map((v) => (
              <li key={v.visitId} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-neutral-900">
                      {v.fullName}
                    </div>
                    <div className="truncate text-sm text-neutral-700">
                      {v.chiefComplaint || '(no complaint)'}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      visitId: <span className="font-mono">{v.visitId}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs text-neutral-600">
                      {v.checkInAt ? new Date(v.checkInAt).toLocaleString() : ''}
                    </div>

                    <form action={startConsultation}>
                      <input type="hidden" name="visitId" value={v.visitId} />
                      <button
                        type="submit"
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50"
                      >
                        Start consultation
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
