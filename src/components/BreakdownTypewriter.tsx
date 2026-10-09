import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Calculator,
} from 'lucide-react';
import {
  PricingCalculationResult,
  CustomerDiscountItem,
  formatRupiah,
} from '../utils/pricingEngine';
import { triggerHaptic } from '../utils/hapticsAndImport';

interface BreakdownTypewriterProps {
  result: PricingCalculationResult;
  customer?: CustomerDiscountItem | null;
  customerMarginResolution?: {
    effectiveMarginPercent: number;
    customerSpecial275EfOverrideActive: boolean;
    modeLabel: string;
  } | null;
}

export const BreakdownTypewriter: React.FC<BreakdownTypewriterProps> = ({
  result,
  customer,
  customerMarginResolution,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const marginSign = result.marginPercent > 0 ? '+' : '';
  const modSign = result.totalAdditiveModifierPercent > 0 ? '+' : '';
  const modNominalSign = result.totalAdditiveNominalRp >= 0 ? '+' : '−';

  // Helper for conditional percentage coloring:
  // < 0 (e.g. -5%)  => merah tua (text-red-700 dark:text-red-400 font-bold)
  // > 0 (e.g. +5%)  => hijau tua (text-emerald-700 dark:text-emerald-400 font-bold)
  // === 0 (0%)      => hitam tebal (text-[#1C1B1A] dark:text-[#F2EFE9] font-bold)
  const getPercentColorClass = (val: number): string => {
    if (val < 0) {
      return 'text-red-700 dark:text-red-400 font-bold';
    }
    if (val > 0) {
      return 'text-emerald-700 dark:text-emerald-400 font-bold';
    }
    return 'text-[#1C1B1A] dark:text-[#F2EFE9] font-bold';
  };

  // Construct copyable plain-text breakdown without deckle and without kelipatan 50
  const plainTextBreakdown = useMemo(() => {
    const downgradeText =
      result.downgradeDetails.length === 0
        ? `   • Diskon Downgrade : -0% (Standar)`
        : [
            `   • Diskon Downgrade : -${result.totalDowngradePercent}%`,
            ...result.downgradeDetails.map((dw) => `     - ${dw.reason}`),
          ].join('\n');

    const upgradeText =
      result.upgradeDetails.length === 0
        ? `   • Upgrade Nominal  : +Rp 0 (Standar)`
        : [
            `   • Upgrade Nominal  : +${formatRupiah(result.totalNominalUpgrade)}`,
            ...result.upgradeDetails.map((u) => `     - ${u.reason}`),
          ].join('\n');

    const lines: string[] = [
      `=== RINCIAN KALKULASI HARGA KARTON ===`,
      `Spesifikasi : ${result.inputSubstanceString} (${result.input.flute})`,
      `Tipe Dinding: ${result.isDoubleWall ? 'Double Wall 5-Layer' : 'Single Wall 3-Layer'}`,
      ``,
      `1. Base Master Table:`,
      `   • Acuan    : ${result.mappedReferenceSubstance} ${result.autoSwapped ? '(Auto-Swap)' : ''}`,
      `   • Base Rp  : ${formatRupiah(result.basePrice)} / M²`,
      ``,
      `2. Virtual Base:`,
      upgradeText,
      `   • Virtual  : ${formatRupiah(result.virtualBase)} / M²`,
      ``,
      `3. Modifier Additive (${modSign}${result.totalAdditiveModifierPercent}%):`,
      `   • Margin   : ${marginSign}${result.marginPercent}% ${customer ? `(${customer.name})` : ''}`,
      `   • Mult 275 : +${result.totalMultiplierPercent}%`,
      downgradeText,
      `   • Nominal  : ${modNominalSign}${formatRupiah(Math.abs(result.totalAdditiveNominalRp), true)} / M²`,
      ``,
      `4. Harga bersih (Per M²):`,
      `   • Rumus    : ${formatRupiah(result.virtualBase)} × (1 ${result.totalAdditiveModifierDecimal >= 0 ? '+' : '−'} ${Math.abs(result.totalAdditiveModifierDecimal).toFixed(4)})`,
      `   • Desimal  : Rp ${result.hargaFinalMentah.toFixed(2)}`,
      `   • Akhir    : ${formatRupiah(result.hargaBersihPerM2)} / M² (Pembulatan 5)`,
    ];

    if (result.areaPerSheetM2 && result.hargaPerSheetRp !== undefined) {
      lines.push(
        ``,
        `5. Hitung Luas & Harga/Pcs:`,
        `   • Dimensi  : ${result.input.sheetLengthMm} × ${result.input.sheetWidthMm} mm`,
        `   • Luas/Pcs : (${result.input.sheetLengthMm} × ${result.input.sheetWidthMm}) ÷ 1.000.000 = ${result.areaPerSheetM2.toFixed(5)} M²`,
        result.moqResult ? `   • MOQ      : ${result.moqResult.roundedMoq.toLocaleString('id-ID')} pcs (Min. 500m)` : '',
        `   • Rumus    : ${result.areaPerSheetM2.toFixed(5)} M² × ${formatRupiah(result.hargaBersihPerM2)}`,
        `   • HARGA/PCS: ${formatRupiah(result.hargaPerSheetRp)} / pcs`
      );
    }

    if (result.weightResult && result.weightResult.beratPerPcsGram > 0) {
      lines.push(
        ``,
        `6. Berat & Tonase:`,
        `   • Gramatur : ${result.weightResult.totalGsm} GSM`,
        `   • Berat/Pcs: ${result.weightResult.beratPerPcsGram.toFixed(1)} g (${result.weightResult.beratPerPcsKg.toFixed(4)} kg)`,
        `   • Rp / Kg  : Rp ${result.weightResult.rpPerKg.toLocaleString('id-ID')} / kg`,
        `   • Rumus Rp/Kg : ${formatRupiah(result.hargaPerSheetRp || 0)} ÷ ${result.weightResult.beratPerPcsKg.toFixed(4)} kg`
      );
      if (result.input.quantityPcs && result.weightResult.tonaseKg > 0) {
        lines.push(
          `   • Tonase   : ${result.weightResult.tonaseKg.toFixed(1)} kg (${result.weightResult.tonaseTon.toFixed(3)} Ton)`
        );
      }
    }

    return lines.filter(Boolean).join('\n');
  }, [result, customer, marginSign, modSign, modNominalSign]);

  const handleCopyText = async () => {
    try {
      triggerHaptic('medium');
      await navigator.clipboard.writeText(plainTextBreakdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="pt-2.5 space-y-3 font-sans text-xs">
      {/* Top Utility Ribbon: Quick Copy & Density Toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-black/6 dark:border-white/8 text-[11px]">
        <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 font-medium shrink-0">
          <Calculator className="w-3.5 h-3.5 text-[#C65D3B]" />
          <span>Audit & Alur Kalkulasi Rumus</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCompact(!isCompact)}
            className="text-[10px] text-neutral-500 dark:text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-[#F2EFE9] underline decoration-dotted cursor-pointer transition-colors whitespace-nowrap"
          >
            {isCompact ? 'Tampilan Detail' : 'Tampilan Ringkas'}
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono text-[10px] font-semibold transition-colors cursor-pointer select-none whitespace-nowrap ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 text-neutral-700 dark:text-neutral-300 border border-black/8 dark:border-white/10'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Salin Teks</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Step 1: Base Harga Master Table                           */}
      {/* ========================================================= */}
      <div className="p-2.5 rounded-md bg-[#F9F8F6] dark:bg-[#1A1816] border border-black/6 dark:border-white/8 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded-xs bg-[#1C1B1A]/8 dark:bg-white/10 text-[#1C1B1A] dark:text-[#F2EFE9] font-mono text-[10px] font-bold shrink-0 whitespace-nowrap">
              Step 1
            </span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
              Harga Dasar Master Table
            </span>
          </div>
          <div className="font-mono font-bold text-xs text-[#1C1B1A] dark:text-[#F2EFE9] tabular-nums shrink-0 whitespace-nowrap text-right">
            {formatRupiah(result.basePrice)}{' '}
            <span className="text-[10px] font-normal text-neutral-400">/ M²</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10.5px] font-mono pt-1 border-t border-black/4 dark:border-white/6 text-neutral-600 dark:text-neutral-400">
          <div className="p-1.5 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
            <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
              Acuan Master
            </span>
            <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] block truncate">
              {result.mappedReferenceSubstance}
            </span>
          </div>
          <div className="p-1.5 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
            <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
              Tipe Flute
            </span>
            <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] block truncate">
              {result.input.flute} · {result.isDoubleWall ? 'Double Wall (5L)' : 'Single Wall (3L)'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Step 2: Virtual Base & Nominal Upgrades                   */}
      {/* ========================================================= */}
      <div className="p-2.5 rounded-md bg-[#F9F8F6] dark:bg-[#1A1816] border border-black/6 dark:border-white/8 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded-xs bg-[#1C1B1A]/8 dark:bg-white/10 text-[#1C1B1A] dark:text-[#F2EFE9] font-mono text-[10px] font-bold shrink-0 whitespace-nowrap">
              Step 2
            </span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
              Pembentukan Virtual Base
            </span>
          </div>
          <div className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 tabular-nums shrink-0 whitespace-nowrap text-right">
            {result.totalNominalUpgrade > 0
              ? `+${formatRupiah(result.totalNominalUpgrade)}`
              : '+Rp 0'}
          </div>
        </div>

        {/* Rincian Tambahan Nominal Upgrade */}
        {result.upgradeDetails.length > 0 && (
          <div className="p-2 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
              <span>Tambahan Nominal Upgrade : +{formatRupiah(result.totalNominalUpgrade)}</span>
              <span className="text-[9px] text-neutral-400 font-normal">
                (Di atas Base M125)
              </span>
            </div>
            <div className="space-y-0.5 text-neutral-600 dark:text-neutral-300">
              {result.upgradeDetails.map((up, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span>- {up.reason}</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                    +{formatRupiah(up.amountRp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Symmetrical Math Formula Card */}
        <div className="p-2 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6 flex flex-wrap items-center justify-between gap-1 text-[10.5px] font-mono min-w-0">
          <span className="text-neutral-500 text-[10px] whitespace-nowrap shrink-0">
            Rumus Virtual Base:
          </span>
          <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] whitespace-nowrap tabular-nums">
            {formatRupiah(result.basePrice)} + {formatRupiah(result.totalNominalUpgrade)} ={' '}
            <span className="text-[#C65D3B] font-bold">{formatRupiah(result.virtualBase)} / M²</span>
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Step 3: Sistem Modifier Additive (%)                      */}
      {/* ========================================================= */}
      <div className="p-2.5 rounded-md bg-[#F9F8F6] dark:bg-[#1A1816] border border-black/6 dark:border-white/8 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded-xs bg-[#1C1B1A]/8 dark:bg-white/10 text-[#1C1B1A] dark:text-[#F2EFE9] font-mono text-[10px] font-bold shrink-0 whitespace-nowrap">
              Step 3
            </span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
              Sistem Modifier Additive (%)
            </span>
          </div>
          <div
            className={`font-mono text-xs tabular-nums shrink-0 whitespace-nowrap text-right ${getPercentColorClass(
              result.totalAdditiveModifierPercent
            )}`}
          >
            {modSign}{result.totalAdditiveModifierPercent}%
          </div>
        </div>

        {/* 3-Part Component Cards */}
        <div className="grid grid-cols-3 gap-1.5 text-[10.5px] font-mono pt-1 border-t border-black/4 dark:border-white/6">
          <div className="p-1.5 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
            <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
              Margin / Diskon
            </span>
            <span
              className={`block tabular-nums whitespace-nowrap ${getPercentColorClass(
                result.marginPercent
              )}`}
            >
              {marginSign}{result.marginPercent}%
            </span>
            {customer && (
              <span
                className="block text-[8.5px] text-neutral-400 truncate mt-0.5"
                title={customer.name}
              >
                {customer.name}
              </span>
            )}
          </div>

          <div className="p-1.5 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
            <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
              Multiplier 275/EF
            </span>
            <span
              className={`block tabular-nums whitespace-nowrap ${getPercentColorClass(
                result.totalMultiplierPercent
              )}`}
            >
              {result.totalMultiplierPercent > 0 ? `+${result.totalMultiplierPercent}%` : '0%'}
            </span>
            <span className="block text-[8.5px] text-neutral-400 truncate mt-0.5">
              {result.totalMultiplierPercent > 0 ? 'Aktif' : 'Nol'}
            </span>
          </div>

          <div className="p-1.5 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
            <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
              Diskon Downgrade
            </span>
            <span
              className={`block tabular-nums whitespace-nowrap ${
                result.totalDowngradePercent > 0
                  ? 'text-red-700 dark:text-red-400 font-bold'
                  : 'text-[#1C1B1A] dark:text-[#F2EFE9] font-bold'
              }`}
            >
              {result.totalDowngradePercent > 0 ? `−${result.totalDowngradePercent}%` : '0%'}
            </span>
            <span className="block text-[8.5px] text-neutral-400 truncate mt-0.5">
              {result.totalDowngradePercent > 0 ? 'Potongan' : 'Nol'}
            </span>
          </div>
        </div>

        {/* Rincian Penjelasan Downgrade pada Sistem Modifier Additive */}
        {result.downgradeDetails.length > 0 && (
          <div className="p-2 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-red-700 dark:text-red-400 font-bold">
              <span>Diskon Downgrade : −{result.totalDowngradePercent}%</span>
              <span className="text-[9px] text-neutral-400 font-normal">
                {result.isDoubleWall ? 'Double Wall (DW)' : 'Single Wall (SW)'}
              </span>
            </div>
            <div className="space-y-0.5 text-neutral-600 dark:text-neutral-300">
              {result.downgradeDetails.map((dw, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span>- {dw.reason}</span>
                  <span className="font-bold text-red-700 dark:text-red-400 tabular-nums">
                    −{dw.discountPercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rincian Multiplier 275/EF jika ada */}
        {result.multiplierDetails.length > 0 && result.totalMultiplierPercent > 0 && (
          <div className="p-2 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
              <span>Multiplier 275 / EF : +{result.totalMultiplierPercent}%</span>
              <span className="text-[9px] text-neutral-400 font-normal">
                (Bahan K275 atau Flute E/F)
              </span>
            </div>
            <div className="space-y-0.5 text-neutral-600 dark:text-neutral-300">
              {result.multiplierDetails.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span>- {m.label}</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    +{m.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additive Formula Bar — Symmetrical & Mobile-Safe */}
        <div className="p-2 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6 flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono min-w-0">
          <div className="flex items-center flex-wrap gap-1 text-neutral-500">
            <span className="shrink-0">Rumus:</span>
            <span className="tabular-nums">
              (
              <span className={getPercentColorClass(result.marginPercent)}>
                {marginSign}{result.marginPercent}%
              </span>
              ) + (
              <span className={getPercentColorClass(result.totalMultiplierPercent)}>
                +{result.totalMultiplierPercent}%
              </span>
              ) − (
              <span
                className={
                  result.totalDowngradePercent > 0
                    ? 'text-red-700 dark:text-red-400 font-bold'
                    : 'text-[#1C1B1A] dark:text-[#F2EFE9] font-bold'
                }
              >
                {result.totalDowngradePercent}%
              </span>
              )
            </span>
          </div>
          <div className="flex items-center gap-1 tabular-nums shrink-0">
            <span className="text-neutral-500">=</span>
            <span className={getPercentColorClass(result.totalAdditiveModifierPercent)}>
              {modSign}{result.totalAdditiveModifierPercent}%
            </span>
            <span className="text-neutral-400 font-normal text-[9.5px]">
              ({modNominalSign}{formatRupiah(Math.abs(result.totalAdditiveNominalRp), true)} / M²)
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Step 4: Harga Bersih / M² (Symmetrical Math Formula Card) */}
      {/* ========================================================= */}
      <div className="p-2.5 rounded-md bg-[#F9F8F6] dark:bg-[#1A1816] border border-black/6 dark:border-white/8 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded-xs bg-[#1C1B1A]/8 dark:bg-white/10 text-[#1C1B1A] dark:text-[#F2EFE9] font-mono text-[10px] font-bold shrink-0 whitespace-nowrap">
              Step 4
            </span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
              Harga bersih (Per M²)
            </span>
          </div>
          <div className="font-mono font-bold text-xs text-[#C65D3B] tabular-nums shrink-0 whitespace-nowrap text-right">
            {formatRupiah(result.hargaBersihPerM2)}{' '}
            <span className="text-[10px] font-normal text-neutral-400">/ M²</span>
          </div>
        </div>

        {/* Dedicated Math Formula Card: Perfectly Symmetrical & No Broken Text Wrapping */}
        <div className="p-2.5 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6 space-y-2 font-mono">
          {/* Row 1: The Multiplication Formula */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10.5px]">
            <span className="text-neutral-500 text-[10px] shrink-0 whitespace-nowrap">
              Rumus Matematika:
            </span>
            <span className="font-bold text-[#1C1B1A] dark:text-[#F2EFE9] whitespace-nowrap tabular-nums self-end sm:self-auto">
              {formatRupiah(result.virtualBase)} × (1 {result.totalAdditiveModifierDecimal >= 0 ? '+' : '−'} {Math.abs(result.totalAdditiveModifierDecimal).toFixed(4)})
            </span>
          </div>

          {/* Row 2: Decimal Raw Value & Rounded Net Target */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-black/4 dark:border-white/6 text-[10px]">
            <div className="flex items-center gap-1.5 text-neutral-500 whitespace-nowrap">
              <span>Nilai Desimal:</span>
              <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] tabular-nums">
                Rp {result.hargaFinalMentah.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-bold whitespace-nowrap tabular-nums text-right shrink-0">
              <span className="text-neutral-400 font-normal">Pembulatan 5 →</span>
              <span className="text-[#C65D3B] text-xs font-mono">
                {formatRupiah(result.hargaBersihPerM2)} / M²
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Step 5: Luas Sheet & Harga / Pcs (Symmetrical & Clean)     */}
      {/* ========================================================= */}
      {result.areaPerSheetM2 && result.hargaPerSheetRp !== undefined && (
        <div className="p-2.5 rounded-md bg-[#F9F8F6] dark:bg-[#1A1816] border border-black/6 dark:border-white/8 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded-xs bg-[#1C1B1A]/8 dark:bg-white/10 text-[#1C1B1A] dark:text-[#F2EFE9] font-mono text-[10px] font-bold shrink-0 whitespace-nowrap">
                Step 5
              </span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                Hitung Luas & Harga/Pcs
              </span>
            </div>
            <div className="font-mono font-bold text-xs text-[#C65D3B] tabular-nums shrink-0 whitespace-nowrap text-right">
              {formatRupiah(result.hargaPerSheetRp)}{' '}
              <span className="text-[10px] font-normal text-neutral-400">/ pcs</span>
            </div>
          </div>

          {/* Symmetrical 2 Cards: Luas Sheet Area & MOQ Produksi (No Deckle, No Kelipatan 50 text) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10.5px] font-mono pt-1 border-t border-black/4 dark:border-white/6">
            <div className="p-2 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
              <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
                Luas Sheet Area (M²)
              </span>
              <span className="font-bold text-[#1C1B1A] dark:text-[#F2EFE9] text-xs block tabular-nums whitespace-nowrap">
                {result.areaPerSheetM2.toFixed(5)} M²
              </span>
              <span className="block text-[9.5px] text-neutral-400 mt-0.5 tabular-nums whitespace-nowrap">
                Dimensi: {result.input.sheetLengthMm} mm × {result.input.sheetWidthMm} mm
              </span>
            </div>

            {result.moqResult && (
              <div className="p-2 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
                <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
                  MOQ Produksi (Corrugator)
                </span>
                <span className="font-bold text-[#1C1B1A] dark:text-[#F2EFE9] text-xs block tabular-nums whitespace-nowrap">
                  {result.moqResult.roundedMoq.toLocaleString('id-ID')} pcs
                </span>
                <span className="block text-[9.5px] text-neutral-400 mt-0.5 whitespace-nowrap">
                  Acuan Min. 500 Meter Lari
                </span>
              </div>
            )}
          </div>

          {/* Rumus Hitung Luas — Bersih & Tanpa Dobel Tampilan Hasil */}
          <div className="p-2 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6 space-y-1.5 text-[10px] font-mono">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[#1C1B1A] dark:text-[#F2EFE9] font-bold">
              <span>Rumus Hitung Luas</span>
              <span className="text-[9px] text-neutral-400 font-normal">
                (P × L ÷ 1.000.000)
              </span>
            </div>
            <div className="space-y-1 text-neutral-600 dark:text-neutral-300">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span>- Panjang Lembar (P)</span>
                <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] tabular-nums">
                  {result.input.sheetLengthMm} mm
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span>- Lebar Lembar (L)</span>
                <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] tabular-nums">
                  {result.input.sheetWidthMm} mm
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span>- Rumus Konversi Luas M²</span>
                <span className="text-neutral-700 dark:text-neutral-300 font-medium tabular-nums">
                  ({result.input.sheetLengthMm} × {result.input.sheetWidthMm}) ÷ 1.000.000
                </span>
              </div>
            </div>
          </div>

          {/* Clean Prominent Highlight for Harga / Pcs (Cukup Hasil Disini yang Warna Orange) */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xs bg-[#C65D3B]/10 dark:bg-[#C65D3B]/15 border-l-[3px] border-[#C65D3B] text-xs">
            <div className="min-w-0 pr-1">
              <span className="font-bold text-[#1C1B1A] dark:text-[#F2EFE9] block tracking-tight">
                Harga / Pcs
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono block">
                {result.areaPerSheetM2.toFixed(5)} M² × {formatRupiah(result.hargaBersihPerM2)}
              </span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-[#C65D3B] tabular-nums shrink-0 text-right">
              {formatRupiah(result.hargaPerSheetRp)}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Step 6: Berat Karton, Tonase & Nilai Rp / Kg              */}
      {/* ========================================================= */}
      {result.weightResult && result.weightResult.beratPerPcsGram > 0 && (
        <div className="p-2.5 rounded-md bg-[#F9F8F6] dark:bg-[#1A1816] border border-black/6 dark:border-white/8 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded-xs bg-[#1C1B1A]/8 dark:bg-white/10 text-[#1C1B1A] dark:text-[#F2EFE9] font-mono text-[10px] font-bold shrink-0 whitespace-nowrap">
                Step 6
              </span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                Spesifikasi Berat & Tonase
              </span>
            </div>
            <div className="font-mono font-bold text-xs text-[#C65D3B] tabular-nums shrink-0 whitespace-nowrap text-right">
              Rp {result.weightResult.rpPerKg.toLocaleString('id-ID')}{' '}
              <span className="text-[10px] font-normal text-neutral-400">/ kg</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10.5px] font-mono pt-1 border-t border-black/4 dark:border-white/6">
            <div className="p-1.5 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
              <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
                Total Gramatur
              </span>
              <span className="font-bold text-[#1C1B1A] dark:text-[#F2EFE9] block whitespace-nowrap tabular-nums">
                {result.weightResult.totalGsm} GSM
              </span>
            </div>

            <div className="p-1.5 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
              <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
                Berat / Pcs
              </span>
              <span className="font-bold text-[#1C1B1A] dark:text-[#F2EFE9] block whitespace-nowrap tabular-nums">
                {result.weightResult.beratPerPcsGram.toFixed(1)} g
              </span>
            </div>

            <div className="p-1.5 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
              <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
                Nilai Rp / Kg
              </span>
              <span className="font-bold text-[#C65D3B] block whitespace-nowrap tabular-nums">
                Rp {result.weightResult.rpPerKg.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="p-1.5 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6">
              <span className="text-neutral-400 block text-[9px] uppercase tracking-wide">
                Total Tonase
              </span>
              <span className="font-bold text-[#1C1B1A] dark:text-[#F2EFE9] block whitespace-nowrap tabular-nums">
                {result.input.quantityPcs && result.weightResult.tonaseKg > 0
                  ? `${result.weightResult.tonaseKg.toFixed(1)} kg`
                  : result.weightResult.moqTonaseKg
                  ? `${result.weightResult.moqTonaseKg.toFixed(1)} kg`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Rp / Kg Logic Formula Bar — Compact & Mobile-Safe */}
          <div className="p-2 rounded-xs bg-white dark:bg-[#141210] border border-black/4 dark:border-white/6 flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono min-w-0">
            <span className="text-neutral-500 whitespace-nowrap shrink-0">
              Rumus Rp/Kg :
            </span>
            <div className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] flex items-center flex-wrap gap-1 tabular-nums">
              <span>{formatRupiah(result.hargaPerSheetRp || 0)} ÷ {result.weightResult.beratPerPcsKg.toFixed(4)} kg =</span>
              <span className="text-[#C65D3B] font-bold whitespace-nowrap">
                Rp {result.weightResult.rpPerKg.toLocaleString('id-ID')} / kg
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
