import * as XLSX from 'xlsx';
import { CustomerDiscountItem, CustomerTier } from './pricingEngine';

/**
 * Smooth Haptic Feedback & Micro-Acoustic Tactile Engine
 * Optimized for 120Hz High-Refresh-Rate Displays & Mobile/Desktop Immersion
 */
let sharedAudioCtx: AudioContext | null = null;

export function triggerHaptic(type: 'light' | 'medium' | 'success' = 'light'): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'light') navigator.vibrate(6);
      else if (type === 'medium') navigator.vibrate(12);
      else if (type === 'success') navigator.vibrate([8, 30, 12]);
    }

    if (typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
      }

      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      const now = sharedAudioCtx.currentTime;

      osc.type = 'sine';
      if (type === 'success') {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.045);
        gain.gain.setValueAtTime(0.018, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        osc.connect(gain);
        gain.connect(sharedAudioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else {
        const startFreq = type === 'medium' ? 210 : 280;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.018);
        gain.gain.setValueAtTime(type === 'medium' ? 0.016 : 0.01, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
        osc.connect(gain);
        gain.connect(sharedAudioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.02);
      }
    }
  } catch {
    // Ignore audio/vibration permission errors silently
  }
}

/**
 * Generate Sample Markdown (.md) Template for Customer Discount Database
 * Aligned with 5-column structure: No | Nama Customer | Tier | SW (%) | DW (%)
 */
export function generateCustomerTemplateMarkdown(): string {
  return `# Template Database Diskon Customer — MYPAK Sheet Pricing Calculator

## Panduan Format Kolom (Markdown & Excel):
- **Kolom A (No):** Nomor urut (1, 2, 3, dst.)
- **Kolom B (Nama Customer):** Nama PT / CV / Klien
- **Kolom C (Tier):** Pilih **Tier 1**, **Tier 2**, **Tier 3**, atau **Tier 4**
- **Kolom D (Diskon SW):** Persentase Single Wall (contoh: \`+9%\` atau \`-4.5%\`)
- **Kolom E (Diskon DW):** Persentase Double Wall (contoh: \`+13%\` atau \`+5%\`)

| No | Nama Customer | Tier | Diskon SW | Diskon DW |
| :--- | :--- | :--- | :--- | :--- |
| 1 | PT Vinns Carton | Tier 1 | +9% | +13% |
| 2 | PT Contoh Mitra Kemasan | Tier 2 | -3.5% | +5% |
| 3 | CV Contoh Box Nusantara | Tier 3 | +7.5% | +11% |
| 4 | UD Contoh Pack Mandiri | Tier 4 | +10% | +14% |
`;
}

/**
 * Download the Markdown (.md) template file
 */
