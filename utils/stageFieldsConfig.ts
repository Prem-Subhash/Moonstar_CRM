export type FieldConfig = {
  label: string
  type: string
  required?: boolean
  options?: string[]
}

// ==========================================
// PERSONAL LINES (NEW BUSINESS) FIELDS
// ==========================================
export const PERSONAL_NEW_BUSINESS_FIELDS: Record<string, Record<string, FieldConfig>> = {
  'Quoting in Progress': {
    target_completion_date: { label: 'Target Date', type: 'date', required: true },
    info_received: { label: 'Docs Received?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    docs_saved: { label: 'Docs Saved?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Quote Has Been Emailed': {
    follow_up_date: { label: 'Follow-up Date', type: 'date', required: true },
    finalized_quote: { label: 'Quote Finalized?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    carrier_quote_sent: { label: 'Quoted Carrier', type: 'text', required: true },
    quoted_premium: { label: 'Quoted Premium', type: 'number', required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Consent Letter Sent': {
    follow_up_date: { label: 'Follow-up Date', type: 'date', required: true },
    payment_method: { label: 'Payment Method', type: 'dropdown', options: ['CC', 'ACH', 'ESCROW'], required: true },
    payment_frequency: { label: 'Payment Frequency', type: 'dropdown', options: ['Full', '2-Pay', '4-Pay', 'Monthly'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Completed': {
    insurance_company_id: { label: 'Insurance Company', type: 'insurance_company', required: true },
    policy_number: { label: 'Policy Number', type: 'text', required: true },
    bound_premium: { label: 'Bound Premium', type: 'number', required: true },
    expected_commission: { label: 'Commission', type: 'commission', required: true },
    docs_saved: { label: 'Docs Saved?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    policy_docs_sent: { label: 'Docs Sent?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Did Not Bind': {
    reason_not_bound: { label: 'Reason Not Bound', type: 'text', required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  }
}

// ==========================================
// PERSONAL LINES RENEWAL FIELDS
// ==========================================
export const PERSONAL_RENEWAL_FIELDS: Record<string, Record<string, FieldConfig>> = {
  'Quoting in Progress': {
    ezlynx_updated: { label: 'EZLynx Updated?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Same Declaration Emailed': {
    quoted_multiple_carriers: { label: 'Quoted Multiple Carriers?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    autopay_setup: { label: 'Autopay Setup?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Completed (Same)': {
    insurance_company_id: { label: 'Insurance Company', type: 'insurance_company', required: true },
    expected_commission: { label: 'Commission', type: 'commission', required: true },
    paid_for_renewal: { label: 'Policy Paid?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Quote Has Been Emailed': {
    follow_up_date: { label: 'Follow-up Date', type: 'date', required: true },
    quote_finalized: { label: 'Quote Finalized?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    carrier_quote_sent: { label: 'Quoted Carrier', type: 'text', required: true },
    quoted_premium: { label: 'Quoted Premium', type: 'number', required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Consent Letter Sent': {
    follow_up_date: { label: 'Follow-up Date', type: 'date', required: true },
    payment_method: { label: 'Payment Method', type: 'dropdown', options: ['CC', 'ACH', 'ESCROW'], required: true },
    payment_frequency: { label: 'Payment Frequency', type: 'dropdown', options: ['Full', '2-Pay', '4-Pay', 'Monthly'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Completed (Switch)': {
    insurance_company_id: { label: 'New Insurance Company', type: 'insurance_company', required: true },
    new_policy_number: { label: 'New Policy Number', type: 'text', required: true },
    new_premium: { label: 'New Bound Premium', type: 'number', required: true },
    expected_commission: { label: 'Commission', type: 'commission', required: true },
    docs_saved_ezlynx: { label: 'Docs Saved?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    docs_sent_to_client: { label: 'Docs Sent?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    cancelled_prev_carrier: { label: 'Prior Term Cancelled?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Cancelled': {
    cancellation_reason: { label: 'Cancellation Reason', type: 'text', required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  }
}

// ==========================================
// COMMERCIAL LINES FIELDS
// ==========================================
export const COMMERCIAL_LINES_FIELDS: Record<string, Record<string, FieldConfig>> = {
  'Quoting in Progress': {
    target_completion_date: { label: 'Target Date', type: 'date', required: true },
    required_documents_received: { label: 'Docs Received?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    documents_saved_filecenter: { label: 'Docs Saved?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Quote Has Been Emailed': {
    follow_up_date: { label: 'Follow-up Date', type: 'date', required: true },
    finalized_quote: { label: 'Quote Finalized?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    carrier_name: { label: 'Quoted Carrier', type: 'text', required: true },
    quoted_premium: { label: 'Quoted Premium', type: 'number', required: true },
    agency_fees: { label: 'Agency Fee', type: 'number', required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Consent Letter Sent': {
    follow_up_date: { label: 'Follow-up Date', type: 'date', required: true },
    payment_method: { label: 'Payment Method', type: 'dropdown', options: ['CC', 'ACH', 'ESCROW'], required: true },
    payment_frequency: { label: 'Payment Frequency', type: 'dropdown', options: ['Full', '2-Pay', '4-Pay', 'Monthly'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Completed': {
    insurance_company_id: { label: 'Insurance Company', type: 'insurance_company', required: true },
    policy_number: { label: 'Policy Number', type: 'text', required: true },
    bound_premium: { label: 'Bound Premium', type: 'number', required: true },
    expected_commission: { label: 'Commission', type: 'commission', required: true },
    agency_fees: { label: 'Agency Fee', type: 'number', required: true },
    policy_docs_saved: { label: 'Docs Saved?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    docs_sent_to_client: { label: 'Docs Sent?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Did Not Bind': {
    reason_not_bound: { label: 'Reason Not Bound', type: 'text', required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  }
}

// ==========================================
// COMMERCIAL RENEWAL FIELDS
// ==========================================
export const COMMERCIAL_RENEWAL_FIELDS: Record<string, Record<string, FieldConfig>> = {
  'Quoting in Progress': {
    business_profile_updated_ezlynx: { label: 'EZLynx Updated?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Same Declaration Emailed': {
    quoted_multiple_carriers: { label: 'Quoted Multiple Carriers?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    autopay_enabled: { label: 'Autopay Enabled?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    agency_fee: { label: 'Agency Fee', type: 'number', required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Completed (Same)': {
    insurance_company_id: { label: 'Insurance Company', type: 'insurance_company', required: true },
    policy_paid: { label: 'Policy Paid?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Quote Has Been Emailed': {
    follow_up_date: { label: 'Follow-up Date', type: 'date', required: true },
    finalized_quote: { label: 'Quote Finalized?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    carrier_name: { label: 'Quoted Carrier', type: 'text', required: true },
    quoted_premium: { label: 'Quoted Premium', type: 'number', required: true },
    agency_fee: { label: 'Agency Fee', type: 'number', required: true },
    savings_amount: { label: 'Savings', type: 'number', required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Consent Letter Sent': {
    follow_up_date: { label: 'Follow-up Date', type: 'date', required: true },
    payment_method: { label: 'Payment Method', type: 'dropdown', options: ['CC', 'ACH', 'ESCROW'], required: true },
    payment_frequency: { label: 'Payment Frequency', type: 'dropdown', options: ['Full', '2-Pay', '4-Pay', 'Monthly'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Completed (Switch)': {
    insurance_company_id: { label: 'New Insurance Company', type: 'insurance_company', required: true },
    new_policy_number: { label: 'New Policy Number', type: 'text', required: true },
    new_premium: { label: 'New Bound Premium', type: 'number', required: true },
    expected_commission: { label: 'Commission', type: 'commission', required: true },
    agency_fee: { label: 'Agency Fee', type: 'number', required: true },
    policy_docs_saved: { label: 'Docs Saved?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    docs_sent_to_client: { label: 'Docs Sent?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    cancelled_previous_carrier: { label: 'Prior Term Cancelled?', type: 'dropdown', options: ['Yes', 'No'], required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  },
  'Cancelled': {
    cancellation_reason: { label: 'Cancellation Reason', type: 'text', required: true },
    notes: { label: 'Notes/Details', type: 'textarea' }
  }
}

export type ResolvedHistoryField = {
  key: string
  label: string
  displayValue: string
}

const isUuid = (str: any) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

export function getStageConfig(
  stageName: string,
  pipelineType?: string
): Record<string, FieldConfig> | null {
  let configMap = PERSONAL_NEW_BUSINESS_FIELDS
  if (pipelineType === 'CommercialRenewal') {
    configMap = COMMERCIAL_RENEWAL_FIELDS
  } else if (pipelineType === 'Commercial') {
    configMap = COMMERCIAL_LINES_FIELDS
  } else if (pipelineType === 'PersonalRenewal') {
    configMap = PERSONAL_RENEWAL_FIELDS
  }

  const normalized = (stageName || '').trim().toLowerCase()
  const matchedKey = Object.keys(configMap).find(
    (k) => k.toLowerCase() === normalized
  )
  if (matchedKey) return configMap[matchedKey]

  // Fallback check across other maps
  for (const m of [
    PERSONAL_NEW_BUSINESS_FIELDS,
    PERSONAL_RENEWAL_FIELDS,
    COMMERCIAL_LINES_FIELDS,
    COMMERCIAL_RENEWAL_FIELDS,
  ]) {
    const k = Object.keys(m).find((k) => k.toLowerCase() === normalized)
    if (k) return m[k]
  }

  return null
}

export function resolveStageHistoryFields(
  stageName: string,
  stageMetadata: Record<string, any> | null | undefined,
  pipelineType?: string,
  insuranceCompaniesMap?: Record<string, string>
): ResolvedHistoryField[] {
  if (!stageMetadata || typeof stageMetadata !== 'object') return []

  const config = getStageConfig(stageName, pipelineType)

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || val === '') return '—'
    const num = Number(val)
    if (isNaN(num)) return String(val)
    return `$${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  if (config) {
    const results: ResolvedHistoryField[] = []
    for (const [key, fieldCfg] of Object.entries(config)) {
      const rawVal = stageMetadata[key]
      let displayValue = '—'

      if (
        fieldCfg.type === 'insurance_company' ||
        key === 'insurance_company_id' ||
        key === 'new_insurance_company_id'
      ) {
        // Business rule: Carrier and Insurance Company are the same business field.
        // Prefer human-readable carrier/company name. Never display raw UUID.
        if (stageMetadata.carrier && String(stageMetadata.carrier).trim() !== '') {
          displayValue = String(stageMetadata.carrier).trim()
        } else if (
          stageMetadata.new_carrier &&
          String(stageMetadata.new_carrier).trim() !== ''
        ) {
          displayValue = String(stageMetadata.new_carrier).trim()
        } else if (rawVal && !isUuid(rawVal)) {
          displayValue = String(rawVal).trim()
        } else if (
          rawVal &&
          isUuid(rawVal) &&
          insuranceCompaniesMap &&
          insuranceCompaniesMap[rawVal]
        ) {
          displayValue = insuranceCompaniesMap[rawVal]
        } else {
          displayValue = '—'
        }
      } else if (
        fieldCfg.type === 'commission' ||
        key === 'expected_commission'
      ) {
        const commVal =
          stageMetadata.expected_commission ??
          stageMetadata.commission ??
          rawVal
        if (commVal !== undefined && commVal !== null && commVal !== '') {
          const cType = stageMetadata.expected_commission_type
          const cPercentage = stageMetadata.expected_commission_percentage
          if (
            cType === 'PERCENTAGE' &&
            cPercentage !== undefined &&
            cPercentage !== null
          ) {
            displayValue = `${cPercentage}% (${formatCurrency(commVal)})`
          } else {
            displayValue = formatCurrency(commVal)
          }
        }
      } else if (
        fieldCfg.type === 'number' ||
        key.toLowerCase().includes('premium') ||
        key.toLowerCase().includes('fee') ||
        key.toLowerCase().includes('savings') ||
        key.toLowerCase().includes('amount')
      ) {
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          displayValue = formatCurrency(rawVal)
        }
      } else if (
        fieldCfg.type === 'dropdown' ||
        typeof rawVal === 'boolean'
      ) {
        if (rawVal === true || rawVal === 'Yes') displayValue = 'Yes'
        else if (rawVal === false || rawVal === 'No') displayValue = 'No'
        else if (rawVal !== undefined && rawVal !== null && rawVal !== '')
          displayValue = String(rawVal)
      } else {
        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
          displayValue = String(rawVal)
        }
      }

      results.push({
        key,
        label: fieldCfg.label,
        displayValue,
      })
    }
    return results
  }

  // Fallback for custom or unconfigured stages
  const internalKeysToFilter = new Set([
    'carrier',
    'new_carrier',
    'gross_commission',
    'expected_commission_type',
    'expected_commission_percentage',
    'locked_carrier_percent',
    'locked_referral_percent',
    'admin_charge',
    'net_commission',
    'referral_payout',
    'company_commission',
  ])

  const results: ResolvedHistoryField[] = []
  for (const [k, v] of Object.entries(stageMetadata)) {
    if (internalKeysToFilter.has(k)) continue

    let label = k
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    let displayValue =
      v === true
        ? 'Yes'
        : v === false
        ? 'No'
        : v !== undefined && v !== null && v !== ''
        ? String(v)
        : '—'

    if (k === 'insurance_company_id') {
      label = 'Insurance Company'
      if (stageMetadata.carrier)
        displayValue = String(stageMetadata.carrier)
      else if (stageMetadata.new_carrier)
        displayValue = String(stageMetadata.new_carrier)
      else if (
        isUuid(v) &&
        insuranceCompaniesMap &&
        insuranceCompaniesMap[v]
      )
        displayValue = insuranceCompaniesMap[v]
      else if (!isUuid(v)) displayValue = String(v)
      else displayValue = '—'
    } else if (k === 'expected_commission') {
      label = 'Commission'
      const cType = stageMetadata.expected_commission_type
      const cPercentage = stageMetadata.expected_commission_percentage
      if (
        cType === 'PERCENTAGE' &&
        cPercentage !== undefined &&
        cPercentage !== null
      ) {
        displayValue = `${cPercentage}% (${formatCurrency(v)})`
      } else {
        displayValue = formatCurrency(v)
      }
    } else if (
      k.toLowerCase().includes('premium') ||
      k.toLowerCase().includes('fee') ||
      k.toLowerCase().includes('amount') ||
      k.toLowerCase().includes('savings')
    ) {
      displayValue = formatCurrency(v)
    }

    results.push({
      key: k,
      label,
      displayValue,
    })
  }

  return results
}
