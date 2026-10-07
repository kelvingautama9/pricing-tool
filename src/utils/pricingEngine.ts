/**
 * CORE BUSINESS LOGIC & DYNAMIC PRICING ENGINE (THE ADDITIVE ARCHITECTURE)
 * Project: Otomatisasi Penghitungan Harga Substance Karton Sheet
 * Company: PT Prokemas Adhikari Kreasi
 * Architecture: Single Wall (3-Layer) & Double Wall CB/F (5-Layer) Additive Modifier Engine
 */

export type OuterLayerMaterial =
  | 'M100'
  | 'M110'
  | 'M125'
  | 'M135'
  | 'M150'
  | 'K110'
  | 'K125'
  | 'K135'
  | 'K150'
  | 'K200'
  | 'K275';

// Strict Inner Layer Validation: JANGAN sediakan opsi K110, K125, K135 pada Mid (SW) atau Flute1/Mid/Flute2 (DW).
export type MidLayerMaterial =
  | 'M100'
  | 'M110'
  | 'M125'
  | 'M135'
  | 'M150'
  | 'K150'
  | 'K200'
  | 'K275';

export type FluteType = 'B/F' | 'C/F' | 'E/F' | 'CB/F';
export type SingleWallFlute = 'B/F' | 'C/F' | 'E/F';

export type LayerPositionLabel = 'Top' | 'Flute 1' | 'Middle' | 'Flute 2' | 'Bottom';

export interface BasePriceRow {
  no: number;
  substance: string;
  'B/F': number;
  'C/F': number;
  'CB/F': number | null; // M125/M125/M125 tidak ada harga CB/F (NULL) sesuai Blueprint
  'E/F': number;
}

/**
 * 2. MASTER DATA (BASE PRICE DATABASE)
 * Harga dalam Rupiah per Meter Persegi (M²). Harga berpusat pada varian ketebalan 125.
 */
export const BASE_PRICE_TABLE: BasePriceRow[] = [
  { no: 1, substance: 'M125/M125/M125', 'B/F': 3894, 'C/F': 3982, 'CB/F': null, 'E/F': 4075 },
  { no: 2, substance: 'K125/M125/M125', 'B/F': 4009, 'C/F': 4098, 'CB/F': 6708, 'E/F': 4191 },
  { no: 3, substance: 'K125/M125/K125', 'B/F': 4125, 'C/F': 4214, 'CB/F': 6825, 'E/F': 4306 },
  { no: 4, substance: 'K150/M125/M125', 'B/F': 4210, 'C/F': 4299, 'CB/F': 6909, 'E/F': 4392 },
  { no: 5, substance: 'K150/M125/K125', 'B/F': 4325, 'C/F': 4415, 'CB/F': 7025, 'E/F': 4507 },
  { no: 6, substance: 'K150/M125/K150', 'B/F': 4526, 'C/F': 4615, 'CB/F': 7225, 'E/F': 4708 },
  { no: 7, substance: 'K200/M125/M125', 'B/F': 4789, 'C/F': 4881, 'CB/F': 7592, 'E/F': 4971 },
  { no: 8, substance: 'K200/M125/K125', 'B/F': 4909, 'C/F': 5001, 'CB/F': 7712, 'E/F': 5091 },
  { no: 9, substance: 'K200/M125/K150', 'B/F': 5117, 'C/F': 5210, 'CB/F': 7921, 'E/F': 5299 },
  { no: 10, substance: 'K200/M125/K200', 'B/F': 5535, 'C/F': 5626, 'CB/F': 8337, 'E/F': 5716 },
  { no: 11, substance: 'K275/M125/M125', 'B/F': 5935, 'C/F': 6031, 'CB/F': 8842, 'E/F': 6116 },
  { no: 12, substance: 'K275/M125/K125', 'B/F': 6060, 'C/F': 6155, 'CB/F': 8966, 'E/F': 6242 },
  { no: 13, substance: 'K275/M125/K150', 'B/F': 6275, 'C/F': 6372, 'CB/F': 9183, 'E/F': 6457 },
  { no: 14, substance: 'K275/M125/K200', 'B/F': 6708, 'C/F': 6804, 'CB/F': 9615, 'E/F': 6890 },
  { no: 15, substance: 'K275/M125/K275', 'B/F': 7951, 'C/F': 8050, 'CB/F': 10962, 'E/F': 8133 },
];

export const OUTER_LAYER_OPTIONS: Array<{
  id: OuterLayerMaterial;
  name: string;
  group: 'Medium' | 'Kraft';
  tag: string;
}> = [
  { id: 'M100', name: 'M100', group: 'Medium', tag: 'SW -4% · DW -2.5%' },
  { id: 'M110', name: 'M110', group: 'Medium', tag: 'SW -2.5% · DW -1.5%' },
  { id: 'M125', name: 'M125', group: 'Medium', tag: 'Base' },
  { id: 'M135', name: 'M135', group: 'Medium', tag: '+300 / -2% (-1% DW)' },
  { id: 'M150', name: 'M150', group: 'Medium', tag: '+300' },
  { id: 'K110', name: 'K110', group: 'Kraft', tag: 'SW -2.5% · DW -1.5%' },
  { id: 'K125', name: 'K125', group: 'Kraft', tag: 'Base' },
  { id: 'K135', name: 'K135', group: 'Kraft', tag: 'SW -2% · DW -1%' },
  { id: 'K150', name: 'K150', group: 'Kraft', tag: 'Base' },
  { id: 'K200', name: 'K200', group: 'Kraft', tag: 'Base' },
  { id: 'K275', name: 'K275', group: 'Kraft', tag: '+2%' },
];

