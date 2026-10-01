'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from '@/lib/toast'
import { Spinner } from '@/components/ui/Loading'
import { getFutureWorkingDate } from '@/utils/dateHelper'
import { Modal } from '@/components/ui/Modal'
import { InsuranceCompanySelect } from '@/components/ui/InsuranceCompanySelect'

type Props = {
  leadId: string
  // IMPORTANT: We need pipelineId to know which fields to show
  pipelineId: string
  currentStageId?: string
  onClose: () => void
  onSuccess: (newStageId?: string, newStageName?: string) => void
}

import {
  FieldConfig,
  PERSONAL_NEW_BUSINESS_FIELDS,
  PERSONAL_RENEWAL_FIELDS,
  COMMERCIAL_LINES_FIELDS,
  COMMERCIAL_RENEWAL_FIELDS
} from '@/utils/stageFieldsConfig'
import { getActivePolicy } from '@/utils/activePolicyHelper'

export default function UpdateStageModal({
  leadId,
  pipelineId,
  currentStageId,
  onClose,
  onSuccess,
}: Props) {
  const [stages, setStages] = useState<any[]>([])
  const [selectedStageId, setSelectedStageId] = useState(currentStageId || '')
  const [mandatoryFields, setMandatoryFields] =
    useState<Record<string, FieldConfig>>({})
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Identify if we are in Commercial Lines based on pipeline name/category?
  // We can just query pipeline details or check if the stage name matches a key in Commercial Fields.
  // Ideally, we load the pipeline info.
  const [pipelineType, setPipelineType] = useState<'PersonalNewBusiness' | 'PersonalRenewal' | 'Commercial' | 'CommercialRenewal' | 'Unknown'>('Unknown')
  const [leadCategory, setLeadCategory] = useState<'personal' | 'commercial' | ''>('')
  const [leadRecord, setLeadRecord] = useState<any>(null)

  const getEffectivePremium = (data: Record<string, any>) => {
    if (data.bound_premium !== undefined && data.bound_premium !== null && data.bound_premium !== '') return Number(data.bound_premium) || 0
    if (data.new_premium !== undefined && data.new_premium !== null && data.new_premium !== '') return Number(data.new_premium) || 0
    if (data.renewal_premium !== undefined && data.renewal_premium !== null && data.renewal_premium !== '') return Number(data.renewal_premium) || 0
    if (leadRecord) return getActivePolicy(leadRecord).activePremium || 0
    return 0
  }

  /* ================= LOAD STAGES ================= */
  useEffect(() => {
    if (!pipelineId) {
      toast('Pipeline ID missing. Please refresh the page.', 'error')
      return
    }
    loadStages()
  }, [pipelineId])

  async function loadStages() {
    setLoading(true)

    // Parallel fetch: Pipeline Details + Stages + Lead Category & Premiums
    const [pipelineRes, stagesRes, leadRes] = await Promise.all([
      supabase.from('pipelines').select('name, category').eq('id', pipelineId).single(),
      supabase.from('pipeline_stages').select('*').eq('pipeline_id', pipelineId).order('stage_order'),
      supabase.from('temp_leads_basics').select('insurence_category, renewal_premium, total_premium, current_premium, new_premium, carrier, insurance_company_id').eq('id', leadId).single()
    ])

    if (leadRes.data) {
      setLeadRecord(leadRes.data)
    }

    if (pipelineRes.error) {
      console.error('Pipeline fetch error', pipelineRes.error)
    } else {
      const name = pipelineRes.data?.name || ''
      const category = pipelineRes.data?.category || ''

      if (name.includes('Commercial') && name.includes('Renewal')) {
        setPipelineType('CommercialRenewal')
      } else if (name.includes('Commercial') || category.includes('Commercial')) {
        setPipelineType('Commercial')
      } else if (name.includes('Renewal')) {
        setPipelineType('PersonalRenewal')
      } else {
        setPipelineType('PersonalNewBusiness')
      }
    }

    const cat = leadRes.data?.insurence_category || pipelineRes.data?.category || ''
    setLeadCategory(cat.toLowerCase().includes('commercial') ? 'commercial' : 'personal')

    if (stagesRes.error) {
      console.error(stagesRes.error)
      toast('Failed to load pipeline stages', 'error')
      setLoading(false)
      return
    }

    setStages(stagesRes.data || [])
    setLoading(false)

    // Automatically load fields if we have a currentStageId
    if (currentStageId && stagesRes.data) {
      const stage = stagesRes.data.find((s: any) => s.id === currentStageId)
      if (stage) {
        // This is a bit of a hack—we need the pipelineType which is set async.
        // But pipelineType is derived from pipelineRes which we just got.
        const name = pipelineRes.data?.name || ''
        const category = pipelineRes.data?.category || ''
        let pType = 'PersonalNewBusiness'
        if (name.includes('Commercial') && name.includes('Renewal')) pType = 'CommercialRenewal'
        else if (name.includes('Commercial') || category.includes('Commercial')) pType = 'Commercial'
        else if (name.includes('Renewal')) pType = 'PersonalRenewal'

        updateMandatoryFields(stage, pType)
      }
    }
  }

  function updateMandatoryFields(stage: any, pType: string) {
    // Pick correct config map
    let configMap = PERSONAL_NEW_BUSINESS_FIELDS
    if (pType === 'CommercialRenewal') {
      configMap = COMMERCIAL_RENEWAL_FIELDS
    } else if (pType === 'Commercial') {
      configMap = COMMERCIAL_LINES_FIELDS
    } else if (pType === 'PersonalRenewal') {
      configMap = PERSONAL_RENEWAL_FIELDS
    }

    // Normalize name for lookup
    const normalizedName = stage.stage_name.trim()

    // Try exact match or match from FIELDS keys
    const matchedKey = Object.keys(configMap).find(
      key => key.toLowerCase() === normalizedName.toLowerCase()
    )

    let fields: Record<string, FieldConfig> = {}

    if (matchedKey) {
      fields = configMap[matchedKey]
    } else if (Array.isArray(stage.mandatory_fields)) {
      stage.mandatory_fields.forEach((f: string) => {
        fields[f] = { label: f, type: 'text', required: true }
      })
    } else if (typeof stage.mandatory_fields === 'object' && stage.mandatory_fields !== null) {
      fields = stage.mandatory_fields
    }

    setMandatoryFields(fields)

    // Initialize state, auto-populating date fields with +2 working days
    const initialData: Record<string, any> = {}
    for (const [key, config] of Object.entries(fields)) {
      if (config.type === 'date') {
        initialData[key] = getFutureWorkingDate(2)
      }
      if (config.type === 'commission') {
        initialData.expected_commission_type = 'AMOUNT'
      }
    }
    setFormData(initialData)
  }

  // Effect for commission calculation
  useEffect(() => {
    if (formData.expected_commission_type === 'PERCENTAGE') {
      const premium = getEffectivePremium(formData)
      const percentage = Number(formData.expected_commission_percentage || 0)
      
      const calculatedAmount = Number(((premium * percentage) / 100).toFixed(2))
      
      if (formData.expected_commission !== calculatedAmount) {
        setFormData(prev => ({ ...prev, expected_commission: calculatedAmount }))
      }
    }
  }, [formData.expected_commission_type, formData.expected_commission_percentage, formData.bound_premium, formData.new_premium, formData.renewal_premium, leadRecord])

  /* ================= CLIENT VALIDATION ================= */
  function validateClientSide() {
    for (const key in mandatoryFields) {
      const cfg = mandatoryFields[key]
      const value = formData[key]

      if (cfg.type === 'insurance_company') {
        const hasCarrier = formData.carrier || formData.new_carrier || formData.insurance_company_id || value
        if (cfg.required && (!hasCarrier || String(hasCarrier).trim() === '')) {
          toast('Please select or type an Insurance Company before completing this stage.', 'warning')
          return false
        }
        continue
      }

      if (
        cfg.required &&
        (value === undefined || value === null || value === '')
      ) {
        toast(`Please fill "${cfg.label}"`, 'warning')
        return false
      }
    }

    if (formData.expected_commission_type === 'PERCENTAGE' && !getEffectivePremium(formData)) {
      toast('Please enter Bound / Renewal Premium to calculate Commission Percentage', 'warning')
      return false
    }

    return true
  }

  /* ================= FIELD RENDERER ================= */
  function renderField(fieldKey: string, config: FieldConfig) {
    const value = formData[fieldKey] ?? ''

    const inputClass = "w-full border border-gray-200 rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"

    switch (config.type) {
      case 'date': {
        // const today = new Date().toISOString().split('T')[0]
        return (
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-700"
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [fieldKey]: e.target.value })
            }
          />
        )
      }

      case 'insurance_company': {
        const resolvedCarrierValue = formData.carrier || formData.new_carrier || formData.insurance_company_id || value || ''
        return (
          <InsuranceCompanySelect
            value={resolvedCarrierValue}
            category={leadCategory}
            onChange={(id, name, commissionPercent) => {
              setFormData(prev => {
                const nextState = { ...prev, [fieldKey]: id || name }
                if (id) {
                  nextState.insurance_company_id = id
                } else {
                  nextState.insurance_company_id = null
                }

                if (prev.new_carrier !== undefined || pipelineType === 'CommercialRenewal' || pipelineType === 'PersonalRenewal') {
                  nextState.new_carrier = name
                }
                nextState.carrier = name

                // Auto-calculate commission if an existing carrier has a configured commission percentage
                if (commissionPercent !== undefined && commissionPercent !== null && !isNaN(Number(commissionPercent))) {
                  const numPercent = Number(commissionPercent)
                  nextState.expected_commission_percentage = numPercent
                  const premium = getEffectivePremium(nextState)
                  if (premium > 0) {
                    nextState.expected_commission = Number(((premium * numPercent) / 100).toFixed(2))
                  }
                }

                return nextState
              })
            }}
          />
        )
      }

      case 'commission': {
        const cType = formData.expected_commission_type || 'AMOUNT'
        const premium = getEffectivePremium(formData)
        return (
          <div className="space-y-3">
            <div className="flex gap-4 items-center">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Type:</label>
              <select
                className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white text-gray-700 w-40"
                value={cType}
                onChange={(e) => setFormData({ ...formData, expected_commission_type: e.target.value })}
              >
                <option value="AMOUNT">Dollar ($)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
            </div>

            {cType === 'AMOUNT' ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-700"
                  value={formData.expected_commission ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_commission: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg p-2.5 pr-7 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-700"
                      value={formData.expected_commission_percentage ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          expected_commission_percentage: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      placeholder="e.g. 10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                  </div>
                  <div className="flex items-center text-gray-400 font-bold">→</div>
                  <div className="relative flex-1 opacity-70">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      disabled
                      className="w-full border border-gray-200 bg-gray-50 rounded-lg p-2.5 pl-7 text-gray-700 cursor-not-allowed font-medium"
                      value={formData.expected_commission ?? 0}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" title="Auto-calculated">🔒</span>
                  </div>
                </div>
                {!premium && (
                  <p className="text-xs text-red-500 font-medium animate-pulse">Please enter Bound / Renewal Premium first to calculate percentage.</p>
                )}
              </div>
            )}
          </div>
        )
      }

      case 'number': {
        const isMoney = fieldKey.toLowerCase().includes('premium') || fieldKey.toLowerCase().includes('fee') || fieldKey.toLowerCase().includes('amount') || fieldKey.toLowerCase().includes('commission') || fieldKey.toLowerCase().includes('savings');
        return (
          <div className="relative">
            {isMoney && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>}
            <input
              type="number"
              className={`w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-700 ${isMoney ? 'pl-7' : ''}`}
              value={value}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : Number(e.target.value);
                setFormData(prev => {
                  const next = {
                    ...prev,
                    [fieldKey]: val,
                  };

                  // When premium changes, auto-calculate commission if a master percentage exists
                  const isPremiumField = fieldKey === 'bound_premium' || fieldKey === 'new_premium' || fieldKey === 'renewal_premium';
                  if (isPremiumField && next.expected_commission_percentage !== undefined && next.expected_commission_percentage !== null && next.expected_commission_percentage !== '') {
                    const numPct = Number(next.expected_commission_percentage);
                    const premium = getEffectivePremium(next);
                    if (premium > 0 && numPct > 0) {
                      next.expected_commission = Number(((premium * numPct) / 100).toFixed(2));
                    } else if (premium === 0) {
                      next.expected_commission = 0;
                    }
                  }

                  return next;
                });
              }}
            />
          </div>
        )
      }

      case 'textarea':
        return (
          <textarea
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-700 resize-y"
            rows={4}
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [fieldKey]: e.target.value })
            }
          />
        )

      case 'dropdown':
        return (
          <div className="relative">
            <select
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-700 appearance-none bg-white cursor-pointer"
              value={value}
              onChange={(e) =>
                setFormData({ ...formData, [fieldKey]: e.target.value })
              }
            >
              <option value="">Select</option>
              {config.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )

      default:
        return (
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-gray-700"
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [fieldKey]: e.target.value })
            }
          />
        )
    }
  }

  /* ================= SAVE ================= */
  async function handleSave() {
    if (!selectedStageId) {
      toast('Please select a stage first', 'warning')
      return
    }

    if (!validateClientSide()) return

    setSaving(true)

    // 🔍 DEBUG — VERY IMPORTANT
    console.log('SENDING TO API:', {
      leadId,
      stageId: selectedStageId,
      stageMetadata: formData,
    })

    // Convert "Yes"/"No" strings to actual booleans so backend business rules pass.
    // We only sanitize fields that are actually present in the formData.
    const sanitizedMetadata = { ...formData }
    Object.keys(sanitizedMetadata).forEach(key => {
      if (sanitizedMetadata[key] === 'Yes') sanitizedMetadata[key] = true
      if (sanitizedMetadata[key] === 'No') sanitizedMetadata[key] = false
    })

    const res = await fetch('/api/update-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        stageId: selectedStageId,
        stageMetadata: sanitizedMetadata,
      }),
    })

    const result = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast(result.error || 'Status update failed', 'error')
      console.error(result)
      return
    }

    // Success
    toast('Pipeline stage updated successfully!', 'success')
    const selectedStage = stages.find((s: any) => s.id === selectedStageId)
    onSuccess(selectedStageId, selectedStage?.stage_name)
    onClose()
  }

  // Check if any Yes/No field is selected as 'No'
  const isBlockedByNo = Object.entries(mandatoryFields).some(([key, config]) => {
    return (
      config.type === 'dropdown' &&
      config.options?.includes('Yes') &&
      config.options?.includes('No') &&
      formData[key] === 'No'
    )
  })

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Update Status"
      maxWidth="max-w-lg"
    >

        {loading ? (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-3">
            <Spinner size={32} />
            <p className="font-medium">Loading pipeline stages...</p>
          </div>
        ) : (
          <div>
            <label className="block text-emerald-700 font-bold mb-2 text-sm uppercase tracking-wide">Select New Status</label>
            <div className="relative">
              <select
                className="w-full border-2 border-emerald-500 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 text-gray-900 font-bold appearance-none bg-white cursor-pointer transition-all shadow-sm"
                value={selectedStageId}
                onChange={(e) => {
                  const stageId = e.target.value
                  setSelectedStageId(stageId)

                  const stage = stages.find((s) => s.id === stageId)

                  if (!stage) {
                    setMandatoryFields({})
                    setFormData({})
                    return
                  }

                  updateMandatoryFields(stage, pipelineType)
                }}
              >
                <option value="">Select new status</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.stage_name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                <svg width="14" height="10" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* ================= DYNAMIC FIELDS ================= */}
        <div className="space-y-5">
          {Object.entries(mandatoryFields).map(([key, config]) => {
            const isNo = config.type === 'dropdown' &&
              config.options?.includes('Yes') &&
              config.options?.includes('No') &&
              formData[key] === 'No';

            // Field-specific error messages for every Yes/No field across all pipeline types
            const FIELD_ERROR_MESSAGES: Record<string, string> = {
              // Personal New Business — Quoting in Progress
              docs_saved:                    "Please save all client documents in FileCenter before moving to the next stage.",
              info_received:                 "Please collect all required information and documents from the client before proceeding.",
              // Personal New Business / All pipelines — Quote Has Been Emailed
              finalized_quote:               "Please finalize the quote before moving to the next stage.",
              quote_finalized:               "Please finalize the quote before moving to the next stage.",
              // Personal New Business / All pipelines — Completed
              policy_docs_sent:              "Please send the policy documents to the client before proceeding.",
              docs_sent_to_client:           "Please send the policy documents to the client before proceeding.",
              // Personal New Business / Commercial — Completed
              docs_saved_ezlynx:             "Please save the policy documents in EZLynx & File Center before proceeding.",
              policy_docs_saved:             "Please save the policy documents in EZLynx & File Center before proceeding.",
              // Personal Renewal / Commercial Renewal — Quoting in Progress
              ezlynx_updated:                "Please update the client's profile in EZLynx before moving to the next stage.",
              business_profile_updated_ezlynx: "Please update the business profile in EZLynx before moving to the next stage.",
              // Personal Renewal / Commercial Renewal — Same Declaration Emailed
              quoted_multiple_carriers:      "Please quote in multiple carriers before moving to the next stage.",
              autopay_setup:                 "Please ensure the current policy is set up on autopay before proceeding.",
              autopay_enabled:               "Please ensure the current policy is set up on autopay before proceeding.",
              // Personal Renewal / Commercial Renewal — Completed (Same)
              paid_for_renewal:              "Please ensure the policy is paid for the renewal term before proceeding.",
              policy_paid:                   "Please ensure the policy is paid for the renewal term before proceeding.",
              // Personal Renewal / Commercial Renewal — Completed (Switch)
              cancelled_prev_carrier:        "Please cancel the renewal term with the previous carrier before proceeding.",
              cancelled_previous_carrier:    "Please cancel the renewal term with the previous carrier before proceeding.",
              // Commercial — Quoting in Progress
              documents_saved_filecenter:    "Please save all documents in FileCenter before moving to the next stage.",
              required_documents_received:   "Please collect all required information and documents from the client before proceeding.",
            }
            const errorText = FIELD_ERROR_MESSAGES[key] ?? `Please complete "${config.label}" before moving to the next stage.`

            return (
              <div key={key} className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-gray-700 font-semibold mb-2 text-sm">
                  {config.label}
                  {config.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className={isNo ? 'ring-2 ring-red-500 rounded-xl transition-all' : ''}>
                  {renderField(key, config)}
                </div>
                {isNo && (
                  <div className="mt-2 flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 animate-pulse">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-xs font-bold leading-tight">
                      {errorText}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isBlockedByNo}
            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold shadow-lg transition-all transform flex items-center justify-center gap-2 h-[46px]
              ${saving || isBlockedByNo
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white md:hover:-translate-y-0.5 shadow-emerald-200 hover:shadow-emerald-300 active:scale-95'
              }
            `}
          >
            {saving ? (
              <>
                <Spinner size={16} />
                Saving...
              </>
            ) : (
              'Save Status'
            )}
          </button>
        </div>
    </Modal>
  )
}