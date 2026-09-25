import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { authenticateApiRequest } from '@/utils/auth';
import { evaluateMatch, StatementRow, CandidateRecord } from '@/utils/statementMatcher';

export async function POST(req: Request) {
  try {
    const auth = await authenticateApiRequest(req, ['accounting', 'superadmin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const body = await req.json();
    const { matches } = body; // Array of items to apply

    if (!Array.isArray(matches)) {
      return NextResponse.json({ error: 'Expected matches array' }, { status: 400 });
    }

    const results = [];
    const processedLeadIds = new Set<string>();

    for (let i = 0; i < matches.length; i++) {
      const item = matches[i];
      const { lead_id, statementRow } = item;

      if (!lead_id || !statementRow) {
        results.push({ index: i, lead_id: lead_id || null, status: 'ERROR', message: 'Missing lead_id or statementRow' });
        continue;
      }

      // 5. Duplicate Check
      if (processedLeadIds.has(lead_id)) {
        results.push({ index: i, lead_id, status: 'VALIDATION_FAILED', message: 'Duplicate lead_id in batch' });
        continue;
      }
      processedLeadIds.add(lead_id);

      // 2. Server-Side Authority: Re-fetch current CRM record
      const { data: dbLead, error: fetchError } = await supabaseServer
        .from('temp_leads_basics')
        .select('id, client_name, expected_commission, actual_commission, accounting_status, policy_number, new_policy_number, carrier, new_carrier')
        .eq('id', lead_id)
        .single();

      if (fetchError || !dbLead) {
        results.push({ index: i, lead_id, status: 'ERROR', message: 'Lead not found in database' });
        continue;
      }

      // 4. Already Reconciled Check
      if (dbLead.accounting_status === 'reconciled') {
        results.push({ index: i, lead_id, status: 'ALREADY_RECONCILED', message: 'Record is already reconciled' });
        continue;
      }

      // 3 & 6. Validation using evaluateMatch (which covers Switch/Historical and Carrier Validation)
      const candidate: CandidateRecord = dbLead;
      const evaluation = evaluateMatch(statementRow as StatementRow, [candidate]);

      if (evaluation.status === 'HISTORICAL_POLICY') {
        results.push({ index: i, lead_id, status: 'HISTORICAL_POLICY_BLOCKED', message: 'Matched old policy of switched renewal' });
        continue;
      }

      if (evaluation.status !== 'EXACT_MATCH') {
        results.push({ index: i, lead_id, status: 'VALIDATION_FAILED', message: `Validation failed: ${evaluation.status}` });
        continue;
      }

      // 7 & 8. Actual Commission & Status Calculation
      const statementActualComm = Number(statementRow.actual_commission) || 0;
      const expectedComm = Number(dbLead.expected_commission) || 0;
      const variance = expectedComm - statementActualComm;

      let newStatus = 'unreconciled';
      if (variance === 0 && statementActualComm > 0) {
        newStatus = 'reconciled';
      } else if (variance !== 0 || statementActualComm < 0) {
        newStatus = 'discrepancy';
      }

      // 1. Allowed writes ONLY: actual_commission, accounting_status
      const { error: updateError } = await supabaseServer
        .from('temp_leads_basics')
        .update({
          actual_commission: statementActualComm,
          accounting_status: newStatus
        })
        .eq('id', lead_id);

      if (updateError) {
        results.push({ index: i, lead_id, status: 'ERROR', message: 'Database update failed' });
        continue;
      }

      // 9. Audit Log
      const { error: logError } = await supabaseServer
        .from('accounting_logs')
        .insert({
          lead_id: lead_id,
          updated_by: user.id,
          old_expected_commission: expectedComm,
          new_expected_commission: expectedComm, // Unchanged
          old_actual_commission: Number(dbLead.actual_commission) || 0,
          new_actual_commission: statementActualComm,
          old_status: dbLead.accounting_status,
          new_status: newStatus,
          notes: 'Applied via Carrier Statement Upload (Batch)',
          created_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Audit log failed for lead', lead_id, logError);
        // Do not fail the row if audit log fails, but it is logged
      }

      results.push({ index: i, lead_id, status: 'APPLIED', message: 'Successfully applied' });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Apply Matches API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
