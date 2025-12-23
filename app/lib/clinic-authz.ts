// app/lib/clinic-authz.ts
import { redirect } from "next/navigation"
import { requireSignedIn } from "./require-signed-in"

type ClinicRole = "admin" | "doctor" | "reception"

export type Actor = {
  id: string
  role: ClinicRole
  clinicId: string
}

function getEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing ${name} in .env.local`)
  return v
}

// Role hierarchy: admin > doctor > reception
function satisfiesRole(role: ClinicRole, required: ClinicRole): boolean {
  if (role === "admin") return true
  if (role === required) return true
  if (role === "doctor" && required === "reception") return true
  return false
}

function normalizeBypassRole(): ClinicRole {
  const raw = (process.env.WT_AUTH_BYPASS_ROLE || "admin").toLowerCase().trim()
  if (raw === "admin") return "admin"
  if (raw === "doctor") return "doctor"
  if (raw === "reception") return "reception"
  return "admin"
}

  const clinicId = getEnv("WT_CLINIC_ID")
  // REMOVE IN PHASE 1:
  // Phase 0 auth bypass only. Must never ship to production.
  // Replace with real Appwrite session + clinic_users role resolution.
  const bypass = process.env.WT_AUTH_BYPASS === "1"

  if (bypass) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WT_AUTH_BYPASS must never be enabled in production!")
    }

    const signedIn = await requireSignedIn()
    const role = normalizeBypassRole()

    if (!satisfiesRole(role, requiredRole)) {
      throw new Error(
        `Insufficient permissions: WT_AUTH_BYPASS_ROLE=${role} does not satisfy required ${requiredRole}`
      )
    }

    return { id: signedIn.userId, role, clinicId }
  }

  redirect("/login")
}
