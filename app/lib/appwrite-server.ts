// app/lib/appwrite-server.ts
import "server-only"
import { Client, Account, Databases } from "node-appwrite"

function must(name: string, v: string | undefined) {
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export function baseClient() {
  const endpoint = must("APPWRITE_ENDPOINT", process.env.APPWRITE_ENDPOINT)
  const project = must("APPWRITE_PROJECT_ID", process.env.APPWRITE_PROJECT_ID)

  return new Client().setEndpoint(endpoint).setProject(project)
}

// Login flow: no API key required
export function accountForServer() {
  return new Account(baseClient())
}

// Admin DB access: API key required
export function databasesForServer() {
  const key = must("APPWRITE_API_KEY", process.env.APPWRITE_API_KEY)
  const client = baseClient().setKey(key)
  return new Databases(client)
}

// Act-as-user using session secret stored in cookie
export function accountForSession(secret: string) {
  const client = baseClient().setSession(secret)
  return new Account(client)
}

export function databasesForSession(secret: string) {
  const client = baseClient().setSession(secret)
  return new Databases(client)
}
