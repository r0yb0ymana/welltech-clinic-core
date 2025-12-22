// app/(shell)/consultation/page.tsx
import { loadConsultation, saveSoap, endConsultation } from './action'
import { redirect } from 'next/navigation'
import { requireSignedIn } from '@/app/lib/require-signed-in'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function getOne(sp: Record<string, any>, key: string) {
  const v = sp?.[key]
  if (Array.isArray(v)) return v[0]
  return typeof v === 'string' ? v : ''
}

export default async function ConsultationPage(props: { searchParams?: SearchParams }) {
  // Auth gate: must be signed in (cookie exists)
  await requireSignedIn()

  const sp = props.searchParams ? await props.searchParams : {}
  const visitId = getOne(sp, 'visitId')

  if (!visitId) redirect('/consultation/history')

  // Dev fallback actor (until real Appwrite auth)
  const actorId = process.env.WT_DEV_USER_ID || 'dev-doctor-1'

  const saved = getOne(sp, 'saved') === '1'

  // IMPORTANT: loadConsultation returns { visit, patient, locked }
  const { visit, patient, locked } = await loadConsultation(visitId)

  const status = String((visit as any).status || '')
  const lockedBy = (visit as any).lockedBy ? String((visit as any).lockedBy) : ''
  const lockedAt = (visit as any).lockedAt
    ? new Date(String((visit as any).lockedAt)).toLocaleString()
    : ''

  const patientFullName = String((patient as any)?.fullName || 'Unknown patient')

  const readOnly =
    Boolean(locked) || (lockedBy && lockedBy !== actorId) || status === 'completed'

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Consultation</h1>

            <div className="mt-3 space-y-1 text-sm text-neutral-800">
              <div>
                <span className="font-semibold">Patient:</span> {patientFullName}
              </div>
              <div>
                <span className="font-semibold">Chief complaint:</span>{' '}
                {(visit as any).chiefComplaint || '(no complaint)'}
              </div>
              <div className="text-xs text-neutral-600">
                visitId: {(visit as any).$id} • status: {status}
                {lockedBy ? ` • lockedBy: ${lockedBy}` : ''}
                {lockedAt ? ` • lockedAt: ${lockedAt}` : ''}
              </div>
            </div>

            {saved && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                Saved.
              </div>
            )}

            {readOnly && status !== 'completed' && lockedBy && lockedBy !== actorId && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Read-only. This visit is locked by {lockedBy}.
              </div>
            )}

            {status === 'completed' && (
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
                Completed. No edits allowed.
              </div>
            )}
          </div>

          <form action={endConsultation}>
            <input type="hidden" name="visitId" value={(visit as any).$id} />
            <input type="hidden" name="actorId" value={actorId} />
            <button
              type="submit"
              disabled={readOnly || status !== 'in_consult'}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                readOnly || status !== 'in_consult'
                  ? 'cursor-not-allowed bg-neutral-200 text-neutral-600'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              End consultation
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">SOAP Notes</h2>

        <form action={saveSoap} className="mt-6 space-y-6">
          <input type="hidden" name="visitId" value={(visit as any).$id} />
          <input type="hidden" name="actorId" value={actorId} />

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Subjective
            </label>
            <textarea
              name="subjective"
              defaultValue={(visit as any).subjective ?? ''}
              rows={5}
              readOnly={readOnly}
              className={`w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500 ${
                readOnly ? 'bg-neutral-50' : ''
              }`}
            />
            <div className="mt-1 text-xs text-neutral-500">Max 4000 chars</div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Objective
            </label>
            <textarea
              name="objective"
              defaultValue={(visit as any).objective ?? ''}
              rows={5}
              readOnly={readOnly}
              className={`w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500 ${
                readOnly ? 'bg-neutral-50' : ''
              }`}
            />
            <div className="mt-1 text-xs text-neutral-500">Max 4000 chars</div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">
              Assessment
            </label>
            <textarea
              name="assessment"
              defaultValue={(visit as any).assessment ?? ''}
              rows={5}
              readOnly={readOnly}
              className={`w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500 ${
                readOnly ? 'bg-neutral-50' : ''
              }`}
            />
            <div className="mt-1 text-xs text-neutral-500">Max 2000 chars</div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-900">Plan</label>
            <textarea
              name="plan"
              defaultValue={(visit as any).plan ?? ''}
              rows={5}
              readOnly={readOnly}
              className={`w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500 ${
                readOnly ? 'bg-neutral-50' : ''
              }`}
            />
            <div className="mt-1 text-xs text-neutral-500">Max 2000 chars</div>
          </div>

          <button
            type="submit"
            disabled={readOnly || status !== 'in_consult'}
            className={`rounded-lg px-5 py-2 text-sm font-semibold ${
              readOnly || status !== 'in_consult'
                ? 'cursor-not-allowed bg-neutral-200 text-neutral-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Save SOAP
          </button>
        </form>
      </div>
    </div>
  )
}
