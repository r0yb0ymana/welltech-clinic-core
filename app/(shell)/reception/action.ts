// app/(shell)/reception/action.ts
"use server"

import { Client, Databases, Query } from "node-appwrite"
import { redirect } from "next/navigation"
import { requireClinicRole } from "@/app/lib/clinic-authz"

interface VisitDocument {
  $id?: string
  clinicId?: string
  patientId?: string
  status?: string
  chiefComplaint?: string
  checkInAt?: string
  queuedAt?: string
  intakeRequestId?: string
  consultStartAt?: string
}

interface PatientDocument {
  $id?: string
  clinicId?: string
  fullName?: string
  phone?: string
  pdpaConsent?: boolean
}

function getEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} in .env.local`)
  return v
}

function getServerDb() {
  const client = new Client()
    .setEndpoint(getEnv("APPWRITE_ENDPOINT"))
    .setProject(getEnv("APPWRITE_PROJECT_ID"))
    .setKey(getEnv("APPWRITE_API_KEY"))

  return new Databases(client)
}

function docId() {
  return crypto.randomUUID()
}

function toString(v: unknown): string {
  return typeof v === "string" ? v : ""
}

function normalizePhone(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  const plus = trimmed.startsWith("+") ? "+" : ""
  const digits = trimmed.replace(/[^\d]/g, "")
  return plus + digits
}

function makeSafeRequestId(raw: string) {
  const id = raw.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 36)
  if (!id || /^[._-]/.test(id)) return ""
  return id
}

function clampString(v: string, max: number) {
  const s = v.trim()
  return s.length <= max ? s : s.slice(0, max)
}

/* =========================
   CREATE (DE-DUPE + IDEMPOTENT VISIT)
========================= */
export async function registerPatient(formData: FormData) {
  await requireClinicRole("reception")

  const fullNameRaw = String(formData.get("fullName") ?? "")
  const chiefComplaintRaw = String(formData.get("chiefComplaint") ?? "")
  const requestIdRaw = String(formData.get("requestId") ?? "")
  const phoneRaw = String(formData.get("phone") ?? "")

  const fullName = clampString(fullNameRaw, 255)
  const chiefComplaint = clampString(chiefComplaintRaw, 255)

  if (!fullName) redirect("/reception?error=" + encodeURIComponent("Full name is required."))
  if (!chiefComplaint) redirect("/reception?error=" + encodeURIComponent("Chief complaint is required."))
  if (!requestIdRaw.trim()) {
    redirect("/reception?error=" + encodeURIComponent("Missing requestId. Refresh and try again."))
  }

  const intakeRequestId = makeSafeRequestId(requestIdRaw.trim())
  if (!intakeRequestId) {
    redirect("/reception?error=" + encodeURIComponent("Invalid requestId. Refresh and try again."))
  }

  const phone = normalizePhone(phoneRaw)

  const db = getServerDb()
  const databaseId = getEnv("APPWRITE_DATABASE_ID")
  const patientsId = getEnv("APPWRITE_PATIENTS_COLLECTION_ID")
  const visitsId = getEnv("APPWRITE_VISITS_COLLECTION_ID")
  const clinicId = getEnv("WT_CLINIC_ID")

  // 1) Idempotency check
  const existingVisit = await db.listDocuments(databaseId, visitsId, [
    Query.equal("clinicId", clinicId),
    Query.equal("intakeRequestId", intakeRequestId),
    Query.limit(1),
  ])

  if (existingVisit.documents.length > 0) {
    redirect("/reception?ok=1")
  }

  // 2) De-dupe patient by phone
  let patientIdToUse: string | null = null

  if (phone) {
    const existingPatient = await db.listDocuments(databaseId, patientsId, [
      Query.equal("clinicId", clinicId),
      Query.equal("phone", phone),
      Query.limit(1),
    ])

    if (existingPatient.documents.length > 0) {
      const doc = existingPatient.documents[0] as PatientDocument
      const id = toString(doc.$id)
      patientIdToUse = id || null
    }
  }

  // 3) Create patient if not found
  if (!patientIdToUse) {
    const patient = await db.createDocument(databaseId, patientsId, docId(), {
      clinicId,
      fullName,
      phone: phone || null,
      pdpaConsent: true,
    })
    const doc = patient as PatientDocument
    const id = toString(doc.$id)
    patientIdToUse = id || null
  }

  // 4) Create visit
  const now = new Date().toISOString()

  await db.createDocument(databaseId, visitsId, docId(), {
    clinicId,
    patientId: patientIdToUse,
    status: "queued",
    chiefComplaint,
    checkInAt: now,
    queuedAt: now,
    intakeRequestId,
  })

  redirect("/reception?ok=1")
}

/* =========================
   READ (QUEUE WITH PATIENT NAMES)
========================= */
export async function listQueuedVisitsWithPatients() {
  await requireClinicRole("reception")

  const db = getServerDb()
  const databaseId = getEnv("APPWRITE_DATABASE_ID")
  const visitsId = getEnv("APPWRITE_VISITS_COLLECTION_ID")
  const patientsId = getEnv("APPWRITE_PATIENTS_COLLECTION_ID")
  const clinicId = getEnv("WT_CLINIC_ID")

  const res = await db.listDocuments(databaseId, visitsId, [
    Query.equal("clinicId", clinicId),
    Query.equal("status", "queued"),
    Query.orderDesc("checkInAt"),
    Query.limit(20),
  ])

  const visits = res.documents as VisitDocument[]
  const patientIds = Array.from(
    new Set(
      visits
        .map(v => toString(v.patientId))
        .filter(Boolean)
    )
  )

  const patientMap = new Map<string, PatientDocument>()
  if (patientIds.length > 0) {
    const patientsRes = await db.listDocuments(databaseId, patientsId, [
      Query.equal("$id", patientIds),
      Query.limit(100),
    ])
    for (const p of patientsRes.documents) {
      const doc = p as PatientDocument
      const id = toString(doc.$id)
      if (id) patientMap.set(id, doc)
    }
  }

  return visits.map(v => {
    const patientId = toString(v.patientId)
    const p = patientMap.get(patientId)
    return {
      visitId: toString(v.$id),
      patientId,
      fullName: p?.fullName ?? "Unknown patient",
      chiefComplaint: toString(v.chiefComplaint),
      checkInAt: toString(v.checkInAt) || null,
      status: toString(v.status),
    }
  })
}

/* =========================
   START CONSULTATION (GUARDED)
========================= */
export async function startConsultation(formData: FormData) {
  await requireClinicRole("reception")

  const visitId = String(formData.get("visitId") ?? "").trim()
  if (!visitId) redirect("/reception?error=" + encodeURIComponent("Missing visitId."))

  const db = getServerDb()
  const databaseId = getEnv("APPWRITE_DATABASE_ID")
  const visitsId = getEnv("APPWRITE_VISITS_COLLECTION_ID")

  const visit = await db.getDocument(databaseId, visitsId, visitId)
  const status = String(((visit as unknown) as { status?: unknown }).status ?? "")

  if (status === "completed") {
    redirect("/reception?error=" + encodeURIComponent("Visit already completed"))
  }
  if (status !== "queued") {
    redirect("/reception?error=" + encodeURIComponent(`Invalid status transition from ${status}`))
  }

  const now = new Date().toISOString()

  await db.updateDocument(databaseId, visitsId, visitId, {
    status: "in_consult",
    consultStartAt: now,
  })

  redirect(`/consultation?visitId=${visitId}`)
}