export const MID_LAYER_OPTIONS: Array<{
  id: MidLayerMaterial;
  name: string;
  group: 'Medium' | 'Kraft';
  tag: string;
}> = [
  { id: 'M100', name: 'M100', group: 'Medium', tag: 'SW -4% · DW -2.5%' },
  { id: 'M110', name: 'M110', group: 'Medium', tag: 'SW -2.5% · DW -1.5%' },
  { id: 'M125', name: 'M125', group: 'Medium', tag: 'Base' },
  { id: 'M135', name: 'M135', group: 'Medium', tag: '+300 / -2% (-1% DW)' },
  { id: 'M150', name: 'M150', group: 'Medium', tag: '+300' },
  { id: 'K150', name: 'K150', group: 'Kraft', tag: '+2.000' },
  { id: 'K200', name: 'K200', group: 'Kraft', tag: '+2.000' },
  { id: 'K275', name: 'K275', group: 'Kraft', tag: '+3.700 / +2%' },
];

// Flute Options: B/F, C/F, E/F (Single Wall 3-Layer) & CB/F (Double Wall 5-Layer)
export const FLUTE_OPTIONS: Array<{
  id: FluteType;
  name: string;
  tag: string;
  supported: boolean;
}> = [
  { id: 'B/F', name: 'B/F', tag: 'SW', supported: true },
  { id: 'C/F', name: 'C/F', tag: 'SW', supported: true },
  { id: 'E/F', name: 'E/F', tag: '+2%', supported: true },
  { id: 'CB/F', name: 'CB/F', tag: 'DW 5-Layer', supported: true },
];

export type CustomerTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4';

/**
 * Customer Discount Item:
 * - `swMarginPercent`: Diskon / Margin Reguler (%)
 * - `dwMarginPercent`: Kolom khusus "275 / E Flute" (%) yang ditetapkan oleh Sales/Market.
 *   (Tetap mempertahankan nama properti `dwMarginPercent` agar kompatibel 100% dengan data LocalStorage yang sudah tersimpan).
 */
export interface CustomerDiscountItem {
  id: string;
  name: string;
  tier: CustomerTier;
  swMarginPercent: number; // Diskon Reguler (%)
  dwMarginPercent: number; // Diskon Khusus 275 / E Flute (%) — sudah termasuk efek +2% sesuai ketentuan sales
}

export const INITIAL_CUSTOMERS: CustomerDiscountItem[] = [
  {
    id: 'cust-1',
    name: 'PT Vinns Carton',
    tier: 'Tier 1',
    swMarginPercent: 9,
    dwMarginPercent: 11,
  },
];

export interface PricingInput {
  topLayer: OuterLayerMaterial;
  flute1Layer?: MidLayerMaterial; // Khusus Double Wall (CB/F)
  midLayer: MidLayerMaterial;
  flute2Layer?: MidLayerMaterial; // Khusus Double Wall (CB/F)
  botLayer: OuterLayerMaterial;
  flute: FluteType;
  marginPercent: number; // Margin (%) yang sedang aktif di input
  // Opsional: Proteksi Anti-Double-Count saat Customer dipilih dari Database
  customerSpecial275EfOverrideActive?: boolean;
  sheetLengthMm?: number; // Panjang (mm)
  sheetWidthMm?: number;  // Lebar (mm)
  quantityPcs?: number;
}

export interface UpgradeDetail {
  layerPosition: LayerPositionLabel;
  originalMaterial: string;
  referenceMaterial: string;
  amountRp: number;
  reason: string;
}

export interface DowngradeDetail {
  layerPosition: LayerPositionLabel;
  originalMaterial: string;
  fromThickness: number;
  toThickness: number;
  discountPercent: number; // e.g. 2.5 for -2.5% (SW) or 1.5 for -1.5% (DW)
  reason: string;
}

export interface MultiplierDetail {
  code: '275_MATERIAL' | 'EF_FLUTE' | 'CUSTOMER_275_EF_INCLUDED';
  label: string;
  percent: number; // e.g. 2 for +2%, or 0 when already included in Customer's 275/E-Flute rate
}

export interface PricingCalculationResult {
  success: boolean;
  errorCode?: 'FREE_TEXT_INVALID' | 'DOUBLE_WALL_TRAP' | 'MISSING_DB_MAPPING' | 'INVALID_MID_LAYER';
  errorMessage?: string;
  input: PricingInput;
  isDoubleWall: boolean;
  inputSubstanceString: string;
  mappedSubstanceBeforeSwap: string;
  mappedReferenceSubstance: string;
  autoSwapped: boolean;
  appliedRulesLog: string[];

  // Step 1: Master Base Lookup
  basePrice: number;
  baseRowNo: number;

  // Step 2: Virtual Base (Base + Nominal Upgrade)
  upgradeDetails: UpgradeDetail[];
  totalNominalUpgrade: number;
  virtualBase: number;

  // Step 3: Additive Percentage Modifiers (Total Modifier = Margin + Multiplier - Downgrade)
  downgradeDetails: DowngradeDetail[];
  totalDowngradePercent: number; // e.g. 7.5 for -7.5%
  totalDowngradeDecimal: number; // e.g. 0.075
  discountNominalRp: number;     // VirtualBase * totalDowngradeDecimal
  hargaDiskon: number;           // VirtualBase - discountNominalRp

