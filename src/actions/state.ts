import { z } from 'zod'
import { isDateOnly } from '@/lib/dates'

/** What every form action hands back to `useActionState`. */
export type FormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export const empty: FormState = {}

export function invalid(error: z.ZodError): FormState {
  const { formErrors, fieldErrors } = z.flattenError(error)
  return {
    error: formErrors[0] ?? 'Please correct the highlighted fields.',
    fieldErrors: fieldErrors as Record<string, string[]>,
  }
}

export const calendarDate = z.string().refine(isDateOnly, 'Enter a valid date.')
