/**
 * CORE BUSINESS LOGIC & DYNAMIC PRICING ENGINE
 * Project: Otomatisasi Penghitungan Harga Substance Karton Sheet
 * Company: PT Prokemas Adhikari Kreasi
 * Location: Jl. Fatahillah Km 49.5 Desa Kalijaya, Cikarang Barat, Bekasi
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

// Error Case 5: Hilangkan opsi K110, K125, dan K135 HANYA dari dropdown "Mid Layer".
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

export interface BasePriceRow {
  no: number;
  substance: string;
  'B/F': number;
  'C/F': number;
  'CB/F': number; // Double Wall (Ditolak oleh sistem kalkulator, hanya tampil di Master Tabel)
  'E/F': number;
}

/**
 * 2. MASTER DATA (BASE PRICE TABLE)
 * Harga dalam Rupiah per Meter Persegi (M²). Tidak termasuk PPN.
 */
export const BASE_PRICE_TABLE: BasePriceRow[] = [
  { no: 1, substance: 'M125/M125/M125', 'B/F': 3894, 'C/F': 3982, 'CB/F': 6593, 'E/F': 4075 },
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

// Opsi Validasi Error Case 1 & Error Case 5 (Clean Minimalist Labels without redundant description)
export const OUTER_LAYER_OPTIONS: Array<{
  id: OuterLayerMaterial;
  name: string;
  group: 'Medium' | 'Kraft';
  tag: string;
}> = [
  { id: 'M100', name: 'M100', group: 'Medium', tag: '-4%' },
  { id: 'M110', name: 'M110', group: 'Medium', tag: '-2.5%' },
  { id: 'M125', name: 'M125', group: 'Medium', tag: 'Base' },
  { id: 'M135', name: 'M135', group: 'Medium', tag: '+300 / -2%' },
  { id: 'M150', name: 'M150', group: 'Medium', tag: '+300' },
  { id: 'K110', name: 'K110', group: 'Kraft', tag: '-2.5%' },
  { id: 'K125', name: 'K125', group: 'Kraft', tag: 'Base' },
  { id: 'K135', name: 'K135', group: 'Kraft', tag: '-2%' },
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
  { id: 'M100', name: 'M100', group: 'Medium', tag: '-4%' },
  { id: 'M110', name: 'M110', group: 'Medium', tag: '-2.5%' },
  { id: 'M125', name: 'M125', group: 'Medium', tag: 'Base' },
  { id: 'M135', name: 'M135', group: 'Medium', tag: '+300 / -2%' },
  { id: 'M150', name: 'M150', group: 'Medium', tag: '+300' },
  { id: 'K150', name: 'K150', group: 'Kraft', tag: '+2.000' },
  { id: 'K200', name: 'K200', group: 'Kraft', tag: '+2.000' },
  { id: 'K275', name: 'K275', group: 'Kraft', tag: '+3.700 / +2%' },
];

// Single-row Flute Options without redundant "(B-Flute)" or "Double Wall" text
export const FLUTE_OPTIONS: Array<{
  id: SingleWallFlute;
  name: string;
  tag: string;
  supported: boolean;
}> = [
  { id: 'B/F', name: 'B/F', tag: '', supported: true },
  { id: 'C/F', name: 'C/F', tag: '', supported: true },
  { id: 'E/F', name: 'E/F', tag: '+2%', supported: true },
];

export type CustomerTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4';

export interface CustomerDiscountItem {
  id: string;
  name: string;
  tier: CustomerTier;
  swMarginPercent: number; // e.g., +9 for +9%, or -5 for -5%
  dwMarginPercent: number; // e.g., +13 for +13%
}

export const INITIAL_CUSTOMERS: CustomerDiscountItem[] = [
  {
    id: 'cust-1',
    name: 'PT Vinns Carton',
    tier: 'Tier 1',
    swMarginPercent: 9,
    dwMarginPercent: 13,
  },
];

export interface PricingInput {
  topLayer: OuterLayerMaterial;
  midLayer: MidLayerMaterial;
  botLayer: OuterLayerMaterial;
  flute: FluteType;
  marginPercent: number; // e.g., 7.5 for 7.5%
  sheetLengthMm?: number; // Optional sheet size calculator
  sheetWidthMm?: number;
  quantityPcs?: number;
}

export interface UpgradeDetail {
  layerPosition: 'Top' | 'Middle' | 'Bottom';
  originalMaterial: string;
  referenceMaterial: string;
  amountRp: number;
  reason: string;
}

export interface DowngradeDetail {
  layerPosition: 'Top' | 'Middle' | 'Bottom';
  originalMaterial: string;
  fromThickness: number;
  toThickness: number;
  discountPercent: number; // e.g. 2.5 for -2.5%
  reason: string;
}

export interface MultiplierDetail {
  code: '275_MATERIAL' | 'EF_FLUTE';
  label: string;
  percent: number; // e.g. 2 for +2%
}

export interface PricingCalculationResult {
  success: boolean;
  errorCode?: 'FREE_TEXT_INVALID' | 'DOUBLE_WALL_TRAP' | 'MISSING_DB_MAPPING' | 'INVALID_MID_LAYER';
  errorMessage?: string;
  input: PricingInput;
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

  // Step 3: Downgrade Discount
  downgradeDetails: DowngradeDetail[];
  totalDowngradePercent: number; // e.g. 9.0 for 9.0%
  totalDowngradeDecimal: number; // e.g. 0.09
  discountNominalRp: number;
  hargaDiskon: number;

  // Step 4: Standard Margin
  marginPercent: number;
  marginDecimal: number;
  marginNominalRp: number;
  hargaDenganMargin: number;

  // Step 5: Conditional Multipliers (275 & E/F)
  multiplierDetails: MultiplierDetail[];
  totalMultiplierPercent: number; // e.g. 4 for 4%
  totalMultiplierDecimal: number; // e.g. 0.04
  multiplierNominalRp: number;
  hargaFinalMentah: number;

  // Step 6: Final Rounded Price per M²
  hargaBersihPerM2: number;

  // Optional Sheet Area & Total Order Conversion
  areaPerSheetM2?: number;
  hargaPerSheetRp?: number;
  totalOrderRp?: number;
}

/**
 * Helper: Apply Mapping Rules 1, 2, 3 for a single layer (Top or Bot)
 */
function mapLayerForLookup(layer: string, position: 'Top' | 'Mid' | 'Bot', logs: string[]): string {
  // Mapping Rule 4 (Mid-Layer Kraft Bypass): Di tabel master, SEMUA Mid Layer selalu M125.
  if (position === 'Mid' && layer.startsWith('K')) {
    logs.push(`Mapping Rule 4 (${position}): Input ${layer} diubah paksa menjadi M125 untuk pencarian tabel.`);
    return 'M125';
  }

  // Mapping Rule 1 (Turunan 125): Jika berakhiran 100 atau 110 -> ubah menjadi 125
  if (layer.endsWith('100') || layer.endsWith('110')) {
    const prefix = layer.charAt(0);
    const mapped = `${prefix}125`;
    logs.push(`Mapping Rule 1 (${position}): ${layer} (turunan 125) dipetakan ke ${mapped}.`);
    return mapped;
  }

  // Mapping Rule 2 (Turunan 150): Jika K135 -> ubah menjadi K150
  if (layer === 'K135') {
    logs.push(`Mapping Rule 2 (${position}): K135 (turunan 150) dipetakan ke K150.`);
    return 'K150';
  }

  // Mapping Rule 3 (Virtual Medium): Jika M150 atau M135 -> ubah menjadi M125
  if (layer === 'M150' || layer === 'M135') {
    logs.push(`Mapping Rule 3 (${position}): ${layer} (Virtual Medium) dipetakan ke acuan M125.`);
    return 'M125';
  }

  return layer;
}

/**
 * Helper: Standard Half-Up Rounding (Apabila desimalnya ,5 maka dibulatkan ke atas)
 */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/**
 * CORE ENGINE FUNCTION: Executes strict Order of Operations (Steps 1 to 6)
 */
export function calculateCartonPricing(input: PricingInput): PricingCalculationResult {
  const { topLayer, midLayer, botLayer, flute, marginPercent } = input;
  const inputSubstanceString = `${topLayer}/${midLayer}/${botLayer}`;
  const appliedRulesLog: string[] = [];

  const emptyFailure = (
    errorCode: PricingCalculationResult['errorCode'],
    errorMessage: string
  ): PricingCalculationResult => ({
    success: false,
    errorCode,
    errorMessage,
    input,
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
    hargaFinalMentah: 0,
    hargaBersihPerM2: 0,
  });

  // VALIDASI ERROR CASE 2: Double Wall (CB/F) Trap
  if (flute === 'CB/F') {
    return emptyFailure(
      'DOUBLE_WALL_TRAP',
      'Kalkulasi Gagal: Sistem saat ini hanya mendukung Single Wall (B/F, C/F, E/F).'
    );
  }

  // VALIDASI ERROR CASE 1 & 5: Validasi Opsi Layer
  const validOuter = OUTER_LAYER_OPTIONS.some((o) => o.id === topLayer) &&
    OUTER_LAYER_OPTIONS.some((o) => o.id === botLayer);
  if (!validOuter) {
    return emptyFailure(
      'FREE_TEXT_INVALID',
      'Kalkulasi Gagal: Spesifikasi layer Top/Bottom tidak valid dalam daftar material standar.'
    );
  }

  const validMid = MID_LAYER_OPTIONS.some((o) => o.id === midLayer);
  if (!validMid) {
    return emptyFailure(
      'INVALID_MID_LAYER',
      'Kalkulasi Gagal: Material K110, K125, dan K135 tidak diizinkan pada Mid Layer sesuai SOP.'
    );
  }

  try {
    // =========================================================================
    // STEP 1: LOOKUP MASTER TABEL (Mapping Rules 1 - 5)
    // =========================================================================
    const mappedTop = mapLayerForLookup(topLayer, 'Top', appliedRulesLog);
    const mappedMid = mapLayerForLookup(midLayer, 'Mid', appliedRulesLog);
    const mappedBot = mapLayerForLookup(botLayer, 'Bot', appliedRulesLog);

    const mappedSubstanceBeforeSwap = `${mappedTop}/${mappedMid}/${mappedBot}`;
    let mappedReferenceSubstance = mappedSubstanceBeforeSwap;
    let autoSwapped = false;

    let matchedRow = BASE_PRICE_TABLE.find((r) => r.substance === mappedSubstanceBeforeSwap);

    // Mapping Rule 5 (Auto-Swap Top/Bot) jika tidak ditemukan di tabel
    if (!matchedRow) {
      const swappedSubstance = `${mappedBot}/${mappedMid}/${mappedTop}`;
      const swappedRow = BASE_PRICE_TABLE.find((r) => r.substance === swappedSubstance);
      if (swappedRow) {
        matchedRow = swappedRow;
        mappedReferenceSubstance = swappedSubstance;
        autoSwapped = true;
        appliedRulesLog.push(
          `Mapping Rule 5 (Auto-Swap): Kombinasi ${mappedSubstanceBeforeSwap} tidak ada di tabel, ditukar otomatis menjadi ${swappedSubstance}.`
        );
      }
    }

    // Error Case 3: Missing Database Mapping
    if (!matchedRow) {
      return emptyFailure(
        'MISSING_DB_MAPPING',
        'Kalkulasi Gagal: Kombinasi material acuan tidak ditemukan di Master Database.'
      );
    }

    const activeFlute = flute as SingleWallFlute;
    const basePrice = matchedRow[activeFlute];
    const baseRowNo = matchedRow.no;

    // =========================================================================
    // STEP 2: BENTUK VIRTUAL BASE (base_price + total_nominal_upgrade)
    // Error Case 4: Hanya dieksekusi dengan conditional constraint ketat bahwa referensi tabelnya adalah M125
    // =========================================================================
    const upgradeDetails: UpgradeDetail[] = [];

    const checkVirtualM150Upgrade = (
      layerValue: string,
      mappedRef: string,
      position: 'Top' | 'Middle' | 'Bottom'
    ) => {
      // Virtual Upgrade M150: Jika input asli user adalah M150 atau M135 dan referensi acuan M125 -> +Rp 300 / layer
      if ((layerValue === 'M150' || layerValue === 'M135') && mappedRef === 'M125') {
        upgradeDetails.push({
          layerPosition: position,
          originalMaterial: layerValue,
          referenceMaterial: 'M125',
          amountRp: 300,
          reason: `Virtual Upgrade M150 pada ${position} Layer (${layerValue} dari acuan M125)`,
        });
      }
    };

    checkVirtualM150Upgrade(topLayer, mappedTop, 'Top');
    checkVirtualM150Upgrade(midLayer, mappedMid, 'Middle');
    checkVirtualM150Upgrade(botLayer, mappedBot, 'Bottom');

    // Upgrade Material Tengah (Mid Layer Kraft di tengah, referensi acuan M125)
    if (mappedMid === 'M125') {
      if (midLayer === 'K150' || midLayer === 'K200') {
        upgradeDetails.push({
          layerPosition: 'Middle',
          originalMaterial: midLayer,
          referenceMaterial: 'M125',
          amountRp: 2000,
          reason: `Upgrade Material Tengah (${midLayer} dari acuan M125)`,
        });
      } else if (midLayer === 'K275') {
        upgradeDetails.push({
          layerPosition: 'Middle',
          originalMaterial: midLayer,
          referenceMaterial: 'M125',
          amountRp: 3700,
          reason: `Upgrade Material Tengah Heavy (K275 dari acuan M125)`,
        });
      }
    }

    const totalNominalUpgrade = upgradeDetails.reduce((acc, item) => acc + item.amountRp, 0);
    const virtualBase = basePrice + totalNominalUpgrade;

    // =========================================================================
    // STEP 3: KALKULASI HARGA DISKON (Downgrade Discount dari Virtual Base)
    // =========================================================================
    const downgradeDetails: DowngradeDetail[] = [];

    const evaluateLayerDowngrade = (
      layerValue: string,
      position: 'Top' | 'Middle' | 'Bottom'
    ) => {
      if (layerValue.endsWith('110')) {
        downgradeDetails.push({
          layerPosition: position,
          originalMaterial: layerValue,
          fromThickness: 125,
          toThickness: 110,
          discountPercent: 2.5,
          reason: `${position} Layer turun ketebalan 125 ke 110 (-2,5%)`,
        });
      } else if (layerValue.endsWith('100')) {
        downgradeDetails.push({
          layerPosition: position,
          originalMaterial: layerValue,
          fromThickness: 125,
          toThickness: 100,
          discountPercent: 4.0,
          reason: `${position} Layer turun ketebalan 125 ke 100 (-4,0%)`,
        });
      } else if (layerValue.endsWith('135')) {
        // Berlaku untuk K135 maupun M135 (turun dari 150 ke 135)
        downgradeDetails.push({
          layerPosition: position,
          originalMaterial: layerValue,
          fromThickness: 150,
          toThickness: 135,
          discountPercent: 2.0,
          reason: `${position} Layer turun ketebalan 150 ke 135 (-2,0%)`,
        });
      }
    };

    evaluateLayerDowngrade(topLayer, 'Top');
    evaluateLayerDowngrade(midLayer, 'Middle');
    evaluateLayerDowngrade(botLayer, 'Bottom');

    const totalDowngradePercent = Number(
      downgradeDetails.reduce((acc, item) => acc + item.discountPercent, 0).toFixed(4)
    );
    const totalDowngradeDecimal = Number((totalDowngradePercent / 100).toFixed(6));
    const hargaDiskon = virtualBase * (1 - totalDowngradeDecimal);
    const discountNominalRp = virtualBase - hargaDiskon;

    // =========================================================================
    // STEP 4: APLIKASI MARGIN / DISKON CUSTOMER (Bisa Positif + atau Negatif -)
    // =========================================================================
    const safeMarginPercent = Number.isFinite(marginPercent) ? marginPercent : 0;
    const marginDecimal = Number((safeMarginPercent / 100).toFixed(6));
    const hargaDenganMargin = hargaDiskon * (1 + marginDecimal);
    const marginNominalRp = hargaDenganMargin - hargaDiskon;

    // =========================================================================
    // STEP 5: APLIKASI MULTIPLIER KHUSUS (275 & E/F)
    // =========================================================================
    const multiplierDetails: MultiplierDetail[] = [];

    const has275 =
      topLayer.endsWith('275') || midLayer.endsWith('275') || botLayer.endsWith('275');
    if (has275) {
      multiplierDetails.push({
        code: '275_MATERIAL',
        label: 'Kombinasi mengandung bahan 275 gsm',
        percent: 2.0,
      });
    }

    if (flute === 'E/F') {
      multiplierDetails.push({
        code: 'EF_FLUTE',
        label: 'Jenis gelombang E-Flute (E/F)',
        percent: 2.0,
      });
    }

    const totalMultiplierPercent = multiplierDetails.reduce((acc, m) => acc + m.percent, 0);
    const totalMultiplierDecimal = Number((totalMultiplierPercent / 100).toFixed(6));
    const hargaFinalMentah = hargaDenganMargin * (1 + totalMultiplierDecimal);
    const multiplierNominalRp = hargaFinalMentah - hargaDenganMargin;

    // =========================================================================
    // STEP 6: FINALISASI & PEMBULATAN (ROUND(harga_final_mentah, 0))
    // =========================================================================
    const hargaBersihPerM2 = roundHalfUp(hargaFinalMentah);

    // Optional sheet dimension calculation
    let areaPerSheetM2: number | undefined;
    let hargaPerSheetRp: number | undefined;
    let totalOrderRp: number | undefined;

    if (input.sheetLengthMm && input.sheetWidthMm && input.sheetLengthMm > 0 && input.sheetWidthMm > 0) {
      areaPerSheetM2 = (input.sheetLengthMm * input.sheetWidthMm) / 1_000_000;
      hargaPerSheetRp = roundHalfUp(hargaBersihPerM2 * areaPerSheetM2);
      if (input.quantityPcs && input.quantityPcs > 0) {
        totalOrderRp = hargaPerSheetRp * input.quantityPcs;
      }
    }

    return {
      success: true,
      input,
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
      hargaFinalMentah,
      hargaBersihPerM2,
      areaPerSheetM2,
      hargaPerSheetRp,
      totalOrderRp,
    };
  } catch (err) {
    return emptyFailure(
      'MISSING_DB_MAPPING',
      'Kalkulasi Gagal: Kombinasi material acuan tidak ditemukan di Master Database.'
    );
  }
}

/**
 * 5. VALIDATED TEST CASES (UNIT TESTING SUITE)
 */
export interface ValidationTestCase {
  id: number;
  title: string;
  description: string;
  input: PricingInput;
  expectedResultRp: number;
  expectedBaseRp: number;
  expectedVirtualBaseRp: number;
  expectedDowngradePercent: number;
  expectedMultiplierPercent: number;
}

export const VALIDATED_TEST_CASES: ValidationTestCase[] = [
  {
    id: 1,
    title: 'Test Case 1: Pure Downgrade + Margin',
    description: 'K110/M100/K110, Flute B/F, Margin 7.5% -> Base 4125, Diskon -9.0%, Margin +7.5%',
    input: {
      topLayer: 'K110',
      midLayer: 'M100',
      botLayer: 'K110',
      flute: 'B/F',
      marginPercent: 7.5,
    },
    expectedResultRp: 4035,
    expectedBaseRp: 4125,
    expectedVirtualBaseRp: 4125,
    expectedDowngradePercent: 9.0,
    expectedMultiplierPercent: 0,
  },
  {
    id: 2,
    title: 'Test Case 2: Upgrade Material Tengah (Nominal) + Mapping Rule 4',
    description: 'K125/K150/K125, Flute B/F, Margin 0% -> Base K125/M125/K125 (4125) + Upgrade Mid K150 (+2000)',
    input: {
      topLayer: 'K125',
      midLayer: 'K150',
      botLayer: 'K125',
      flute: 'B/F',
      marginPercent: 0,
    },
    expectedResultRp: 6125,
    expectedBaseRp: 4125,
    expectedVirtualBaseRp: 6125,
    expectedDowngradePercent: 0,
    expectedMultiplierPercent: 0,
  },
  {
    id: 3,
    title: 'Test Case 3: Downgrade + Multiplier Bertumpuk (275 & E/F)',
    description: 'K275/M125/M100, Flute E/F, Margin 0% -> Base 6116, Diskon -4%, Multiplier +4% (275 & E/F)',
    input: {
      topLayer: 'K275',
      midLayer: 'M125',
      botLayer: 'M100',
      flute: 'E/F',
      marginPercent: 0,
    },
    expectedResultRp: 6106,
    expectedBaseRp: 6116,
    expectedVirtualBaseRp: 6116,
    expectedDowngradePercent: 4.0,
    expectedMultiplierPercent: 4.0,
  },
  {
    id: 4,
    title: 'Test Case 4: Auto-Swap Bottom & Top (Mapping Rule 5)',
    description: 'M125/M125/K150, Flute B/F, Margin 0% -> Auto-swap ke K150/M125/M125 (4210)',
    input: {
      topLayer: 'M125',
      midLayer: 'M125',
      botLayer: 'K150',
      flute: 'B/F',
      marginPercent: 0,
    },
    expectedResultRp: 4210,
    expectedBaseRp: 4210,
    expectedVirtualBaseRp: 4210,
    expectedDowngradePercent: 0,
    expectedMultiplierPercent: 0,
  },
  {
    id: 5,
    title: 'Test Case 5: "The Virtual Base" (Upgrade Tersembunyi pada M135)',
    description: 'M135/M135/M135, Flute B/F, Margin 0% -> Base 3894 + Virtual M150 (+900 = 4794) lalu Diskon -6%',
    input: {
      topLayer: 'M135',
      midLayer: 'M135',
      botLayer: 'M135',
      flute: 'B/F',
      marginPercent: 0,
    },
    expectedResultRp: 4506,
    expectedBaseRp: 3894,
    expectedVirtualBaseRp: 4794,
    expectedDowngradePercent: 6.0,
    expectedMultiplierPercent: 0,
  },
];

/**
 * FORMATTERS FOR WHATSAPP EXPORT (Minimalist & Executive)
 */
export function formatRupiah(value: number, includeDecimals = false): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(value);
}

