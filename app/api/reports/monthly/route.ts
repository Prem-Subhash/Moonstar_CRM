import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import { formatCurrency } from '@/lib/currency'
import { getActivePolicy } from '@/utils/activePolicyHelper'
import { formatPolicies } from '@/utils/formatPolicies'
import { authenticateApiRequest } from '@/utils/auth'

// 1. Zod Input Validation
const ReportSchema = z.object({
    month: z.string().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD required").optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD required").optional(),
    date_type: z.enum(['effective', 'expiration']).default('effective'),
    policy_flow: z.enum(['new', 'renewal', 'all', '']).optional(),
    insurence_category: z.enum(['personal', 'commercial', 'all', '']).optional(),
    line_of_businesses: z.array(z.string()).optional(),
    assigned_csr: z.string().uuid().optional().or(z.literal('')),
    customer_name: z.string().optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(10).max(100).default(50),
    exportType: z.enum(['json', 'excel', 'pdf']).default('json')
})

export async function POST(request: Request) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    // Auth Check
    const auth = await authenticateApiRequest(request, ['csr', 'admin', 'superadmin', 'accounting'])
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const parseResult = ReportSchema.safeParse(body)

    if (!parseResult.success) {
        return NextResponse.json({ error: parseResult.error.flatten() }, { status: 400 })
    }

    let { month, start_date, end_date, date_type, policy_flow, insurence_category, line_of_businesses, assigned_csr, customer_name, page, limit, exportType } = parseResult.data

    // 2. Date Parsing
    if (month && !start_date && !end_date) {
        start_date = `${month}-01`
        const [y, m] = month.split('-')
        const firstDayNextMonth = new Date(parseInt(y), parseInt(m), 1)
        const lastDay = new Date(firstDayNextMonth.getTime() - 86400000)
        end_date = lastDay.toISOString().split('T')[0]
    }

    if (!start_date || !end_date) {
        return NextResponse.json({ error: 'Valid date range is required.' }, { status: 400 });
    }

    const safeFlow = policy_flow === 'all' || policy_flow === '' ? null : policy_flow
    const safeCategory = insurence_category === 'all' || insurence_category === '' ? null : insurence_category
    const dateField = date_type === 'expiration' ? 'renewal_date' : 'effective_date'

    // 3. Fetch KPI Summary
    const { data: summaryData, error: summaryError } = await supabase.rpc('get_report_summary', {
        p_start_date: start_date,
        p_end_date: end_date,
        p_date_type: date_type,
        p_flow: safeFlow,
        p_category: safeCategory,
        p_csr: assigned_csr || null,
        p_line_of_businesses: (line_of_businesses && line_of_businesses.length > 0) ? line_of_businesses : null,
        p_customer_name: customer_name || null
    })

    if (summaryError) {
        console.error('Summary Error:', summaryError)
    }

    // 4. Base Query Builder
    let query = supabase
        .from('temp_leads_basics')
        .select(`
            id,
            policy_id,
            client_name,
            policy_type,
            lead_policies(policy_type),
            effective_date,
            renewal_date,
            created_at,
            carrier,
            total_premium,
            policy_number,
            new_carrier,
            new_policy_number,
            new_premium,
            policy_flow,
            insurence_category,
            assigned_csr,
            policy_terms:policy_terms!policy_term_id (
              id,
              policy_id,
              term_sequence,
              term_status,
              carrier,
              policy_number,
              written_premium,
              effective_date,
              expiration_date
            ),
            assigned_csr_profile:profiles!temp_leads_assigned_csr_fkey (full_name),
            assigned_user_profile:profiles!fk_profile (full_name)
        `, { count: 'exact' })
        .gte(dateField, start_date)
        .lte(dateField, end_date)

    if (safeFlow) query = query.eq('policy_flow', safeFlow)
    if (safeCategory) query = query.eq('insurence_category', safeCategory)
    if (line_of_businesses && line_of_businesses.length > 0) {
        query = query.in('policy_type', line_of_businesses)
    }
    if (assigned_csr) query = query.eq('assigned_csr', assigned_csr)
    if (customer_name) query = query.ilike('client_name', `%${customer_name}%`)

    query = query.order(dateField, { ascending: false })

    const getAuthoritativeTerm = (row: any) => {
        if (Array.isArray(row.policy_terms)) {
            return row.policy_terms.find((t: any) => t.term_status === 'Active') || row.policy_terms[0] || null
        }
        return typeof row.policy_terms === 'object' ? row.policy_terms : null
    }

    const transformRow = (row: any) => {
        const activeTerm = getAuthoritativeTerm(row)
        const active = getActivePolicy({ ...row, policy_terms: activeTerm || row.policy_terms })
        const policiesFormatted = formatPolicies(row.lead_policies && row.lead_policies.length > 0 ? row.lead_policies.map((p: any) => p.policy_type) : row.policy_type)
        
        const activeCarrier = activeTerm?.carrier || active.activeCarrier
        const activePolicyNumber = activeTerm?.policy_number || active.activePolicyNumber
        const activePremium = (activeTerm && activeTerm.written_premium !== null && activeTerm.written_premium !== undefined)
            ? Number(activeTerm.written_premium) || 0
            : (active.activePremium ? Number(active.activePremium) : 0)
        const rowDate = date_type === 'expiration'
            ? (activeTerm?.expiration_date || row.renewal_date || row.effective_date)
            : (activeTerm?.effective_date || row.effective_date)

        return {
            ...row,
            policies_formatted: policiesFormatted,
            active_carrier: activeCarrier,
            active_policy_number: activePolicyNumber,
            active_premium: activePremium,
            display_date: rowDate,
            is_switched: active.isSwitched
        }
    }

    // JSON Preview (Paginated)
    if (exportType === 'json') {
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data, count, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const transformedData = data?.map(transformRow) || []

        return NextResponse.json({
            summary: summaryData,
            data: transformedData,
            pagination: { total: count, page, limit }
        })
    }

    // 5. Handle Export (Excel / PDF)
    const { data, error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const transformedExportData = data?.map(transformRow) || []

    if (exportType === 'excel') {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Enterprise Report')

        // Title and Summary Section at the Top
        worksheet.addRow(['Enterprise Reporting - Monthly Summary']).font = { bold: true, size: 16 }
        worksheet.addRow([`Period: ${start_date} to ${end_date}`])
        worksheet.addRow([])

        worksheet.addRow(['KPI Summary']).font = { bold: true, size: 12 }
        worksheet.addRow(['Metric', 'Value']).font = { bold: true }
        worksheet.addRow(['Total Policies', summaryData?.total_policies || 0])
        worksheet.addRow(['Total Premium', formatCurrency(summaryData?.total_premium)])
        worksheet.addRow(['New Business Premium', formatCurrency(summaryData?.new_business_premium)])
        worksheet.addRow(['Renewal Premium', formatCurrency(summaryData?.renewal_premium)])
        worksheet.addRow(['Personal Lines', summaryData?.personal_line_count || 0])
        worksheet.addRow(['Commercial Lines', summaryData?.commercial_line_count || 0])
        worksheet.addRow([])

        // Data Table Headers
        const dateHeader = date_type === 'expiration' ? 'DATE (EXPIRATION)' : 'DATE (EFFECTIVE)'

        const tableHeaderRow = worksheet.addRow(['CLIENT', 'TYPE', 'CATEGORY', 'FLOW', 'PREMIUM', 'CSR', dateHeader])
        tableHeaderRow.font = { bold: true }
        tableHeaderRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF10B981' } // A green shade like the UI
            }
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
        })

        // Add lead data
        transformedExportData.forEach((row: any) => {
            const addedRow = worksheet.addRow([
                row.client_name || '-',
                row.policies_formatted || '-',
                row.insurence_category || '-',
                row.policy_flow || '-',
                row.active_premium,
                row.assigned_csr_profile?.full_name || row.assigned_user_profile?.full_name || row.assigned_csr || '-',
                row.display_date || '-'
            ])
            addedRow.getCell(5).numFmt = '"$"#,##0.00'
        })

        worksheet.columns.forEach((column, i) => {
            column.width = i === 0 ? 30 : 20
        })

        const buffer = await workbook.xlsx.writeBuffer()
        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Enterprise_Report_${start_date}_to_${end_date}.xlsx"`
            }
        })
    }

    if (exportType === 'pdf') {
        const PDFDocument = (await import('pdfkit')).default
        const path = await import('path')

        const fontPathRegular = path.join(process.cwd(), 'assets', 'fonts', 'Roboto-Regular.ttf')
        const fontPathBold = path.join(process.cwd(), 'assets', 'fonts', 'Roboto-Bold.ttf')

        const doc = new PDFDocument({ 
            margin: 30, 
            size: 'A4',
            font: fontPathRegular 
        })

        const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
            const chunks: any[] = []
            doc.on('data', (chunk) => chunks.push(chunk))
            doc.on('end', () => resolve(Buffer.concat(chunks)))
            doc.on('error', reject)

            try {
                const dateLabel = date_type === 'expiration' ? 'Expiration Date' : 'Effective Date'
                doc.fontSize(18).font(fontPathBold).text('Enterprise Report', { align: 'center' })
                doc.fontSize(10).font(fontPathRegular).text(`Period: ${start_date} to ${end_date} (${dateLabel})`, { align: 'center' })
                doc.moveDown(2)

                doc.fontSize(12).font(fontPathBold).text('KPI Summary')
                doc.fontSize(10).font(fontPathRegular)
                doc.text(`Total Policies: ${summaryData?.total_policies || 0}`)
                doc.text(`Total Premium: ${formatCurrency(summaryData?.total_premium)}`)
                doc.moveDown(2)

                const drawHeader = (startY: number) => {
                    doc.rect(30, startY - 5, 540, 20).fill('#10B981') // Green box for headers
                    doc.fillColor('white').font(fontPathBold).fontSize(9)
                    doc.text('CLIENT', 35, startY, { width: 115, lineBreak: false })
                    doc.text('TYPE', 155, startY, { width: 75, lineBreak: false })
                    doc.text('CATEGORY', 235, startY, { width: 65, lineBreak: false })
                    doc.text('FLOW', 305, startY, { width: 50, lineBreak: false })
                    doc.text('PREMIUM', 360, startY, { width: 60, lineBreak: false })
                    doc.text('CSR', 425, startY, { width: 65, lineBreak: false })
                    doc.text('DATE', 495, startY, { width: 70, lineBreak: false })
                    doc.fillColor('black') // Reset color
                    return startY + 20
                }

                let y = drawHeader(doc.y)
                doc.font(fontPathRegular).fontSize(8)

                transformedExportData.forEach((row: any) => {
                    if (y > 750) {
                        doc.addPage()
                        y = drawHeader(30)
                        doc.font(fontPathRegular).fontSize(8)
                    }
                    const csrName = row.assigned_csr_profile?.full_name || row.assigned_user_profile?.full_name || row.assigned_csr || '-'

                    doc.text(row.client_name || '-', 35, y, { width: 115, height: 14, ellipsis: true })
                    doc.text(row.policies_formatted || '-', 155, y, { width: 75, height: 14, ellipsis: true })
                    doc.text(row.insurence_category || '-', 235, y, { width: 65, height: 14, ellipsis: true })
                    doc.text(row.policy_flow || '-', 305, y, { width: 50, height: 14, ellipsis: true })
                    doc.text(formatCurrency(row.active_premium), 380, y, { width: 60, height: 14, ellipsis: true })
                    doc.text(csrName, 425, y, { width: 65, height: 14, ellipsis: true })
                    doc.text(row.display_date || '-', 495, y, { width: 70, lineBreak: false })
                    y += 18
                    doc.moveTo(30, y - 5).lineTo(570, y - 5).strokeColor('#E5E7EB').lineWidth(0.5).stroke().strokeColor('black')
                })
                doc.end()
            } catch (err) {
                reject(err)
            }
        })

        return new Response(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Enterprise_Report_${start_date}_to_${end_date}.pdf"`
            }
        })
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
}
