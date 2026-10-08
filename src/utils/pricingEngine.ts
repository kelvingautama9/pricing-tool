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
  { id: 'M100', name: 'M100', group: 'Medium', tag: '-4% / -2.5%' },
  { id: 'M110', name: 'M110', group: 'Medium', tag: '-2.5% / -1.5%' },
  { id: 'M125', name: 'M125', group: 'Medium', tag: 'Base' },
  { id: 'M135', name: 'M135', group: 'Medium', tag: '+300 · -2%/-1%' },
  { id: 'M150', name: 'M150', group: 'Medium', tag: '+300' },
  { id: 'K110', name: 'K110', group: 'Kraft', tag: '-2.5% / -1.5%' },
  { id: 'K125', name: 'K125', group: 'Kraft', tag: 'Base' },
  { id: 'K135', name: 'K135', group: 'Kraft', tag: '-2% / -1%' },
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
  { id: 'M100', name: 'M100', group: 'Medium', tag: '-4% / -2.5%' },
  { id: 'M110', name: 'M110', group: 'Medium', tag: '-2.5% / -1.5%' },
  { id: 'M125', name: 'M125', group: 'Medium', tag: 'Base' },
  { id: 'M135', name: 'M135', group: 'Medium', tag: '+300 · -2%/-1%' },
  { id: 'M150', name: 'M150', group: 'Medium', tag: '+300' },
  { id: 'K150', name: 'K150', group: 'Kraft', tag: '+2.000' },
  { id: 'K200', name: 'K200', group: 'Kraft', tag: '+2.000' },
  { id: 'K275', name: 'K275', group: 'Kraft', tag: '+3.700 · +2%' },
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
  { id: 'CB/F', name: 'CB/F', tag: 'DW', supported: true },
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

  // Sheet Area, MOQ, Weight & Pcs Conversion
  areaPerSheetM2?: number;
  hargaPerSheetRp?: number;      // ROUND(Harga_M2 * Area_M2, 2)
  totalOrderRp?: number;
  moqResult?: MoqCalculationResult;
  weightResult?: WeightCalculationResult;
}

export const ORDER_MIN_LENGTH_MM = 500.0;
export const ORDER_MAX_LENGTH_MM = 2600.0;
export const ORDER_MIN_WIDTH_MM = 300.0;
export const ORDER_MAX_WIDTH_MM = 2480.0;
export const CORRUGATOR_DECKLE_MAX_WIDTH_MM = 2480.0;
export const CORRUGATOR_MIN_RUN_LENGTH_MM = 500000.0; // 500 meter
export const MOQ_ROUNDING_MULTIPLE = 50;

/**
 * -----------------------------------------------------------------------------
 * LOGIKA PERHITUNGAN KHUSUS BERAT KARTON SHEET, TONASE & HARGA RP/KG
 * -----------------------------------------------------------------------------
 * Standar Industri Corrugated Board Packaging:
 * 1. Gramatur Tiap Lapisan (GSM):
 *    Diekstrak dari kode bahan (misal M125 -> 125, K150 -> 150, K200 -> 200, K275 -> 275).
 * 2. Faktor Gelombang (Take-Up Factor):
 *    - B/F: 1.35
 *    - C/F: 1.44
 *    - E/F: 1.25
 *    - CB/F (Double Wall): Flute 1 (C Flute) = 1.44 | Flute 2 (B Flute) = 1.35
 * 3. Total Gramatur Sheet (Total GSM g/m²):
 *    - Single Wall (SW): Top + (Mid × TakeUp) + Bot
 *    - Double Wall (DW CB/F): Top + (Flute1 × 1.44) + Mid + (Flute2 × 1.35) + Bot
 * 4. Berat per M² (kg/m²):
 *    - Total GSM / 1.000
 * 5. Berat per Pcs (Lembar):
 *    - Gram: Luas M² × Total GSM
 *    - Kilogram: (Luas M² × Total GSM) / 1.000
 * 6. Tonase Total Order:
 *    - Total Berat (kg) = Berat per Pcs (kg) × Qty
 *    - Tonase (Ton) = Total Berat (kg) / 1.000
 * 7. Nilai Hitungan Rp / kg:
 *    - Harga / M² dibagi Berat per M² (kg)
 *      (Identik secara matematis dengan: Harga per Pcs (Rp) dibagi Berat per Pcs (kg))
 */
