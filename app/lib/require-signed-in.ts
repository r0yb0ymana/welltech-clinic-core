import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function requireSignedIn(): Promise<string> {
  const cookieStore = await cookies()
  const jwt = cookieStore.get("wt_session")?.value

  if (!jwt) redirect("/login?error=Please%20sign%20in")

  return jwt
}
