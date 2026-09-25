import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { normalizeImportDate } from './fileParser';

export interface NormalizedStatementRow {
  row_index: number;
  policy_number: string | null;
  actual_commission: number | null;
  carrier_name: string | null;
  statement_date: string | null;
  is_valid: boolean;
  validation_errors: string[];
  raw_data?: Record<string, any>;
}

export interface StatementParseSummary {
  fileName: string;
  fileType: 'pdf' | 'xlsx' | 'xls' | 'csv';
  fileSize: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  detectedCarrier?: string | null;
  detectedStatementDate?: string | null;
}

export interface StatementParseResult {
  success: boolean;
  summary?: StatementParseSummary;
  rows: NormalizedStatementRow[];
  error?: string;
  warnings?: string[];
}

const POLICY_ALIASES = [
  'policy number',
  'policy #',
  'policy no',
  'policy no.',
  'policy',
  'policy id',
  'policynumber',
  'policyno',
  'policy_number',
  'policy_id',
  'pol_num',
  'policy ref',
  'pol #',
  'pol no',
  'contract number',
  'contract #'
];

const COMMISSION_ALIASES = [
  'commission',
  'commission paid',
  'actual commission',
  'commission amount',
  'paid commission',
  'net commission',
  'gross commission',
  'comm amount',
  'comm paid',
  'commission_amount',
  'actual_commission',
  'paid comm',
  'comm',
  'payment amount',
  'amount paid',
  'carrier commission',
  'comm $'
];

const CARRIER_ALIASES = [
  'carrier',
  'carrier name',
  'carrier_name',
  'company',
  'company name',
  'insurance company',
  'insurance carrier',
  'carrier / company',
  'company_name',
  'carrier_id'
];

const DATE_ALIASES = [
  'statement date',
  'statement_date',
  'date',
  'process date',
  'accounting date',
  'trans date',
  'transaction date',
  'effective date',
  'pay date',
  'payment date',
  'stmt date',
  'stmt_date'
];

function cleanHeaderKey(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/[\r\n\t_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function matchHeader(header: string, aliases: string[]): boolean {
  const cleaned = cleanHeaderKey(header);
  if (!cleaned) return false;

  for (const alias of aliases) {
    if (cleaned === alias) return true;
    if (cleaned === alias.replace('#', '').trim()) return true;
  }

  // Substring match for compound headers
  for (const alias of aliases) {
    if (cleaned.includes(alias)) return true;
  }

  return false;
}

export function parseCommissionAmount(val: any): { amount: number | null; error?: string } {
  if (val === null || val === undefined || val === '') {
    return { amount: null, error: 'Empty commission amount' };
  }

  if (typeof val === 'number') {
    if (isNaN(val)) return { amount: null, error: 'Invalid commission: NaN' };
    return { amount: Math.round(val * 100) / 100 };
  }

  let str = String(val).trim();
  if (!str) return { amount: null, error: 'Empty commission amount' };

  // Handle accounting parentheses for negative numbers, e.g. (150.00) -> -150.00
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.substring(1).trim();
  }

  // Remove currency signs, commas, and trailing/leading spaces
  const cleaned = str.replace(/[$€£,]/g, '').trim();

  // Validate numeric string format
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return { amount: null, error: `Invalid commission value: "${val}"` };
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return { amount: null, error: `Invalid commission value: "${val}"` };
  }

  const finalAmount = isNegative ? -Math.abs(num) : num;
  return { amount: Math.round(finalAmount * 100) / 100 };
}

