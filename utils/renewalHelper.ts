import { normalizeImportDate } from '@/utils/fileParser'
import { formatPhoneInput } from '@/utils/phoneFormatter'

export interface RenewalValidationResult {
  isValid: boolean
  errors: string[]
}

export interface RenewalPipelineResolution {
  pipelineId: string
  stageId: string
}

/**
 * Resolves the target renewal pipeline and its initial stage (stage_order = 1)
 * based on the insurance category.
 */
export async function resolveRenewalPipelineAndStage(
  supabase: any,
  category: 'personal' | 'commercial'
): Promise<RenewalPipelineResolution> {
  const pipelineName =
    category === 'personal'
      ? 'Personal Lines Renewal'
      : 'Commercial Lines Renewal Pipeline'

  const { data: pipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .select('id')
    .eq('name', pipelineName)
    .single()

  if (pipelineError || !pipeline) {
    throw new Error(`${pipelineName} not found in system.`)
  }

  const { data: stage, error: stageError } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipeline.id)
    .order('stage_order', { ascending: true })
    .limit(1)
    .single()

  if (stageError || !stage) {
    throw new Error(`Initial pipeline stage not found for ${pipelineName}.`)
  }

  return {
    pipelineId: pipeline.id,
    stageId: stage.id,
  }
}

/**
 * Validates a single renewal record (either from Excel import row or manual entry form).
 */
export function validateRenewalRecord(
  r: any,
  category: 'personal' | 'commercial',
  isExcelImport = false
): RenewalValidationResult {
  const errors: string[] = []

  const accountName = isExcelImport
    ? r['applicant data account name']?.trim()
    : r.client_name?.trim() || r.account_name?.trim()

  const policyNumber = isExcelImport
    ? r['policy data policy number']?.trim()
    : r.policy_number?.trim()

  const expirationDateInput = isExcelImport
    ? r['policy data policy expiration date']
    : r.renewal_date

  const expirationDate = typeof expirationDateInput === 'string' ? expirationDateInput.trim() : expirationDateInput

  const premiumStr = isExcelImport
    ? r['policy data totalwrittenpremium']?.toString()?.trim()
    : r.current_premium?.toString()?.trim()

  const policyType = isExcelImport
    ? r['policy data policy type']?.trim()
    : r.policy_type?.trim()

  if (!accountName) {
    errors.push('Missing Account Name')
  }
  if (!policyNumber) {
    errors.push('Missing Policy Number')
  }

  const formattedDate = normalizeImportDate(expirationDate)
  if (!expirationDate || !formattedDate) {
    errors.push('Invalid Renewal Date')
  }

  const premiumNum = Number(premiumStr)
  if (!premiumStr || isNaN(premiumNum)) {
    errors.push('Invalid Premium')
  }

  if (isExcelImport && policyType) {
    const validTypes =
      category === 'personal'
        ? ['personal', 'personal lines']
        : ['commercial', 'commercial lines']
    if (!validTypes.includes(policyType.toLowerCase())) {
      errors.push('Invalid Policy Type')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Builds the database payload object for temp_leads_basics from either
 * an Excel import row or a manual renewal form input.
 */
export function buildRenewalPayload(
  r: any,
  category: 'personal' | 'commercial',
  pipelineId: string,
  stageId: string,
  userId: string | null,
  isExcelImport = false
) {
  const accountName = isExcelImport
    ? r['applicant data account name']?.trim()
    : r.client_name?.trim() || r.account_name?.trim()

  const lineOfBusiness = isExcelImport
    ? r['policy data line of business']?.trim()
    : r.policy_type?.trim() || null

  const expirationDate = isExcelImport
    ? r['policy data policy expiration date']
    : r.renewal_date

  const carrier = isExcelImport
    ? r['policy data master company']?.trim()
    : r.carrier?.trim() || null

  const policyNumber = isExcelImport
    ? r['policy data policy number']?.trim()
    : r.policy_number?.trim()

  const premiumStr = isExcelImport
    ? r['policy data totalwrittenpremium']
    : r.current_premium

  const referral = isExcelImport
    ? r['applicant data lead source']?.trim() || null
    : r.referral?.trim() || null

  const notes = isExcelImport ? null : r.notes?.trim() || null
  const phone = isExcelImport ? null : (r.phone ? formatPhoneInput(r.phone.trim()) : null)
  const email = isExcelImport ? null : r.email?.trim() || null

  let businessName: string | null = null
  if (category === 'commercial') {
    if (isExcelImport) {
      businessName = accountName
    } else {
      businessName = r.business_name?.trim() || accountName
    }
  } else {
    businessName = null
  }

  return {
    client_name: accountName,
    business_name: businessName,
    phone,
    email,
    policy_type: lineOfBusiness,
    renewal_date: normalizeImportDate(expirationDate),
    carrier,
    policy_number: policyNumber,
    current_premium: Number(premiumStr),
    renewal_premium: null,
    referral,
    referral_id: r.referral_id || null,
    notes,
    policy_flow: 'renewal',
    insurence_category: category,
    pipeline_id: pipelineId,
    current_stage_id: stageId,
    assigned_csr: userId,
  }
}

/**
 * Saves one or more renewal records into temp_leads_basics using
 * the standard onConflict: 'policy_number,renewal_date' upsert strategy.
 */
export async function saveRenewalRecords(supabase: any, payload: any[]) {
  return await supabase.from('temp_leads_basics').upsert(payload, {
    onConflict: 'policy_number,renewal_date',
  })
}
