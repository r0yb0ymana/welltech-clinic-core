'use client'

export default function ReceptionForm({
  action,
  requestId,
}: {
  action: (formData: FormData) => Promise<void>
  requestId: string
}) {
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-900">
          Full name
        </label>
        <input
          name="fullName"
          placeholder="e.g. John Tan"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-900">
          Phone (for de-dupe)
        </label>
        <input
          name="phone"
          placeholder="e.g. 04xxxxxxxx"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-900">
          Chief complaint
        </label>
        <textarea
          name="chiefComplaint"
          placeholder="e.g. Fever, sore throat, cough"
          rows={4}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-500"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Register
      </button>
    </form>
  )
}
