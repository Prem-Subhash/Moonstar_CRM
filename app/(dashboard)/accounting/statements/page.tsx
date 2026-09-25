import React from 'react'
import { redirect } from 'next/navigation'
import { createServer } from '@/lib/supabaseServer'
import { FileText, ArrowLeft, Upload, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import CarrierStatementUpload from '@/components/accounting/CarrierStatementUpload'

export default async function CarrierStatementsPage() {
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

  // 2. Fetch master carriers for reference
  const { data: carriers } = await supabase
    .from('insurance_companies')
    .select('id, name, commission_percent, category, is_active')
    .order('name')

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
              Carrier Statements
            </h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Carrier commission statement reconciliation hub and master commission reference.
          </p>
        </div>
      </div>

      {/* Carrier Statement Upload & Preview Area */}
      <CarrierStatementUpload carriers={carriers || []} />

      {/* Info notice about statement parsing module */}
      <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-blue-900">
        <AlertCircle size={18} className="text-[#2E5C85] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm text-[#2E5C85]">Carrier Statement Batch Parser</p>
          <p className="text-blue-700 leading-relaxed">
            Automated PDF, Excel, and CSV statement parsing and auto-matching are configured for carrier statement layouts. You can review active master carrier rates below and navigate to the Policy Ledger to reconcile policy commissions.
          </p>
        </div>
      </div>

      {/* Active Carriers Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#2E5C85]" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Configured Master Carrier Commission Rates ({carriers?.length || 0})
            </h2>
          </div>
          <Link href="/accounting/all-leads">
            <button className="text-xs font-bold text-[#2E5C85] hover:underline">
              Go to Policy Ledger →
            </button>
          </Link>
        </div>

        {!carriers || carriers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No master carriers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left table-fixed">
              <colgroup>
                <col className="w-[300px]" />
                <col className="w-[200px]" />
                <col className="w-[200px]" />
                <col className="w-[150px]" />
              </colgroup>
              <thead className="bg-gradient-to-r from-[#10B889] to-[#2E5C85] text-white text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Carrier Name</th>
                  <th className="px-4 py-3.5 font-semibold">Category</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Master Commission Rate</th>
                  <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {carriers.map((carrier) => (
                  <tr key={carrier.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3.5 font-bold text-gray-800 text-xs">
                      {carrier.name}
                    </td>
                    <td className="px-4 py-3.5 capitalize text-xs text-gray-600 font-medium">
                      {carrier.category}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-emerald-600 text-xs">
                      {Number(carrier.commission_percent).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        carrier.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {carrier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
