// REMOVE IN PHASE 1:
// Phase 0 stub. Replace with real session verification.
import { redirect } from "next/navigation"

export type SignedIn = { userId: string; email: string }

export async function requireSignedIn(): Promise<SignedIn> {
  // DEV-ONLY AUTH BYPASS
  const bypass = process.env.WT_AUTH_BYPASS === "1"
  const nodeEnv = process.env.NODE_ENV
  if (bypass) {
    if (nodeEnv === "production") {
      throw new Error("WT_AUTH_BYPASS must never be enabled in production!")
    }
    return {
      userId: process.env.WT_AUTH_BYPASS_USER_ID || process.env.WT_DEV_USER_ID || "dev-doctor-1",
      email: process.env.WT_AUTH_BYPASS_EMAIL || process.env.WT_DEV_EMAIL || "dev@local",
    }
  }
  // Phase 0: no login support
  redirect("/login")
}
