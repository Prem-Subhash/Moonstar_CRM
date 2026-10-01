'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Filter,
  Search,
  RefreshCw,
  Info,
  Building2,
  FileCheck,
  CheckSquare
} from 'lucide-react'
import { NormalizedStatementRow, StatementParseSummary } from '@/utils/carrierStatementParser'
import { PreviewMatchResult } from '@/utils/statementMatcher'

interface CarrierOption {
  id: string
  name: string
  commission_percent?: number
  is_active?: boolean
}

interface CarrierStatementUploadProps {
  carriers: CarrierOption[]
}

export default function CarrierStatementUpload({ carriers }: CarrierStatementUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [carrierOverride, setCarrierOverride] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const [summary, setSummary] = useState<StatementParseSummary | null>(null)
  const [parsedRows, setParsedRows] = useState<NormalizedStatementRow[]>([])
  
  // Phase 2 State
  const [phase2Preview, setPhase2Preview] = useState<PreviewMatchResult[]>([])
  const [isPreviewing, setIsPreviewing] = useState(false)

  // Phase 3 Apply State
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [isApplying, setIsApplying] = useState(false)
  const [applyResults, setApplyResults] = useState<Record<number, any>>({})

  // UI state for preview
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'invalid'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50

  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedExtensions = ['pdf', 'xlsx', 'xls', 'csv']

  const validateFile = (selectedFile: File): boolean => {
    setParseError(null)
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!ext || !allowedExtensions.includes(ext)) {
      setParseError(`Unsupported file format (.${ext || 'unknown'}). Please upload a PDF, XLSX, XLS, or CSV statement.`)
      return false
    }

    const MAX_BYTES = 15 * 1024 * 1024 // 15MB
    if (selectedFile.size > MAX_BYTES) {
      setParseError('File size exceeds the 15MB maximum limit.')
      return false
    }

    if (selectedFile.size === 0) {
      setParseError('The selected file is empty (0 bytes).')
      return false
    }

    return true
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0]
      if (validateFile(selected)) {
        setFile(selected)
        setSummary(null)
        setParsedRows([])
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0]
      if (validateFile(dropped)) {
        setFile(dropped)
        setSummary(null)
        setParsedRows([])
      }
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleClear = () => {
    setFile(null)
    setSummary(null)
    setParsedRows([])
    setPhase2Preview([])
    setSelectedIndices(new Set())
    setApplyResults({})
    setParseError(null)
    setSearchQuery('')
    setCurrentPage(1)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleParse = async () => {
    if (!file) return

    setIsParsing(true)
    setParseError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (carrierOverride.trim()) {
        formData.append('carrier_name', carrierOverride.trim())
      }

      const res = await fetch('/api/accounting/parse-statement', {
        method: 'POST',
        body: formData
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        setParseError(result.error || 'Failed to parse carrier statement.')
        return
      }

      setSummary(result.summary)
      const validRows = result.rows || []
      setParsedRows(validRows)
      setCurrentPage(1)

      if (validRows.length > 0) {
        setIsPreviewing(true)
        try {
          const p2res = await fetch('/api/accounting/preview-matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: validRows })
          })
          const p2result = await p2res.json()
          if (p2res.ok && p2result.success) {
            const previews = p2result.results || []
            setPhase2Preview(previews)
            
            // Auto-select exact matches
            const initialSelections = new Set<number>()
            previews.forEach((p: PreviewMatchResult, index: number) => {
              if (p.status === 'EXACT_MATCH') {
                initialSelections.add(index)
              }
            })
            setSelectedIndices(initialSelections)
            setApplyResults({})
          } else {
            console.error('Phase 2 Preview error:', p2result.error)
          }
        } catch (p2err) {
          console.error('Phase 2 network error:', p2err)
        } finally {
          setIsPreviewing(false)
        }
      }
    } catch (err: any) {
      setParseError(err.message || 'Network error while uploading statement.')
    } finally {
      setIsParsing(false)
    }
  }

  const toggleSelection = (index: number) => {
    const next = new Set(selectedIndices)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setSelectedIndices(next)
  }

  const handleApply = async () => {
    if (selectedIndices.size === 0) return

    setIsApplying(true)
    
    // Prepare payload
    const matchesPayload = Array.from(selectedIndices).map(index => {
      const p = phase2Preview[index]
      return {
        originalIndex: index,
        lead_id: p.matchedLeadId,
        statementRow: p.statementRow
      }
    })

    try {
      const res = await fetch('/api/accounting/apply-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: matchesPayload })
      })

      const data = await res.json()
      
      const newResults = { ...applyResults }
      if (data.results) {
        data.results.forEach((r: any) => {
          const originalIndex = matchesPayload[r.index].originalIndex
          newResults[originalIndex] = r
          
          // Deselect successfully applied items or items that failed validation permanently
          if (r.status === 'APPLIED' || r.status === 'ALREADY_RECONCILED' || r.status === 'HISTORICAL_POLICY_BLOCKED') {
             const nextSel = new Set(selectedIndices)
             nextSel.delete(originalIndex)
             setSelectedIndices(nextSel)
          }
        })
      }
      setApplyResults(newResults)

    } catch (err: any) {
      console.error('Apply error:', err)
      alert('Network error while applying matches.')
    } finally {
      setIsApplying(false)
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Filter & Search rows
  const filteredRows = parsedRows.filter(row => {
    if (activeTab === 'valid' && !row.is_valid) return false
    if (activeTab === 'invalid' && row.is_valid) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchesPolicy = row.policy_number?.toLowerCase().includes(q)
      const matchesCarrier = row.carrier_name?.toLowerCase().includes(q)
      const matchesError = row.validation_errors.some(err => err.toLowerCase().includes(q))
      return matchesPolicy || matchesCarrier || matchesError
    }

    return true
  })

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const applySummary = Object.values(applyResults).reduce((acc: any, r: any) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Upload Zone Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UploadCloud size={20} className="text-[#10B889]" />
              Carrier Statement Import & Matching Preview
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload PDF, Excel (.xlsx, .xls), or CSV carrier commission statements for automated matching.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Phase 3: Reconciliation Mode
            </span>
          </div>
        </div>

        {/* Carrier Association Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/70">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 shrink-0">
            <Building2 size={16} className="text-[#2E5C85]" />
            Statement Carrier:
          </div>
          <select
            value={carrierOverride}
            onChange={(e) => setCarrierOverride(e.target.value)}
            disabled={isParsing}
            className="w-full sm:w-72 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#2E5C85]"
          >
            <option value="">Auto-detect from statement header / rows</option>
            {carriers.map(c => (
              <option key={c.id} value={c.name}>
                {c.name} {c.commission_percent ? `(${c.commission_percent}%)` : ''}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-gray-400">
            Optional override if statement does not specify carrier column.
          </span>
        </div>

        {/* Drag & Drop Zone */}
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-[#10B889] bg-emerald-50/50 scale-[0.99]'
                : 'border-gray-300 hover:border-[#2E5C85] hover:bg-gray-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-100 to-blue-100 flex items-center justify-center text-[#2E5C85] shadow-inner">
                <UploadCloud size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  Drag and drop your carrier statement here, or{' '}
                  <span className="text-[#2E5C85] underline">browse files</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supported formats: PDF (text-based), Excel (.xlsx, .xls), CSV • Up to 15 MB
                </p>
              </div>
              <div className="flex items-center gap-4 text-gray-400 text-xs pt-1">
                <span className="flex items-center gap-1"><FileText size={14} /> PDF</span>
                <span>•</span>
                <span className="flex items-center gap-1"><FileSpreadsheet size={14} /> XLSX / XLS</span>
                <span>•</span>
                <span className="flex items-center gap-1"><FileSpreadsheet size={14} /> CSV</span>
              </div>
            </div>
          </div>
        ) : (
          /* Selected File Details & Actions */
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                {file.name.endsWith('.pdf') ? <FileText size={22} /> : <FileSpreadsheet size={22} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{file.name}</p>
                <p className="text-[11px] text-gray-500">
                  {formatFileSize(file.size)} • {file.name.split('.').pop()?.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClear}
                disabled={isParsing || isApplying}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 transition flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Clear / Remove
              </button>
              <button
                type="button"
                onClick={handleParse}
                disabled={isParsing || isApplying}
                className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#10B889] to-[#2E5C85] hover:opacity-95 rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Parsing Statement...
                  </>
                ) : (
                  <>
                    <FileCheck size={14} />
                    Parse Statement
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {parseError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-xs text-red-800">
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-red-900">Parsing Error</p>
              <p className="text-red-700 leading-relaxed">{parseError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Parsing Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Rows Parsed</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{summary.totalRows}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{summary.fileName}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/30">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Valid Financial Rows</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{summary.validRows}</p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Ready for review</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-rose-50/30">
            <div>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Invalid / Incomplete Rows</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{summary.invalidRows}</p>
              <p className="text-[11px] text-rose-600/80 mt-0.5">Missing policy or amount</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Apply Results Summary */}
      {Object.keys(applyResults).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-xs">
          <h3 className="font-bold text-gray-900 mb-2 border-b border-gray-100 pb-2">Apply Results Summary</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 size={14} /> APPLIED: {applySummary['APPLIED'] || 0}
            </div>
            {applySummary['ALREADY_RECONCILED'] > 0 && (
              <div className="flex items-center gap-1.5 text-blue-700">
                <Info size={14} /> SKIPPED (Reconciled): {applySummary['ALREADY_RECONCILED']}
              </div>
            )}
            {applySummary['VALIDATION_FAILED'] > 0 && (
              <div className="flex items-center gap-1.5 text-orange-700">
                <AlertCircle size={14} /> VALIDATION FAILED: {applySummary['VALIDATION_FAILED']}
              </div>
            )}
            {applySummary['HISTORICAL_POLICY_BLOCKED'] > 0 && (
              <div className="flex items-center gap-1.5 text-purple-700">
                <AlertCircle size={14} /> BLOCKED (Historical): {applySummary['HISTORICAL_POLICY_BLOCKED']}
              </div>
            )}
            {applySummary['ERROR'] > 0 && (
              <div className="flex items-center gap-1.5 text-rose-700">
                <XCircle size={14} /> ERROR: {applySummary['ERROR']}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase 2/3: Match Preview Section */}
      {phase2Preview.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <FileCheck size={18} className="text-[#2E5C85]" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Phase 3: Policy Matches Preview & Apply
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Review calculated variances and apply actual commissions to CRM policies.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleApply}
                disabled={isApplying || selectedIndices.size === 0}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isApplying ? <RefreshCw size={14} className="animate-spin" /> : <CheckSquare size={14} />}
                Apply Selected ({selectedIndices.size})
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={isApplying}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 transition flex items-center gap-1.5"
              >
                Discard / Cancel Preview
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100/70 text-gray-700 uppercase tracking-wider text-[11px] border-y border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-center w-10">Select</th>
                  <th className="px-4 py-3 font-bold">Match Status / Apply Result</th>
                  <th className="px-4 py-3 font-bold">Client Name</th>
                  <th className="px-4 py-3 font-bold">Statement Carrier<br/><span className="text-[10px] text-gray-400">DB Carrier</span></th>
                  <th className="px-4 py-3 font-bold">Statement Policy<br/><span className="text-[10px] text-gray-400">DB Active Policy</span></th>
                  <th className="px-4 py-3 font-bold text-right">Expected Comm</th>
                  <th className="px-4 py-3 font-bold text-right">Actual Comm</th>
                  <th className="px-4 py-3 font-bold text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {phase2Preview.map((preview, i) => {
                  let statusBadge = null;
                  switch (preview.status) {
                    case 'EXACT_MATCH':
                      statusBadge = <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">EXACT / HIGH CONFIDENCE</span>; break;
                    case 'CARRIER_MISMATCH':
                      statusBadge = <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">CARRIER MISMATCH / REVIEW</span>; break;
                    case 'AMBIGUOUS':
                      statusBadge = <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">AMBIGUOUS</span>; break;
                    case 'HISTORICAL_POLICY':
                      statusBadge = <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">HISTORICAL POLICY / DO NOT MATCH</span>; break;
                    case 'NO_MATCH':
                    default:
                      statusBadge = <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">NO MATCH</span>; break;
                  }

                  const result = applyResults[i];
                  let resultBadge = null;
                  if (result) {
                    if (result.status === 'APPLIED') {
                      resultBadge = <span className="mt-1 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white"><CheckCircle2 size={10} className="mr-1"/> APPLIED</span>;
                    } else if (result.status === 'ALREADY_RECONCILED') {
                      resultBadge = <span className="mt-1 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800"><Info size={10} className="mr-1"/> SKIPPED (Reconciled)</span>;
                    } else if (result.status === 'HISTORICAL_POLICY_BLOCKED') {
                      resultBadge = <span className="mt-1 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800"><AlertCircle size={10} className="mr-1"/> BLOCKED (Historical)</span>;
                    } else {
                      resultBadge = <span className="mt-1 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800"><XCircle size={10} className="mr-1"/> {result.status}: {result.message}</span>;
                    }
                  }

                  const expected = preview.expectedCommission;
                  const actual = preview.statementRow.actual_commission;
                  const variance = preview.variance;

                  const canSelect = preview.matchedLeadId && !resultBadge; // Cannot select if already has a definitive apply result

                  return (
                    <tr key={i} className={`hover:bg-gray-50/80 transition ${result?.status === 'APPLIED' ? 'bg-emerald-50/30' : ''}`}>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIndices.has(i)}
                          onChange={() => toggleSelection(i)}
                          disabled={!canSelect || isApplying}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex flex-col gap-1 items-start">
                          {statusBadge}
                          <span className="text-[9px] text-gray-400">{preview.reason}</span>
                          {resultBadge}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">
                        {preview.clientName || <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{preview.statementRow.carrier_name || <span className="text-gray-400 italic">—</span>}</div>
                        <div className="text-[10px] text-gray-500">{preview.activeDbCarrier || <span className="text-gray-400 italic">—</span>}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-gray-900">{preview.statementRow.policy_number || <span className="text-rose-600 italic">Missing</span>}</div>
                        <div className="text-[10px] text-gray-500">{preview.activeDbPolicyNumber || <span className="text-gray-400 italic">—</span>}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-gray-600">
                        {expected !== null ? formatCurrency(expected) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-600">
                        {actual !== null ? formatCurrency(actual) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black">
                        {variance !== null ? (
                          <span className={variance > 0 ? 'text-amber-600' : variance < 0 ? 'text-emerald-600' : 'text-gray-400'}>
                            {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phase 1 Raw Preview Table Section */}
      {parsedRows.length > 0 && !isPreviewing && phase2Preview.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#2E5C85]" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Statement Preview ({filteredRows.length} of {parsedRows.length})
                </h3>
                <p className="text-[11px] text-gray-400">
                  Carrier: {summary?.detectedCarrier || 'Not specified'} • Type: {summary?.fileType.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex bg-gray-200/80 p-1 rounded-xl text-xs font-semibold text-gray-600">
                <button
                  type="button"
                  onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-lg transition ${
                    activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm font-bold' : 'hover:text-gray-900'
                  }`}
                >
                  All ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('valid'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-lg transition ${
                    activeTab === 'valid' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'hover:text-emerald-700'
                  }`}
                >
                  Valid ({summary?.validRows || 0})
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('invalid'); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-lg transition ${
                    activeTab === 'invalid' ? 'bg-rose-600 text-white shadow-sm font-bold' : 'hover:text-rose-700'
                  }`}
                >
                  Invalid ({summary?.invalidRows || 0})
                </button>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search policy or carrier..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-[#2E5C85]"
                />
              </div>
            </div>
          </div>

          <div className="mx-4 bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-900">
            <Info size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Phase 1 Preview Mode:</strong> Rows are parsed and normalized in memory only. No records have been written to the database, and no policies have been matched or reconciled.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100/70 text-gray-700 uppercase tracking-wider text-[11px] border-y border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-bold w-12 text-center">#</th>
                  <th className="px-4 py-3 font-bold w-28 text-center">Status</th>
                  <th className="px-4 py-3 font-bold">Policy Number</th>
                  <th className="px-4 py-3 font-bold text-right">Actual Commission</th>
                  <th className="px-4 py-3 font-bold">Carrier</th>
                  <th className="px-4 py-3 font-bold">Statement Date</th>
                  <th className="px-4 py-3 font-bold">Validation Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No statement rows match your search/filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr
                      key={row.row_index}
                      className={`hover:bg-gray-50/80 transition ${
                        !row.is_valid ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono text-center">
                        {row.row_index}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.is_valid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle size={12} /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 font-mono">
                        {row.policy_number ? (
                          row.policy_number
                        ) : (
                          <span className="text-rose-600 italic font-sans font-medium">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black font-mono">
                        {row.actual_commission !== null ? (
                          <span className={row.actual_commission < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            {formatCurrency(row.actual_commission)}
                          </span>
                        ) : (
                          <span className="text-rose-600 italic font-sans font-medium">Invalid</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">
                        {row.carrier_name || <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono">
                        {row.statement_date || <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.validation_errors && row.validation_errors.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.validation_errors.map((err, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded"
                              >
                                {err}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} rows
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                >
                  Previous
                </button>
                <span className="px-2 font-bold text-gray-800">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
