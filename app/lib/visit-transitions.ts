import { databasesForServer } from "./appwrite-server"

function getEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} in .env.local`)
  return v
}

function truncateError(err: unknown, maxLength: number = 500): string {
  const msg = String((err as unknown as { message?: unknown })?.message || err)
  return msg.length > maxLength ? msg.slice(0, maxLength) : msg
}

export type Actor = { id: string; role: string }

/**
 * Validates and completes a visit with append-only audit recording.
 * 
 * Clinic isolation: extracts clinicId from the visit document and validates
 * that it matches the expected clinic scope. All audit records use visit.clinicId.
 * 
 * Audit-first pattern:
 * 1. Write "visit.complete_attempt" audit event before any state mutation.
 * 2. Perform the visit status change.
 * 3. Write "visit.completed" audit event on success.
 * 4. On failure, write "visit.complete_failed" audit event with error details.
 * 
 * If the final "visit.completed" audit fails after successful status change,
 * the function logs the error but returns success (visit is already completed).
 * 
 * All audit records include requestId for correlation and traceability.
 * No audit record is ever mutated — only appended.
 */
export async function validateAndCompleteVisit(visitId: string, actor: Actor, expectedClinicId: string, requestId: string) {
  if (!visitId) throw new Error("Missing visitId")
  if (!expectedClinicId) throw new Error("Missing expectedClinicId")
  if (!requestId) throw new Error("Missing requestId")

  const db = databasesForServer()
  const databaseId = getEnv("APPWRITE_DATABASE_ID")
  const visitsId = getEnv("APPWRITE_VISITS_COLLECTION_ID")
  const auditsId = getEnv("APPWRITE_VISIT_AUDITS_COLLECTION_ID")

  const current = await db.getDocument(databaseId, visitsId, visitId)
  const visitClinicId = String(((current as unknown) as { clinicId?: unknown }).clinicId ?? "")
  const fromStatus = String(((current as unknown) as { status?: unknown }).status ?? "").toLowerCase()
  const now = new Date().toISOString()

  // CLINIC ISOLATION: Validate visit belongs to the expected clinic
  if (visitClinicId !== expectedClinicId) {
    throw new Error("Visit clinic does not match actor clinic scope")
  }

  // Validate status before recording any intent
  if (fromStatus === "completed") {
    throw new Error("Visit already completed")
  }

  if (fromStatus !== "in_consult") {
    throw new Error("Visit must be in_consult to complete")
  }

  // Write "visit.complete_attempt" audit record — documents the intent to transition.
  const attemptAuditId = crypto.randomUUID()
  await db.createDocument(databaseId, auditsId, attemptAuditId, {
    visitId,
    clinicId: visitClinicId,
    requestId,
    eventType: "visit.complete_attempt",
    actorUserId: actor.id,
    occurredAt: now,
    fromStatus,
    toStatus: "completed",
  })

  // Perform the state transition
  try {
    await db.updateDocument(databaseId, visitsId, visitId, {
      status: "completed",
      consultEndAt: now,
    })
  } catch (err) {
    // Write "visit.complete_failed" audit record: the attempt failed.
    const failedAuditId = crypto.randomUUID()
    try {
      await db.createDocument(databaseId, auditsId, failedAuditId, {
        visitId,
        clinicId: visitClinicId,
        requestId,
        eventType: "visit.complete_failed",
        actorUserId: actor.id,
        occurredAt: new Date().toISOString(),
        fromStatus,
        toStatus: "completed",
        error: truncateError(err),
      })
    } catch (auditErr) {
      // If audit write also fails, log but surface the original failure.
      console.error("Failed to write visit.complete_failed audit:", auditErr)
    }
    throw err
  }

  // Write "visit.completed" audit record on success
  const completedAuditId = crypto.randomUUID()
  try {
    await db.createDocument(databaseId, auditsId, completedAuditId, {
      visitId,
      clinicId: visitClinicId,
      requestId,
      eventType: "visit.completed",
      actorUserId: actor.id,
      occurredAt: new Date().toISOString(),
      fromStatus,
      toStatus: "completed",
    })
  } catch (auditErr) {
    // The visit is already completed. Log the audit failure but do NOT throw,
    // so the user sees the visit as successfully completed.
    console.error("Visit completed but failed to write visit.completed audit:", auditErr)
  }
}


