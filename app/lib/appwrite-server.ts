import { Client, Account, Databases } from "node-appwrite"

function baseClient() {
  const endpoint = process.env.APPWRITE_ENDPOINT
  const project = process.env.APPWRITE_PROJECT_ID

  if (!endpoint || !project) {
    throw new Error("Missing APPWRITE_ENDPOINT or APPWRITE_PROJECT_ID in env")
  }

  return new Client().setEndpoint(endpoint).setProject(project)
}

// For login (creates session + JWT in same request)
export function accountForServer() {
  return new Account(baseClient())
}

// For admin/server DB reads (API key required)
export function databasesForServer() {
  const key = process.env.APPWRITE_API_KEY
  if (!key) throw new Error("Missing APPWRITE_API_KEY in env")

  const client = baseClient().setKey(key)
  return new Databases(client)
}
