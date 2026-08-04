import { z } from 'zod'
import { isDateOnly } from '@/lib/dates'

/** What every form action hands back to `useActionState`. */
export type FormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  /**
   * What the user submitted, echoed back on failure. React resets a form once
   * its action settles, so uncontrolled inputs must re-seed their defaults
   * from here or a rejected submission wipes everything typed.
   */
  values?: Record<string, string>
}

export const empty: FormState = {}

export function invalid(error: z.ZodError, formData?: FormData): FormState {
  const { formErrors, fieldErrors } = z.flattenError(error)
  return {
    error: formErrors[0] ?? 'Please correct the highlighted fields.',
    fieldErrors: fieldErrors as Record<string, string[]>,
    ...(formData ? { values: submittedValues(formData) } : {}),
  }
}

function submittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {}
  for (const [name, value] of formData) {
    if (typeof value === 'string' && !name.startsWith('$ACTION_')) values[name] = value
  }
  return values
}

export const calendarDate = z.string().refine(isDateOnly, 'Enter a valid date.')
