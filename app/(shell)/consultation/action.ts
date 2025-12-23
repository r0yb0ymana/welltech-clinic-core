// app/(shell)/consultation/action.ts
"use server"

import { Client, Databases } from "node-appwrite"
import { redirect } from "next/navigation"
import { requireClinicRole } from "@/app/lib/clinic-authz"

function getServerDb() {
  const endpoint = process.env.APPWRITE_ENDPOINT
  const projectId = process.env.APPWRITE_PROJECT_ID
  const apiKey = process.env.APPWRITE_API_KEY

  if (!endpoint) throw new Error("Missing APPWRITE_ENDPOINT")
  if (!projectId) throw new Error("Missing APPWRITE_PROJECT_ID")
  if (!apiKey) throw new Error("Missing APPWRITE_API_KEY")

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
  return new Databases(client)
}

function str(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : ""
}

function toString(v: unknown): string {
  return typeof v === "string" ? v : ""
}

function isCompleted(status: unknown) {
  return String(status ?? "").toLowerCase() === "completed"
}

function isInConsult(status: unknown) {
  return String(status ?? "").toLowerCase() === "in_consult"
}

/* =========================
   LOAD CONSULTATION
========================= */
export async function loadConsultation(visitId: string) {
  if (!visitId) throw new Error("Missing visitId")

  await requireClinicRole("doctor")

  const db = getServerDb()
  const databaseId = process.env.APPWRITE_DATABASE_ID!
  const visitsId = process.env.APPWRITE_VISITS_COLLECTION_ID!
  const patientsId = process.env.APPWRITE_PATIENTS_COLLECTION_ID!

  const visit = await db.getDocument(databaseId, visitsId, visitId)
  const patientId = toString(((visit as unknown) as { patientId?: unknown }).patientId)

  let patient: unknown = null
  if (patientId) {
    patient = await db.getDocument(databaseId, patientsId, patientId)
  }

  return {
    visit,
    patient,
    locked: isCompleted(((visit as unknown) as { status?: unknown }).status),
  }
}

/* =========================
   SAVE SOAP
========================= */
export async function saveSoap(formData: FormData) {
  const actor = await requireClinicRole("doctor")

  const visitId = str(formData.get("visitId"))
  if (!visitId) redirect("/consultation")

  const subjective = str(formData.get("subjective"))
  const objective = str(formData.get("objective"))
  const assessment = str(formData.get("assessment"))
  const plan = str(formData.get("plan"))

  const db = getServerDb()
  const databaseId = process.env.APPWRITE_DATABASE_ID!
  const visitsId = process.env.APPWRITE_VISITS_COLLECTION_ID!

  const current = await db.getDocument(databaseId, visitsId, visitId)
  if (isCompleted(((current as unknown) as { status?: unknown }).status)) {
    redirect(`/consultation?visitId=${visitId}`)
  }

  await db.updateDocument(databaseId, visitsId, visitId, {
    subjective,
    objective,
    assessment,
    plan,
    soapUpdatedAt: new Date().toISOString(),
    soapUpdatedBy: actor.id,
  })

  redirect(`/consultation?visitId=${visitId}&saved=1`)
}

/* =========================
   END CONSULTATION
========================= */
export async function endConsultation(formData: FormData) {
  const actor = await requireClinicRole("doctor")

  const visitId = str(formData.get("visitId"))
  if (!visitId) redirect("/consultation")

  const db = getServerDb()
  const databaseId = process.env.APPWRITE_DATABASE_ID!
  const visitsId = process.env.APPWRITE_VISITS_COLLECTION_ID!

  const current = await db.getDocument(databaseId, visitsId, visitId)
  const clinicId = toString(((current as unknown) as { clinicId?: unknown }).clinicId)
  
  if (isCompleted(((current as unknown) as { status?: unknown }).status)) {
    // Visit already completed — reject the completion attempt.
    redirect(`/reception?error=Visit%20already%20completed`)
  }

  // Only allow completing a visit that is currently 'in_consult'.
  if (!isInConsult(((current as unknown) as { status?: unknown }).status)) {
    redirect(`/consultation?visitId=${visitId}&error=Visit%20not%20in%20consult`)
  }

  // Generate a requestId for audit traceability
  const requestId = crypto.randomUUID()

  // Delegate validation + completion + audit to helper.
  try {
    const { validateAndCompleteVisit } = await import("@/app/lib/visit-transitions")
    await validateAndCompleteVisit(visitId, { id: actor.id, role: actor.role }, clinicId, requestId)
  } catch (err: unknown) {
    const m = String(((err as unknown) as { message?: unknown }).message || err)
    redirect(`/consultation?visitId=${visitId}&error=${encodeURIComponent(m)}`)
  }

  redirect("/reception?ok=1")
}

