// app/(shell)/consultation/history/page.tsx
import { Client, Databases, Query } from "node-appwrite"
import Link from "next/link"
import { redirect } from "next/navigation"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

interface VisitDocument {
  $id?: string
  patientId?: string
  status?: string
  chiefComplaint?: string
  checkInAt?: string
  consultStartAt?: string
  consultEndAt?: string
  soapUpdatedAt?: string
  soapUpdatedBy?: string
  [key: string]: unknown
}

interface PatientDocument {
  $id?: string
  clinicId?: string
  fullName?: string
  [key: string]: unknown
}

function getOne(sp: Record<string, unknown>, key: string) {
  const v = sp?.[key]
  if (Array.isArray(v)) return v[0]
  return typeof v === "string" ? v : ""
}

function getServerDb() {
  const endpoint = process.env.APPWRITE_ENDPOINT
  const projectId = process.env.APPWRITE_PROJECT_ID
  const apiKey = process.env.APPWRITE_API_KEY

  if (!endpoint) throw new Error("Missing APPWRITE_ENDPOINT in .env.local")
  if (!projectId) throw new Error("Missing APPWRITE_PROJECT_ID in .env.local")
  if (!apiKey) throw new Error("Missing APPWRITE_API_KEY in .env.local")

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
  return new Databases(client)
}

function envIds() {
  const databaseId = process.env.APPWRITE_DATABASE_ID
  const visitsId = process.env.APPWRITE_VISITS_COLLECTION_ID
  const patientsId = process.env.APPWRITE_PATIENTS_COLLECTION_ID
  const clinicId = process.env.WT_CLINIC_ID

  if (!databaseId) throw new Error("Missing APPWRITE_DATABASE_ID in .env.local")
  if (!visitsId) throw new Error("Missing APPWRITE_VISITS_COLLECTION_ID in .env.local")
  if (!patientsId) throw new Error("Missing APPWRITE_PATIENTS_COLLECTION_ID in .env.local")
  if (!clinicId) throw new Error("Missing WT_CLINIC_ID in .env.local")

  return { databaseId, visitsId, patientsId, clinicId }
}

function fmt(dt: unknown) {
  if (!dt) return "-"
  try {
    return new Date(String(dt)).toLocaleString()
  } catch {
    return "-"
  }
}

async function fetchVisits(params: { patientId?: string; status?: string; limit?: number }) {
  const db = getServerDb()
  const { databaseId, visitsId, clinicId } = envIds()

  const status = params.status?.trim() || "completed"
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200)

  const queries: string[] = [Query.equal("clinicId", clinicId), Query.equal("status", status), Query.limit(limit)]

  // For speed you want:
  // - status view => idx_visits_clinic_status_checkInAt
  // - patient view => idx_visits_clinic_patient_checkInAt
  if (params.patientId?.trim()) {
    queries.push(Query.equal("patientId", params.patientId.trim()))
  }

  // Order by checkInAt descending
  queries.push(Query.orderDesc("checkInAt"))

  const res = await db.listDocuments(databaseId, visitsId, queries)
  return res.documents
}

async function getPatientName(patientId: string) {
  const db = getServerDb()
  const { databaseId, patientsId, clinicId } = envIds()

  // Fetch by id, then verify clinic isolation.
  // (Yes: this is N+1. With limit <= 50 it’s fine for MVP.)
  try {
    const p = (await db.getDocument(databaseId, patientsId, patientId)) as PatientDocument
    if (String(p.clinicId) !== String(clinicId)) return "Unknown patient"
    return String(p.fullName || "Unknown patient")
  } catch {
    return "Unknown patient"
  }
}

export default async function ConsultationHistoryPage(props: { searchParams?: SearchParams }) {
  const sp = props.searchParams ? await props.searchParams : {}
  const patientId = getOne(sp, "patientId")
  const status = getOne(sp, "status") || "completed"

  // Guard: only allow known statuses
  const allowed = new Set(["queued", "in_consult", "completed"])
  if (!allowed.has(status)) redirect("/consultation/history?status=completed")

  const visits = (await fetchVisits({ patientId: patientId || undefined, status, limit: 50 })) as VisitDocument[]

  // Resolve patient names (MVP approach)
  const patientNameById = new Map<string, string>()
  for (const v of visits) {
    const pid = String(v.patientId || "")
    if (!pid) continue
    if (!patientNameById.has(pid)) {
      patientNameById.set(pid, await getPatientName(pid))
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Consultation History</h1>
            <div className="mt-2 text-sm text-neutral-600">
              Status: <span className="font-semibold text-neutral-900">{status}</span>
              {patientId ? (
                <>
                  {" "}
                  • PatientId: <span className="font-mono text-xs text-neutral-700">{patientId}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/consultation/history?status=completed"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Completed
            </Link>
            <Link
              href="/consultation/history?status=in_consult"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              In consult
            </Link>
            <Link
              href="/consultation/history?status=queued"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Queued
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        {visits.length === 0 ? (
          <div className="text-sm text-neutral-700">No visits found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-semibold text-neutral-600">
                  <th className="py-3 pr-4">Patient</th>
                  <th className="py-3 pr-4">Chief complaint</th>
                  <th className="py-3 pr-4">Check-in</th>
                  <th className="py-3 pr-4">Consult start</th>
                  <th className="py-3 pr-4">Consult end</th>
                  <th className="py-3 pr-4">SOAP updated</th>
                  <th className="py-3 pr-0">Actions</th>
                </tr>
              </thead>

              <tbody className="text-sm text-neutral-900">
                {visits.map((v) => {
                  const pid = String(v.patientId || "")
                  const patientName = patientNameById.get(pid) || "Unknown patient"

                  return (
                    <tr key={v.$id} className="border-b border-neutral-100">
                      <td className="py-4 pr-4">
                        <div className="font-semibold">{patientName}</div>
                        <div className="mt-1 font-mono text-xs text-neutral-500">{pid}</div>
                      </td>

                      <td className="py-4 pr-4">{v.chiefComplaint || "-"}</td>
                      <td className="py-4 pr-4">{fmt(v.checkInAt)}</td>
                      <td className="py-4 pr-4">{fmt(v.consultStartAt)}</td>
                      <td className="py-4 pr-4">{fmt(v.consultEndAt)}</td>
                      <td className="py-4 pr-4">
                        <div>{fmt(v.soapUpdatedAt)}</div>
                        <div className="mt-1 text-xs text-neutral-500">
                          by {v.soapUpdatedBy ? String(v.soapUpdatedBy) : "-"}
                        </div>
                      </td>

                      <td className="py-4 pr-0">
                        <div className="flex gap-2">
                          <Link
                            href={`/consultation?visitId=${v.$id}`}
                            className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                          >
                            Open
                          </Link>

                          <Link
                            href={`/consultation/history?patientId=${pid}&status=completed`}
                            className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                          >
                            Patient history
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