export interface LayerWeightBreakdownItem {
  position: LayerPositionLabel;
  material: string;
  baseGsm: number;
  takeUpFactor: number;
  effectiveGsm: number;
}

export interface WeightCalculationResult {
  totalGsm: number;          // Total Gramatur Karton Sheet (g/m²)
  beratPerM2Kg: number;      // Berat Karton per M² dalam Kilogram (kg/m²)
  beratPerPcsGram: number;   // Berat per Lembar / Pcs (Gram)
  beratPerPcsKg: number;     // Berat per Lembar / Pcs (Kg)
  tonaseKg: number;          // Total Berat untuk Qty yang diisi user (Kg)
  tonaseTon: number;         // Total Tonase untuk Qty yang diisi user (Ton)
  rpPerKg: number;           // Nilai Rupiah per Kilogram (Rp/kg)
  fluteTakeUpFactor: number; // Faktor gelombang flute utama
  fluteDetailsText: string;  // Keterangan faktor gelombang
  layers: LayerWeightBreakdownItem[]; // Rincian GSM per lapisan
  moqTonaseKg?: number;      // Alternatif: tonase acuan jika menggunakan MOQ (Kg)
  moqTonaseTon?: number;     // Alternatif: tonase acuan jika menggunakan MOQ (Ton)
}

export const FLUTE_TAKE_UP_FACTORS: Record<
  FluteType,
  {
    flute1: number;
    flute2?: number;
    description: string;
  }
> = {
  'B/F': { flute1: 1.35, description: 'Take-up B/F (1.35)' },
  'C/F': { flute1: 1.44, description: 'Take-up C/F (1.44)' },
  'E/F': { flute1: 1.25, description: 'Take-up E/F (1.25)' },
  'CB/F': { flute1: 1.44, flute2: 1.35, description: 'Take-up C (1.44) + B (1.35)' },
};

/**
 * Ekstraksi angka Gramatur (GSM) dari kode material.
 * Contoh: 'M125' -> 125, 'K200' -> 200, 'K275' -> 275
 */
export function parseMaterialGsm(material: string): number {
  if (!material) return 125;
  const match = material.match(/\d+/);
  return match ? parseInt(match[0], 10) : 125;
}

/**
 * Fungsi Perhitungan Berat Sheet, Tonase & Nilai Rp/Kg
 */
