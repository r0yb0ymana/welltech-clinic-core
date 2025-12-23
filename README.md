This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Setup: Appwrite Configuration

Before running the development server, you must configure Appwrite. See `.env.local.example` for required environment variables:

```
APPWRITE_ENDPOINT
APPWRITE_PROJECT_ID
APPWRITE_API_KEY
APPWRITE_DATABASE_ID
APPWRITE_PATIENTS_COLLECTION_ID
APPWRITE_VISITS_COLLECTION_ID
APPWRITE_CLINIC_USERS_COLLECTION_ID
APPWRITE_VISIT_AUDITS_COLLECTION_ID
WT_CLINIC_ID
```

### Required Collections

1. **patients**
   - `clinicId` (string)
   - `fullName` (string)
   - `phone` (string, optional)
   - `pdpaConsent` (boolean)

2. **visits**
   - `clinicId` (string)
   - `patientId` (string, relationship to patients)
   - `status` (string: "queued", "in_consult", "completed")
   - `chiefComplaint` (string)
   - `checkInAt` (datetime)
   - `queuedAt` (datetime)
   - `consultStartAt` (datetime, optional)
   - `consultEndAt` (datetime, optional)
   - `subjective` (string, optional)
   - `objective` (string, optional)
   - `assessment` (string, optional)
   - `plan` (string, optional)
   - `intakeRequestId` (string, for de-duplication)

3. **clinic_users**
   - `clinicId` (string)
   - `userId` (string)
   - `role` (string: "reception", "doctor")

4. **visit_audits** (append-only audit trail)
   - `visitId` (string, relationship to visits)
   - `clinicId` (string)
   - `requestId` (string, correlation id for tracing a single completion attempt)
   - `eventType` (string: "visit.complete_attempt", "visit.completed", "visit.complete_failed")
   - `actorUserId` (string)
   - `occurredAt` (datetime)
   - `fromStatus` (string)
   - `toStatus` (string)
   - `error` (string, optional, populated only on failed events; truncated to 500 chars)

### Recommended Indexes

For optimal query performance:
- **visits**: Index on `(clinicId, status)` for queue queries
- **visits**: Index on `(clinicId, intakeRequestId)` for de-duplication
- **visit_audits**: Index on `(visitId, occurredAt)` for audit trail retrieval
- **visit_audits**: Index on `(requestId)` for tracing a single completion attempt

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
