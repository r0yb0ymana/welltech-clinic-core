import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Client, Account, Databases } from "node-appwrite"

/**
 * Internal helper: build Appwrite client from session secret
 */
function appwriteFromSession(secret: string) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJECT_ID!)
    .setSession(secret)

  return {
    account: new Account(client),
    databases: new Databases(client),
  }
}

/**
 * Require a valid signed-in session
 */
export async function requireSignedIn() {
  const cookieStore = await cookies()
  const secret = cookieStore.get("wt_session")?.value

  if (!secret) {
    redirect("/login?error=Please%20sign%20in")
  }

  return secret
}

/**
 * Require user to belong to a clinic with a given role
 */
export async function requireClinicRole(requiredRole: "reception" | "doctor") {
  const secret = await requireSignedIn()
  const { account, databases } = appwriteFromSession(secret)

  // Get current Appwrite user
  const user = await account.get()

  // Query clinic_users collection
  const result = await databases.listDocuments(
    process.env.APPWRITE_DATABASE_ID!,
    process.env.APPWRITE_CLINIC_USERS_COLLECTION_ID!,
    [
      `equal("userId","${user.$id}")`,
      `equal("clinicId","${process.env.WT_CLINIC_ID}")`,
    ]
  )

  if (result.total === 0) {
    redirect("/login?error=No%20clinic%20access")
  }

  const membership = result.documents[0]
  const role = membership.role as string

  if (role !== requiredRole) {
    redirect("/login?error=Insufficient%20permissions")
  }

  return {
    user,
    clinicRole: role,
  }
}