export function calculateWeight(
  input: PricingInput,
  hargaBersihPerM2: number,
  hargaPerSheetRp?: number,
  areaPerSheetM2?: number,
  moqPcs?: number
): WeightCalculationResult {
  const isDoubleWall = input.flute === 'CB/F';
  const factors = FLUTE_TAKE_UP_FACTORS[input.flute] || FLUTE_TAKE_UP_FACTORS['B/F'];

  const layers: LayerWeightBreakdownItem[] = [];

  // 1. Top Layer (Liner Luar)
  const topGsm = parseMaterialGsm(input.topLayer);
  layers.push({
    position: 'Top',
    material: input.topLayer,
    baseGsm: topGsm,
    takeUpFactor: 1.0,
    effectiveGsm: topGsm,
  });

  if (isDoubleWall) {
    // 2. Flute 1 (C Flute)
    const f1Mat = input.flute1Layer || 'M125';
    const f1Base = parseMaterialGsm(f1Mat);
    const f1Factor = factors.flute1;
    const f1Eff = roundHalfUp(f1Base * f1Factor, 2);
    layers.push({
      position: 'Flute 1',
      material: f1Mat,
      baseGsm: f1Base,
      takeUpFactor: f1Factor,
      effectiveGsm: f1Eff,
    });

    // 3. Middle (Center Liner)
    const midGsm = parseMaterialGsm(input.midLayer);
    layers.push({
      position: 'Middle',
      material: input.midLayer,
      baseGsm: midGsm,
      takeUpFactor: 1.0,
      effectiveGsm: midGsm,
    });

    // 4. Flute 2 (B Flute)
    const f2Mat = input.flute2Layer || 'M125';
    const f2Base = parseMaterialGsm(f2Mat);
    const f2Factor = factors.flute2 || 1.35;
    const f2Eff = roundHalfUp(f2Base * f2Factor, 2);
    layers.push({
      position: 'Flute 2',
      material: f2Mat,
      baseGsm: f2Base,
      takeUpFactor: f2Factor,
      effectiveGsm: f2Eff,
    });

    // 5. Bottom Layer (Liner Dalam)
    const botGsm = parseMaterialGsm(input.botLayer);
    layers.push({
      position: 'Bottom',
      material: input.botLayer,
      baseGsm: botGsm,
      takeUpFactor: 1.0,
      effectiveGsm: botGsm,
    });
  } else {
    // Single Wall (Top Liner - Fluting Medium - Bottom Liner)
    const midGsm = parseMaterialGsm(input.midLayer);
    const midFactor = factors.flute1;
    const midEff = roundHalfUp(midGsm * midFactor, 2);
    layers.push({
      position: 'Middle',
      material: input.midLayer,
      baseGsm: midGsm,
      takeUpFactor: midFactor,
      effectiveGsm: midEff,
    });

    const botGsm = parseMaterialGsm(input.botLayer);
    layers.push({
      position: 'Bottom',
      material: input.botLayer,
      baseGsm: botGsm,
      takeUpFactor: 1.0,
      effectiveGsm: botGsm,
    });
  }

  // Total GSM Sheet (g/m²)
  const totalGsm = roundHalfUp(
    layers.reduce((acc, l) => acc + l.effectiveGsm, 0),
    2
  );

  // Berat per M² (Kg/m²) = totalGsm / 1.000
  const beratPerM2Kg = totalGsm / 1000.0;

  // Luas Lembar (M²)
  const area =
    areaPerSheetM2 ||
    (input.sheetLengthMm && input.sheetWidthMm
      ? (input.sheetLengthMm * input.sheetWidthMm) / 1_000_000
      : 0);

  // Berat per Lembar / Pcs (Gram & Kg)
  const beratPerPcsGram = area > 0 ? roundHalfUp(area * totalGsm, 2) : 0;
  const beratPerPcsKg = area > 0 ? Number((beratPerPcsGram / 1000.0).toFixed(5)) : 0;

  // Tonase Order berdasarkan Qty yang diisi user
  const qty = input.quantityPcs && input.quantityPcs > 0 ? input.quantityPcs : 0;
  const tonaseKg = roundHalfUp(beratPerPcsKg * qty, 2);
  const tonaseTon = Number((tonaseKg / 1000.0).toFixed(4));

  // Nilai Hitungan Rp / kg:
  // - Jika lembar & pcs tersedia: Harga / Pcs (Rp) dibagi Berat / Pcs (kg)
  // - Jika lembar belum diisi: Harga / M² (Rp) dibagi Berat / M² (kg)
  // Keduanya bernilai sama persis.
  let rpPerKg = 0;
  if (beratPerPcsKg > 0 && hargaPerSheetRp && hargaPerSheetRp > 0) {
    rpPerKg = roundHalfUp(hargaPerSheetRp / beratPerPcsKg, 0);
  } else if (beratPerM2Kg > 0 && hargaBersihPerM2 > 0) {
    rpPerKg = roundHalfUp(hargaBersihPerM2 / beratPerM2Kg, 0);
  }

  let moqTonaseKg: number | undefined;
  let moqTonaseTon: number | undefined;
  if (moqPcs && moqPcs > 0 && beratPerPcsKg > 0) {
    moqTonaseKg = roundHalfUp(beratPerPcsKg * moqPcs, 2);
    moqTonaseTon = Number((moqTonaseKg / 1000.0).toFixed(4));
  }

  return {
    totalGsm,
    beratPerM2Kg,
    beratPerPcsGram,
    beratPerPcsKg,
    tonaseKg,
    tonaseTon,
    rpPerKg,
    fluteTakeUpFactor: factors.flute1,
    fluteDetailsText: factors.description,
    layers,
    moqTonaseKg,
    moqTonaseTon,
  };
}

