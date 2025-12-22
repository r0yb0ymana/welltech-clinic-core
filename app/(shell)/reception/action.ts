// app/(shell)/reception/action.ts
'use server'

import { Client, Databases, Query } from 'node-appwrite'
import { redirect } from 'next/navigation'

function getEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} in .env.local`)
  return v
}

function getServerDb() {
  const client = new Client()
    .setEndpoint(getEnv('APPWRITE_ENDPOINT'))
    .setProject(getEnv('APPWRITE_PROJECT_ID'))
    .setKey(getEnv('APPWRITE_API_KEY'))

  return new Databases(client)
}

function docId() {
  // Appwrite accepts UUIDs: a-zA-Z0-9._- and max 36 chars.
  return crypto.randomUUID()
}

function normalizePhone(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const plus = trimmed.startsWith('+') ? '+' : ''
  const digits = trimmed.replace(/[^\d]/g, '')
  return plus + digits
}

function makeSafeRequestId(raw: string) {
  // intakeRequestId stored as a field (not documentId)
  // keep it strict anyway for indexes + safety
  const id = raw.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 36)
  if (!id || /^[._-]/.test(id)) return ''
  return id
}

function clampString(v: string, max: number) {
  const s = v.trim()
  if (s.length <= max) return s
  return s.slice(0, max)
}

/* =========================
   CREATE (DE-DUPE + IDEMPOTENT VISIT)
   ========================= */
export async function registerPatient(formData: FormData) {
  const fullNameRaw = String(formData.get('fullName') ?? '')
  const chiefComplaintRaw = String(formData.get('chiefComplaint') ?? '')
  const requestIdRaw = String(formData.get('requestId') ?? '')
  const phoneRaw = String(formData.get('phone') ?? '')

  const fullName = clampString(fullNameRaw, 255)
  const chiefComplaint = clampString(chiefComplaintRaw, 255)

  if (!fullName) redirect('/reception?error=' + encodeURIComponent('Full name is required.'))
  if (!chiefComplaint) redirect('/reception?error=' + encodeURIComponent('Chief complaint is required.'))
  if (!requestIdRaw.trim()) {
    redirect('/reception?error=' + encodeURIComponent('Missing requestId. Refresh and try again.'))
  }

  const intakeRequestId = makeSafeRequestId(requestIdRaw.trim())
  if (!intakeRequestId) {
    redirect('/reception?error=' + encodeURIComponent('Invalid requestId. Refresh and try again.'))
  }

  const phone = normalizePhone(phoneRaw)

  const db = getServerDb()
  const databaseId = getEnv('APPWRITE_DATABASE_ID')
  const patientsId = getEnv('APPWRITE_PATIENTS_COLLECTION_ID')
  const visitsId = getEnv('APPWRITE_VISITS_COLLECTION_ID')
  const clinicId = getEnv('WT_CLINIC_ID')

  // 1) Idempotency: if this intakeRequestId already created a visit, stop.
  const existingVisit = await db.listDocuments(databaseId, visitsId, [
    Query.equal('clinicId', clinicId),
    Query.equal('intakeRequestId', intakeRequestId),
    Query.limit(1),
  ])

  if (existingVisit.documents.length > 0) {
    redirect('/reception?ok=1')
  }

  // 2) De-dupe patient by phone (if provided)
  let patientIdToUse: string | null = null

  if (phone) {
    const existingPatient = await db.listDocuments(databaseId, patientsId, [
      Query.equal('clinicId', clinicId),
      Query.equal('phone', phone),
      Query.limit(1),
    ])

    if (existingPatient.documents.length > 0) {
      patientIdToUse = (existingPatient.documents[0] as any).$id
    }
  }

  // 3) Create patient if not found
  if (!patientIdToUse) {
    const patient = await db.createDocument(databaseId, patientsId, docId(), {
      clinicId,
      fullName,
      phone: phone || null,
      // keep whatever you’ve got in your patients schema
      pdpaConsent: true,
    })
    patientIdToUse = (patient as any).$id
  }

  // 4) Create visit (store intakeRequestId for idempotency)
  const now = new Date().toISOString()

  await db.createDocument(databaseId, visitsId, docId(), {
    clinicId,
    patientId: patientIdToUse,
    status: 'queued',
    chiefComplaint,
    checkInAt: now,

    // if you created these columns, set them
    queuedAt: now,

    intakeRequestId,
  })

  redirect('/reception?ok=1')
}

/* =========================
   READ (QUEUE WITH PATIENT NAMES)
   ========================= */
export async function listQueuedVisitsWithPatients() {
  const db = getServerDb()

  const databaseId = getEnv('APPWRITE_DATABASE_ID')
  const visitsId = getEnv('APPWRITE_VISITS_COLLECTION_ID')
  const patientsId = getEnv('APPWRITE_PATIENTS_COLLECTION_ID')
  const clinicId = getEnv('WT_CLINIC_ID')

  const res = await db.listDocuments(databaseId, visitsId, [
    Query.equal('clinicId', clinicId),
    Query.equal('status', 'queued'),
    Query.orderDesc('checkInAt'),
    Query.limit(20),
  ])

  const visits = res.documents as any[]
  const patientIds = Array.from(new Set(visits.map(v => v.patientId).filter(Boolean)))

  const patientMap = new Map<string, any>()
  if (patientIds.length > 0) {
    // Appwrite supports Query.equal('$id', [id1, id2, ...])
    const patientsRes = await db.listDocuments(databaseId, patientsId, [
      Query.equal('$id', patientIds),
      Query.limit(100),
    ])
    for (const p of patientsRes.documents as any[]) patientMap.set(p.$id, p)
  }

  return visits.map(v => {
    const p = patientMap.get(v.patientId)
    return {
      visitId: v.$id,
      patientId: v.patientId,
      fullName: p?.fullName ?? 'Unknown patient',
      chiefComplaint: v.chiefComplaint ?? '',
      checkInAt: v.checkInAt ?? null,
      status: v.status ?? '',
    }
  })
}

/* =========================
   START CONSULTATION (GUARDED)
   ========================= */
export async function startConsultation(formData: FormData) {
  const visitId = String(formData.get('visitId') ?? '').trim()
  if (!visitId) redirect('/reception?error=' + encodeURIComponent('Missing visitId.'))

  const db = getServerDb()
  const databaseId = getEnv('APPWRITE_DATABASE_ID')
  const visitsId = getEnv('APPWRITE_VISITS_COLLECTION_ID')

  // Load visit first so we can guard transitions
  const visit = await db.getDocument(databaseId, visitsId, visitId)
  const status = String((visit as any).status ?? '')

  // Hard transition rule: queued -> in_consult only
  if (status === 'completed') {
    redirect('/reception?error=' + encodeURIComponent('Visit already completed'))
  }
  if (status !== 'queued') {
    redirect('/reception?error=' + encodeURIComponent(`Invalid status transition from ${status}`))
  }

  const now = new Date().toISOString()

  await db.updateDocument(databaseId, visitsId, visitId, {
    status: 'in_consult',
    consultStartAt: now,

    // optional, if you created these fields
    // consultedBy: actor userId goes here once auth/roles are wired
  })

  redirect(`/consultation?visitId=${visitId}`)
}
