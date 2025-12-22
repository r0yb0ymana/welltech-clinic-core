// app/(shell)/pharmacy/page.tsx
import { requireSignedIn } from "@/app/lib/require-signed-in"

export default async function PharmacyPage() {
  // Auth gate: must be signed in
  await requireSignedIn()

  return <div>Pharmacy placeholder</div>
}
