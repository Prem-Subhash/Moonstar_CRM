import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/utils/auth';
import { parseCarrierStatement } from '@/utils/carrierStatementParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = ['pdf', 'xlsx', 'xls', 'csv'];

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msexcel',
  'application/x-msexcel',
  'application/x-excel',
  'text/csv',
  'application/csv',
  'text/plain',
  'text/x-csv',
  'application/octet-stream' // Browsers sometimes report this for xls/csv
]);

export async function POST(req: Request) {
  try {
    // 1. Enforce RBAC for Accounting & Superadmin only
    const auth = await authenticateApiRequest(req, ['accounting', 'superadmin']);
    if (auth.error) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get('file');
    const carrierNameOverride = formData.get('carrier_name') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No statement file provided in request.' },
        { status: 400 }
      );
    }

    // 3. Security & Validation Checks
    const fileName = file.name || 'unnamed_file';
    const fileSize = file.size;
    const fileMime = file.type;

    if (fileSize === 0) {
      return NextResponse.json(
        { success: false, error: 'The uploaded file is empty (0 bytes).' },
        { status: 400 }
      );
    }

    const MAX_BYTES = 15 * 1024 * 1024; // 15MB
    if (fileSize > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds maximum allowed limit of 15MB.' },
        { status: 400 }
      );
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file format (.${ext || 'unknown'}). Supported formats are: PDF, XLSX, XLS, and CSV.`
        },
        { status: 400 }
      );
    }

    // Check MIME type if supplied
    if (fileMime && !ALLOWED_MIME_TYPES.has(fileMime)) {
      // In case of unusual browser mime-type, log warning but allow if extension is verified
      console.warn(`[CarrierStatement] Non-standard MIME type detected: ${fileMime} for ${fileName}`);
    }

    // 4. Read File Content into Memory Buffer (No disk/DB writes)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Parse and Normalize Carrier Statement
    const result = await parseCarrierStatement(
      buffer,
      fileName,
      fileMime,
      carrierNameOverride?.trim() || null
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to parse carrier statement.'
        },
        { status: 422 }
      );
    }

    // 6. Return Normalized Preview Records (Phase 1: Preview Only)
    return NextResponse.json({
      success: true,
      summary: result.summary,
      rows: result.rows
    });
  } catch (error: any) {
    console.error('[CarrierStatement] API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred while parsing the statement.'
      },
      { status: 500 }
    );
  }
}
