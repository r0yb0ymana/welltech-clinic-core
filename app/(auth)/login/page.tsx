import { redirect } from "next/navigation"

  // REMOVE IN PHASE 1:
  // Phase 0 bypass. Real login will replace this route.
  if (process.env.WT_AUTH_BYPASS === "1") {
    redirect("/reception")
  }
  // No login in Phase 0
  return null
}
