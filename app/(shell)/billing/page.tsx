// app/(shell)/billing/page.tsx
import { requireSignedIn } from "@/app/lib/require-signed-in"

export default async function BillingPage() {
  // Auth gate: must be signed in
  await requireSignedIn()

  return <div>Billing placeholder</div>
}