export function normalizeStatementRow(
  raw: Record<string, any>,
  rowIndex: number,
  columnMapping: {
    policyKey?: string;
    commissionKey?: string;
    carrierKey?: string;
    dateKey?: string;
  },
  defaultCarrier?: string | null,
  defaultDate?: string | null
): NormalizedStatementRow {
  const errors: string[] = [];

  // 1. Policy Number
  let policyRaw: any = columnMapping.policyKey ? raw[columnMapping.policyKey] : undefined;
  let policy_number: string | null = null;
  if (policyRaw !== undefined && policyRaw !== null && String(policyRaw).trim() !== '') {
    policy_number = String(policyRaw).trim().replace(/^['"]|['"]$/g, '');
  } else {
    errors.push('Missing policy number');
  }

  // 2. Commission
  let commissionRaw: any = columnMapping.commissionKey ? raw[columnMapping.commissionKey] : undefined;
  let actual_commission: number | null = null;
  if (commissionRaw !== undefined && commissionRaw !== null && String(commissionRaw).trim() !== '') {
    const { amount, error } = parseCommissionAmount(commissionRaw);
    if (!error && amount !== null) {
      actual_commission = amount;
    }
  }

  // Fallback: If commissionKey didn't resolve to a valid amount, check if another column has a valid amount
  if (actual_commission === null) {
    for (const [k, v] of Object.entries(raw)) {
      if (k === columnMapping.policyKey) continue;
      // Skip if it looks like a date
      if (normalizeImportDate(v) !== null) continue;
      const { amount, error } = parseCommissionAmount(v);
      if (!error && amount !== null) {
        actual_commission = amount;
        break;
      }
    }
    if (actual_commission === null) {
      errors.push(commissionRaw !== undefined ? `Invalid commission value: "${commissionRaw}"` : 'Missing commission amount');
    }
  }

  // 3. Carrier Name
  let carrierRaw: any = columnMapping.carrierKey ? raw[columnMapping.carrierKey] : undefined;
  let carrier_name: string | null = defaultCarrier || null;
  if (carrierRaw !== undefined && carrierRaw !== null && String(carrierRaw).trim() !== '') {
    carrier_name = String(carrierRaw).trim();
  }

  // 4. Statement Date
  let dateRaw: any = columnMapping.dateKey ? raw[columnMapping.dateKey] : undefined;
  let statement_date: string | null = defaultDate || null;
  if (dateRaw !== undefined && dateRaw !== null && String(dateRaw).trim() !== '') {
    const normalized = normalizeImportDate(dateRaw);
    statement_date = normalized !== null ? normalized : String(dateRaw).trim();
  }

  const isAllEmpty = Object.values(raw).every(v => v === null || v === undefined || String(v).trim() === '');
  if (isAllEmpty) {
    return {
      row_index: rowIndex,
      policy_number: null,
      actual_commission: null,
      carrier_name: null,
      statement_date: null,
      is_valid: false,
      validation_errors: ['Empty row'],
      raw_data: raw
    };
  }

  return {
    row_index: rowIndex,
    policy_number,
    actual_commission,
    carrier_name,
    statement_date,
    is_valid: errors.length === 0,
    validation_errors: errors,
    raw_data: raw
  };
}

/**
 * Parses an Excel file (.xlsx, .xls) buffer into normalized statement rows.
 */
export function parseExcelStatement(
  buffer: Buffer,
  carrierOverride?: string | null
): StatementParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, rows: [], error: 'The Excel workbook contains no worksheets.' };
    }

    // Locate the first worksheet with table contents
    let targetSheetName = workbook.SheetNames[0];
    let worksheet = workbook.Sheets[targetSheetName];
    let rawSheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // If sheet 0 is empty, search other sheets
    if (!rawSheetData || rawSheetData.length === 0) {
      for (const name of workbook.SheetNames) {
        const testSheet = workbook.Sheets[name];
        const testData = XLSX.utils.sheet_to_json(testSheet, { header: 1, defval: '' });
        if (testData && testData.length > 0) {
          targetSheetName = name;
          worksheet = testSheet;
          rawSheetData = testData as any[][];
          break;
        }
      }
    }

    if (!rawSheetData || rawSheetData.length === 0) {
      return { success: false, rows: [], error: 'The Excel worksheet is empty.' };
    }

    // Scan the first 20 rows to detect the header row
    let headerRowIdx = -1;
    let columnMapping: {
      policyKey?: string;
      commissionKey?: string;
      carrierKey?: string;
      dateKey?: string;
    } = {};

    for (let r = 0; r < Math.min(rawSheetData.length, 20); r++) {
      const row = rawSheetData[r];
      if (!Array.isArray(row)) continue;

      let hasPolicy = false;
      let hasCommission = false;
      const testMapping: typeof columnMapping = {};

      for (let c = 0; c < row.length; c++) {
        const cell = cleanHeaderKey(row[c]);
        if (!cell) continue;

        if (!testMapping.policyKey && matchHeader(cell, POLICY_ALIASES)) {
          testMapping.policyKey = String(c);
          hasPolicy = true;
        } else if (!testMapping.commissionKey && matchHeader(cell, COMMISSION_ALIASES)) {
          testMapping.commissionKey = String(c);
          hasCommission = true;
        } else if (!testMapping.carrierKey && matchHeader(cell, CARRIER_ALIASES)) {
          testMapping.carrierKey = String(c);
        } else if (!testMapping.dateKey && matchHeader(cell, DATE_ALIASES)) {
          testMapping.dateKey = String(c);
        }
      }

      // Found a matching header row if both policy and commission are matched,
      // or at least policy is matched with multiple columns present
      if (hasPolicy && (hasCommission || row.filter(Boolean).length >= 2)) {
        headerRowIdx = r;
        columnMapping = testMapping;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return {
        success: false,
        rows: [],
        error: 'No recognizable statement columns found. Expected column headers for Policy Number and Commission Amount.'
      };
    }

    const dataRows = rawSheetData.slice(headerRowIdx + 1);
    if (dataRows.length === 0) {
      return {
        success: false,
        rows: [],
        error: 'No parseable statement rows found in worksheet.'
      };
    }

    const normalizedRows: NormalizedStatementRow[] = [];
    let validCount = 0;
    let invalidCount = 0;

    dataRows.forEach((row, idx) => {
      // Ignore trailing empty rows
      const isEmpty = !row || !Array.isArray(row) || row.every(v => v === null || v === undefined || String(v).trim() === '');
      if (isEmpty) return;

      const rawRecord: Record<string, any> = {};
      row.forEach((cell, cIdx) => {
        rawRecord[String(cIdx)] = cell;
      });

      const normalized = normalizeStatementRow(
        rawRecord,
        idx + 1,
        columnMapping,
        carrierOverride
      );

      if (normalized.is_valid) {
        validCount++;
      } else {
        invalidCount++;
      }
      normalizedRows.push(normalized);
    });

    if (normalizedRows.length === 0) {
      return {
        success: false,
        rows: [],
        error: 'No statement data rows found below the header row.'
      };
    }

    return {
      success: true,
      summary: {
        fileName: '',
        fileType: 'xlsx',
        fileSize: buffer.length,
        totalRows: normalizedRows.length,
        validRows: validCount,
        invalidRows: invalidCount,
        detectedCarrier: carrierOverride || null
      },
      rows: normalizedRows
    };
  } catch (err: any) {
    return {
      success: false,
      rows: [],
      error: `Failed to parse Excel file: ${err.message || 'Malformed Excel workbook.'}`
    };
  }
}

