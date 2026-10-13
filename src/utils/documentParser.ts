import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export interface ParsedDocumentResult {
  id: string;
  name: string;
  ext: string;
  sizeLabel: string;
  textContent: string;
  base64Data?: string;
  mimeType?: string;
  summary?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Universal Document and Spreadsheet Parser for AI Context
 * Handles Excel (.xlsx, .xls), CSV, Word (.docx, .doc), PDF, and text/code files
 */
export async function parseDocumentFile(file: File): Promise<ParsedDocumentResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
  const sizeLabel = formatBytes(file.size);
  const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // 1. Excel Spreadsheets (.xlsx, .xls, .csv, .tsv)
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'tsv') {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const sheetSummaries: string[] = [];

      const targetSheets = workbook.SheetNames.slice(0, 10);
      for (const sheetName of targetSheets) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: '',
        });

        const nonEmptyRows = rows
          .filter((r) => Array.isArray(r) && r.some((cell) => String(cell ?? '').trim() !== ''))
          .slice(0, 200);

        if (nonEmptyRows.length > 0) {
          const rawHeader = nonEmptyRows[0] as unknown[];
          const header = rawHeader.map((c, idx) => {
            const str = String(c ?? '').trim();
            return str || `Kolom_${idx + 1}`;
          });
          const sep = header.map(() => '---');

          const bodyLines = nonEmptyRows.slice(1).map((r) => {
            const rowArr = r as unknown[];
            const cols = header.map((_, idx) => {
              const cellVal = String(rowArr[idx] ?? '').replace(/[\r\n]+/g, ' ').trim();
              return cellVal || '-';
            });
            return `| ${cols.join(' | ')} |`;
          });

          sheetSummaries.push(
            `### Sheet: "${sheetName}" (${nonEmptyRows.length} baris)\n| ${header.join(' | ')} |\n| ${sep.join(' | ')} |\n${bodyLines.join('\n')}`
          );
        }
      }

      const textContent =
        sheetSummaries.join('\n\n') ||
        `Spreadsheet "${file.name}" terbaca namun tidak berisi data sel yang valid.`;

      return {
        id,
        name: file.name,
        ext,
        sizeLabel,
        textContent,
        summary: `${targetSheets.length} Sheet · ${sheetSummaries.length} tabel terbaca`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        id,
        name: file.name,
        ext,
        sizeLabel,
        textContent: `Gagal membaca isi spreadsheet: ${msg}`,
      };
    }
  }

  // 2. Word Documents (.docx, .doc)
  if (ext === 'docx') {
    try {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      const rawText = (result.value || '').trim();

      const wordCount = rawText ? rawText.split(/\s+/).length : 0;
      const textContent = rawText || `Dokumen Word "${file.name}" tidak memiliki teks terbaca.`;

      return {
        id,
        name: file.name,
        ext: 'docx',
        sizeLabel,
        textContent,
        summary: `${wordCount} kata terbaca`,
      };
    } catch {
      // Fallback via server parser if client fails
      const fallbackResult = await parseViaServer(file, id, sizeLabel, 'docx');
      if (fallbackResult) return fallbackResult;

      return {
        id,
        name: file.name,
        ext: 'docx',
        sizeLabel,
        textContent: `Dokumen Word "${file.name}" terlampir.`,
      };
    }
  }

  if (ext === 'doc') {
    // Legacy Word 97-2003 binary format
    const serverResult = await parseViaServer(file, id, sizeLabel, 'doc');
    if (serverResult) return serverResult;

    // Client fallback: scan printable text strings
    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const textChunks: string[] = [];
      let currentChunk = '';

      for (let i = 0; i < uint8.length; i++) {
        const byte = uint8[i];
        // Printable ASCII
        if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
          currentChunk += String.fromCharCode(byte);
        } else {
          if (currentChunk.length >= 4) {
            textChunks.push(currentChunk.trim());
          }
          currentChunk = '';
        }
      }
      if (currentChunk.length >= 4) {
        textChunks.push(currentChunk.trim());
      }

      const extracted = textChunks.filter((c) => c.length > 8).join('\n\n');
      return {
        id,
        name: file.name,
        ext: 'doc',
        sizeLabel,
        textContent: extracted || `Dokumen DOC "${file.name}" terlampir.`,
        summary: 'DOC Legacy terkonversi',
      };
    } catch {
      return {
        id,
        name: file.name,
        ext: 'doc',
        sizeLabel,
        textContent: `Dokumen Word "${file.name}" terlampir.`,
      };
    }
  }

  // 3. PDF Documents (.pdf)
  if (ext === 'pdf' || file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Convert to base64 for Gemini inlineMedia and server parser
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Data = btoa(binary);

    // Parse via server endpoint with legacy pdfjs
    const serverResult = await parseViaServer(file, id, sizeLabel, 'pdf', base64Data);
    if (serverResult && serverResult.textContent.trim()) {
      return {
        ...serverResult,
        base64Data,
        mimeType: 'application/pdf',
      };
    }

    // Client fallback regex stream scanner for uncompressed PDF text
    try {
      const latinText = binary;
      const textMatches: string[] = [];
      // Match text within BT ... ET blocks
      const btBlocks = latinText.match(/BT[\s\S]*?ET/g) || [];
      for (const block of btBlocks.slice(0, 50)) {
        const tjMatches = block.match(/\((.*?)\)\s*Tj/g) || [];
        for (const tj of tjMatches) {
          const cleaned = tj.replace(/^\(|\)\s*Tj$/g, '').trim();
          if (cleaned.length > 2) {
            textMatches.push(cleaned);
          }
        }
      }

      const extracted = textMatches.join(' ');
      return {
        id,
        name: file.name,
        ext: 'pdf',
        sizeLabel,
        textContent:
          extracted ||
          `Dokumen PDF "${file.name}" (${sizeLabel}) terlampir. Siap dianalisis oleh AI.`,
        base64Data,
        mimeType: 'application/pdf',
        summary: extracted ? 'Teks PDF terekstrak' : 'PDF Terlampir',
      };
    } catch {
      return {
        id,
        name: file.name,
        ext: 'pdf',
        sizeLabel,
        textContent: `Dokumen PDF "${file.name}" (${sizeLabel}) terlampir.`,
        base64Data,
        mimeType: 'application/pdf',
      };
    }
  }

  // 4. Plain Text, Code, JSON, Markdown, Config files
  return new Promise<ParsedDocumentResult>((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = String(ev.target?.result || '').slice(0, 48000);
      resolve({
        id,
        name: file.name,
        ext,
        sizeLabel,
        textContent: raw || `File teks kosong (${file.name}).`,
        summary: `${raw.length} karakter`,
      });
    };
    reader.onerror = () => {
      resolve({
        id,
        name: file.name,
        ext,
        sizeLabel,
        textContent: `Gagal membaca isi file: ${file.name}`,
      });
    };
    reader.readAsText(file);
  });
}

/**
 * Helper to call server-side `/api/parse-document`
 */
async function parseViaServer(
  file: File,
  id: string,
  sizeLabel: string,
  ext: string,
  existingBase64?: string
): Promise<ParsedDocumentResult | null> {
  try {
    let base64 = existingBase64;
    if (!base64) {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      base64 = btoa(binary);
    }

    const res = await fetch('/api/parse-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64,
        filename: file.name,
        ext,
        mimeType: file.type,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.text) {
      return {
        id,
        name: file.name,
        ext,
        sizeLabel,
        textContent: data.text,
        summary: data.summary || `${data.text.length} karakter`,
      };
    }
  } catch {
    // Server parse failed or unavailable
  }
  return null;
}
