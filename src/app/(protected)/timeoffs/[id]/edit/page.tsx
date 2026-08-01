import { notFound } from 'next/navigation'
import { updateTimeoff } from '@/actions/timeoffs'
import { TimeoffForm } from '@/components/TimeoffForm'
import { allowancesByYear, findTimeoff, listTimeoffs } from '@/db/queries'
import { requireUserId } from '@/lib/session'

export default async function EditTimeoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await requireUserId()

  const [timeoff, existing, allowances] = await Promise.all([
    findTimeoff(userId, id),
    listTimeoffs(userId),
    allowancesByYear(userId),
  ])

  if (!timeoff) notFound()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit time off</h1>
      <TimeoffForm
        action={updateTimeoff}
        existing={existing}
        allowances={[...allowances]}
        initial={{
          id: timeoff.id,
          startDate: timeoff.startDate,
          endDate: timeoff.endDate,
          requestDate: timeoff.requestDate,
        }}
        submitLabel="Save changes"
      />
    </div>
  )
}
