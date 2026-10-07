/**
 * LEGACY BACKUP: COMPOUNDING PRICING ENGINE (ARCHIVED SKILL & CODE BACKUP)
 * -------------------------------------------------------------------------
 * File ini disimpan sebagai cadangan resmi (backup) untuk logika kalkulasi
 * lama berbasis "Compounding" (Single Wall 6-Tahap) sebelum rombakan total
 * ke Arsitektur "Additive Modifier" (Single Wall & Double Wall 5-Layer).
 *
 * Cara memuat kembali (jika suatu saat dibutuhkan):
 * - Gunakan fungsi `calculateCartonPricingCompoundingLegacy` di bawah ini, atau
 * - Muat `LEGACY_COMPOUNDING_SKILL_MARKDOWN` ke dalam Role Library AI.
 */

import {
  BASE_PRICE_TABLE,
  OUTER_LAYER_OPTIONS,
  MID_LAYER_OPTIONS,
  SingleWallFlute,
  PricingInput,
  UpgradeDetail,
  DowngradeDetail,
  MultiplierDetail,
  roundHalfUp,
} from './pricingEngine';

export const LEGACY_COMPOUNDING_SKILL_MARKDOWN = `---
name: Legacy Compounding Pricing Engine (v1 Backup)
description: Dokumentasi dan instruksi sistem untuk logika harga lama berbasis Compounding (Single Wall 3-Layer). Disimpan sebagai arsip cadangan.
category: analysis
temperature: 0.2
---
# SYSTEM BACKUP: LEGACY COMPOUNDING PRICING ENGINE (V1)

Logika ini menggunakan skema **Compounding (Bunga-Berbunga Bertahap)** dengan urutan:
1. **Tahap 1 (Base Lookup):** Cari harga dasar di \`base_price_table\` (ketebalan acuan 125). Double Wall (CB/F) ditolak pada versi lama.
2. **Tahap 2 (Virtual Base):** \`Virtual Base = Base Price + Nominal Upgrade\` (+Rp 300 untuk M135/M150, +Rp 2.000 untuk Mid K150/K200, +Rp 3.700 untuk Mid K275).
3. **Tahap 3 (Harga Diskon Downgrade):** \`Harga Diskon = Virtual Base * (1 - Total Downgrade %)\`.
   - 125 -> 110 = -2.5% / layer
   - 125 -> 100 = -4.0% / layer
   - 150 -> 135 = -2.0% / layer
4. **Tahap 4 (Aplikasi Margin Compounding terhadap Harga Diskon):**
   \`Harga Dengan Margin = Harga Diskon * (1 + Margin %)\`
5. **Tahap 5 (Aplikasi Multiplier Khusus Compounding terhadap Harga Dengan Margin):**
   \`Harga Final Mentah = Harga Dengan Margin * (1 + Multiplier 275/EF %)\`
6. **Tahap 6 (Pembulatan Akhir):** \`ROUND(Harga Final Mentah, 0)\`.
`;

function mapLayerLegacy(layer: string, position: 'Top' | 'Mid' | 'Bot', logs: string[]): string {
  if (position === 'Mid' && layer.startsWith('K')) {
    logs.push(`Legacy Mapping Rule 4 (${position}): Input ${layer} diubah paksa menjadi M125.`);
    return 'M125';
  }
  if (layer.endsWith('100') || layer.endsWith('110')) {
    const prefix = layer.charAt(0);
    return `${prefix}125`;
  }
  if (layer === 'K135') return 'K150';
  if (layer === 'M150' || layer === 'M135') return 'M125';
  return layer;
}

