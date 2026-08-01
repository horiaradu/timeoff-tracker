import Link from 'next/link'
import { DeleteTimeoffButton } from '@/components/DeleteTimeoffButton'
import { EmailRequestButton } from '@/components/EmailRequestButton'
import { allowancesByYear, findProfile, listTimeoffs } from '@/db/queries'
import type { Timeoff } from '@/db/schema'
import { formatPeriod, formatRomanian, today, year as yearOf } from '@/lib/dates'
import { requireUserId } from '@/lib/session'
import { balanceFor } from '@/lib/validation'

export default async function DashboardPage() {
  const userId = await requireUserId()
  const [timeoffs, allowances, profile] = await Promise.all([
    listTimeoffs(userId),
    allowancesByYear(userId),
    findProfile(userId),
  ])

  const year = yearOf(today())
  const balance = balanceFor(year, timeoffs, allowances, year)
  const canPrint = Boolean(profile?.signaturePng)

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Time off</h1>
          {balance.remaining === null ? (
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              No allowance set for {year}.{' '}
              <Link href="/settings" className="underline underline-offset-4">
                Add it in Settings
              </Link>{' '}
              to start booking.
            </p>
          ) : (
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              <span className="font-semibold text-black dark:text-white">{balance.remaining}</span>{' '}
              days remaining in {year} &middot; {balance.granted} granted
              {balance.carriedOver > 0 && ` + ${balance.carriedOver} carried over`} &middot;{' '}
              {balance.used} used
            </p>
          )}
        </div>
        <Link
          href="/new"
          className="bg-foreground text-background rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          New time off
        </Link>
      </section>

      {!canPrint && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Add your details and signature in{' '}
          <Link href="/settings" className="underline underline-offset-4">
            Settings
          </Link>{' '}
          before you can download a request.
        </p>
      )}

      {timeoffs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/15 px-4 py-12 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          No time off booked yet.
        </p>
      ) : (
        groupByYear(timeoffs).map(([groupYear, entries]) => {
          const groupBalance = balanceFor(groupYear, timeoffs, allowances, year)

          return (
            <section key={groupYear} className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-black/10 pb-2 dark:border-white/15">
                <h2 className="text-lg font-semibold tracking-tight">{groupYear}</h2>
                <p className="text-sm text-black/50 dark:text-white/50">
                  {groupBalance.used} used
                  {groupBalance.granted !== null && (
                    <>
                      {' of '}
                      {groupBalance.granted + groupBalance.carriedOver}
                      {groupBalance.carriedOver > 0 &&
                        ` (${groupBalance.carriedOver} carried over)`}
                    </>
                  )}
                </p>
              </div>
              <ul className="divide-y divide-black/10 dark:divide-white/10">
                {entries.map((timeoff) => (
                  <li key={timeoff.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                    <div className="min-w-52">
                      <p className="font-medium">
                        {formatRomanian(timeoff.startDate)}
                        {timeoff.endDate !== timeoff.startDate &&
                          ` - ${formatRomanian(timeoff.endDate)}`}
                      </p>
                      <p className="mt-0.5 text-sm text-black/50 dark:text-white/50">
                        {timeoff.workingDays} working {timeoff.workingDays === 1 ? 'day' : 'days'}
                        {' · '}requested {formatRomanian(timeoff.requestDate)}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-3 text-sm">
                      {canPrint && (
                        <>
                          <a
                            href={`/api/timeoffs/${timeoff.id}/pdf`}
                            className="rounded-lg border border-black/15 px-3 py-1.5 transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                          >
                            Download PDF
                          </a>
                          <EmailRequestButton
                            id={timeoff.id}
                            period={formatPeriod(timeoff.startDate, timeoff.endDate)}
                            lastRecipient={profile?.lastRecipient ?? null}
                          />
                        </>
                      )}
                      <Link
                        href={`/timeoffs/${timeoff.id}/edit`}
                        className="rounded-lg border border-black/15 px-3 py-1.5 transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        Edit
                      </Link>
                      <DeleteTimeoffButton
                        id={timeoff.id}
                        period={`${formatRomanian(timeoff.startDate)} - ${formatRomanian(timeoff.endDate)}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}

/** Newest year first, entries inside each year keeping the order they came in. */
function groupByYear(timeoffs: Timeoff[]): [number, Timeoff[]][] {
  const groups = new Map<number, Timeoff[]>()
  for (const timeoff of timeoffs) {
    const group = groups.get(yearOf(timeoff.startDate))
    if (group) group.push(timeoff)
    else groups.set(yearOf(timeoff.startDate), [timeoff])
  }
  return [...groups].sort(([a], [b]) => b - a)
}
