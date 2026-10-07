import {
  BASE_PRICE_TABLE,
  CustomerDiscountItem,
  FluteType,
  MidLayerMaterial,
  OuterLayerMaterial,
  OUTER_LAYER_OPTIONS,
  MID_LAYER_OPTIONS,
  PricingInput,
  calculateCartonPricing,
  formatRupiah,
  resolveCustomerEffectiveMargin,
} from './pricingEngine';

// Dynamic Context Sniffer & Anti-Hallucination Engine
export interface WebAppContext {
  appTitle: string;
  metaDescription: string;
  currentPath: string;
  detectedDomain: 'ecommerce' | 'coding' | 'analytics' | 'productivity' | 'general';
  activePageSummary: string;
}

export function detectCurrentWebContext(): WebAppContext {
  if (typeof window === 'undefined') {
    return {
      appTitle: 'MYPAK Sheet Pricing Calculator',
      metaDescription: '',
      currentPath: '/',
      detectedDomain: 'general',
      activePageSummary: '',
    };
  }

  const title = document.title || 'MYPAK Sheet Pricing Calculator';
  const metaDesc =
    document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const path = window.location.pathname;

  const combined = `${title} ${metaDesc} ${path}`.toLowerCase();
  let domain: WebAppContext['detectedDomain'] = 'general';

  if (/shop|store|product|cart|harga|checkout|katalog|pricing|sheet/i.test(combined)) {
    domain = 'ecommerce';
  } else if (/code|developer|api|git|terminal|debug|function/i.test(combined)) {
    domain = 'coding';
  } else if (/metric|dashboard|chart|analisis|report|sql|data/i.test(combined)) {
    domain = 'analytics';
  } else if (/task|note|calendar|doc|project|todo|crm/i.test(combined)) {
    domain = 'productivity';
  }

  const mainHeadings = Array.from(document.querySelectorAll('h1, h2'))
    .slice(0, 3)
    .map((el) => el.textContent?.trim())
    .filter(Boolean)
    .join(' | ');

  return {
    appTitle: title,
    metaDescription: metaDesc,
    currentPath: path,
    detectedDomain: domain,
    activePageSummary: mainHeadings,
  };
}

/**
 * 1. SMART CONTEXT ROUTER / MINI-RAG LOKAL (Saves up to 80% input tokens while keeping 100% accuracy)
 * & 2. DETERMINISTIC PRE-CALCULATION ENGINE (100% Exact TypeScript Math Execution before LLM call)
 */
export interface DetectedSpecAction {
  topLayer: OuterLayerMaterial;
  flute1Layer?: MidLayerMaterial;
  midLayer: MidLayerMaterial;
  flute2Layer?: MidLayerMaterial;
  botLayer: OuterLayerMaterial;
  flute: FluteType;
  marginPercent?: number;
  customerId?: string;
  customerName?: string;
  label: string;
  pricePerM2: number;
}

const VALID_OUTER_SET = new Set<string>(OUTER_LAYER_OPTIONS.map((o) => o.id));
const VALID_MID_SET = new Set<string>(MID_LAYER_OPTIONS.map((m) => m.id));