export function calculateCartonPricingCompoundingLegacy(input: PricingInput) {
  const { topLayer, midLayer, botLayer, flute, marginPercent } = input;
  const appliedRulesLog: string[] = [];

  if (flute === 'CB/F') {
    return {
      success: false,
      errorMessage: 'Legacy Engine hanya mendukung Single Wall (B/F, C/F, E/F).',
    };
  }

  const validOuter =
    OUTER_LAYER_OPTIONS.some((o) => o.id === topLayer) &&
    OUTER_LAYER_OPTIONS.some((o) => o.id === botLayer);
  const validMid = MID_LAYER_OPTIONS.some((o) => o.id === midLayer);
  if (!validOuter || !validMid) {
    return {
      success: false,
      errorMessage: 'Spesifikasi layer tidak valid.',
    };
  }

  const mappedTop = mapLayerLegacy(topLayer, 'Top', appliedRulesLog);
  const mappedMid = mapLayerLegacy(midLayer, 'Mid', appliedRulesLog);
  const mappedBot = mapLayerLegacy(botLayer, 'Bot', appliedRulesLog);

  const mappedSubstanceBeforeSwap = `${mappedTop}/${mappedMid}/${mappedBot}`;
  let matchedRow = BASE_PRICE_TABLE.find((r) => r.substance === mappedSubstanceBeforeSwap);

  if (!matchedRow) {
    const swappedSubstance = `${mappedBot}/${mappedMid}/${mappedTop}`;
    matchedRow = BASE_PRICE_TABLE.find((r) => r.substance === swappedSubstance);
  }

  if (!matchedRow) {
    return {
      success: false,
      errorMessage: 'Kombinasi tidak ditemukan di Master Tabel.',
    };
  }

  const activeFlute = flute as SingleWallFlute;
  const basePrice = matchedRow[activeFlute] ?? 0;

  const upgradeDetails: UpgradeDetail[] = [];
  const checkM150 = (val: string, ref: string, pos: 'Top' | 'Middle' | 'Bottom') => {
    if ((val === 'M150' || val === 'M135') && ref === 'M125') {
      upgradeDetails.push({
        layerPosition: pos,
        originalMaterial: val,
        referenceMaterial: 'M125',
        amountRp: 300,
        reason: `Virtual Upgrade M150 (${val})`,
      });
    }
  };
  checkM150(topLayer, mappedTop, 'Top');
  checkM150(midLayer, mappedMid, 'Middle');
  checkM150(botLayer, mappedBot, 'Bottom');

  if (mappedMid === 'M125') {
    if (midLayer === 'K150' || midLayer === 'K200') {
      upgradeDetails.push({
        layerPosition: 'Middle',
        originalMaterial: midLayer,
        referenceMaterial: 'M125',
        amountRp: 2000,
        reason: `Upgrade Mid ${midLayer}`,
      });
    } else if (midLayer === 'K275') {
      upgradeDetails.push({
        layerPosition: 'Middle',
        originalMaterial: midLayer,
        referenceMaterial: 'M125',
        amountRp: 3700,
        reason: `Upgrade Mid K275`,
      });
    }
  }

  const totalNominalUpgrade = upgradeDetails.reduce((a, b) => a + b.amountRp, 0);
  const virtualBase = basePrice + totalNominalUpgrade;

  const downgradeDetails: DowngradeDetail[] = [];
  const evalDowngrade = (val: string, pos: 'Top' | 'Middle' | 'Bottom') => {
    if (val.endsWith('110')) {
      downgradeDetails.push({
        layerPosition: pos,
        originalMaterial: val,
        fromThickness: 125,
        toThickness: 110,
        discountPercent: 2.5,
        reason: `${pos} 125->110 (-2.5%)`,
      });
    } else if (val.endsWith('100')) {
      downgradeDetails.push({
        layerPosition: pos,
        originalMaterial: val,
        fromThickness: 125,
        toThickness: 100,
        discountPercent: 4.0,
        reason: `${pos} 125->100 (-4.0%)`,
      });
    } else if (val.endsWith('135')) {
      downgradeDetails.push({
        layerPosition: pos,
        originalMaterial: val,
        fromThickness: 150,
        toThickness: 135,
        discountPercent: 2.0,
        reason: `${pos} 150->135 (-2.0%)`,
      });
    }
  };
  evalDowngrade(topLayer, 'Top');
  evalDowngrade(midLayer, 'Middle');
  evalDowngrade(botLayer, 'Bottom');

  const totalDowngradePercent = Number(
    downgradeDetails.reduce((a, b) => a + b.discountPercent, 0).toFixed(4)
  );
  const hargaDiskon = virtualBase * (1 - totalDowngradePercent / 100);
  const hargaDenganMargin = hargaDiskon * (1 + (marginPercent || 0) / 100);

  const multiplierDetails: MultiplierDetail[] = [];
  if (topLayer.endsWith('275') || midLayer.endsWith('275') || botLayer.endsWith('275')) {
    multiplierDetails.push({ code: '275_MATERIAL', label: 'Bahan 275', percent: 2.0 });
  }
  if (flute === 'E/F') {
    multiplierDetails.push({ code: 'EF_FLUTE', label: 'Flute E/F', percent: 2.0 });
  }
  const totalMultiplierPercent = multiplierDetails.reduce((a, b) => a + b.percent, 0);
  const hargaFinalMentah = hargaDenganMargin * (1 + totalMultiplierPercent / 100);
  const hargaBersihPerM2 = roundHalfUp(hargaFinalMentah);

  return {
    success: true,
    basePrice,
    virtualBase,
    hargaDiskon,
    hargaDenganMargin,
    hargaFinalMentah,
    hargaBersihPerM2,
  };
}
