import { CustomerDiscountItem, CustomerTier } from './pricingEngine';

/**
 * Smooth Haptic Feedback & Micro-Acoustic Tactile Engine
 * Optimized for 120Hz High-Refresh-Rate Displays & Mobile/Desktop Immersion
 */
let sharedAudioCtx: AudioContext | null = null;

export function triggerHaptic(type: 'light' | 'medium' | 'success' = 'light'): void {
  try {
    // 1. Native Vibration API (Android / Supported Mobile Browsers)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'light') navigator.vibrate(6);
      else if (type === 'medium') navigator.vibrate(12);
      else if (type === 'success') navigator.vibrate([8, 30, 12]);
    }

    // 2. Ultra-Subtle Tactile Tick (iOS / Desktop 120Hz Immersion)
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
 */
export function generateCustomerTemplateMarkdown(): string {
  return `# Database Diskon Customer — MYPAK Sheet Pricing Calculator
Gunakan tabel Markdown di bawah ini untuk mengimpor daftar customer beserta persentase Diskon (-%) atau Margin (+%) untuk Single Wall (SW) dan Double Wall (DW).
Pilihan Tier yang didukung: **VIP**, **Priority**, atau **Reguler**.

| Nama Customer | Tier | SW (%) | DW (%) |
| :--- | :--- | :--- | :--- |
| PT Vinns Carton | Priority | +9% | +13% |
| Contoh Customer Diskon Minus | VIP | -4.5% | +5% |
| Contoh Customer Reguler | Reguler | +7.5% | +11% |
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
 * Parse uploaded .md, .csv, .txt, or .json file into CustomerDiscountItem[]
 */
export function parseCustomerImportFile(rawText: string): CustomerDiscountItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // 1. Try JSON format first if starts with [ or {
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
          tier: normalizeTier(String(item.tier || 'Priority')),
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

    // 2. Markdown Table Row: | PT Vinns Carton | Priority | +9% | +13% |
    if (line.includes('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => {
          // Remove empty leading/trailing cells from outer pipes
          if (idx === 0 && line.startsWith('|')) return false;
          if (idx === arr.length - 1 && line.endsWith('|')) return false;
          return true;
        });

      if (cells.length >= 2) {
        const firstCellLower = cells[0].toLowerCase();
        // Skip header or separator rows like | :--- | or | Nama Customer |
        if (
          firstCellLower.includes('nama') ||
          firstCellLower.includes('customer') ||
          /^[:\-=\s]+$/.test(cells[0])
        ) {
          continue;
        }

        const name = cells[0].replace(/\*\*/g, '').trim();
        if (!name) continue;

        // Check if 4 columns (Name | Tier | SW | DW) or 3 columns (Name | SW | DW)
        if (cells.length >= 4) {
          results.push({
            id: `cust-imp-${Date.now()}-${i}`,
            name,
            tier: normalizeTier(cells[1]),
            swMarginPercent: parsePercentNumber(cells[2]),
            dwMarginPercent: parsePercentNumber(cells[3]),
          });
        } else if (cells.length === 3) {
          results.push({
            id: `cust-imp-${Date.now()}-${i}`,
            name,
            tier: 'Priority',
            swMarginPercent: parsePercentNumber(cells[1]),
            dwMarginPercent: parsePercentNumber(cells[2]),
          });
        } else if (cells.length === 2) {
          results.push({
            id: `cust-imp-${Date.now()}-${i}`,
            name,
            tier: 'Priority',
            swMarginPercent: parsePercentNumber(cells[1]),
            dwMarginPercent: 0,
          });
        }
        continue;
      }
    }

    // 3. Bullet or Line Format: "- PT Vinns Carton | VIP | SW: +9% | DW: +13%" or "PT Vinns Carton, Priority, 9, 13"
    const cleanedLine = line.replace(/^[-*•]\s*/, '').trim();
    if (cleanedLine.includes(',') || cleanedLine.includes(';')) {
      const delim = cleanedLine.includes(';') ? ';' : ',';
      const cols = cleanedLine.split(delim).map((c) => c.trim());
      const firstLower = cols[0].toLowerCase();
      if (firstLower.includes('nama') || firstLower.includes('customer')) continue;

      if (cols.length >= 4) {
        results.push({
          id: `cust-imp-${Date.now()}-${i}`,
          name: cols[0],
          tier: normalizeTier(cols[1]),
          swMarginPercent: parsePercentNumber(cols[2]),
          dwMarginPercent: parsePercentNumber(cols[3]),
        });
      } else if (cols.length === 3) {
        results.push({
          id: `cust-imp-${Date.now()}-${i}`,
          name: cols[0],
          tier: 'Priority',
          swMarginPercent: parsePercentNumber(cols[1]),
          dwMarginPercent: parsePercentNumber(cols[2]),
        });
      }
    }
  }

  return results;
}

function normalizeTier(raw: string): CustomerTier {
  const clean = raw.toLowerCase().trim();
  if (clean.includes('vip')) return 'VIP';
  if (clean.includes('reg')) return 'Reguler';
  return 'Priority';
}

function parsePercentNumber(raw: string): number {
  // Extract signed float e.g. "SW: +9.5%" -> 9.5, "-4,5%" -> -4.5
  const normalized = raw.replace(',', '.');
  const match = normalized.match(/[+-]?\d+(\.\d+)?/);
  if (!match) return 0;
  const val = parseFloat(match[0]);
  return Number.isFinite(val) ? val : 0;
}
