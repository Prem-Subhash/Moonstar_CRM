'use client'

import { useState } from 'react'
import { Plus, Eye, EyeOff } from 'lucide-react'
import { Spinner } from '@/components/ui/Loading'
import { toast } from '@/lib/toast'
import { COMPANY_ROLE_MAP, CompanyKey, validateCompanyRole } from '@/constants/companyRoles'
import { Modal } from '@/components/ui/Modal'

type CreateUserModalProps = {
    isOpen: boolean
    onClose: () => void
    fixedRole?: string
    onSuccess?: () => void
}

export function CreateUserModal({ isOpen, onClose, fixedRole, onSuccess }: CreateUserModalProps) {
    const [formData, setFormData] = useState<{
        email: string
        full_name: string
        password: string
        company: CompanyKey
        role: string
        insurance_access: string[]
    }>({
        email: '',
        full_name: '',
        password: '',
        company: fixedRole === 'csr' ? 'insurance' : 'insurance',
        role: fixedRole || 'csr',
        insurance_access: ['personal', 'commercial']
    })
    const [createLoading, setCreateLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleCompanyChange = (newCompany: CompanyKey) => {
        if (fixedRole) return
        const defaultRole = COMPANY_ROLE_MAP[newCompany]?.roles[0]?.value || ''
        setFormData({ ...formData, company: newCompany, role: defaultRole })
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()

        const submitRole = fixedRole || formData.role
        if (submitRole === 'csr' && formData.insurance_access.length === 0) {
            toast('Please select at least one insurance access option (Personal or Commercial).', 'error')
            return
        }

        const submitData = {
            ...formData,
            role: submitRole,
            company: fixedRole === 'csr' ? 'insurance' : formData.company,
            insurance_access: submitRole === 'csr' ? formData.insurance_access : undefined
        }

        if (!validateCompanyRole(submitData.company, submitData.role)) {
            toast('Invalid company and role combination selected.', 'error')
            return
        }

        try {
            setCreateLoading(true)
            const res = await fetch('/api/superadmin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData)
            })
            const j = await res.json()
            if (j.error) throw new Error(j.error)

            setFormData({
                email: '',
                full_name: '',
                password: '',
                company: fixedRole === 'csr' ? 'insurance' : 'insurance',
                role: fixedRole || 'csr',
                insurance_access: ['personal', 'commercial']
            })
            toast(fixedRole === 'csr' ? 'CSR created successfully!' : 'User created successfully!', 'success')
            onSuccess?.()
            onClose()
        } catch (err: any) {
            toast(err.message, 'error')
        } finally {
            setCreateLoading(false)
        }
    }

    const isCSR = fixedRole === 'csr' || formData.role === 'csr'

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={fixedRole === 'csr' ? 'New CSR Account' : 'New User Account'}
            subtitle={fixedRole === 'csr' ? 'Create Customer Success Representative' : 'Define access and administrative roles'}
            icon={<Plus size={18} />}
            maxWidth="max-w-4xl"
        >
            <form id="create-user-form" onSubmit={handleCreateUser} autoComplete="off" className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-end">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Step 1: Company</label>
                    <select
                        value={fixedRole === 'csr' ? 'insurance' : formData.company}
                        onChange={e => handleCompanyChange(e.target.value as CompanyKey)}
                        disabled={fixedRole === 'csr'}
                        className="bg-gray-50 border border-gray-200 p-3 h-[46px] rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none text-sm transition-all w-full font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                        {Object.entries(COMPANY_ROLE_MAP).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                </div>
                {!fixedRole && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Step 2: Role</label>
                        <select
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            className="bg-gray-50 border border-gray-200 p-3 h-[46px] rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none text-sm transition-all w-full font-bold"
                        >
                            {COMPANY_ROLE_MAP[formData.company]?.roles.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Full Name</label>
                    <input
                        required
                        type="text"
                        autoComplete="off"
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        className="bg-gray-50 border border-gray-200 p-3 h-[46px] rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none text-sm transition-all"
                        placeholder="John Doe"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Email</label>
                    <input
                        required
                        type="email"
                        autoComplete="off"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="bg-gray-50 border border-gray-200 p-3 h-[46px] rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none text-sm transition-all"
                        placeholder="john@example.com"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Password</label>
                    <div className="relative group">
                        <input
                            required
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="bg-gray-50 border border-gray-200 p-3 h-[46px] rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none text-sm transition-all w-full pr-12"
                            placeholder="Min 6 chars"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-emerald-600 transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {isCSR && (
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-[10px] font-bold text-black uppercase tracking-widest ml-1">Insurance Access</label>
                        <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 px-4 h-[46px] rounded-xl focus-within:ring-2 focus-within:ring-emerald-600/20 transition-all">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer hover:text-emerald-700">
                                <input
                                    type="checkbox"
                                    checked={formData.insurance_access.includes('personal')}
                                    onChange={e => {
                                        const updated = e.target.checked
                                            ? [...formData.insurance_access, 'personal']
                                            : formData.insurance_access.filter(a => a !== 'personal')
                                        setFormData({ ...formData, insurance_access: updated })
                                    }}
                                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                />
                                Personal
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer hover:text-emerald-700">
                                <input
                                    type="checkbox"
                                    checked={formData.insurance_access.includes('commercial')}
                                    onChange={e => {
                                        const updated = e.target.checked
                                            ? [...formData.insurance_access, 'commercial']
                                            : formData.insurance_access.filter(a => a !== 'commercial')
                                        setFormData({ ...formData, insurance_access: updated })
                                    }}
                                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                                />
                                Commercial
                            </label>
                        </div>
                    </div>
                )}
            </form>
            
            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    form="create-user-form"
                    disabled={createLoading}
                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 transition-all flex justify-center items-center h-[46px] font-bold disabled:opacity-50 shadow-emerald-200 hover:shadow-emerald-300 shadow-lg w-full sm:w-auto"
                >
                    {createLoading ? <Spinner size={20} /> : (fixedRole === 'csr' ? 'Create CSR' : 'Create User')}
                </button>
            </div>
        </Modal>
    )
}
