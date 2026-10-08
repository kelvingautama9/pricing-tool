import React, { useState, useEffect, useMemo } from 'react';
import {
  PricingCalculationResult,
  CustomerDiscountItem,
  formatRupiah,
} from '../utils/pricingEngine';

interface BreakdownTypewriterProps {
  result: PricingCalculationResult;
  customer?: CustomerDiscountItem | null;
  customerMarginResolution?: {
    effectiveMarginPercent: number;
    customerSpecial275EfOverrideActive: boolean;
    modeLabel: string;
  } | null;
}

interface BreakdownStepItem {
  id: number;
  title: string;
  detailLines: string[];
  valueText: string;
  tone?: 'default' | 'amber' | 'emerald' | 'accent';
}

export const BreakdownTypewriter: React.FC<BreakdownTypewriterProps> = ({
  result,
  customer,
  customerMarginResolution,
}) => {
  const steps: BreakdownStepItem[] = useMemo(() => {
    const marginSign = result.marginPercent > 0 ? '+' : '';
    const modSign = result.totalAdditiveModifierPercent > 0 ? '+' : '';
    const modNominalSign = result.totalAdditiveNominalRp >= 0 ? '+' : '-';

    const upgradeLines =
      result.upgradeDetails.length === 0
        ? [
            `• Tambahan Nominal: +Rp 0 (Tidak ada layer M135/M150 atau Inner Kraft)`,
            `• Virtual Base: ${formatRupiah(result.virtualBase)}`,
          ]
        : [
            ...result.upgradeDetails.map(
              (up) => `• +${formatRupiah(up.amountRp)} (${up.reason})`
            ),
            `• Virtual Base: ${formatRupiah(result.basePrice)} + ${formatRupiah(
              result.totalNominalUpgrade
            )} = ${formatRupiah(result.virtualBase)}`,
          ];

    const downgradeSummary =
      result.downgradeDetails.length === 0
        ? 'Tidak ada penurunan ketebalan'
        : result.downgradeDetails.map((dw) => dw.reason).join(', ');

    const multiplierSummary =
      result.multiplierDetails.length === 0
        ? 'Tidak ada bahan K275 atau Flute E/F'
        : result.multiplierDetails
            .map((m) => (m.percent > 0 ? `+${m.percent}% (${m.label})` : m.label))
            .join(', ');

    const customerDetailNote =
      customer && customerMarginResolution
        ? ` (${customer.name} · ${customerMarginResolution.modeLabel} | SW: ${
            customer.swMarginPercent > 0 ? '+' : ''
          }${customer.swMarginPercent}%, 275/EF: ${
            customer.dwMarginPercent > 0 ? '+' : ''
          }${customer.dwMarginPercent}%)`
        : '';

    const step3Lines = [
      `• Margin / Diskon   : ${marginSign}${result.marginPercent}%${customerDetailNote}`,
      `• Multiplier 275/EF : +${result.totalMultiplierPercent}% (${multiplierSummary})`,
      `• Diskon Downgrade  : -${result.totalDowngradePercent}% (${downgradeSummary})`,
      `• Rumus Additive    : (${marginSign}${result.marginPercent}%) + (+${result.totalMultiplierPercent}%) - (${result.totalDowngradePercent}%) = ${modSign}${result.totalAdditiveModifierPercent}%`,
    ];

    const list: BreakdownStepItem[] = [
      {
        id: 1,
        title: `1. Base Harga Tabel (#${result.baseRowNo})`,
        detailLines: [
          `• Acuan Tabel : ${result.mappedReferenceSubstance} (${result.input.flute} · ${
            result.isDoubleWall ? 'Double Wall 5-Layer' : 'Single Wall 3-Layer'
          })${result.autoSwapped ? ' · Auto-Swap' : ''}`,
        ],
        valueText: formatRupiah(result.basePrice),
        tone: 'default',
      },
      {
        id: 2,
        title: `2. Pembentukan Virtual Base (Nominal Rp)`,
        detailLines: upgradeLines,
        valueText: `+${formatRupiah(result.totalNominalUpgrade)}`,
        tone: result.totalNominalUpgrade > 0 ? 'amber' : 'default',
      },
      {
        id: 3,
        title: `3. Sistem Modifier Persentase (Additive: ${modSign}${result.totalAdditiveModifierPercent}%)`,
        detailLines: step3Lines,
        valueText: `${modNominalSign}${formatRupiah(
          Math.abs(result.totalAdditiveNominalRp),
          true
        )}`,
        tone:
          result.totalAdditiveModifierPercent < 0
            ? 'emerald'
            : result.totalAdditiveModifierPercent > 0
            ? 'accent'
            : 'default',
      },
      {
        id: 4,
        title: `4. Harga Bersih / M²`,
        detailLines: [
          `• Rumus : ${formatRupiah(result.virtualBase)} × (1 ${
            result.totalAdditiveModifierDecimal >= 0 ? '+' : '-'
          } ${Math.abs(result.totalAdditiveModifierDecimal).toFixed(4)}) = Rp ${result.hargaFinalMentah.toFixed(2)}`,
        ],
        valueText: formatRupiah(result.hargaBersihPerM2),
        tone: 'accent',
      },
    ];

    if (result.areaPerSheetM2 && result.hargaPerSheetRp !== undefined) {
      const detailLines: string[] = [
        `• Luas (${result.input.sheetLengthMm} × ${result.input.sheetWidthMm} mm) = ${result.areaPerSheetM2.toFixed(
          5
        )} M² × ${formatRupiah(result.hargaBersihPerM2)}`,
      ];

      if (result.moqResult && result.moqResult.roundedMoq > 0) {
        detailLines.push(
          `• Deckle Corrugator (2.480 mm): ${result.moqResult.out} Out (Lebar ${result.input.sheetWidthMm} mm)`
        );
        detailLines.push(
          `• MOQ Produksi (Min. 500 Meter): ${result.moqResult.roundedMoq.toLocaleString('id-ID')} Lembar (Kelipatan 50 ke atas dari ${result.moqResult.rawMoq.toLocaleString('id-ID')} pcs)`
        );
      }

      if (result.moqResult?.validation.warnings && result.moqResult.validation.warnings.length > 0) {
        result.moqResult.validation.warnings.forEach((w) => {
          detailLines.push(`• ⚠️ Peringatan: ${w.title} — ${w.message}`);
        });
      }

      list.push({
        id: 5,
        title: `5. Konversi Luas Area, MOQ & Harga / Pcs`,
        detailLines,
        valueText: formatRupiah(result.hargaPerSheetRp),
        tone: 'accent',
      });
    }

    if (result.weightResult && result.weightResult.beratPerPcsGram > 0) {
      const weightLines: string[] = [
        `• Total Gramatur: ${result.weightResult.totalGsm} g/m² (${result.weightResult.fluteDetailsText})`,
        `• Berat / Pcs: ${result.weightResult.beratPerPcsGram.toLocaleString('id-ID', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 2,
        })} gram (${result.weightResult.beratPerPcsKg.toFixed(4)} kg / lembar)`,
        `• Rp / Kg: Rp ${result.weightResult.rpPerKg.toLocaleString('id-ID')} / kg (Harga/Pcs ÷ Berat/Pcs)`,
      ];

      if (result.input.quantityPcs && result.weightResult.tonaseKg > 0) {
        weightLines.push(
          `• Total Tonase (${result.input.quantityPcs.toLocaleString('id-ID')} pcs): ${result.weightResult.tonaseKg.toLocaleString(
            'id-ID',
            { minimumFractionDigits: 1, maximumFractionDigits: 2 }
          )} kg (${result.weightResult.tonaseTon.toFixed(3)} Ton)`
        );
      } else if (result.weightResult.moqTonaseKg && result.moqResult) {
        weightLines.push(
          `• Acuan Tonase MOQ (${result.moqResult.roundedMoq.toLocaleString('id-ID')} pcs): ${result.weightResult.moqTonaseKg.toLocaleString(
            'id-ID',
            { minimumFractionDigits: 1, maximumFractionDigits: 2 }
          )} kg (${result.weightResult.moqTonaseTon?.toFixed(3)} Ton)`
        );
      }

      list.push({
        id: 6,
        title: `6. Spesifikasi Berat Karton, Tonase & Nilai Rp / Kg`,
        detailLines: weightLines,
        valueText: `Rp ${result.weightResult.rpPerKg.toLocaleString('id-ID')}/kg`,
        tone: 'accent',
      });
    }

    return list;
  }, [result, customer, customerMarginResolution]);

  // Calculate total characters across all steps for smooth character-by-character AI streaming
  const stepCharOffsets = useMemo(() => {
    let runningTotal = 0;
    return steps.map((s) => {
      const start = runningTotal;
      const detailJoined = s.detailLines.join('\n');
      const len = s.title.length + detailJoined.length + s.valueText.length;
      runningTotal += len;
      return { start, end: runningTotal, len, detailJoined };
    });
  }, [steps]);

  const totalChars = stepCharOffsets[stepCharOffsets.length - 1]?.end || 0;
  const [revealedChars, setRevealedChars] = useState<number>(0);

  useEffect(() => {
    setRevealedChars(0);
    let current = 0;

    // Fast smooth character-by-character AI chatbot streaming effect (~6 chars per 12ms tick)
    const interval = setInterval(() => {
      current += 6;
      if (current >= totalChars) {
        setRevealedChars(totalChars);
        clearInterval(interval);
      } else {
        setRevealedChars(current);
      }
    }, 12);

    return () => clearInterval(interval);
  }, [
    totalChars,
    result.inputSubstanceString,
    result.input.flute,
    result.marginPercent,
    result.hargaPerSheetRp,
  ]);

  const getValueColor = (tone?: BreakdownStepItem['tone']) => {
    if (tone === 'amber') return 'text-amber-700 dark:text-amber-400';
    if (tone === 'emerald') return 'text-emerald-700 dark:text-emerald-400';
    if (tone === 'accent') return 'text-[#C65D3B] font-bold';
    return 'text-[#1C1B1A] dark:text-[#F2EFE9]';
  };

  return (
    <div className="space-y-1.5 text-xs pt-2 border-t border-black/6 dark:border-white/8">
      {steps.map((step, idx) => {
        const { start, end, detailJoined } = stepCharOffsets[idx];
        if (revealedChars <= start) return null;

        const localProgress = Math.min(revealedChars - start, end - start);
        const titleLen = step.title.length;
        const detailLen = detailJoined.length;

        const typedTitle = step.title.slice(0, Math.min(localProgress, titleLen));
        const typedDetail =
          localProgress > titleLen
            ? detailJoined.slice(0, Math.min(localProgress - titleLen, detailLen))
            : '';
        const typedValue =
          localProgress > titleLen + detailLen
            ? step.valueText.slice(0, localProgress - titleLen - detailLen)
            : '';

        const isCurrentlyTypingStep = revealedChars > start && revealedChars < end;
        const renderedLines = typedDetail ? typedDetail.split('\n') : [];

        return (
          <div
            key={step.id}
            className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0 border-black/5 dark:border-white/5"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[11.5px] text-[#1C1B1A] dark:text-[#F2EFE9]">
                <span>{typedTitle}</span>
                {isCurrentlyTypingStep && localProgress <= titleLen && (
                  <span className="inline-block w-[1.5px] h-3 bg-[#C65D3B] ml-0.5 align-middle animate-pulse" />
                )}
              </div>
              {renderedLines.length > 0 && (
                <div className="mt-1 space-y-0.5 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono leading-relaxed pl-1">
                  {renderedLines.map((lineText, lineIdx) => {
                    const isLastLine = lineIdx === renderedLines.length - 1;
                    return (
                      <div key={lineIdx} className="break-words">
                        <span>{lineText}</span>
                        {isLastLine &&
                          isCurrentlyTypingStep &&
                          localProgress > titleLen &&
                          localProgress <= titleLen + detailLen && (
                            <span className="inline-block w-[1.5px] h-2.5 bg-[#C65D3B] ml-0.5 align-middle animate-pulse" />
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              className={`font-mono text-[11.5px] font-semibold tabular-nums shrink-0 text-right ${getValueColor(
                step.tone
              )}`}
            >
              <span>{typedValue}</span>
              {isCurrentlyTypingStep && localProgress > titleLen + detailLen && (
                <span className="inline-block w-[1.5px] h-3 bg-[#C65D3B] ml-0.5 align-middle animate-pulse" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
