import React, { useState, useEffect, useMemo } from 'react';
import { PricingCalculationResult, formatRupiah } from '../utils/pricingEngine';

interface BreakdownTypewriterProps {
  result: PricingCalculationResult;
}

interface BreakdownStepItem {
  id: number;
  title: string;
  detail: string;
  valueText: string;
  tone?: 'default' | 'amber' | 'emerald' | 'accent';
}

export const BreakdownTypewriter: React.FC<BreakdownTypewriterProps> = ({
  result,
}) => {
  const steps: BreakdownStepItem[] = useMemo(() => {
    const marginSign = result.marginPercent > 0 ? '+' : '';
    const modSign = result.totalAdditiveModifierPercent > 0 ? '+' : '';
    const modNominalSign = result.totalAdditiveNominalRp >= 0 ? '+' : '-';

    const upgradeDesc =
      result.upgradeDetails.length === 0
        ? `Tidak ada tambahan nominal (+Rp 0) → Virtual Base: ${formatRupiah(result.virtualBase)}`
        : result.upgradeDetails
            .map((up) => `+${formatRupiah(up.amountRp)} (${up.reason})`)
            .join(' · ') + ` → Virtual Base: ${formatRupiah(result.virtualBase)}`;

    const downgradeDesc =
      result.downgradeDetails.length === 0
        ? `Tidak ada penurunan ketebalan (0%)`
        : result.downgradeDetails.map((dw) => dw.reason).join(' · ');

    const multiplierDesc =
      result.multiplierDetails.length === 0
        ? 'Tidak ada bahan 275 atau Flute E/F (0%)'
        : result.multiplierDetails
            .map((m) => (m.percent > 0 ? `+${m.percent}% (${m.label})` : m.label))
            .join(' · ');

    const list: BreakdownStepItem[] = [
      {
        id: 1,
        title: `1. Base Harga Tabel (#${result.baseRowNo})`,
        detail: `${result.mappedReferenceSubstance} (${result.input.flute} · ${
          result.isDoubleWall ? 'Double Wall 5-Layer' : 'Single Wall 3-Layer'
        })${result.autoSwapped ? ' · Auto-Swap' : ''}`,
        valueText: formatRupiah(result.basePrice),
        tone: 'default',
      },
      {
        id: 2,
        title: `2. Pembentukan Virtual Base (Nominal Rp)`,
        detail: upgradeDesc,
        valueText: `+${formatRupiah(result.totalNominalUpgrade)}`,
        tone: result.totalNominalUpgrade > 0 ? 'amber' : 'default',
      },
      {
        id: 3,
        title: `3. Sistem Modifier Persentase (Additive: ${modSign}${result.totalAdditiveModifierPercent}%)`,
        detail: `Margin (${marginSign}${result.marginPercent}%) + Multiplier (+${result.totalMultiplierPercent}%: ${multiplierDesc}) - Diskon Downgrade (-${result.totalDowngradePercent}%: ${downgradeDesc})`,
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
        detail: `${formatRupiah(result.virtualBase)} × (1 ${
          result.totalAdditiveModifierDecimal >= 0 ? '+' : '-'
        } ${Math.abs(result.totalAdditiveModifierDecimal).toFixed(4)}) = Rp ${result.hargaFinalMentah.toFixed(2)}`,
        valueText: formatRupiah(result.hargaBersihPerM2),
        tone: 'accent',
      },
    ];

    if (result.areaPerSheetM2 && result.hargaPerSheetRp !== undefined) {
      list.push({
        id: 5,
        title: `5. Konversi Luas Area & Harga / Pcs`,
        detail: `Luas (${result.input.sheetLengthMm} × ${result.input.sheetWidthMm} mm) = ${result.areaPerSheetM2.toFixed(
          5
        )} M² × ${formatRupiah(result.hargaBersihPerM2)}`,
        valueText: formatRupiah(result.hargaPerSheetRp),
        tone: 'accent',
      });
    }

    return list;
  }, [result]);

  // Calculate total characters across all steps for smooth character-by-character AI streaming
  const stepCharOffsets = useMemo(() => {
    let runningTotal = 0;
    return steps.map((s) => {
      const start = runningTotal;
      const len = s.title.length + s.detail.length + s.valueText.length;
      runningTotal += len;
      return { start, end: runningTotal, len };
    });
  }, [steps]);

  const totalChars = stepCharOffsets[stepCharOffsets.length - 1]?.end || 0;
  const [revealedChars, setRevealedChars] = useState<number>(0);

  useEffect(() => {
    setRevealedChars(0);
    let current = 0;

    // Fast smooth character-by-character AI chatbot streaming effect (~4 chars per 12ms tick at 120Hz)
    const interval = setInterval(() => {
      current += 4;
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
        const { start, end } = stepCharOffsets[idx];
        if (revealedChars <= start) return null;

        const localProgress = Math.min(revealedChars - start, end - start);
        const titleLen = step.title.length;
        const detailLen = step.detail.length;

        const typedTitle = step.title.slice(0, Math.min(localProgress, titleLen));
        const typedDetail =
          localProgress > titleLen
            ? step.detail.slice(0, Math.min(localProgress - titleLen, detailLen))
            : '';
        const typedValue =
          localProgress > titleLen + detailLen
            ? step.valueText.slice(0, localProgress - titleLen - detailLen)
            : '';

        const isCurrentlyTypingStep = revealedChars > start && revealedChars < end;

        return (
          <div
            key={step.id}
            className="flex items-start justify-between gap-3 py-1.5 border-b last:border-b-0 border-black/5 dark:border-white/5"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[11.5px] text-[#1C1B1A] dark:text-[#F2EFE9]">
                <span>{typedTitle}</span>
                {isCurrentlyTypingStep && localProgress <= titleLen && (
                  <span className="inline-block w-[1.5px] h-3 bg-[#C65D3B] ml-0.5 align-middle animate-pulse" />
                )}
              </div>
              {(typedDetail || localProgress > titleLen) && (
                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono leading-relaxed mt-0.5">
                  <span>{typedDetail}</span>
                  {isCurrentlyTypingStep &&
                    localProgress > titleLen &&
                    localProgress <= titleLen + detailLen && (
                      <span className="inline-block w-[1.5px] h-2.5 bg-[#C65D3B] ml-0.5 align-middle animate-pulse" />
                    )}
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
