import { APPLICANT_TYPES, FIRST_NAMES, LAST_NAMES } from '../../../content/company.ts'

/** Name of a staff member or applicant: a character's fixed name or one from the name pools. */
export function personName(p: { archetype: string; first: number; last: number }): string {
  const type = APPLICANT_TYPES.find((t) => t.key === p.archetype)
  return type?.name ?? `${FIRST_NAMES[p.first] ?? '?'} ${LAST_NAMES[p.last] ?? ''}`.trim()
}

export const personCv = (archetype: string) => APPLICANT_TYPES.find((t) => t.key === archetype)?.cv ?? ''
