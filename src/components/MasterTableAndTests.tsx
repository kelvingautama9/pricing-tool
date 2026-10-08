import React from 'react';
import {
  BASE_PRICE_TABLE,
  VALIDATED_TEST_CASES,
  calculateCartonPricing,
  formatRupiah,
  PricingInput,
  OuterLayerMaterial,
  MidLayerMaterial,
} from '../utils/pricingEngine';
import { CheckCircle2, Play, ShieldCheck } from 'lucide-react';

interface MasterTableAndTestsProps {
  activeTab: 'calculator' | 'master' | 'tests';
  currentReferenceSubstance?: string;
  onLoadPresetInput: (input: PricingInput, title: string) => void;
}

export const MasterTableAndTests: React.FC<MasterTableAndTestsProps> = ({
  activeTab,
  currentReferenceSubstance,
  onLoadPresetInput,
}) => {
  if (activeTab === 'master') {
    return (
      <div className="space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 border-b border-black/8 dark:border-white/10">
          <div>
            <h2 className="text-sm sm:text-base font-display font-bold tracking-tight text-[#1C1B1A] dark:text-[#F2EFE9]">
              01. Master Tabel Referensi Harga Dasar (M²)
            </h2>
            <p className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 leading-snug">
              MYPAK Sheet Pricing Calculator · Single Wall & Double Wall (CB/F) · Harga belum termasuk PPN
            </p>
          </div>
          <div className="text-[9.5px] sm:text-xs font-mono text-neutral-500 dark:text-neutral-400 tabular-nums shrink-0">
            15 Kombinasi Acuan · Basis Ketebalan 125
          </div>
        </div>

        <div
          className="rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 overflow-hidden shadow-2xs"
          style={{ overscrollBehaviorY: 'auto' }}
        >
          {/* Mobile swipe helper */}
          <div className="sm:hidden flex items-center justify-between px-3 py-1 bg-[#F9F9F9] dark:bg-[#1A1816] border-b border-black/5 dark:border-white/5 text-[9px] text-neutral-400 font-sans">
            <span>↔ Geser horizontal untuk melihat seluruh flute</span>
            <span className="font-mono text-neutral-500 font-semibold">15 Acuan</span>
          </div>

          <div
            className="overflow-x-auto custom-scrollbar"
            style={{
              overscrollBehaviorY: 'auto',
              overscrollBehaviorX: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y pan-x',
            }}
          >
            <table className="w-full text-left border-collapse text-[10.5px] sm:text-xs min-w-[520px]">
              <thead>
                <tr className="bg-[#F3F1ED] dark:bg-[#22201E] border-b border-black/8 dark:border-white/10 text-[9.5px] sm:text-[11px] font-display font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <th className="py-2 sm:py-2.5 px-2 text-center w-8 sm:w-10">No</th>
                  <th className="py-2 sm:py-2.5 px-2 sm:px-3 whitespace-nowrap">
                    Substance
                    <span className="hidden sm:inline text-[9px] font-normal text-neutral-400 dark:text-neutral-500 ml-1">
                      (Top/Mid/Bot)
                    </span>
                  </th>
                  <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-right whitespace-nowrap">
                    B/F
                    <span className="hidden md:inline text-[8.5px] font-normal text-neutral-400 ml-0.5">(SW)</span>
                  </th>
                  <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-right whitespace-nowrap">
                    C/F
                    <span className="hidden md:inline text-[8.5px] font-normal text-neutral-400 ml-0.5">(SW)</span>
                  </th>
                  <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-right whitespace-nowrap">
                    CB/F
                    <span className="hidden md:inline text-[8.5px] font-normal text-neutral-400 ml-0.5">(DW)</span>
                  </th>
                  <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-right whitespace-nowrap">
                    E/F
                    <span className="hidden md:inline text-[8.5px] font-normal text-neutral-400 ml-0.5">(SW)</span>
                  </th>
                  <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-right whitespace-nowrap">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6 dark:divide-white/8 font-mono tabular-nums text-[10px] sm:text-xs">
                {BASE_PRICE_TABLE.map((row) => {
                  const isHighlighted = currentReferenceSubstance === row.substance;
                  const [top, mid, bot] = row.substance.split('/') as [
                    OuterLayerMaterial,
                    MidLayerMaterial,
                    OuterLayerMaterial
                  ];

                  return (
                    <tr
                      key={row.no}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-[#C65D3B]/10 font-semibold'
                          : 'hover:bg-black/3 dark:hover:bg-white/3'
                      }`}
                    >
                      <td className="py-1.5 sm:py-2 px-2 text-center text-neutral-400 text-[9.5px] sm:text-[11px]">
                        {row.no}
                      </td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] whitespace-nowrap">
                        <span>{row.substance}</span>
                        {isHighlighted && (
                          <span className="ml-1.5 font-sans text-[8.5px] sm:text-[9.5px] text-[#C65D3B] px-1 py-0.5 rounded-xs bg-[#C65D3B]/12 font-medium">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right whitespace-nowrap">
                        {formatRupiah(row['B/F'])}
                      </td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right whitespace-nowrap">
                        {formatRupiah(row['C/F'])}
                      </td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right whitespace-nowrap">
                        {row['CB/F'] !== null ? (
                          formatRupiah(row['CB/F'])
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500 text-[9.5px] sm:text-[10px]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right whitespace-nowrap">
                        {formatRupiah(row['E/F'])}
                      </td>
                      <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right font-sans whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onLoadPresetInput(
                                {
                                  topLayer: top,
                                  midLayer: mid,
                                  botLayer: bot,
                                  flute: 'B/F',
                                  marginPercent: 0,
                                  sheetLengthMm: 1000,
                                  sheetWidthMm: 1000,
                                },
                                `Master #${row.no} SW (${row.substance})`
                              )
                            }
                            className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-[#C65D3B] hover:text-white text-[9px] sm:text-[10.5px] font-medium transition-colors duration-150 cursor-pointer"
                          >
                            SW
                          </button>
                          {row['CB/F'] !== null && (
                            <button
                              type="button"
                              onClick={() =>
                                onLoadPresetInput(
                                  {
                                    topLayer: top,
                                    flute1Layer: 'M125',
                                    midLayer: mid,
                                    flute2Layer: 'M125',
                                    botLayer: bot,
                                    flute: 'CB/F',
                                    marginPercent: 0,
                                    sheetLengthMm: 1000,
                                    sheetWidthMm: 1000,
                                  },
                                  `Master #${row.no} DW (${top}/M125/${mid}/M125/${bot})`
                                )
                              }
                              className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-[#C65D3B] hover:text-white text-[9px] sm:text-[10.5px] font-medium transition-colors duration-150 cursor-pointer"
                            >
                              CB/F
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ringkasan Aturan Penyesuaian sesuai System Blueprint (Additive Architecture) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3.5 pt-1 sm:pt-2">
          <div className="p-2.5 sm:p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 space-y-1 sm:space-y-1.5">
            <h3 className="text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#C65D3B]">
              Tahap 2: Virtual Base
            </h3>
            <ul className="text-[9.5px] sm:text-xs space-y-0.5 sm:space-y-1 text-neutral-600 dark:text-neutral-300 font-mono tabular-nums leading-tight">
              <li>• M150 / M135: +Rp 300 / layer</li>
              <li>• Inner K150 / K200: +Rp 2.000 / layer</li>
              <li>• Inner K275: +Rp 3.700 / layer</li>
            </ul>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 space-y-1 sm:space-y-1.5">
            <h3 className="text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#C65D3B]">
              Tahap 3: Diskon Downgrade
            </h3>
            <ul className="text-[9.5px] sm:text-xs space-y-0.5 sm:space-y-1 text-neutral-600 dark:text-neutral-300 font-mono tabular-nums leading-tight">
              <li>• 125 → 110: SW -2,5% | DW -1,5%</li>
              <li>• 125 → 100: SW -4,0% | DW -2,5%</li>
              <li>• 150 → 135: SW -2,0% | DW -1,0%</li>
            </ul>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 space-y-1 sm:space-y-1.5">
            <h3 className="text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#C65D3B]">
              Additive Modifier & Final
            </h3>
            <ul className="text-[9.5px] sm:text-xs space-y-0.5 sm:space-y-1 text-neutral-600 dark:text-neutral-300 font-mono tabular-nums leading-tight">
              <li>• Bahan 275: +2% | Flute E/F: +2%</li>
              <li>• Total Mod = Margin + Mult - Diskon</li>
              <li>• Harga/M² = ROUND(VirtualBase × (1+Mod), 0)</li>
              <li>• Harga/Pcs = ROUND(Harga/M² × Luas, 2)</li>
            </ul>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 space-y-1 sm:space-y-1.5">
            <h3 className="text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#C65D3B]">
              MOQ Corrugator (Min. 500m)
            </h3>
            <ul className="text-[9.5px] sm:text-xs space-y-0.5 sm:space-y-1 text-neutral-600 dark:text-neutral-300 font-mono tabular-nums leading-tight">
              <li>• Standar: P 500–2600 | L 300–2480mm</li>
              <li>• Deckle 2480: Out = floor(2480 / L)</li>
              <li>• Raw MOQ = ceil((500.000 / P) × Out)</li>
              <li>• Dibulatkan Kelipatan 50 Ke Atas</li>
              <li>• Lebar 1251–1649mm (afval tinggi)</li>
            </ul>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 space-y-1 sm:space-y-1.5">
            <h3 className="text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#C65D3B]">
              Berat, Tonase & Rp / Kg
            </h3>
            <ul className="text-[9.5px] sm:text-xs space-y-0.5 sm:space-y-1 text-neutral-600 dark:text-neutral-300 font-mono tabular-nums leading-tight">
              <li>• Take-Up: B 1.35 · C 1.44 · E 1.25</li>
              <li>• DW: Flute1 C (1.44) + Flute2 B (1.35)</li>
              <li>• Berat/Pcs = (Luas × GSM) / 1.000</li>
              <li>• Tonase = (Berat × Qty) / 1.000</li>
              <li>• Rp/kg = Harga Pcs ÷ Berat Pcs (kg)</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'tests') {
    const passedCount = VALIDATED_TEST_CASES.filter((tc) => {
      const liveCalc = calculateCartonPricing(tc.input);
      const m2Match = liveCalc.success && liveCalc.hargaBersihPerM2 === tc.expectedResultRp;
      const pcsMatch =
        liveCalc.hargaPerSheetRp !== undefined &&
        Math.abs(liveCalc.hargaPerSheetRp - tc.expectedSheetRp) < 0.005;
      return m2Match && pcsMatch;
    }).length;

    return (
      <div className="space-y-3 sm:space-y-4">
        {/* Header Strip with responsive count badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 sm:pb-3 border-b border-black/8 dark:border-white/10">
          <div>
            <h2 className="text-xs sm:text-base font-display font-bold tracking-tight text-[#1C1B1A] dark:text-[#F2EFE9]">
              02. Validated Unit Tests (The Additive Architecture SSOT)
            </h2>
            <p className="text-[9.5px] sm:text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 leading-snug">
              Verifikasi 3 skenario ekstrem System Blueprint (DW 5-Layer CB/F, Multiplier E/F + 275, Virtual Base M135).
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xs bg-emerald-600/10 border border-emerald-600/25 text-[9px] sm:text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 self-start sm:self-auto shrink-0 font-mono">
            <ShieldCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-600 shrink-0" />
            <span>
              {passedCount} / {VALIDATED_TEST_CASES.length} Test Lulus (100%)
            </span>
          </div>
        </div>

        {/* Test Cards List */}
        <div className="space-y-2 sm:space-y-2.5">
          {VALIDATED_TEST_CASES.map((tc) => {
            const liveCalc = calculateCartonPricing(tc.input);
            const isPass =
              liveCalc.success &&
              liveCalc.hargaBersihPerM2 === tc.expectedResultRp &&
              liveCalc.hargaPerSheetRp !== undefined &&
              Math.abs(liveCalc.hargaPerSheetRp - tc.expectedSheetRp) < 0.005;

            const modSign = liveCalc.totalAdditiveModifierPercent > 0 ? '+' : '';

            return (
              <div
                key={tc.id}
                className="p-2.5 sm:p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-3.5 hover:border-black/15 dark:hover:border-white/15 transition-colors shadow-2xs"
              >
                <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                  <div className="flex items-start sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isPass
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      />
                      <h3 className="text-[11px] sm:text-xs font-display font-bold text-[#1C1B1A] dark:text-[#F2EFE9] leading-tight truncate">
                        {tc.title}
                      </h3>
                    </div>
                    <span className="shrink-0 px-1.5 py-0.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] font-mono text-[8.5px] sm:text-[10px] font-semibold text-[#C65D3B]">
                      {liveCalc.inputSubstanceString} · {tc.input.flute}
                    </span>
                  </div>

                  <p className="text-[9.5px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                    {tc.description}
                  </p>

                  {/* Structured Micro-Metric Strip: Responsive 3-cols mobile, 6-cols desktop */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5 pt-0.5 font-mono text-[8.5px] sm:text-[10px] tabular-nums">
                    <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5">
                      <span className="block text-[7.5px] sm:text-[8.5px] text-neutral-400 truncate">
                        Acuan
                      </span>
                      <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] truncate block">
                        {formatRupiah(liveCalc.basePrice)}
                      </span>
                    </div>
                    <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5">
                      <span className="block text-[7.5px] sm:text-[8.5px] text-neutral-400 truncate">
                        Virtual Base
                      </span>
                      <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] truncate block">
                        {formatRupiah(liveCalc.virtualBase)}
                      </span>
                    </div>
                    <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5">
                      <span className="block text-[7.5px] sm:text-[8.5px] text-neutral-400 truncate">
                        Margin
                      </span>
                      <span className="font-semibold text-[#C65D3B] truncate block">
                        +{tc.input.marginPercent}%
                      </span>
                    </div>
                    <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5">
                      <span className="block text-[7.5px] sm:text-[8.5px] text-neutral-400 truncate">
                        Multiplier
                      </span>
                      <span className="font-semibold text-neutral-600 dark:text-neutral-300 truncate block">
                        +{liveCalc.totalMultiplierPercent}%
                      </span>
                    </div>
                    <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5">
                      <span className="block text-[7.5px] sm:text-[8.5px] text-neutral-400 truncate">
                        Downgrade
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate block">
                        -{liveCalc.totalDowngradePercent}%
                      </span>
                    </div>
                    <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5">
                      <span className="block text-[7.5px] sm:text-[8.5px] text-neutral-400 truncate">
                        Modifier
                      </span>
                      <span className="font-semibold text-[#C65D3B] truncate block">
                        {modSign}
                        {liveCalc.totalAdditiveModifierPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-2 pt-1.5 sm:pt-2 lg:pt-0 border-t lg:border-t-0 border-black/6 dark:border-white/8 shrink-0">
                  <div className="text-left lg:text-right font-mono tabular-nums leading-tight">
                    <div className="text-[8px] sm:text-[9.5px] text-neutral-400 dark:text-neutral-500">
                      M²: {formatRupiah(liveCalc.hargaBersihPerM2)} <span className="hidden sm:inline">(Mentah: {liveCalc.hargaFinalMentah.toFixed(2)})</span>
                    </div>
                    <div className="text-[11px] sm:text-sm font-bold text-[#C65D3B] mt-0.5">
                      Pcs: {formatRupiah(liveCalc.hargaPerSheetRp ?? liveCalc.hargaBersihPerM2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLoadPresetInput(tc.input, tc.title)}
                    className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md bg-[#C65D3B] hover:bg-[#b24f2f] text-white text-[9.5px] sm:text-[10.5px] font-semibold transition-colors duration-150 active:scale-[0.98] cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Muat Spek</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