/**
 * Parses a CSV file buffer or string into normalized statement rows.
 */
export function parseCsvStatement(
  content: string | Buffer,
  carrierOverride?: string | null
): StatementParseResult {
  try {
    const text = typeof content === 'string' ? content : content.toString('utf-8');
    if (!text || text.trim().length === 0) {
      return { success: false, rows: [], error: 'The uploaded CSV file is empty.' };
    }

    const parsed = Papa.parse(text, {
      skipEmptyLines: true,
      header: false
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return {
        success: false,
        rows: [],
        error: `Malformed CSV file: ${parsed.errors[0]?.message || 'Failed to parse CSV.'}`
      };
    }

    const rows = parsed.data as string[][];
    if (!rows || rows.length === 0) {
      return { success: false, rows: [], error: 'The CSV file contains no data.' };
    }

    // Detect header row among first 15 rows
    let headerRowIdx = -1;
    let columnMapping: {
      policyKey?: string;
      commissionKey?: string;
      carrierKey?: string;
      dateKey?: string;
    } = {};

    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      let hasPolicy = false;
      let hasCommission = false;
      const testMapping: typeof columnMapping = {};

      for (let c = 0; c < row.length; c++) {
        const cell = cleanHeaderKey(row[c]);
        if (!cell) continue;

        if (!testMapping.policyKey && matchHeader(cell, POLICY_ALIASES)) {
          testMapping.policyKey = String(c);
          hasPolicy = true;
        } else if (!testMapping.commissionKey && matchHeader(cell, COMMISSION_ALIASES)) {
          testMapping.commissionKey = String(c);
          hasCommission = true;
        } else if (!testMapping.carrierKey && matchHeader(cell, CARRIER_ALIASES)) {
          testMapping.carrierKey = String(c);
        } else if (!testMapping.dateKey && matchHeader(cell, DATE_ALIASES)) {
          testMapping.dateKey = String(c);
        }
      }

      if (hasPolicy && (hasCommission || row.filter(Boolean).length >= 2)) {
        headerRowIdx = r;
        columnMapping = testMapping;
        break;
      }
    }

    if (headerRowIdx === -1) {
      return {
        success: false,
        rows: [],
        error: 'No recognizable statement columns found. Expected column headers for Policy Number and Commission Amount.'
      };
    }

    const dataRows = rows.slice(headerRowIdx + 1);
    if (dataRows.length === 0) {
      return {
        success: false,
        rows: [],
        error: 'No parseable statement rows found in CSV file.'
      };
    }

    const normalizedRows: NormalizedStatementRow[] = [];
    let validCount = 0;
    let invalidCount = 0;

    dataRows.forEach((row, idx) => {
      const isEmpty = !row || !Array.isArray(row) || row.every(v => !v || v.trim() === '');
      if (isEmpty) return;

      const rawRecord: Record<string, any> = {};
      row.forEach((cell, cIdx) => {
        rawRecord[String(cIdx)] = cell;
      });

      const normalized = normalizeStatementRow(
        rawRecord,
        idx + 1,
        columnMapping,
        carrierOverride
      );

      if (normalized.is_valid) {
        validCount++;
      } else {
        invalidCount++;
      }
      normalizedRows.push(normalized);
    });

    return {
      success: true,
      summary: {
        fileName: '',
        fileType: 'csv',
        fileSize: typeof content === 'string' ? Buffer.byteLength(content) : content.length,
        totalRows: normalizedRows.length,
        validRows: validCount,
        invalidRows: invalidCount,
        detectedCarrier: carrierOverride || null
      },
      rows: normalizedRows
    };
  } catch (err: any) {
    return {
      success: false,
      rows: [],
      error: `Failed to parse CSV file: ${err.message || 'Malformed CSV format.'}`
    };
  }
}

