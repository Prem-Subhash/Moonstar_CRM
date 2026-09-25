import React from 'react'
import { redirect } from 'next/navigation'
import { createServer } from '@/lib/supabaseServer'
import { formatCurrency } from '@/lib/currency'
import { Clock, User, ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function AccountingAuditLogsPage() {
  const supabase = await createServer()

  // 1. Verify User Authentication & RBAC
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['accounting', 'superadmin'].includes(profile.role)) {
    redirect('/unauthorized')
  }

  // 2. Fetch all accounting logs with relations
  const { data: logs, error } = await supabase
    .from('accounting_logs')
    .select(`
      id,
      lead_id,
      updated_by,
      old_expected_commission,
      new_expected_commission,
      old_actual_commission,
      new_actual_commission,
      old_status,
      new_status,
      notes,
      created_at,
      updater:profiles!updated_by (
        full_name,
        role
      ),
      lead:temp_leads_basics!lead_id (
        id,
        client_name,
        carrier,
        new_carrier,
        policy_number,
        new_policy_number
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Fetch accounting logs failed:', error)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/accounting" className="text-gray-400 hover:text-gray-600 transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">
              Accounting Audit Logs
            </h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Complete audit trail of all commission adjustments, reconciliation status changes, and verification events.
          </p>
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#2E5C85]" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Recorded Transactions ({logs?.length || 0})
            </h2>
          </div>
        </div>

        {!logs || logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No accounting audit entries recorded.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const operatorName = (Array.isArray(log.updater) 
                ? log.updater[0]?.full_name 
                : (log.updater as any)?.full_name) || 'System Operator'
              const operatorRole = (Array.isArray(log.updater) 
                ? log.updater[0]?.role 
                : (log.updater as any)?.role) || 'accounting'
              const clientName = (Array.isArray(log.lead) 
                ? log.lead[0]?.client_name 
                : (log.lead as any)?.client_name) || 'Deleted Lead'
              const leadId = log.lead_id

              return (
                <div key={log.id} className="p-5 hover:bg-gray-50/70 transition space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                        <User size={14} />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900">{operatorName}</span>
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {operatorRole}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                      <Clock size={12} />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="font-semibold text-gray-700">
                        Target Policy: <Link href={`/accounting/leads/${leadId}`} className="text-[#2E5C85] hover:underline font-bold">{clientName}</Link>
                      </div>
                      {log.new_status && (
                        <div>
                          <span className="font-medium text-gray-500">Status: </span>
                          <span className="font-bold text-gray-700 uppercase tracking-wide bg-white px-2 py-0.5 rounded border border-gray-200">
                            {log.old_status || 'none'} → {log.new_status}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Value changes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-200/50">
                      {log.old_expected_commission !== log.new_expected_commission && (
                        <div>
                          <span className="font-medium text-gray-500">Expected Commission: </span>
                          <span className="line-through text-red-500">{formatCurrency(log.old_expected_commission)}</span>
                          {' → '}
                          <span className="font-bold text-emerald-600">{formatCurrency(log.new_expected_commission)}</span>
                        </div>
                      )}
                      {log.old_actual_commission !== log.new_actual_commission && (
                        <div>
                          <span className="font-medium text-gray-500">Collected Commission: </span>
                          <span className="line-through text-red-500">{formatCurrency(log.old_actual_commission)}</span>
                          {' → '}
                          <span className="font-bold text-purple-600">{formatCurrency(log.new_actual_commission)}</span>
                        </div>
                      )}
                    </div>

                    {log.notes && (
                      <div className="pt-2 border-t border-gray-200/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Notes / Documentation</p>
                        <p className="text-gray-700 italic mt-0.5">"{log.notes}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