  marginPercent: number;         // e.g. 9.5 for +9.5%
  marginDecimal: number;         // e.g. 0.095
  marginNominalRp: number;       // VirtualBase * marginDecimal
  hargaDenganMargin: number;     // VirtualBase * (1 + marginDecimal - totalDowngradeDecimal)

  multiplierDetails: MultiplierDetail[];
  totalMultiplierPercent: number; // e.g. 4 for +4%
  totalMultiplierDecimal: number; // e.g. 0.04
  multiplierNominalRp: number;    // VirtualBase * totalMultiplierDecimal

  // Combined Additive Modifier
  totalAdditiveModifierPercent: number; // Margin + Multiplier - Downgrade (in %)
  totalAdditiveModifierDecimal: number; // (Margin + Multiplier - Downgrade) / 100
  totalAdditiveNominalRp: number;       // VirtualBase * totalAdditiveModifierDecimal

  // Step 4: Finalization (M² & Pcs)
  hargaFinalMentah: number;      // VirtualBase * (1 + totalAdditiveModifierDecimal)
  hargaBersihPerM2: number;      // ROUND(hargaFinalMentah, 0)

  // Sheet Area & Pcs Conversion
  areaPerSheetM2?: number;
  hargaPerSheetRp?: number;      // ROUND(Harga_M2 * Area_M2, 2)
  totalOrderRp?: number;
}

/**
 * Helper: Apply Mapping Rules 1, 2, 3, 4 for lookup in master table
 */
function mapOuterLayerForLookup(layer: string, position: 'Top' | 'Bot', logs: string[]): string {
  // Mapping Rule 1: Jika berakhiran 100 atau 110 -> ubah teks pencarian menjadi 125
  if (layer.endsWith('100') || layer.endsWith('110')) {
    const prefix = layer.charAt(0);
    const mapped = `${prefix}125`;
    logs.push(`Mapping Rule 1 (${position}): ${layer} dipetakan ke ${mapped}.`);
    return mapped;
  }

  // Mapping Rule 2: Jika input K135 -> ubah teks pencarian menjadi K150
  if (layer === 'K135') {
    logs.push(`Mapping Rule 2 (${position}): K135 dipetakan ke K150.`);
    return 'K150';
  }

  // Mapping Rule 3: Jika input M150 atau M135 -> ubah teks pencarian menjadi M125
  if (layer === 'M150' || layer === 'M135') {
    logs.push(`Mapping Rule 3 (${position}): ${layer} dipetakan ke M125.`);
    return 'M125';
  }

  return layer;
}

/**
 * Helper: Standard Half-Up Rounding to N decimal places
 */
export function roundHalfUp(value: number, decimals = 0): number {
  if (decimals <= 0) {
    return Math.floor(value + 0.5);
  }
  const factor = Math.pow(10, decimals);
  return Math.floor(value * factor + 0.5) / factor;
}

/**
 * Helper: Check whether a specification triggers the 275 or E/F condition,
 * and count how many triggers are active (0, 1, or 2 when BOTH 275 and E/F are active).
 */
export function getSpec275AndEfStatus(input: {
  topLayer: OuterLayerMaterial;
  flute1Layer?: MidLayerMaterial;
  midLayer: MidLayerMaterial;
  flute2Layer?: MidLayerMaterial;
  botLayer: OuterLayerMaterial;
  flute: FluteType;
}): {
  has275: boolean;
  isEfFlute: boolean;
  triggerCount: number;
} {
  const isDW = input.flute === 'CB/F';
  const activeLayers: string[] = isDW
    ? [
        input.topLayer,
        input.flute1Layer || 'M125',
        input.midLayer,
        input.flute2Layer || 'M125',
        input.botLayer,
      ]
    : [input.topLayer, input.midLayer, input.botLayer];

  const has275 = activeLayers.some((l) => l.endsWith('275'));
  const isEfFlute = input.flute === 'E/F';
  const triggerCount = (has275 ? 1 : 0) + (isEfFlute ? 1 : 0);

  return { has275, isEfFlute, triggerCount };
}

/**
 * Helper: Resolve effective Margin (%) when a Customer is selected (Hybrid Opsi A: Anti-Double-Count).
 * - If spec has NO 275 and is NOT E/F -> uses Customer's Reguler/SW Margin (`swMarginPercent`), overrideActive = false.
 * - If spec has 275 OR E/F -> uses Customer's `275 / E Flute` column (`dwMarginPercent`), and sets `customerSpecial275EfOverrideActive = true`
 *   so the engine does NOT double-add the first +2% multiplier!
 */
export function resolveCustomerEffectiveMargin(
  customer: CustomerDiscountItem,
  spec: {
    topLayer: OuterLayerMaterial;
    flute1Layer?: MidLayerMaterial;
    midLayer: MidLayerMaterial;
    flute2Layer?: MidLayerMaterial;
    botLayer: OuterLayerMaterial;
    flute: FluteType;
  }
): {
  effectiveMarginPercent: number;
  customerSpecial275EfOverrideActive: boolean;
  modeLabel: string;
} {
  const { has275, isEfFlute, triggerCount } = getSpec275AndEfStatus(spec);
  if (triggerCount > 0) {
    const reasons = [has275 ? 'K275' : '', isEfFlute ? 'E/F' : ''].filter(Boolean).join(' + ');
    return {
      effectiveMarginPercent: customer.dwMarginPercent,
      customerSpecial275EfOverrideActive: true,
      modeLabel: `Acuan 275/E-Flute (${reasons})`,
    };
  }
  return {
    effectiveMarginPercent: customer.swMarginPercent,
    customerSpecial275EfOverrideActive: false,
    modeLabel: 'Acuan Reguler',
  };
}

