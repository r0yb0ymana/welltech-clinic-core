import { redirect } from "next/navigation"

type SP = Promise<Record<string, string | string[] | undefined>>

export default async function LoginPage({ searchParams }: { searchParams?: SP }) {
  if (process.env.WT_AUTH_BYPASS === "1") redirect("/reception")

  const sp = searchParams ? await searchParams : undefined
  const e = sp?.error
  const error = typeof e === "string" ? e : Array.isArray(e) ? e[0] : undefined

  return (
    <div style={{ maxWidth: 520, margin: "80px auto", padding: 16 }}>
      <h1>Login disabled (Phase 0)</h1>
      {error ? <p style={{ color: "salmon" }}>{decodeURIComponent(error)}</p> : null}
      <p>
        Set <code>WT_AUTH_BYPASS=1</code> to skip auth.
      </p>
    </div>
  )
}
