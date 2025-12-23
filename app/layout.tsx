// app/layout.tsx
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "WellTech Clinic Core",
  description: "Phase 0",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ background: "black", color: "white" }}>{children}</body>
    </html>
  )
}