export function generateWhatsAppText(
  result: PricingCalculationResult,
  mode: 'ringkas' | 'lengkap' = 'ringkas',
  customTitle?: string
): string {
  if (!result.success) return '';

  const headerTitle = customTitle
    ? `*ESTIMASI HARGA SHEET — ${customTitle.toUpperCase()}*`
    : `*ESTIMASI HARGA KARTON SHEET*`;

  if (mode === 'ringkas') {
    const lines: string[] = [
      headerTitle,
      `MYPAK Sheet Pricing Calculator`,
      `────────────────────`,
      `• *Substance:* ${result.inputSubstanceString}`,
      `• *Flute:* ${result.input.flute} (Single Wall)`,
      `• *Base Acuan:* ${result.mappedReferenceSubstance} (${formatRupiah(result.basePrice)})`,
    ];

    if (result.totalNominalUpgrade > 0) {
      lines.push(`• *Virtual Base:* ${formatRupiah(result.virtualBase)} (+${formatRupiah(result.totalNominalUpgrade)})`);
    }

    if (result.totalDowngradePercent > 0) {
      lines.push(
        `• *Diskon Downgrade:* -${result.totalDowngradePercent}% (-${formatRupiah(Math.round(result.discountNominalRp))})`
      );
    }

    if (result.marginPercent !== 0) {
      const sign = result.marginPercent > 0 ? '+' : '';
      const nominalSign = result.marginNominalRp >= 0 ? '+' : '-';
      lines.push(
        `• *Diskon/Margin:* ${sign}${result.marginPercent}% (${nominalSign}${formatRupiah(Math.abs(Math.round(result.marginNominalRp)))})`
      );
    }

    if (result.totalMultiplierPercent > 0) {
      lines.push(
        `• *Multiplier Khusus:* +${result.totalMultiplierPercent}% (+${formatRupiah(Math.round(result.multiplierNominalRp))})`
      );
    }

    lines.push(`────────────────────`);
    lines.push(`*HARGA BERSIH / M²: ${formatRupiah(result.hargaBersihPerM2)}*`);

    if (result.areaPerSheetM2 && result.hargaPerSheetRp) {
      lines.push(
        `• *Ukuran Sheet:* ${result.input.sheetLengthMm}x${result.input.sheetWidthMm} mm (${result.areaPerSheetM2.toFixed(4)} M²)`
      );
      lines.push(`• *Harga / Lembar:* ${formatRupiah(result.hargaPerSheetRp)}`);
      if (result.totalOrderRp && result.input.quantityPcs) {
        lines.push(`• *Total (${result.input.quantityPcs} pcs):* ${formatRupiah(result.totalOrderRp)}`);
      }
    }

    lines.push(`_Harga per M² belum termasuk PPN_`);
    return lines.join('\n');
  }

  // Mode Lengkap (Breakdown urutan operasi 1-6)
  const fullLines: string[] = [
    headerTitle,
    `MYPAK Sheet Pricing Calculator`,
    `────────────────────`,
    `*Spesifikasi:* ${result.inputSubstanceString} | Flute ${result.input.flute}`,
    `*Acuan Master:* #${result.baseRowNo} ${result.mappedReferenceSubstance}${result.autoSwapped ? ' (Auto-Swap)' : ''}`,
    ``,
    `*Rincian Kalkulasi:*`,
    `1. Base Price: ${formatRupiah(result.basePrice)}`,
    `2. Upgrade Nominal: +${formatRupiah(result.totalNominalUpgrade)} → Virtual Base: ${formatRupiah(result.virtualBase)}`,
    `3. Potongan Downgrade (-${result.totalDowngradePercent}%): ${formatRupiah(result.hargaDiskon, true)}`,
    `4. + Margin (${result.marginPercent}%): ${formatRupiah(result.hargaDenganMargin, true)}`,
    `5. + Multiplier (${result.totalMultiplierPercent}%): ${formatRupiah(result.hargaFinalMentah, true)}`,
    `────────────────────`,
    `*6. HARGA BERSIH / M²: ${formatRupiah(result.hargaBersihPerM2)}*`,
  ];

  if (result.areaPerSheetM2 && result.hargaPerSheetRp) {
    fullLines.push(
      `• Dimensi: ${result.input.sheetLengthMm}x${result.input.sheetWidthMm} mm → ${formatRupiah(result.hargaPerSheetRp)}/lbr`
    );
  }

  fullLines.push(`_Harga belum termasuk PPN_`);
  return fullLines.join('\n');
}
