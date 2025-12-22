// app/(shell)/page.tsx
import { requireSignedIn } from "@/app/lib/require-signed-in"

export default async function DashboardPage() {
  // Auth gate: must be signed in
  await requireSignedIn()

  return <div>Dashboard placeholder</div>
}
