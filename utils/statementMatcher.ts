import { getActivePolicy, PolicyRecord } from './activePolicyHelper';

export type MatchStatus = 
  | 'EXACT_MATCH'
  | 'CARRIER_MISMATCH'
  | 'AMBIGUOUS'
  | 'HISTORICAL_POLICY'
  | 'NO_MATCH';

export interface StatementRow {
  row_index: number;
  policy_number: string | null;
  actual_commission: number | null;
  carrier_name: string | null;
  statement_date: string | null;
  is_valid: boolean;
  validation_errors: string[];
}

export interface CandidateRecord extends PolicyRecord {
  id: string;
  client_name?: string | null;
  expected_commission?: number | string | null;
  actual_commission?: number | string | null;
  accounting_status?: string | null;
  accounting_verified?: boolean | null;
}

export interface PreviewMatchResult {
  statementRow: StatementRow;
  status: MatchStatus;
  matchedLeadId: string | null;
  clientName: string | null;
  activeDbPolicyNumber: string | null;
  activeDbCarrier: string | null;
  expectedCommission: number | null;
  variance: number | null;
  reason: string;
}

export function normalizePolicyNumber(policy: string | null | undefined): string {
  if (!policy) return '';
  return policy.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizeCarrier(carrier: string | null | undefined): string {
  if (!carrier) return '';
  // Convert to lower case, remove punctuation, remove common suffixes to allow fuzzy match
  let normalized = carrier.trim().toLowerCase().replace(/[^\w\s]/g, '');
  // Remove multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');
  // Remove common generic terms for conservative matching
  normalized = normalized.replace(/\b(insurance|ins|company|co|inc|llc|corp)\b/g, '').trim();
  return normalized;
}

export function isCarrierAgreement(carrierA: string | null | undefined, carrierB: string | null | undefined): boolean {
  const normA = normalizeCarrier(carrierA);
  const normB = normalizeCarrier(carrierB);
  
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  
  return false;
}

export function evaluateMatch(
  statementRow: StatementRow, 
  candidates: CandidateRecord[]
): PreviewMatchResult {
  const statementPolicyNorm = normalizePolicyNumber(statementRow.policy_number);
  const statementCarrier = statementRow.carrier_name;
  
  const actualComm = statementRow.actual_commission ?? 0;

  const result: PreviewMatchResult = {
    statementRow,
    status: 'NO_MATCH',
    matchedLeadId: null,
    clientName: null,
    activeDbPolicyNumber: null,
    activeDbCarrier: null,
    expectedCommission: null,
    variance: null,
    reason: 'No active or historical candidate matches',
  };

  if (!statementPolicyNorm) {
    result.reason = 'Statement policy number is missing';
    return result;
  }

  const activeMatches: CandidateRecord[] = [];
  let isHistoricalMatch = false;

  for (const candidate of candidates) {
    const activeInfo = getActivePolicy(candidate);
    const activePolicyNorm = normalizePolicyNumber(activeInfo.activePolicyNumber);
    const oldPolicyNorm = normalizePolicyNumber(candidate.policy_number);

    if (activePolicyNorm === statementPolicyNorm) {
      activeMatches.push(candidate);
    } else if (activeInfo.isSwitched && oldPolicyNorm === statementPolicyNorm) {
      // It matches the old policy, but the policy was switched!
      isHistoricalMatch = true;
    }
  }

  if (activeMatches.length === 0) {
    if (isHistoricalMatch) {
      result.status = 'HISTORICAL_POLICY';
      result.reason = 'Matches an old policy of a switched renewal (new policy active)';
    }
    return result;
  }

  if (activeMatches.length > 1) {
    result.status = 'AMBIGUOUS';
    result.reason = `Multiple valid active candidates found (${activeMatches.length} matches)`;
    return result;
  }

  // Exactly one active match
  const match = activeMatches[0];
  const activeInfo = getActivePolicy(match);
  
  const expectedComm = Number(match.expected_commission) || 0;
  
  result.matchedLeadId = match.id;
  result.clientName = match.client_name ?? null;
  result.activeDbPolicyNumber = activeInfo.activePolicyNumber;
  result.activeDbCarrier = activeInfo.activeCarrier;
  result.expectedCommission = expectedComm;
  result.variance = expectedComm - actualComm; // Expected - Actual
  
  const carrierAgrees = isCarrierAgreement(statementCarrier, activeInfo.activeCarrier);

  if (carrierAgrees) {
    result.status = 'EXACT_MATCH';
    result.reason = 'Exactly one active candidate, policy and carrier agree';
  } else {
    result.status = 'CARRIER_MISMATCH';
    result.reason = 'Exactly one active candidate, policy matches but carrier does not sufficiently agree';
  }

  return result;
}