/**
 * Server-side PDF text extraction and statement normalization.
 * Requires a text-based PDF. Scanned/image-only PDFs are explicitly rejected.
 */
export async function parsePdfStatement(
  buffer: Buffer,
  carrierOverride?: string | null
): Promise<StatementParseResult> {
  try {
    // Dynamic require/import for pdf-parse
    const { PDFParse } = await import('pdf-parse');
    const { getData } = await import('pdf-parse/worker');
    PDFParse.setWorker(getData());
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText({ cellSeparator: '\t', cellThreshold: 5 });

    const rawText = textResult?.text;
    if (!rawText || rawText.trim().length < 15) {
      return {
        success: false,
        rows: [],
        error: 'Unreadable PDF: The uploaded PDF does not contain extractable text. Scanned or image-only PDFs are not supported. Please upload a text-based PDF, Excel, or CSV file.'
      };
    }

    // Split document into lines
    const lines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('-- ') && !l.endsWith(' --'));

    if (lines.length === 0) {
      return {
        success: false,
        rows: [],
        error: 'No text lines could be extracted from the PDF.'
      };
    }

    // Extract document-level carrier or statement date metadata from top lines if present
    let docCarrier = carrierOverride || null;
    let docDate: string | null = null;

    const topLines = lines.slice(0, 15);
    for (const line of topLines) {
      const carrierMatch = line.match(/(?:carrier|company|insurance company)[:\s]+([A-Za-z0-9\s&.,'-]+)/i);
      if (carrierMatch && !docCarrier) {
        docCarrier = carrierMatch[1].trim();
      }
      const dateMatch = line.match(/(?:statement date|stmt date|date|process date)[:\s]+([0-9A-Za-z/.-]+)/i);
      if (dateMatch && !docDate) {
        const norm = normalizeImportDate(dateMatch[1].trim());
        if (norm) docDate = norm;
      }
    }

    // Find table header row
    let headerLineIdx = -1;
    let headerColumns: string[] = [];

    const tokenizePdfHeaderLine = (line: string): string[] => {
      const byDelim = line.split(/\t+|\|+|\s{2,}/).map(t => t.trim()).filter(Boolean);
      if (byDelim.length >= 2) return byDelim;

      const words = line.split(/\s+/).filter(Boolean);
      const result: string[] = [];
      let wIdx = 0;
      while (wIdx < words.length) {
        if (wIdx + 1 < words.length) {
          const pair = `${words[wIdx]} ${words[wIdx + 1]}`.toLowerCase();
          if (
            POLICY_ALIASES.some(a => pair === a || pair.includes(a)) ||
            COMMISSION_ALIASES.some(a => pair === a || pair.includes(a)) ||
            CARRIER_ALIASES.some(a => pair === a || pair.includes(a)) ||
            DATE_ALIASES.some(a => pair === a || pair.includes(a))
          ) {
            result.push(`${words[wIdx]} ${words[wIdx + 1]}`);
            wIdx += 2;
            continue;
          }
        }
        result.push(words[wIdx]);
        wIdx++;
      }
      return result.length > 0 ? result : words;
    };

    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const line = lines[i];
      const tokens = tokenizePdfHeaderLine(line);

      let hasPolicy = false;
      let hasCommission = false;

      for (const tok of tokens) {
        if (matchHeader(tok, POLICY_ALIASES)) hasPolicy = true;
        if (matchHeader(tok, COMMISSION_ALIASES)) hasCommission = true;
      }

      if (hasPolicy && (hasCommission || tokens.length >= 2)) {
        headerLineIdx = i;
        headerColumns = tokens;
        break;
      }
    }

    const normalizedRows: NormalizedStatementRow[] = [];
    let validCount = 0;
    let invalidCount = 0;

    if (headerLineIdx !== -1) {
      // Structure-based parsing below the header line
      let policyColIdx = -1;
      let commColIdx = -1;
      let carrierColIdx = -1;
      let dateColIdx = -1;

      headerColumns.forEach((col, idx) => {
        if (policyColIdx === -1 && matchHeader(col, POLICY_ALIASES)) policyColIdx = idx;
        else if (commColIdx === -1 && matchHeader(col, COMMISSION_ALIASES)) commColIdx = idx;
        else if (carrierColIdx === -1 && matchHeader(col, CARRIER_ALIASES)) carrierColIdx = idx;
        else if (dateColIdx === -1 && matchHeader(col, DATE_ALIASES)) dateColIdx = idx;
      });

      const dataLines = lines.slice(headerLineIdx + 1);

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        if (line.toLowerCase().includes('page ') || line.toLowerCase().includes('total')) continue;

        let tokens = line.split(/\t+|\|+|\s{2,}/).map(t => t.trim()).filter(Boolean);
        if (tokens.length < 2) {
          tokens = line.split(/\s+/).filter(Boolean);
        }

        if (tokens.length < 2) continue;

        const rawRecord: Record<string, any> = {};
        tokens.forEach((t, idx) => {
          rawRecord[String(idx)] = t;
        });

        const mapping = {
          policyKey: policyColIdx !== -1 ? String(policyColIdx) : undefined,
          commissionKey: commColIdx !== -1 ? String(commColIdx) : undefined,
          carrierKey: carrierColIdx !== -1 ? String(carrierColIdx) : undefined,
          dateKey: dateColIdx !== -1 ? String(dateColIdx) : undefined
        };

        const normalized = normalizeStatementRow(
          rawRecord,
          normalizedRows.length + 1,
          mapping,
          docCarrier,
          docDate
        );

        // Keep rows that look like financial records
        if (normalized.policy_number || normalized.actual_commission !== null) {
          if (normalized.is_valid) validCount++;
          else invalidCount++;
          normalizedRows.push(normalized);
        }
      }
    } else {
      // Fallback line-by-line pattern matching when no header line is recognized
      // Scan each line for: [Policy Token] ... [Currency/Amount] ... [Optional Date]
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length < 5) continue;

        // Extract monetary amount: matches "$1,234.56", "(450.00)", "250.75", etc.
        const moneyMatches = [...line.matchAll(/(?:\$|\b)\(?-?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?(?:\b|\s|$)/g)];
        if (moneyMatches.length === 0) continue;

        const lastMoney = moneyMatches[moneyMatches.length - 1][0].trim();
        const { amount: commVal } = parseCommissionAmount(lastMoney);
        if (commVal === null) continue;

        // Extract tokens excluding the money token
        const lineWithoutMoney = line.replace(lastMoney, ' ');
        const tokens = lineWithoutMoney.split(/\s+/).map(t => t.trim()).filter(Boolean);

        // Find candidate policy number (alphanumeric token with at least 4 characters containing digits)
        const policyCandidate = tokens.find(t =>
          /^[A-Za-z0-9#-]{4,30}$/.test(t) && /\d/.test(t) && !/^\d{4}-\d{2}-\d{2}$/.test(t)
        );

        // Find candidate date
        const dateCandidate = tokens.find(t => normalizeImportDate(t) !== null);
        const normDate = dateCandidate ? normalizeImportDate(dateCandidate) : docDate;

        const errors: string[] = [];
        if (!policyCandidate) errors.push('Missing policy number');

        const normalized: NormalizedStatementRow = {
          row_index: normalizedRows.length + 1,
          policy_number: policyCandidate || null,
          actual_commission: commVal,
          carrier_name: docCarrier,
          statement_date: normDate,
          is_valid: errors.length === 0,
          validation_errors: errors,
          raw_data: { line }
        };

        if (normalized.is_valid) validCount++;
        else invalidCount++;
        normalizedRows.push(normalized);
      }
    }

    if (normalizedRows.length === 0) {
      return {
        success: false,
        rows: [],
        error: 'No recognizable statement columns or rows found in the PDF. Please ensure the document is a valid carrier statement containing policy numbers and commission values.'
      };
    }

    return {
      success: true,
      summary: {
        fileName: '',
        fileType: 'pdf',
        fileSize: buffer.length,
        totalRows: normalizedRows.length,
        validRows: validCount,
        invalidRows: invalidCount,
        detectedCarrier: docCarrier,
        detectedStatementDate: docDate
      },
      rows: normalizedRows
    };
  } catch (err: any) {
    return {
      success: false,
      rows: [],
      error: `Failed to parse PDF document: ${err.message || 'Unreadable or damaged PDF file.'}`
    };
  }
}