export function downloadCustomerTemplateMd(): void {
  triggerHaptic('medium');
  const content = generateCustomerTemplateMarkdown();
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template-database-customer.md';
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Download an Excel (.xlsx) template file with exact Columns A, B, C, D, E
 */
export function downloadCustomerTemplateExcel(): void {
  triggerHaptic('medium');
  const rows = [
    ['No', 'Nama Customer', 'Tier', 'Diskon SW', 'Diskon DW'],
    [1, 'PT Vinns Carton', 'Tier 1', '+9%', '+13%'],
    [2, 'PT Contoh Mitra Kemasan', 'Tier 2', '-3.5%', '+5%'],
    [3, 'CV Contoh Box Nusantara', 'Tier 3', '+7.5%', '+11%'],
    [4, 'UD Contoh Pack Mandiri', 'Tier 4', '+10%', '+14%'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },  // Kolom A: Nomor
    { wch: 28 }, // Kolom B: Nama Customer
    { wch: 12 }, // Kolom C: Tier
    { wch: 14 }, // Kolom D: Diskon SW
    { wch: 14 }, // Kolom E: Diskon DW
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Database Customer');
  XLSX.writeFile(workbook, 'template-database-customer.xlsx');
}

/**
 * Parse Excel (.xlsx, .xls, .ods) ArrayBuffer with exact Column A-E mapping:
 * Kolom A (idx 0): Nomor
 * Kolom B (idx 1): Nama Customer
 * Kolom C (idx 2): Tier (Tier 1 / Tier 2 / Tier 3)
 * Kolom D (idx 3): Diskon SW
 * Kolom E (idx 4): Diskon DW
 */
export function parseCustomerExcelBuffer(buffer: ArrayBuffer): CustomerDiscountItem[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    const results: CustomerDiscountItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || row.length < 2) continue;

      const colA = String(row[0] ?? '').trim();
      const colB = String(row[1] ?? '').trim();

      // Skip header row if Column A is "No"/"Nomor" or Column B is "Nama Customer"
      if (
        colA.toLowerCase() === 'no' ||
        colA.toLowerCase() === 'nomor' ||
        colB.toLowerCase().includes('nama customer') ||
        colB.toLowerCase() === 'customer'
      ) {
        continue;
      }

      // Support standard 5-column layout (A=No, B=Nama, C=Tier, D=SW, E=DW)
      if (row.length >= 5 && colB.length > 0) {
        const name = colB;
        const tier = normalizeTier(String(row[2] ?? 'Tier 1'));
        const swMarginPercent = parsePercentNumber(String(row[3] ?? '0'));
        const dwMarginPercent = parsePercentNumber(String(row[4] ?? '0'));

        results.push({
          id: `cust-xls-${Date.now()}-${i}`,
          name,
          tier,
          swMarginPercent,
          dwMarginPercent,
        });
      } else if (row.length === 4 && colA.length > 0 && isNaN(Number(colA))) {
        // Fallback if user omitted Column A (Nomor) and started directly with Nama Customer in Col A
        results.push({
          id: `cust-xls-${Date.now()}-${i}`,
          name: colA,
          tier: normalizeTier(colB),
          swMarginPercent: parsePercentNumber(String(row[2] ?? '0')),
          dwMarginPercent: parsePercentNumber(String(row[3] ?? '0')),
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Parse uploaded .md, .csv, .txt, or .json text into CustomerDiscountItem[]
 */
export function parseCustomerImportFile(rawText: string): CustomerDiscountItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. Try JSON format first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.customers)
        ? parsed.customers
        : [];
      return arr
        .filter((item: unknown) => typeof item === 'object' && item !== null && 'name' in item)
        .map((item: Record<string, unknown>, idx: number) => ({
          id: `cust-imp-${Date.now()}-${idx}`,
          name: String(item.name || '').trim(),
          tier: normalizeTier(String(item.tier || 'Tier 1')),
          swMarginPercent: parsePercentNumber(String(item.swMarginPercent ?? item.sw ?? '0')),
          dwMarginPercent: parsePercentNumber(String(item.dwMarginPercent ?? item.dw ?? '0')),
        }))
        .filter((c: CustomerDiscountItem) => c.name.length > 0);
    } catch {
      // Fall through to Markdown/CSV parser
    }
  }

  const results: CustomerDiscountItem[] = [];
  const lines = trimmed.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('>')) continue;

    // 2. Markdown Table Row: | 1 | PT Vinns Carton | Tier 1 | +9% | +13% | OR | PT Vinns Carton | Tier 1 | +9% | +13% |
    if (line.includes('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => {
          if (idx === 0 && line.startsWith('|')) return false;
          if (idx === arr.length - 1 && line.endsWith('|')) return false;
          return true;
        });

      if (cells.length >= 2) {
        const firstLower = cells[0].toLowerCase();
        const secondLower = (cells[1] || '').toLowerCase();

        // Skip header or separator rows
        if (
          firstLower === 'no' ||
          firstLower === 'nomor' ||
          firstLower.includes('nama') ||
          secondLower.includes('nama customer') ||
          /^[:\-=\s]+$/.test(cells[0])
        ) {
          continue;
        }

        // 5 Columns: | No | Nama Customer | Tier | SW | DW |
        if (cells.length >= 5) {
          const name = cells[1].replace(/\*\*/g, '').trim();
          if (!name) continue;
          results.push({
            id: `cust-imp-${Date.now()}-${i}`,
            name,
            tier: normalizeTier(cells[2]),
            swMarginPercent: parsePercentNumber(cells[3]),
            dwMarginPercent: parsePercentNumber(cells[4]),
          });
          continue;
        }

        // 4 Columns: | Nama Customer | Tier | SW | DW |
        if (cells.length === 4) {
          const name = cells[0].replace(/\*\*/g, '').trim();
          if (!name) continue;
          results.push({
            id: `cust-imp-${Date.now()}-${i}`,
            name,
            tier: normalizeTier(cells[1]),
            swMarginPercent: parsePercentNumber(cells[2]),
            dwMarginPercent: parsePercentNumber(cells[3]),
          });
          continue;
        }

        // 3 Columns: | Nama Customer | SW | DW |
        if (cells.length === 3) {
          const name = cells[0].replace(/\*\*/g, '').trim();
          if (!name) continue;
          results.push({
            id: `cust-imp-${Date.now()}-${i}`,
            name,
            tier: 'Tier 1',
            swMarginPercent: parsePercentNumber(cells[1]),
            dwMarginPercent: parsePercentNumber(cells[2]),
          });
          continue;
        }
      }
    }

    // 3. CSV / Semicolon Row (5 cols: No, Nama, Tier, SW, DW or 4 cols: Nama, Tier, SW, DW)
    const cleanedLine = line.replace(/^[-*•]\s*/, '').trim();
    if (cleanedLine.includes(',') || cleanedLine.includes(';')) {
      const delim = cleanedLine.includes(';') ? ';' : ',';
      const cols = cleanedLine.split(delim).map((c) => c.trim());
      const firstLower = cols[0].toLowerCase();
      const secondLower = (cols[1] || '').toLowerCase();
      if (
        firstLower === 'no' ||
        firstLower === 'nomor' ||
        firstLower.includes('nama') ||
        secondLower.includes('nama')
      ) {
        continue;
      }

      if (cols.length >= 5) {
        results.push({
          id: `cust-imp-${Date.now()}-${i}`,
          name: cols[1],
          tier: normalizeTier(cols[2]),
          swMarginPercent: parsePercentNumber(cols[3]),
          dwMarginPercent: parsePercentNumber(cols[4]),
        });
      } else if (cols.length === 4) {
        results.push({
          id: `cust-imp-${Date.now()}-${i}`,
          name: cols[0],
          tier: normalizeTier(cols[1]),
          swMarginPercent: parsePercentNumber(cols[2]),
          dwMarginPercent: parsePercentNumber(cols[3]),
        });
      }
    }
  }

  return results;
}

export function normalizeTier(raw: string): CustomerTier {
  const clean = raw.toLowerCase().trim();
  if (clean.includes('4')) return 'Tier 4';
  if (clean.includes('3') || clean.includes('reg')) return 'Tier 3';
  if (clean.includes('2') || clean.includes('prio')) return 'Tier 2';
  return 'Tier 1';
}

export function parsePercentNumber(raw: string): number {
  const normalized = raw.replace(',', '.');
  const match = normalized.match(/[+-]?\d+(\.\d+)?/);
  if (!match) return 0;
  const val = parseFloat(match[0]);
  return Number.isFinite(val) ? val : 0;
}
