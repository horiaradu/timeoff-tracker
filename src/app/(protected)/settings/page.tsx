import { AllowanceForm } from '@/components/AllowanceForm'
import { ProfileForm } from '@/components/ProfileForm'
import { findProfile, listAllowances, listTimeoffs } from '@/db/queries'
import { today, year as yearOf } from '@/lib/dates'
import { requireUserId } from '@/lib/session'
import { balanceFor } from '@/lib/validation'

export default async function SettingsPage() {
  const userId = await requireUserId()
  const [profile, allowances, timeoffs] = await Promise.all([
    findProfile(userId),
    listAllowances(userId),
    listTimeoffs(userId),
  ])

  const currentYear = yearOf(today())
  const granted = new Map(allowances.map((row) => [row.year, row.days]))
  const highest = allowances.reduce((max, row) => Math.max(max, row.year), currentYear - 1)

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted mt-1 text-sm">
            These details are printed on every leave request you download.
          </p>
        </div>
        <ProfileForm profile={profile} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Vacation days</h2>
          <p className="text-muted mt-1 text-sm">How many days you are entitled to each year.</p>
        </div>

        <div className="space-y-4">
          {allowances.map((allowance) => {
            const balance = balanceFor(allowance.year, timeoffs, granted, currentYear)
            return (
              <div key={allowance.id} className="flex flex-wrap items-end gap-4">
                <AllowanceForm year={allowance.year} days={allowance.days} />
                <span className="text-muted pb-2 text-sm">
                  {balance.carriedOver > 0 && `+${balance.carriedOver} carried over · `}
                  {balance.used} used · {balance.remaining} left
                </span>
              </div>
            )
          })}

          <div className="border-line border-t pt-4">
            <AllowanceForm year={Math.max(highest + 1, currentYear)} editableYear />
          </div>
        </div>
      </section>
    </div>
  )
}