/**
 * CORE ENGINE FUNCTION: Executes strict Additive Architecture (Tahap 1 to 4)
 * Alias `calculatePrice` is also exported below for direct blueprint compatibility.
 */
export function calculateCartonPricing(input: PricingInput): PricingCalculationResult {
  const {
    topLayer,
    midLayer,
    botLayer,
    flute,
    marginPercent,
    customerSpecial275EfOverrideActive = false,
  } = input;

  const isDoubleWall = flute === 'CB/F';
  const flute1Layer: MidLayerMaterial = input.flute1Layer || 'M125';
  const flute2Layer: MidLayerMaterial = input.flute2Layer || 'M125';

  const inputSubstanceString = isDoubleWall
    ? `${topLayer}/${flute1Layer}/${midLayer}/${flute2Layer}/${botLayer}`
    : `${topLayer}/${midLayer}/${botLayer}`;

  const appliedRulesLog: string[] = [];

  const emptyFailure = (
    errorCode: PricingCalculationResult['errorCode'],
    errorMessage: string
  ): PricingCalculationResult => ({
    success: false,
    errorCode,
    errorMessage,
    input: {
      ...input,
      flute1Layer: isDoubleWall ? flute1Layer : undefined,
      flute2Layer: isDoubleWall ? flute2Layer : undefined,
    },
    isDoubleWall,
    inputSubstanceString,
    mappedSubstanceBeforeSwap: '',
    mappedReferenceSubstance: '',
    autoSwapped: false,
    appliedRulesLog,
    basePrice: 0,
    baseRowNo: 0,
    upgradeDetails: [],
    totalNominalUpgrade: 0,
    virtualBase: 0,
    downgradeDetails: [],
    totalDowngradePercent: 0,
    totalDowngradeDecimal: 0,
    discountNominalRp: 0,
    hargaDiskon: 0,
    marginPercent: marginPercent || 0,
    marginDecimal: 0,
    marginNominalRp: 0,
    hargaDenganMargin: 0,
    multiplierDetails: [],
    totalMultiplierPercent: 0,
    totalMultiplierDecimal: 0,
    multiplierNominalRp: 0,
    totalAdditiveModifierPercent: 0,
    totalAdditiveModifierDecimal: 0,
    totalAdditiveNominalRp: 0,
    hargaFinalMentah: 0,
    hargaBersihPerM2: 0,
  });

  // 1. Strict Layer Validation
  const validOuter =
    OUTER_LAYER_OPTIONS.some((o) => o.id === topLayer) &&
    OUTER_LAYER_OPTIONS.some((o) => o.id === botLayer);
  if (!validOuter) {
    return emptyFailure(
      'FREE_TEXT_INVALID',
      'Kalkulasi Gagal: Spesifikasi layer Top/Bottom tidak valid dalam daftar material standar.'
    );
  }

  const innerLayersToCheck: Array<{ pos: LayerPositionLabel; val: MidLayerMaterial }> = isDoubleWall
    ? [
        { pos: 'Flute 1', val: flute1Layer },
        { pos: 'Middle', val: midLayer },
        { pos: 'Flute 2', val: flute2Layer },
      ]
    : [{ pos: 'Middle', val: midLayer }];

  for (const inner of innerLayersToCheck) {
    const isValidInner = MID_LAYER_OPTIONS.some((o) => o.id === inner.val);
    if (!isValidInner) {
      return emptyFailure(
        'INVALID_MID_LAYER',
        `Kalkulasi Gagal: Material ${inner.val} tidak diizinkan pada posisi ${inner.pos} (Hanya K150, K200, K275 untuk Kraft dalam).`
      );
    }
  }

  try {
    // =========================================================================
    // TAHAP 1: UI INPUT & BASE LOOKUP MAPPING (Mapping Rules 1 - 6)
    // =========================================================================
    const mappedTop = mapOuterLayerForLookup(topLayer, 'Top', appliedRulesLog);
    const mappedBot = mapOuterLayerForLookup(botLayer, 'Bot', appliedRulesLog);

    // Mapping Rule 4 (Mid-Layer Bypass) & Rule 5 (Double Wall 5-to-3 Condensation):
    // Format pencarian ke tabel master SELALU dipaksa menjadi: Top/M125/Bottom
    const mappedMid = 'M125';
    if (isDoubleWall) {
      appliedRulesLog.push(
        `Mapping Rule 4 & 5 (DW 5-to-3 Condensation): 5 layer (${inputSubstanceString}) dikondensasi menjadi ${mappedTop}/M125/${mappedBot} untuk pencarian tabel CB/F.`
      );
    } else if (midLayer !== 'M125') {
      appliedRulesLog.push(
        `Mapping Rule 4 (Mid-Layer Bypass): Mid Layer ${midLayer} dipaksa menjadi M125 saat mencari ke tabel master.`
      );
    }

    const mappedSubstanceBeforeSwap = `${mappedTop}/${mappedMid}/${mappedBot}`;
    let mappedReferenceSubstance = mappedSubstanceBeforeSwap;
    let autoSwapped = false;

    let matchedRow = BASE_PRICE_TABLE.find((r) => r.substance === mappedSubstanceBeforeSwap);

    // Mapping Rule 6 (Auto-Swap Top/Bottom) jika tidak ditemukan di tabel
    if (!matchedRow) {
      const swappedSubstance = `${mappedBot}/${mappedMid}/${mappedTop}`;
      const swappedRow = BASE_PRICE_TABLE.find((r) => r.substance === swappedSubstance);
      if (swappedRow) {
        matchedRow = swappedRow;
        mappedReferenceSubstance = swappedSubstance;
        autoSwapped = true;
        appliedRulesLog.push(
          `Mapping Rule 6 (Auto-Swap): Kombinasi ${mappedSubstanceBeforeSwap} tidak ada di tabel, ditukar otomatis menjadi ${swappedSubstance}.`
        );
      }
    }

    if (!matchedRow) {
      return emptyFailure(
        'MISSING_DB_MAPPING',
        'Kalkulasi Gagal: Kombinasi material acuan tidak ditemukan di Master Database.'
      );
    }

    const rawBasePrice = matchedRow[flute];
    if (rawBasePrice === null || rawBasePrice === undefined) {
      return emptyFailure(
        'MISSING_DB_MAPPING',
        `Kalkulasi Gagal: Kombinasi acuan ${mappedReferenceSubstance} tidak tersedia (TIDAK ADA) untuk Flute ${flute} pada Master Tabel.`
      );
    }

    const basePrice = rawBasePrice;
    const baseRowNo = matchedRow.no;

    // =========================================================================
    // TAHAP 2: PEMBENTUKAN VIRTUAL BASE (Nominal Rp per Layer)
    // =========================================================================
    const upgradeDetails: UpgradeDetail[] = [];

    const allOrderedLayers: Array<{ pos: LayerPositionLabel; val: string; isInner: boolean }> =
      isDoubleWall
        ? [
            { pos: 'Top', val: topLayer, isInner: false },
            { pos: 'Flute 1', val: flute1Layer, isInner: true },
            { pos: 'Middle', val: midLayer, isInner: true },
            { pos: 'Flute 2', val: flute2Layer, isInner: true },
            { pos: 'Bottom', val: botLayer, isInner: false },
          ]
        : [
            { pos: 'Top', val: topLayer, isInner: false },
            { pos: 'Middle', val: midLayer, isInner: true },
            { pos: 'Bottom', val: botLayer, isInner: false },
          ];

    for (const item of allOrderedLayers) {
      // 1. Jika layer input (dimanapun posisinya) adalah M150 atau M135: Tambah +Rp 300 / layer
      if (item.val === 'M150' || item.val === 'M135') {
        upgradeDetails.push({
          layerPosition: item.pos,
          originalMaterial: item.val,
          referenceMaterial: 'M125',
          amountRp: 300,
          reason: `Virtual Upgrade M150 pada ${item.pos} (${item.val})`,
        });
      }

      // 2. Jika Inner Layer (Mid di SW, atau Flute1/Mid/Flute2 di DW) berjenis Kraft:
      if (item.isInner) {
        if (item.val === 'K150' || item.val === 'K200') {
          upgradeDetails.push({
            layerPosition: item.pos,
            originalMaterial: item.val,
            referenceMaterial: 'M125',
            amountRp: 2000,
            reason: `Upgrade Inner Kraft pada ${item.pos} (${item.val})`,
          });
        } else if (item.val === 'K275') {
          upgradeDetails.push({
            layerPosition: item.pos,
            originalMaterial: item.val,
            referenceMaterial: 'M125',
            amountRp: 3700,
            reason: `Upgrade Inner Heavy Kraft pada ${item.pos} (K275)`,
          });
        }
      }
    }

    const totalNominalUpgrade = upgradeDetails.reduce((acc, item) => acc + item.amountRp, 0);
    const virtualBase = basePrice + totalNominalUpgrade;

    // =========================================================================
    // TAHAP 3: SISTEM MODIFIER PERSENTASE (ADDITIVE ARCHITECTURE)
    // Total Modifier = Margin (%) + Multiplier 275/EF (%) - Total Diskon Downgrade (%)
    // =========================================================================

    // A. Start / Input Tambahan: Margin Customer (%)
    const safeMarginPercent = Number.isFinite(marginPercent) ? marginPercent : 0;
    const marginDecimal = Number((safeMarginPercent / 100).toFixed(6));

    // B. Multipliers (Additive):
    // - Ada bahan 275 = +2%
    // - Jenis Flute E/F = +2%
    // PROTEKSI ANTI-DOUBLE-COUNT (Hybrid Opsi A):
    // Jika customer dipilih dan memakai kolom khusus "275 / E Flute", maka +2% pertama sudah termasuk di dalam angka margin customer tersebut.
    const multiplierDetails: MultiplierDetail[] = [];
    const has275 = allOrderedLayers.some((l) => l.val.endsWith('275'));
    const isEfFlute = flute === 'E/F';

    let rawTriggers: Array<{ code: '275_MATERIAL' | 'EF_FLUTE'; label: string; percent: number }> = [];
    if (has275) {
      rawTriggers.push({
        code: '275_MATERIAL',
        label: 'Kombinasi mengandung bahan 275 gsm (+2%)',
        percent: 2.0,
      });
    }
    if (isEfFlute) {
      rawTriggers.push({
        code: 'EF_FLUTE',
        label: 'Jenis gelombang E-Flute / E/F (+2%)',
        percent: 2.0,
      });
    }

    if (customerSpecial275EfOverrideActive && rawTriggers.length > 0) {
      // Trigger pertama sudah masuk ke dalam angka Diskon Khusus 275 / E-Flute milik Customer (Anti Double-Count)
      const absorbed = rawTriggers[0];
      multiplierDetails.push({
        code: 'CUSTOMER_275_EF_INCLUDED',
        label: `${absorbed.label} sudah termasuk di Acuan 275/E-Flute Customer (Anti Double-Count)`,
        percent: 0,
      });
      // Jika keduanya aktif (ada K275 SEKALIGUS E/F), tambahkan +2% untuk trigger kedua
      for (let i = 1; i < rawTriggers.length; i++) {
        multiplierDetails.push(rawTriggers[i]);
      }
    } else {
      multiplierDetails.push(...rawTriggers);
    }

    const totalMultiplierPercent = Number(
      multiplierDetails.reduce((acc, m) => acc + m.percent, 0).toFixed(4)
    );
    const totalMultiplierDecimal = Number((totalMultiplierPercent / 100).toFixed(6));

    // C. Downgrade Discount (Subtractive):
    // Single Wall (SW): 125->110 = -2.5%, 125->100 = -4.0%, 150->135 = -2.0%
    // Double Wall (DW): 125->110 = -1.5%, 125->100 = -2.5%, 150->135 = -1.0%
    const downgradeDetails: DowngradeDetail[] = [];
    const rate110 = isDoubleWall ? 1.5 : 2.5;
    const rate100 = isDoubleWall ? 2.5 : 4.0;
    const rate135 = isDoubleWall ? 1.0 : 2.0;
    const wallTag = isDoubleWall ? 'DW' : 'SW';

    for (const item of allOrderedLayers) {
      if (item.val.endsWith('110')) {
        downgradeDetails.push({
          layerPosition: item.pos,
          originalMaterial: item.val,
          fromThickness: 125,
          toThickness: 110,
          discountPercent: rate110,
          reason: `${item.pos} (${item.val}) turun 125→110 (-${rate110}% ${wallTag})`,
        });
      } else if (item.val.endsWith('100')) {
        downgradeDetails.push({
          layerPosition: item.pos,
          originalMaterial: item.val,
          fromThickness: 125,
          toThickness: 100,
          discountPercent: rate100,
          reason: `${item.pos} (${item.val}) turun 125→100 (-${rate100}% ${wallTag})`,
        });
      } else if (item.val.endsWith('135')) {
        downgradeDetails.push({
          layerPosition: item.pos,
          originalMaterial: item.val,
          fromThickness: 150,
          toThickness: 135,
          discountPercent: rate135,
          reason: `${item.pos} (${item.val}) turun 150→135 (-${rate135}% ${wallTag})`,
        });
      }
    }

    const totalDowngradePercent = Number(
      downgradeDetails.reduce((acc, item) => acc + item.discountPercent, 0).toFixed(4)
    );
    const totalDowngradeDecimal = Number((totalDowngradePercent / 100).toFixed(6));

    // TOTAL ADDITIVE MODIFIER = Margin (%) + Total Multiplier (%) - Total Diskon Downgrade (%)
    const totalAdditiveModifierPercent = Number(
      (safeMarginPercent + totalMultiplierPercent - totalDowngradePercent).toFixed(4)
    );
    const totalAdditiveModifierDecimal = Number((totalAdditiveModifierPercent / 100).toFixed(6));

    // Nominal equivalents (all linear / additive against Virtual Base!)
    const discountNominalRp = virtualBase * totalDowngradeDecimal;
    const hargaDiskon = virtualBase - discountNominalRp;
    const marginNominalRp = virtualBase * marginDecimal;
    const hargaDenganMargin = virtualBase * (1 + marginDecimal - totalDowngradeDecimal);
    const multiplierNominalRp = virtualBase * totalMultiplierDecimal;
    const totalAdditiveNominalRp = virtualBase * totalAdditiveModifierDecimal;

    // =========================================================================
    // TAHAP 4: FINALISASI MATEMATIS (M² dan Pcs)
    // 1. Harga_M2 = ROUND( Virtual Base * (1 + Total Modifier), 0 )
    // 2. Area_M2 = (Panjang_mm * Lebar_mm) / 1.000.000
    // 3. Harga_Pcs = ROUND( Harga_M2 * Area_M2, 2 )
    // =========================================================================
    const hargaFinalMentah = virtualBase * (1 + totalAdditiveModifierDecimal);
    const hargaBersihPerM2 = roundHalfUp(hargaFinalMentah, 0);

    let areaPerSheetM2: number | undefined;
    let hargaPerSheetRp: number | undefined;
    let totalOrderRp: number | undefined;

    if (
      input.sheetLengthMm &&
      input.sheetWidthMm &&
      input.sheetLengthMm > 0 &&
      input.sheetWidthMm > 0
    ) {
      areaPerSheetM2 = (input.sheetLengthMm * input.sheetWidthMm) / 1_000_000;
      hargaPerSheetRp = roundHalfUp(hargaBersihPerM2 * areaPerSheetM2, 2);
      if (input.quantityPcs && input.quantityPcs > 0) {
        totalOrderRp = roundHalfUp(hargaPerSheetRp * input.quantityPcs, 2);
      }
    }

    return {
      success: true,
      input: {
        ...input,
        flute1Layer: isDoubleWall ? flute1Layer : undefined,
        flute2Layer: isDoubleWall ? flute2Layer : undefined,
      },
      isDoubleWall,
      inputSubstanceString,
      mappedSubstanceBeforeSwap,
      mappedReferenceSubstance,
      autoSwapped,
      appliedRulesLog,
      basePrice,
      baseRowNo,
      upgradeDetails,
      totalNominalUpgrade,
      virtualBase,
      downgradeDetails,
      totalDowngradePercent,
      totalDowngradeDecimal,
      discountNominalRp,
      hargaDiskon,
      marginPercent: safeMarginPercent,
      marginDecimal,
      marginNominalRp,
      hargaDenganMargin,
      multiplierDetails,
      totalMultiplierPercent,
      totalMultiplierDecimal,
      multiplierNominalRp,
      totalAdditiveModifierPercent,
      totalAdditiveModifierDecimal,
      totalAdditiveNominalRp,
      hargaFinalMentah,
      hargaBersihPerM2,
      areaPerSheetM2,
      hargaPerSheetRp,
      totalOrderRp,
    };
  } catch {
    return emptyFailure(
      'MISSING_DB_MAPPING',
      'Kalkulasi Gagal: Kombinasi material acuan tidak ditemukan di Master Database.'
    );
  }
}

