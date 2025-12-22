"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { accountForServer } from "@/app/lib/appwrite-server"

function isRedirectError(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as any).digest === "string" &&
    (e as any).digest.startsWith("NEXT_REDIRECT")
  )
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim()
  const password = String(formData.get("password") || "")

  if (!email || !password) redirect("/login?error=Missing%20credentials")

  try {
    const account = accountForServer()

    const session = await account.createEmailPasswordSession(email, password)

    // IMPORTANT: session.secret can be undefined depending on SDK/version.
    // For Phase 0 gating, any non-empty value works.
    const token = (session as any).secret || (session as any).$id

    if (!token) {
      redirect("/login?error=Session%20token%20missing%20from%20Appwrite%20response")
    }

    const cookieStore = await cookies()
    cookieStore.set({
      name: "wt_session",
      value: String(token),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    })

    redirect("/reception")
  } catch (e: any) {
    if (isRedirectError(e)) throw e
    redirect(`/login?error=${encodeURIComponent(e?.message || "Login failed")}`)
  }
}