export interface MoqDimensionWarningItem {
  type: 'danger' | 'warning' | 'info';
  code:
    | 'DECKLE_WASTE_NON_STANDARD'
    | 'WIDTH_EXCEEDED'
    | 'WIDTH_TOO_NARROW'
    | 'LENGTH_TOO_SHORT'
    | 'LENGTH_TOO_LONG'
    | 'SLITTER_KNIFE_LIMIT';
  title: string;
  message: string;
}

export interface MoqDimensionValidation {
  isDeckleWasteWarning: boolean; // Lebar berada pada rentang 1251 - 1649 mm
  isWidthExceeded: boolean;      // Lebar > 2480 mm
  isWidthTooNarrow: boolean;     // Lebar < 300 mm
  isLengthTooShort: boolean;     // Panjang < 500 mm
  isLengthTooLong: boolean;      // Panjang > 2600 mm
  hasAnyWarning: boolean;
  warnings: MoqDimensionWarningItem[];
}

export interface MoqCalculationResult {
  lengthMm: number;
  widthMm: number;
  deckleMaxWidthMm: number; // 2480 mm
  minRunLengthMm: number;   // 500.000 mm (500 meter)
  out: number;              // 1 sampai 7 out
  rawMoq: number;           // ceil((500000 / panjang) * out)
  roundedMoq: number;       // dibulatkan kelipatan 50 ke atas (ceil(raw / 50) * 50)
  isValidForProduction: boolean;
  validation: MoqDimensionValidation;
}

/**
 * Langkah 1: Menentukan Nilai "Out" dari Lebar Sheet
 * Batasan mesin corrugator standar:
 * - Lebar < 300.0 mm -> Di bawah batas min order (Out = 7, limit fisik slitter)
 * - Lebar > 2480.0 mm -> Out = 1 (agar user tetap bisa menghitung referensi)
 * - 300.0 <= Lebar <= 2480.0 mm -> Out = floor(2480.0 / Lebar)
 */
export function hitungOut(lebar: number): number {
  if (!Number.isFinite(lebar) || lebar <= 0) return 0;
  if (lebar > CORRUGATOR_DECKLE_MAX_WIDTH_MM) {
    return 1;
  }
  if (lebar < ORDER_MIN_WIDTH_MM) {
    return 7;
  }
  return Math.floor(CORRUGATOR_DECKLE_MAX_WIDTH_MM / lebar);
}

/**
 * Langkah 2: Menghitung MOQ (Minimum Order Quantity)
 * - Standar Order: Panjang 500–2.600 mm | Lebar 300–2.480 mm
 * - Non-Standar Afval Tinggi: Lebar 1.251–1.649 mm
 * - Panjang tarikan minimal = 500.000 mm (500 meter)
 * - Rumus Raw: ceil((500000 / Panjang) * Out)
 * - Pembulatan Kelipatan 50 Ke Atas: ceil(Raw / 50) * 50
 * - Jika di luar range standar: Peringatan merah (notes), user tetap dapat menghitung kalkulasi
 */