// Export alias `calculatePrice` sesuai nama fungsi di System Blueprint
export const calculatePrice = calculateCartonPricing;

/**
 * 4. VALIDATED UNIT TESTS (WAJIB LULUS 100% SESUAI BLUEPRINT)
 */
export interface ValidationTestCase {
  id: number;
  title: string;
  description: string;
  input: PricingInput;
  expectedResultRp: number;     // Expected Harga / M²
  expectedSheetRp: number;      // Expected Harga / Pcs
  expectedBaseRp: number;
  expectedVirtualBaseRp: number;
  expectedDowngradePercent: number;
  expectedMultiplierPercent: number;
  expectedTotalModifierPercent: number;
}

export const VALIDATED_TEST_CASES: ValidationTestCase[] = [
  {
    id: 1,
    title: 'Test Case 1: Skala Penuh Double Wall (CB/F)',
    description:
      'K150/M100/M100/M100/K125, Flute CB/F, Dimensi 1860x1161 mm, Margin +9.5% -> Base K150/M125/K125 (7.025), Total Modifier +2.0% (+9.5% - 7.5%), Harga/M² Rp 7.166, Harga/Pcs Rp 15.474,69',
    input: {
      topLayer: 'K150',
      flute1Layer: 'M100',
      midLayer: 'M100',
      flute2Layer: 'M100',
      botLayer: 'K125',
      flute: 'CB/F',
      marginPercent: 9.5,
      sheetLengthMm: 1860,
      sheetWidthMm: 1161,
    },
    expectedResultRp: 7166,
    expectedSheetRp: 15474.69,
    expectedBaseRp: 7025,
    expectedVirtualBaseRp: 7025,
    expectedDowngradePercent: 7.5,
    expectedMultiplierPercent: 0,
    expectedTotalModifierPercent: 2.0,
  },
  {
    id: 2,
    title: 'Test Case 2: Virtual Base Tabrakan dengan Multiplier Bertumpuk (Single Wall)',
    description:
      'K275/K150/M100, Flute E/F, Dimensi 1000x1000 mm, Margin +5.0% -> Base K275/M125/M125 (6.116) + Mid K150 (+2.000) = Virtual Base 8.116, Total Modifier +5.0% (+5% + 2% + 2% - 4%), Harga/M² & Pcs Rp 8.522',
    input: {
      topLayer: 'K275',
      midLayer: 'K150',
      botLayer: 'M100',
      flute: 'E/F',
      marginPercent: 5.0,
      sheetLengthMm: 1000,
      sheetWidthMm: 1000,
    },
    expectedResultRp: 8522,
    expectedSheetRp: 8522,
    expectedBaseRp: 6116,
    expectedVirtualBaseRp: 8116,
    expectedDowngradePercent: 4.0,
    expectedMultiplierPercent: 4.0,
    expectedTotalModifierPercent: 5.0,
  },
  {
    id: 3,
    title: 'Test Case 3: Virtual Base M135 (Turunan M150)',
    description:
      'K125/M135/K110, Flute B/F, Dimensi 1000x1000 mm, Margin +8.0% -> Base K125/M125/K125 (4.125) + M135 (+300) = Virtual Base 4.425, Total Modifier +3.5% (+8% - 2% - 2.5%), Harga/M² & Pcs Rp 4.580',
    input: {
      topLayer: 'K125',
      midLayer: 'M135',
      botLayer: 'K110',
      flute: 'B/F',
      marginPercent: 8.0,
      sheetLengthMm: 1000,
      sheetWidthMm: 1000,
    },
    expectedResultRp: 4580,
    expectedSheetRp: 4580,
    expectedBaseRp: 4125,
    expectedVirtualBaseRp: 4425,
    expectedDowngradePercent: 4.5,
    expectedMultiplierPercent: 0,
    expectedTotalModifierPercent: 3.5,
  },
];