/**
 * Universal dispatcher for parsing uploaded statement files.
 * Validates file extension, size, and routes to format-specific parser.
 */
export async function parseCarrierStatement(
  buffer: Buffer,
  fileName: string,
  mimeType?: string,
  carrierOverride?: string | null
): Promise<StatementParseResult> {
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit

  if (!buffer || buffer.length === 0) {
    return {
      success: false,
      rows: [],
      error: 'Empty file uploaded. Please select a valid statement file.'
    };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return {
      success: false,
      rows: [],
      error: 'File size exceeds maximum allowed limit of 15MB.'
    };
  }

  const ext = fileName.split('.').pop()?.toLowerCase();
  const allowedExts = ['pdf', 'xlsx', 'xls', 'csv'];

  if (!ext || !allowedExts.includes(ext)) {
    return {
      success: false,
      rows: [],
      error: `Unsupported file format (.${ext || 'unknown'}). Supported formats are: PDF, XLSX, XLS, and CSV.`
    };
  }

  let result: StatementParseResult;

  if (ext === 'pdf') {
    result = await parsePdfStatement(buffer, carrierOverride);
  } else if (ext === 'xlsx' || ext === 'xls') {
    result = parseExcelStatement(buffer, carrierOverride);
  } else if (ext === 'csv') {
    result = parseCsvStatement(buffer, carrierOverride);
  } else {
    return {
      success: false,
      rows: [],
      error: `Unsupported file type: ${ext}`
    };
  }

  if (result.success && result.summary) {
    result.summary.fileName = fileName;
    result.summary.fileSize = buffer.length;
    result.summary.fileType = ext as any;
  }

  return result;
}