export function calculateMOQ(panjang: number, lebar: number): MoqCalculationResult {
  const warnings: MoqDimensionWarningItem[] = [];

  if (!Number.isFinite(panjang) || !Number.isFinite(lebar) || panjang <= 0 || lebar <= 0) {
    return {
      lengthMm: Number.isFinite(panjang) ? panjang : 0,
      widthMm: Number.isFinite(lebar) ? lebar : 0,
      deckleMaxWidthMm: CORRUGATOR_DECKLE_MAX_WIDTH_MM,
      minRunLengthMm: CORRUGATOR_MIN_RUN_LENGTH_MM,
      out: 0,
      rawMoq: 0,
      roundedMoq: 0,
      isValidForProduction: false,
      validation: {
        isDeckleWasteWarning: false,
        isWidthExceeded: false,
        isWidthTooNarrow: false,
        isLengthTooShort: false,
        isLengthTooLong: false,
        hasAnyWarning: false,
        warnings: [],
      },
    };
  }

  const out = hitungOut(lebar);

  // 1. Cek rentang non-standar khusus 1251 mm - 1649 mm (afval deckle berlebih)
  const isDeckleWasteWarning = lebar >= 1251 && lebar <= 1649;
  if (isDeckleWasteWarning) {
    warnings.push({
      type: 'danger',
      code: 'DECKLE_WASTE_NON_STANDARD',
      title: 'Lebar Non-Standar (1.251–1.649 mm)',
      message: `Rentang ini menghasilkan afval buangan tinggi (Out = 1). Tidak masuk order standar pabrik, namun harga tetap dikalkulasi sebagai referensi.`,
    });
  }

  // 2. Cek lebar melebihi batas maksimal (> 2480 mm)
  const isWidthExceeded = lebar > ORDER_MAX_WIDTH_MM;
  if (isWidthExceeded) {
    warnings.push({
      type: 'danger',
      code: 'WIDTH_EXCEEDED',
      title: 'Lebar Melebihi Standar (> 2.480 mm)',
      message: `Lebar (${lebar.toLocaleString('id-ID')} mm) melebihi batas deckle mesin (maks. 2.480 mm).`,
    });
  }

  // 3. Cek lebar di bawah batas minimal (< 300 mm)
  const isWidthTooNarrow = lebar < ORDER_MIN_WIDTH_MM;
  if (isWidthTooNarrow) {
    warnings.push({
      type: 'danger',
      code: 'WIDTH_TOO_NARROW',
      title: 'Lebar Di Bawah Standar (< 300 mm)',
      message: `Lebar (${lebar.toLocaleString('id-ID')} mm) di bawah batas minimum lebar order (min. 300 mm).`,
    });
  }

  // 4. Cek panjang standar minimal (< 500 mm) dan maksimal (> 2600 mm)
  const isLengthTooShort = panjang < ORDER_MIN_LENGTH_MM;
  if (isLengthTooShort) {
    warnings.push({
      type: 'danger',
      code: 'LENGTH_TOO_SHORT',
      title: 'Panjang Di Bawah Standar (< 500 mm)',
      message: `Panjang (${panjang.toLocaleString('id-ID')} mm) di bawah cut-off minimum order (min. 500 mm).`,
    });
  }

  const isLengthTooLong = panjang > ORDER_MAX_LENGTH_MM;
  if (isLengthTooLong) {
    warnings.push({
      type: 'danger',
      code: 'LENGTH_TOO_LONG',
      title: 'Panjang Melebihi Standar (> 2.600 mm)',
      message: `Panjang (${panjang.toLocaleString('id-ID')} mm) melebihi batas cut-off maksimum order (maks. 2.600 mm).`,
    });
  }

  const isValidForProduction =
    out > 0 &&
    !isWidthExceeded &&
    !isWidthTooNarrow &&
    !isLengthTooShort &&
    !isLengthTooLong &&
    !isDeckleWasteWarning;

  let rawMoq = 0;
  let roundedMoq = 0;

  if (out > 0 && panjang > 0) {
    rawMoq = Math.ceil((CORRUGATOR_MIN_RUN_LENGTH_MM / panjang) * out);
    roundedMoq = Math.ceil(rawMoq / MOQ_ROUNDING_MULTIPLE) * MOQ_ROUNDING_MULTIPLE;
  }

  return {
    lengthMm: panjang,
    widthMm: lebar,
    deckleMaxWidthMm: CORRUGATOR_DECKLE_MAX_WIDTH_MM,
    minRunLengthMm: CORRUGATOR_MIN_RUN_LENGTH_MM,
    out,
    rawMoq,
    roundedMoq,
    isValidForProduction,
    validation: {
      isDeckleWasteWarning,
      isWidthExceeded,
      isWidthTooNarrow,
      isLengthTooShort,
      isLengthTooLong,
      hasAnyWarning: warnings.length > 0,
      warnings,
    },
  };
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
    let moqResult: MoqCalculationResult | undefined;

    if (
      input.sheetLengthMm &&
      input.sheetWidthMm &&
      input.sheetLengthMm > 0 &&
      input.sheetWidthMm > 0
    ) {
      areaPerSheetM2 = (input.sheetLengthMm * input.sheetWidthMm) / 1_000_000;
      hargaPerSheetRp = roundHalfUp(hargaBersihPerM2 * areaPerSheetM2, 2);
      moqResult = calculateMOQ(input.sheetLengthMm, input.sheetWidthMm);
      if (input.quantityPcs && input.quantityPcs > 0) {
        totalOrderRp = roundHalfUp(hargaPerSheetRp * input.quantityPcs, 2);
      }
    }

    // Kalkulasi Khusus Berat Lembar, Tonase & Nilai Rp/Kg
    const weightResult = calculateWeight(
      input,
      hargaBersihPerM2,
      hargaPerSheetRp,
      areaPerSheetM2,
      moqResult?.roundedMoq
    );

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
      moqResult,
      weightResult,
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
      if (result.moqResult && result.moqResult.roundedMoq > 0) {
        lines.push(
          `• *MOQ Mesin (500m):* ${result.moqResult.roundedMoq.toLocaleString('id-ID')} pcs (${result.moqResult.out} Out · Kelipatan 50)`
        );
      }
      if (result.moqResult?.validation.warnings && result.moqResult.validation.warnings.length > 0) {
        result.moqResult.validation.warnings.forEach((w) => {
          lines.push(`  ⚠️ _Catatan: ${w.title}_`);
        });
      }
      lines.push(`*5. HARGA / PCS: ${formatRupiah(result.hargaPerSheetRp)}*`);
      if (result.weightResult && result.weightResult.beratPerPcsGram > 0) {
        lines.push(
          `• *Berat Sheet:* ${result.weightResult.beratPerPcsGram.toLocaleString('id-ID', { maximumFractionDigits: 1 })} g (${result.weightResult.beratPerPcsKg.toFixed(4)} kg) · *Rp ${result.weightResult.rpPerKg.toLocaleString('id-ID')}/kg*`
        );
        if (result.input.quantityPcs && result.weightResult.tonaseKg > 0) {
          lines.push(
            `• *Tonase Order:* ${result.weightResult.tonaseKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg (${result.weightResult.tonaseTon.toFixed(3)} Ton)`
          );
        }
      }
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
    if (result.moqResult && result.moqResult.roundedMoq > 0) {
      fullLines.push(
        `• *MOQ Mesin (500m):* ${result.moqResult.roundedMoq.toLocaleString('id-ID')} pcs (${result.moqResult.out} Out · Kelipatan 50)`
      );
    }
    if (result.moqResult?.validation.warnings && result.moqResult.validation.warnings.length > 0) {
      result.moqResult.validation.warnings.forEach((w) => {
        fullLines.push(`  ⚠️ _Catatan: ${w.title}_`);
      });
    }
    if (result.weightResult && result.weightResult.beratPerPcsGram > 0) {
      fullLines.push(
        `• *Spesifikasi Berat:* ${result.weightResult.totalGsm} g/m² (${result.weightResult.fluteDetailsText})`
      );
      fullLines.push(
        `• *Berat / Pcs:* ${result.weightResult.beratPerPcsGram.toLocaleString('id-ID', { maximumFractionDigits: 1 })} gram (${result.weightResult.beratPerPcsKg.toFixed(4)} kg)`
      );
      fullLines.push(
        `• *Rp / Kg:* Rp ${result.weightResult.rpPerKg.toLocaleString('id-ID')} / kg`
      );
      if (result.input.quantityPcs && result.weightResult.tonaseKg > 0) {
        fullLines.push(
          `• *Total Tonase (${result.input.quantityPcs.toLocaleString('id-ID')} pcs):* ${result.weightResult.tonaseKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg (${result.weightResult.tonaseTon.toFixed(3)} Ton)`
        );
      }
    }
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