/**
 * FORMATTERS FOR CURRENCY & WHATSAPP EXPORT
 * Jika nilai memiliki desimal (misal Rp 15.474,69), tampilkan 2 desimal secara presisi.
 */
export function formatRupiah(value: number, forceDecimals?: boolean): string {
  const hasFraction = Math.abs(value - Math.round(value)) > 0.001;
  const showDecimals = forceDecimals !== undefined ? forceDecimals : hasFraction;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value);
}

/**
 * Export Format sesuai Seksi 5.2 System Blueprint:
 * Merender breakdown harga secara berurutan:
 * Base Harga -> Tambahan Rupiah -> Rincian % (Margin/Diskon/Multiplier) -> Harga/M² -> Harga/Pcs
 */
export function generateWhatsAppText(
  result: PricingCalculationResult,
  mode: 'ringkas' | 'lengkap' = 'ringkas',
  customTitle?: string
): string {
  if (!result.success) return '';

  const headerTitle = customTitle
    ? `*ESTIMASI HARGA SHEET — ${customTitle.toUpperCase()}*`
    : `*ESTIMASI HARGA KARTON SHEET*`;

  const wallLabel = result.isDoubleWall ? 'Double Wall (5-Layer)' : 'Single Wall (3-Layer)';
  const modSign = result.totalAdditiveModifierPercent > 0 ? '+' : '';
  const marginSign = result.marginPercent > 0 ? '+' : '';

  if (mode === 'ringkas') {
    const lines: string[] = [
      headerTitle,
      `MYPAK Sheet Pricing Calculator`,
      `────────────────────`,
      `• *Spesifikasi:* ${result.inputSubstanceString}`,
      `• *Flute:* ${result.input.flute} (${wallLabel})`,
      `• *1. Base Harga:* ${formatRupiah(result.basePrice)} (${result.mappedReferenceSubstance})`,
      `• *2. Tambahan Rupiah:* +${formatRupiah(result.totalNominalUpgrade)} → *Virtual Base: ${formatRupiah(result.virtualBase)}*`,
      `• *3. Rincian % (Additive):* Margin ${marginSign}${result.marginPercent}% | Multiplier +${result.totalMultiplierPercent}% | Downgrade -${result.totalDowngradePercent}% → *Total Modifier: ${modSign}${result.totalAdditiveModifierPercent}%*`,
      `────────────────────`,
      `*4. HARGA / M²: ${formatRupiah(result.hargaBersihPerM2)}*`,
    ];

    if (result.areaPerSheetM2 && result.hargaPerSheetRp !== undefined) {
      lines.push(
        `• *Dimensi Sheet:* ${result.input.sheetLengthMm} x ${result.input.sheetWidthMm} mm (${result.areaPerSheetM2.toFixed(5)} M²)`
      );
      lines.push(`*5. HARGA / PCS: ${formatRupiah(result.hargaPerSheetRp)}*`);
      if (result.totalOrderRp && result.input.quantityPcs) {
        lines.push(
          `• *Total Order (${result.input.quantityPcs.toLocaleString('id-ID')} pcs):* ${formatRupiah(result.totalOrderRp)}`
        );
      }
    }

    lines.push(`_Harga belum termasuk PPN_`);
    return lines.join('\n');
  }

  // Mode Lengkap (Rincian Tahap 1–4 Additive Architecture)
  const fullLines: string[] = [
    headerTitle,
    `MYPAK Sheet Pricing Calculator`,
    `────────────────────`,
    `*Spesifikasi:* ${result.inputSubstanceString} | Flute ${result.input.flute} (${wallLabel})`,
    `*Acuan Master:* #${result.baseRowNo} ${result.mappedReferenceSubstance}${
      result.autoSwapped ? ' (Auto-Swap)' : ''
    }`,
    ``,
    `*Urutan Kalkulasi (Additive Architecture):*`,
    `1. Base Harga Tabel: ${formatRupiah(result.basePrice)}`,
    `2. Tambahan Rupiah: +${formatRupiah(result.totalNominalUpgrade)} → Virtual Base: ${formatRupiah(
      result.virtualBase
    )}`,
    `3. Rincian Modifier Persentase (Additive):`,
    `   • Margin Customer: ${marginSign}${result.marginPercent}%`,
    `   • Multiplier (275 / E-Flute): +${result.totalMultiplierPercent}%`,
    `   • Diskon Downgrade (${result.isDoubleWall ? 'DW' : 'SW'}): -${result.totalDowngradePercent}%`,
    `   • Total Additive Modifier: ${modSign}${result.totalAdditiveModifierPercent}% (${
      result.totalAdditiveNominalRp >= 0 ? '+' : '-'
    }${formatRupiah(Math.abs(result.totalAdditiveNominalRp), true)})`,
    `────────────────────`,
    `*4. HARGA / M²: ${formatRupiah(result.hargaBersihPerM2)}* _(Mentah: Rp ${result.hargaFinalMentah.toFixed(2)})_`,
  ];

  if (result.areaPerSheetM2 && result.hargaPerSheetRp !== undefined) {
    fullLines.push(
      `*5. HARGA / PCS (${result.input.sheetLengthMm}x${result.input.sheetWidthMm} mm = ${result.areaPerSheetM2.toFixed(
        5
      )} M²): ${formatRupiah(result.hargaPerSheetRp)}*`
    );
    if (result.totalOrderRp && result.input.quantityPcs) {
      fullLines.push(
        `• Total (${result.input.quantityPcs.toLocaleString('id-ID')} pcs): ${formatRupiah(
          result.totalOrderRp
        )}`
      );
    }
  }

  fullLines.push(`_Harga belum termasuk PPN_`);
  return fullLines.join('\n');
}
