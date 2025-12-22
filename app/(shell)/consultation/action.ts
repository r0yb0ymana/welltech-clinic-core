'use server'

import { Client, Databases, Query } from 'node-appwrite'
import { redirect } from 'next/navigation'
import { requireClinicRole } from '@/app/lib/clinic-authz'

function getServerDb() {
  const endpoint = process.env.APPWRITE_ENDPOINT
  const projectId = process.env.APPWRITE_PROJECT_ID
  const apiKey = process.env.APPWRITE_API_KEY

  if (!endpoint) throw new Error('Missing APPWRITE_ENDPOINT')
  if (!projectId) throw new Error('Missing APPWRITE_PROJECT_ID')
  if (!apiKey) throw new Error('Missing APPWRITE_API_KEY')

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
  return new Databases(client)
}

function str(v: FormDataEntryValue | null) {
  return typeof v === 'string' ? v.trim() : ''
}

function isCompleted(status: any) {
  return String(status ?? '').toLowerCase() === 'completed'
}

/* =========================
   LOAD CONSULTATION
========================= */
export async function loadConsultation(visitId: string) {
  if (!visitId) throw new Error('Missing visitId')

  // Role gate (doctor only)
  await requireClinicRole('doctor')

  const db = getServerDb()
  const databaseId = process.env.APPWRITE_DATABASE_ID!
  const visitsId = process.env.APPWRITE_VISITS_COLLECTION_ID!
  const patientsId = process.env.APPWRITE_PATIENTS_COLLECTION_ID!

  const visit = await db.getDocument(databaseId, visitsId, visitId)
  const patientId = (visit as any).patientId

  let patient: any = null
  if (patientId) {
    patient = await db.getDocument(databaseId, patientsId, patientId)
  }

  return {
    visit,
    patient,
    locked: isCompleted((visit as any).status),
  }
}

/* =========================
   SAVE SOAP
========================= */
export async function saveSoap(formData: FormData) {
  await requireClinicRole('doctor')

  const visitId = str(formData.get('visitId'))
  if (!visitId) redirect('/consultation')

  const subjective = str(formData.get('subjective'))
  const objective = str(formData.get('objective'))
  const assessment = str(formData.get('assessment'))
  const plan = str(formData.get('plan'))

  const db = getServerDb()
  const databaseId = process.env.APPWRITE_DATABASE_ID!
  const visitsId = process.env.APPWRITE_VISITS_COLLECTION_ID!

  const current = await db.getDocument(databaseId, visitsId, visitId)
  if (isCompleted((current as any).status)) {
    redirect(`/consultation?visitId=${visitId}`)
  }

  await db.updateDocument(databaseId, visitsId, visitId, {
    subjective,
    objective,
    assessment,
    plan,
    soapUpdatedAt: new Date().toISOString(),
  })

  redirect(`/consultation?visitId=${visitId}&saved=1`)
}

/* =========================
   END CONSULTATION
========================= */
export async function endConsultation(formData: FormData) {
  await requireClinicRole('doctor')

  const visitId = str(formData.get('visitId'))
  if (!visitId) redirect('/consultation')

  const db = getServerDb()
  const databaseId = process.env.APPWRITE_DATABASE_ID!
  const visitsId = process.env.APPWRITE_VISITS_COLLECTION_ID!

  const current = await db.getDocument(databaseId, visitsId, visitId)
  if (isCompleted((current as any).status)) {
    redirect('/reception')
  }

  await db.updateDocument(databaseId, visitsId, visitId, {
    status: 'completed',
    consultEndAt: new Date().toISOString(),
  })

  redirect('/reception?ok=1')
}
