/**
 * policyStateHelper.ts
 *
 * Resolves the authoritative state for an insurance policy from existing database relations:
 * 1. `temp_leads_basics.stage_metadata` (if set by CSR during pipeline actions)
 * 2. `temp_intake_forms.form_data` (Personal & Commercial multi-layout intake hierarchies)
 * 3. Graceful fallback to '—' (Unspecified)
 *
 * Zero database schema modifications required.
 */

// Mapping of full US state names to 2-letter postal abbreviations
const US_STATE_MAP: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  'NEW HAMPSHIRE': 'NH',
  'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM',
  'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC',
  'NORTH DAKOTA': 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  WASHINGTON: 'WA',
  'WEST VIRGINIA': 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY',
  'DISTRICT OF COLUMBIA': 'DC',
}

export function normalizeStateCode(rawState?: string | null): string | null {
  if (!rawState || typeof rawState !== 'string') return null
  const cleaned = rawState.trim()
  if (!cleaned) return null

  // If already 2-letter postal code
  if (cleaned.length === 2) {
    return cleaned.toUpperCase()
  }

  const upper = cleaned.toUpperCase()
  if (US_STATE_MAP[upper]) {
    return US_STATE_MAP[upper]
  }

  return cleaned.substring(0, 2).toUpperCase()
}

export function resolvePolicyState(lead: any): string {
  if (!lead) return '—'

  // 1. Check direct stage_metadata (set during CSR pipeline transitions)
  if (lead.stage_metadata) {
    const sm = lead.stage_metadata
    const stateCandidate =
      sm.state ||
      sm.policy_state ||
      sm.risk_state ||
      sm.address?.state ||
      sm.property_state ||
      sm.garaging_state ||
      sm.business_state
    const normalized = normalizeStateCode(stateCandidate)
    if (normalized) return normalized
  }

  // 2. Check linked intake form(s) from `temp_intake_forms`
  const rawForms = lead.intake_forms
  const forms: any[] = Array.isArray(rawForms)
    ? rawForms
    : rawForms
    ? [rawForms]
    : []

  if (forms.length > 0) {
    // Sort so most recently submitted or created form is evaluated first
    const sorted = [...forms].sort((a, b) => {
      const timeA = new Date(a.submitted_at || a.created_at || 0).getTime()
      const timeB = new Date(b.submitted_at || b.created_at || 0).getTime()
      return timeB - timeA
    })

    for (const f of sorted) {
      const fd = f.form_data
      if (!fd || typeof fd !== 'object') continue

      // Personal Lines Hierarchy
      const personalCandidate =
        fd.mailing_address?.state ||
        fd.home?.property_address?.state ||
        fd.home?.state ||
        fd.auto?.garaging_address?.state ||
        fd.auto?.state ||
        fd.primary_applicant?.state ||
        fd.primary_applicant?.address?.state ||
        fd.co_applicant?.state ||
        fd.co_applicant?.address?.state

      const normPersonal = normalizeStateCode(personalCandidate)
      if (normPersonal) return normPersonal

      // Commercial Lines Hierarchy
      const commercialCandidate =
        fd.business_info?.state ||
        fd.business_address?.state ||
        (Array.isArray(fd.locations) && fd.locations[0]?.state) ||
        (Array.isArray(fd.locations) && fd.locations[0]?.address?.state) ||
        fd.commercial?.state ||
        fd.state

      const normCommercial = normalizeStateCode(commercialCandidate)
      if (normCommercial) return normCommercial
    }
  }

  return '—'
}
