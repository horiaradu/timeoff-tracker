import { currentUserId } from '@/auth'
import { findProfile, findTimeoff } from '@/db/queries'
import { renderLeaveRequest } from '@/pdf/LeaveRequest'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId()
  if (!userId) return new Response('Sign in first.', { status: 401 })

  const { id } = await params
  const [timeoff, profile] = await Promise.all([findTimeoff(userId, id), findProfile(userId)])

  if (!timeoff) return new Response('No such time off.', { status: 404 })

  if (!profile?.signaturePng) {
    return new Response('Add your details and signature in Settings first.', { status: 409 })
  }

  const pdf = await renderLeaveRequest({
    profile: {
      fullName: profile.fullName,
      ciSeries: profile.ciSeries,
      ciNumber: profile.ciNumber,
      cnp: profile.cnp,
      city: profile.city,
      jobTitle: profile.jobTitle,
      signaturePng: profile.signaturePng,
    },
    timeoff: {
      startDate: timeoff.startDate,
      endDate: timeoff.endDate,
      requestDate: timeoff.requestDate,
    },
  })

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cerere-concediu-${timeoff.startDate}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
