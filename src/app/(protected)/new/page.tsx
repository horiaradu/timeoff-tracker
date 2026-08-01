import { createTimeoff } from '@/actions/timeoffs'
import { TimeoffForm } from '@/components/TimeoffForm'
import { allowancesByYear, listTimeoffs } from '@/db/queries'
import { today } from '@/lib/dates'
import { requireUserId } from '@/lib/session'

export default async function NewTimeoffPage() {
  const userId = await requireUserId()
  const [existing, allowances] = await Promise.all([listTimeoffs(userId), allowancesByYear(userId)])

  const now = today()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New time off</h1>
      <TimeoffForm
        action={createTimeoff}
        existing={existing}
        allowances={[...allowances]}
        initial={{ startDate: now, endDate: now, requestDate: now }}
        submitLabel="Book time off"
      />
    </div>
  )
}