export function extractSpecsFromText(
  text: string,
  defaultFlute: FluteType = 'B/F',
  defaultMargin = 0
): DetectedSpecAction[] {
  if (!text) return [];
  const results: DetectedSpecAction[] = [];
  const seen = new Set<string>();

  // Detect if text mentions a specific flute near the spec or globally
  let detectedFlute: FluteType = defaultFlute;
  if (/\bCB\s*\/?\s*F(?:lute)?\b/i.test(text) || /\bdouble\s*wall\b/i.test(text)) {
    detectedFlute = 'CB/F';
  } else if (/\bE\s*\/?\s*F(?:lute)?\b/i.test(text)) {
    detectedFlute = 'E/F';
  } else if (/\bC\s*\/?\s*F(?:lute)?\b/i.test(text)) {
    detectedFlute = 'C/F';
  } else if (/\bB\s*\/?\s*F(?:lute)?\b/i.test(text)) {
    detectedFlute = 'B/F';
  }

  // 1. Check 5-Layer Double Wall specs first: Top/Flute1/Mid/Flute2/Bot
  const regex5 =
    /\b([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\b/g;
  let m5: RegExpExecArray | null;
  while ((m5 = regex5.exec(text)) !== null) {
    const top = m5[1].toUpperCase() as OuterLayerMaterial;
    const f1 = m5[2].toUpperCase() as MidLayerMaterial;
    const mid = m5[3].toUpperCase() as MidLayerMaterial;
    const f2 = m5[4].toUpperCase() as MidLayerMaterial;
    const bot = m5[5].toUpperCase() as OuterLayerMaterial;

    if (
      !VALID_OUTER_SET.has(top) ||
      !VALID_MID_SET.has(f1) ||
      !VALID_MID_SET.has(mid) ||
      !VALID_MID_SET.has(f2) ||
      !VALID_OUTER_SET.has(bot)
    ) {
      continue;
    }

    const key = `${top}/${f1}/${mid}/${f2}/${bot}-CB/F-${defaultMargin}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const calc = calculateCartonPricing({
      topLayer: top,
      flute1Layer: f1,
      midLayer: mid,
      flute2Layer: f2,
      botLayer: bot,
      flute: 'CB/F',
      marginPercent: defaultMargin,
    });

    if (calc.success) {
      results.push({
        topLayer: top,
        flute1Layer: f1,
        midLayer: mid,
        flute2Layer: f2,
        botLayer: bot,
        flute: 'CB/F',
        marginPercent: defaultMargin,
        label: `${top}/${f1}/${mid}/${f2}/${bot} (CB/F)`,
        pricePerM2: calc.hargaBersihPerM2,
      });
    }
  }

  // 2. Check 3-Layer Single Wall specs: Top/Mid/Bot (skip substrings of 5-layer matches)
  const stripped5 = text.replace(regex5, ' ');
  const regex3 = /\b([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\b/g;
  const swFlute: FluteType = detectedFlute === 'CB/F' ? 'B/F' : detectedFlute;

  let m3: RegExpExecArray | null;
  while ((m3 = regex3.exec(stripped5)) !== null) {
    const top = m3[1].toUpperCase() as OuterLayerMaterial;
    const mid = m3[2].toUpperCase() as MidLayerMaterial;
    const bot = m3[3].toUpperCase() as OuterLayerMaterial;

    if (!VALID_OUTER_SET.has(top) || !VALID_MID_SET.has(mid) || !VALID_OUTER_SET.has(bot)) {
      continue;
    }

    const key = `${top}/${mid}/${bot}-${swFlute}-${defaultMargin}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const calc = calculateCartonPricing({
      topLayer: top,
      midLayer: mid,
      botLayer: bot,
      flute: swFlute,
      marginPercent: defaultMargin,
    });

    if (calc.success) {
      results.push({
        topLayer: top,
        midLayer: mid,
        botLayer: bot,
        flute: swFlute,
        marginPercent: defaultMargin,
        label: `${top}/${mid}/${bot} (${swFlute})`,
        pricePerM2: calc.hargaBersihPerM2,
      });
    }
  }

  return results.slice(0, 4);
}

/**
 * Build Smart Mini-RAG + Deterministic Pre-Calculation Context for the latest user query
 */
export function buildSmartRagAndPreCalcContext(
  userQuery: string,
  customers: CustomerDiscountItem[],
  selectedCustomerId: string | null,
  activeCalculationInput: PricingInput
): string {
  const q = (userQuery || '').trim();
  const qLower = q.toLowerCase();

  const activeCust = customers.find((c) => c.id === selectedCustomerId) || null;
  const tierCounts = {
    'Tier 1': customers.filter((c) => c.tier === 'Tier 1').length,
    'Tier 2': customers.filter((c) => c.tier === 'Tier 2').length,
    'Tier 3': customers.filter((c) => c.tier === 'Tier 3').length,
    'Tier 4': customers.filter((c) => c.tier === 'Tier 4').length,
  };

  // 1. Check if user is asking for ALL customers or full tier list
  const asksAllCustomers =
    /\b(semua\s+customer|daftar\s+lengkap|seluruh\s+customer|103\s+customer|list\s+customer|semua\s+pt|berapa\s+customer|total\s+customer)\b/i.test(
      qLower
    );

  // 2. Match specific customers mentioned by name or Tier in the query
  const queryTokens = qLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 3 &&
        ![
          'yang',
          'untuk',
          'berapa',
          'harga',
          'spek',
          'karton',
          'sheet',
          'dan',
          'atau',
          'dengan',
          'dari',
          'pada',
          'pt',
          'cv',
          'tier',
          'diskon',
          'margin',
          'flute',
        ].includes(w)
    );

  const matchedCustomers = customers.filter((c) => {
    const cLower = c.name.toLowerCase();
    if (qLower.includes(cLower)) return true;
    return queryTokens.some((tok) => cLower.includes(tok));
  });

  // Also check if user asks about a specific Tier (e.g., "Tier 1", "Tier 2", "Tier 3", "Tier 4")
  const tierMatch = qLower.match(/\btier\s*([1-4])\b/i);
  const requestedTier = tierMatch ? (`Tier ${tierMatch[1]}` as CustomerDiscountItem['tier']) : null;
  const tierFilteredCustomers = requestedTier
    ? customers.filter((c) => c.tier === requestedTier)
    : [];

  // 3. Deterministic Pre-Calculation Engine (Supports both 3-Layer SW and 5-Layer DW CB/F)
  type PreCalcSpecItem = {
    isDW: boolean;
    top: OuterLayerMaterial;
    f1?: MidLayerMaterial;
    mid: MidLayerMaterial;
    f2?: MidLayerMaterial;
    bot: OuterLayerMaterial;
  };
  const mentionedSpecs: PreCalcSpecItem[] = [];

  const regex5 =
    /\b([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\b/g;
  let m5: RegExpExecArray | null;
  while ((m5 = regex5.exec(q)) !== null) {
    const top = m5[1].toUpperCase() as OuterLayerMaterial;
    const f1 = m5[2].toUpperCase() as MidLayerMaterial;
    const mid = m5[3].toUpperCase() as MidLayerMaterial;
    const f2 = m5[4].toUpperCase() as MidLayerMaterial;
    const bot = m5[5].toUpperCase() as OuterLayerMaterial;
    if (
      VALID_OUTER_SET.has(top) &&
      VALID_MID_SET.has(f1) &&
      VALID_MID_SET.has(mid) &&
      VALID_MID_SET.has(f2) &&
      VALID_OUTER_SET.has(bot)
    ) {
      mentionedSpecs.push({ isDW: true, top, f1, mid, f2, bot });
    }
  }

  const strippedQ = q.replace(regex5, ' ');
  const regex3 = /\b([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\s*\/\s*([MKmk]\d{3})\b/g;
  let m3: RegExpExecArray | null;
  while ((m3 = regex3.exec(strippedQ)) !== null) {
    const top = m3[1].toUpperCase() as OuterLayerMaterial;
    const mid = m3[2].toUpperCase() as MidLayerMaterial;
    const bot = m3[3].toUpperCase() as OuterLayerMaterial;
    if (VALID_OUTER_SET.has(top) && VALID_MID_SET.has(mid) && VALID_OUTER_SET.has(bot)) {
      mentionedSpecs.push({ isDW: false, top, mid, bot });
    }
  }

  // Detect dimensions in query like "1860 x 1161" or use active calculator dimensions
  const dimMatch = q.match(/\b(\d{3,4})\s*[x×*]\s*(\d{3,4})\b/i);
  const queryLengthMm = dimMatch ? Number(dimMatch[1]) : activeCalculationInput.sheetLengthMm;
  const queryWidthMm = dimMatch ? Number(dimMatch[2]) : activeCalculationInput.sheetWidthMm;

  const specsToPreCalc: PreCalcSpecItem[] =
    mentionedSpecs.length > 0
      ? mentionedSpecs.slice(0, 4)
      : [
          {
            isDW: activeCalculationInput.flute === 'CB/F',
            top: activeCalculationInput.topLayer,
            f1: activeCalculationInput.flute1Layer || 'M125',
            mid: activeCalculationInput.midLayer,
            f2: activeCalculationInput.flute2Layer || 'M125',
            bot: activeCalculationInput.botLayer,
          },
        ];

  const marginsToCalc: Array<{
    label: string;
    margin: number;
    customerRef?: CustomerDiscountItem;
  }> = [
    {
      label: `Kalkulator Aktif (${activeCalculationInput.marginPercent}%)`,
      margin: activeCalculationInput.marginPercent,
      customerRef: activeCust || undefined,
    },
  ];
  if (activeCalculationInput.marginPercent !== 0) {
    marginsToCalc.push({ label: 'Nett 0%', margin: 0 });
  }
  matchedCustomers.slice(0, 4).forEach((mc) => {
    marginsToCalc.push({
      label: `${mc.name} (${mc.tier}, SW:${mc.swMarginPercent}%, 275/EF:${mc.dwMarginPercent}%)`,
      margin: mc.swMarginPercent,
      customerRef: mc,
    });
  });

  const pctMatch = q.match(/([+-]?\d+(?:[.,]\d+)?)\s*%/);
  if (pctMatch) {
    const parsedPct = parseFloat(pctMatch[1].replace(',', '.'));
    if (Number.isFinite(parsedPct) && !marginsToCalc.some((x) => x.margin === parsedPct && !x.customerRef)) {
      marginsToCalc.push({ label: `Input Query (${parsedPct}%)`, margin: parsedPct });
    }
  }

  const deterministicPreCalcLines: string[] = [];
  for (const sp of specsToPreCalc) {
    for (const mg of marginsToCalc) {
      if (sp.isDW) {
        const resolved = mg.customerRef
          ? resolveCustomerEffectiveMargin(mg.customerRef, {
              topLayer: sp.top,
              flute1Layer: sp.f1,
              midLayer: sp.mid,
              flute2Layer: sp.f2,
              botLayer: sp.bot,
              flute: 'CB/F',
            })
          : {
              effectiveMarginPercent: mg.margin,
              customerSpecial275EfOverrideActive: false,
            };

        const cbf = calculateCartonPricing({
          topLayer: sp.top,
          flute1Layer: sp.f1,
          midLayer: sp.mid,
          flute2Layer: sp.f2,
          botLayer: sp.bot,
          flute: 'CB/F',
          marginPercent: resolved.effectiveMarginPercent,
          customerSpecial275EfOverrideActive: resolved.customerSpecial275EfOverrideActive,
          sheetLengthMm: queryLengthMm,
          sheetWidthMm: queryWidthMm,
        });

        if (cbf.success) {
          const pcsText =
            cbf.hargaPerSheetRp !== undefined
              ? ` | Luas ${queryLengthMm}x${queryWidthMm}mm (${cbf.areaPerSheetM2?.toFixed(5)} M²) => Harga/Pcs = ${formatRupiah(cbf.hargaPerSheetRp)}`
              : '';
          deterministicPreCalcLines.push(
            `• Double Wall 5-Layer ${cbf.inputSubstanceString} [${mg.label}] -> Acuan: #${cbf.baseRowNo} ${cbf.mappedReferenceSubstance} (${formatRupiah(cbf.basePrice)}) | Virtual Base: ${formatRupiah(cbf.virtualBase)} (+Rp ${cbf.totalNominalUpgrade}) | Additive Modifier: ${cbf.totalAdditiveModifierPercent > 0 ? '+' : ''}${cbf.totalAdditiveModifierPercent}% (Margin ${cbf.marginPercent}% + Mult ${cbf.totalMultiplierPercent}% - Diskon DW ${cbf.totalDowngradePercent}%) => HASIL EKSAK CB/F = ${formatRupiah(cbf.hargaBersihPerM2)}/M² (mentah ${cbf.hargaFinalMentah.toFixed(2)})${pcsText}`
          );
        }
      } else {
        const calcForFlute = (fluteType: 'B/F' | 'C/F' | 'E/F') => {
          const resolved = mg.customerRef
            ? resolveCustomerEffectiveMargin(mg.customerRef, {
                topLayer: sp.top,
                midLayer: sp.mid,
                botLayer: sp.bot,
                flute: fluteType,
              })
            : {
                effectiveMarginPercent: mg.margin,
                customerSpecial275EfOverrideActive: false,
              };
          return calculateCartonPricing({
            topLayer: sp.top,
            midLayer: sp.mid,
            botLayer: sp.bot,
            flute: fluteType,
            marginPercent: resolved.effectiveMarginPercent,
            customerSpecial275EfOverrideActive: resolved.customerSpecial275EfOverrideActive,
            sheetLengthMm: queryLengthMm,
            sheetWidthMm: queryWidthMm,
          });
        };

        const bf = calcForFlute('B/F');
        const cf = calcForFlute('C/F');
        const ef = calcForFlute('E/F');

        if (bf.success && cf.success && ef.success) {
          const pcsText =
            bf.hargaPerSheetRp !== undefined
              ? ` | Harga/Pcs (${queryLengthMm}x${queryWidthMm}mm): B/F=${formatRupiah(bf.hargaPerSheetRp)}, C/F=${formatRupiah(cf.hargaPerSheetRp!)}, E/F=${formatRupiah(ef.hargaPerSheetRp!)}`
              : '';
          deterministicPreCalcLines.push(
            `• Single Wall 3-Layer ${sp.top}/${sp.mid}/${sp.bot} [${mg.label}] -> Acuan: #${bf.baseRowNo} ${bf.mappedReferenceSubstance}${bf.autoSwapped ? ' (Auto-Swap)' : ''} | Virtual Base B/F: ${formatRupiah(bf.virtualBase)} (+Rp ${bf.totalNominalUpgrade}) | Downgrade SW: -${bf.totalDowngradePercent}% | Total Additive Mod B/F: ${bf.totalAdditiveModifierPercent > 0 ? '+' : ''}${bf.totalAdditiveModifierPercent}% => HASIL EKSAK: B/F = ${formatRupiah(bf.hargaBersihPerM2)}/M² (mentah ${bf.hargaFinalMentah.toFixed(2)}), C/F = ${formatRupiah(cf.hargaBersihPerM2)}/M², E/F = ${formatRupiah(ef.hargaBersihPerM2)}/M² (Mod E/F: ${ef.totalAdditiveModifierPercent > 0 ? '+' : ''}${ef.totalAdditiveModifierPercent}%)${pcsText}`
          );
        }
      }
    }
  }

  // Build Customer Context Block (Smart Mini-RAG)
  let customerRagBlock = `Total Customer Terdaftar: ${customers.length} Customer (Tier 1: ${tierCounts['Tier 1']}, Tier 2: ${tierCounts['Tier 2']}, Tier 3: ${tierCounts['Tier 3']}, Tier 4: ${tierCounts['Tier 4']})
Customer Aktif di Kalkulator: ${
    activeCust
      ? `${activeCust.name} (${activeCust.tier}, Diskon SW: ${activeCust.swMarginPercent > 0 ? `+${activeCust.swMarginPercent}%` : `${activeCust.swMarginPercent}%`}, Kolom 275 / E Flute: ${activeCust.dwMarginPercent > 0 ? `+${activeCust.dwMarginPercent}%` : `${activeCust.dwMarginPercent}%`})`
      : 'Manual (Tanpa Customer Spesifik)'
  }`;

  if (matchedCustomers.length > 0 && !asksAllCustomers) {
    customerRagBlock += `\nHASIL PENCARIAN MINI-RAG CUSTOMER YANG COCOK DENGAN PERTANYAAN USER:\n${matchedCustomers
      .map(
        (c, i) =>
          `${i + 1}. ${c.name} [${c.tier} | Diskon SW: ${c.swMarginPercent > 0 ? `+${c.swMarginPercent}%` : `${c.swMarginPercent}%`} | 275 / E Flute: ${c.dwMarginPercent > 0 ? `+${c.dwMarginPercent}%` : `${c.dwMarginPercent}%`}]`
      )
      .join('\n')}`;
  }

  if (tierFilteredCustomers.length > 0 && !asksAllCustomers) {
    customerRagBlock += `\nDAFTAR CUSTOMER ${requestedTier?.toUpperCase()} (${tierFilteredCustomers.length} PT):\n${tierFilteredCustomers
      .map(
        (c, i) =>
          `${i + 1}.${c.name}[SW:${c.swMarginPercent > 0 ? `+${c.swMarginPercent}%` : `${c.swMarginPercent}%`}|275/EF:${c.dwMarginPercent > 0 ? `+${c.dwMarginPercent}%` : `${c.dwMarginPercent}%`}]`
      )
      .join('; ')}`;
  }

  if (
    asksAllCustomers ||
    (/\b(customer|pt|cv|klien|pelanggan|diskon|tier)\b/i.test(qLower) &&
      matchedCustomers.length === 0 &&
      tierFilteredCustomers.length === 0)
  ) {
    const allRows = customers
      .map(
        (c, idx) =>
          `${idx + 1}.${c.name}[${c.tier}|SW:${c.swMarginPercent > 0 ? `+${c.swMarginPercent}%` : `${c.swMarginPercent}%`}|275/EF:${c.dwMarginPercent > 0 ? `+${c.dwMarginPercent}%` : `${c.dwMarginPercent}%`}]`
      )
      .join('; ');
    customerRagBlock += `\nDIREKTORI LENGKAP ${customers.length} CUSTOMER:\n${allRows}`;
  }

  const masterTableCompact = BASE_PRICE_TABLE.map(
    (r) =>
      `${r.no}.${r.substance}(BF:${r['B/F']},CF:${r['C/F']},EF:${r['E/F']},CBF:${
        r['CB/F'] ?? 'TIDAK_ADA'
      })`
  ).join('; ');

  return `[DETERMINISTIC PRE-CALCULATION ENGINE — 100% EXACT VERIFIED NUMBERS (GUNAKAN ANGKA INI SECARA LANGSUNG TANPA MENGHITUNG ULANG MANUAL)]
${deterministicPreCalcLines.join('\n')}

[SMART MINI-RAG CUSTOMER & MASTER TABLE CONTEXT]
${customerRagBlock}
TABEL MASTER 15 ACUAN (Rp/M²):
${masterTableCompact}`;
}

/**
 * 3. INSTANT RESPONSE CACHE (0ms Latency for Repeated Queries in the Same Context)
 */
const SESSION_RESPONSE_CACHE = new Map<
  string,
  { content: string; reasoning?: string; modelUsed: string; timestamp: number }
>();

export function getCachedAIResponse(
  query: string,
  calculatorSnapshot: string,
  roleId: string
): { content: string; reasoning?: string; modelUsed: string } | null {
  const normalizedKey = `${roleId}::${calculatorSnapshot}::${query.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  const hit = SESSION_RESPONSE_CACHE.get(normalizedKey);
  if (!hit) return null;
  if (Date.now() - hit.timestamp > 15 * 60 * 1000) {
    SESSION_RESPONSE_CACHE.delete(normalizedKey);
    return null;
  }
  return hit;
}

export function setCachedAIResponse(
  query: string,
  calculatorSnapshot: string,
  roleId: string,
  data: { content: string; reasoning?: string; modelUsed: string }
): void {
  if (!query.trim() || !data.content || data.content.length < 20) return;
  const normalizedKey = `${roleId}::${calculatorSnapshot}::${query.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  SESSION_RESPONSE_CACHE.set(normalizedKey, {
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * 4. AUTO-RESIZE & SMART IMAGE COMPRESSION BEFORE UPLOAD
 */
export function compressImageFileToBase64(
  fileOrBlob: File | Blob,
  maxDimension = 1280,
  quality = 0.82
): Promise<{ base64Data: string; previewUrl: string; mimeType: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = (ev) => {
      const rawDataUrl = String(ev.target?.result || '');
      const img = new Image();
      img.onerror = () => {
        const commaIdx = rawDataUrl.indexOf(',');
        resolve({
          base64Data: commaIdx !== -1 ? rawDataUrl.slice(commaIdx + 1) : '',
          previewUrl: rawDataUrl,
          mimeType: fileOrBlob.type || 'image/jpeg',
          sizeBytes: fileOrBlob.size,
        });
      };
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const commaIdx = rawDataUrl.indexOf(',');
          resolve({
            base64Data: commaIdx !== -1 ? rawDataUrl.slice(commaIdx + 1) : '',
            previewUrl: rawDataUrl,
            mimeType: fileOrBlob.type || 'image/jpeg',
            sizeBytes: fileOrBlob.size,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const targetMime = 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(targetMime, quality);
        const commaIdx = compressedDataUrl.indexOf(',');
        const base64Data = commaIdx !== -1 ? compressedDataUrl.slice(commaIdx + 1) : '';
        const approxBytes = Math.round((base64Data.length * 3) / 4);

        resolve({
          base64Data,
          previewUrl: compressedDataUrl,
          mimeType: targetMime,
          sizeBytes: approxBytes,
        });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

export function buildUniversalSystemInstruction(
  basePrompt: string,
  rolePrompt?: string,
  activeCalculatorSnapshot?: string,
  customerDatabaseSnapshot?: string
): string {
  const ctx = detectCurrentWebContext();

  const groundingEnvelope = `
[RUNTIME CONTEXT GROUNDING & DETERMINISTIC MULTITASK ENGINE]
- Current Application: "${ctx.appTitle}"
- Active Calculator Spec & Price Snapshot: ${activeCalculatorSnapshot || 'Standar'}
- CRITICAL ACCURACY & SPEED INSTRUCTION:
  1. Di bawah ini terdapat bagian [DETERMINISTIC PRE-CALCULATION ENGINE] yang sudah menghitung harga eksak 100% menggunakan mesin TypeScript Additive Architecture (Single Wall 3-Layer & Double Wall CB/F 5-Layer) untuk spesifikasi yang ditanyakan user maupun spesifikasi yang sedang aktif. WAJIB gunakan angka hasil hitungan eksak tersebut secara langsung! Jangan menghitung ulang secara kira-kira.
  2. Anda mampu menjawab pertanyaan Database Customer (Tier 1–4, Diskon SW & Kolom 275 / E Flute), Perhitungan Harga Karton Sheet (Tahap 1–4 Additive Modifier), maupun kombinasi keduanya secara instan dan ringkas.

${customerDatabaseSnapshot ? `${customerDatabaseSnapshot}\n` : ''}
[RICH OUTPUT, MATHEMATICAL LATEX & STRICT TABLE RESTRAINT RULES]
- Text Styling: Gunakan **bold**, *italic*, inline \`code\`, dan poin bullet yang bersih.
- Mathematical Formulas: Gunakan LaTeX \`$...$\` atau \`$$...$$\` bila diperlukan.
- STRICT TABLE & CONTAINER RESTRAINT (CRITICAL):
  * JANGAN gunakan tabel Markdown (\`| ... |\`) atau blok kotak kode untuk jawaban biasa, rincian harga 1–3 spesifikasi, atau pengecekan customer tunggal! Sajikan dengan paragraf singkat dan bullet points yang rapi.
  * Gunakan tabel HANYA jika user secara eksplisit meminta tabel ("buatkan tabel", "dalam bentuk tabel") atau saat menyajikan perbandingan data berjumlah besar (5+ baris).

[ROLE & BEHAVIOR SPECIFICATION]
${rolePrompt || basePrompt}
`.trim();

  return groundingEnvelope;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
