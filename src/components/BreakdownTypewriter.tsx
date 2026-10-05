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
    const marginNominalSign = result.marginNominalRp >= 0 ? '+' : '-';

    const upgradeDesc =
      result.upgradeDetails.length === 0
        ? 'Tidak ada tambahan nominal (+Rp 0)'
        : result.upgradeDetails
            .map((up) => `+${formatRupiah(up.amountRp)} (${up.reason})`)
            .join(' · ') + ` → Virtual Base: ${formatRupiah(result.virtualBase)}`;

    const downgradeDesc =
      result.downgradeDetails.length === 0
        ? `Tidak ada penurunan ketebalan (0%) → ${formatRupiah(result.hargaDiskon, true)}`
        : result.downgradeDetails.map((dw) => dw.reason).join(' · ') +
          ` → Setelah diskon: ${formatRupiah(result.hargaDiskon, true)}`;

    const multiplierDesc =
      result.multiplierDetails.length === 0
        ? 'Tidak ada bahan 275 atau Flute E/F (0%)'
        : result.multiplierDetails
            .map((m) => `+${m.percent}% (${m.label})`)
            .join(' · ');

    return [
      {
        id: 1,
        title: `1. Harga Dasar Acuan (#${result.baseRowNo})`,
        detail: `${result.mappedReferenceSubstance} (${result.input.flute})${
          result.autoSwapped ? ' · Auto-Swap' : ''
        }`,
        valueText: formatRupiah(result.basePrice),
        tone: 'default',
      },
      {
        id: 2,
        title: `2. Penambahan Spek (Virtual Base)`,
        detail: upgradeDesc,
        valueText: `+${formatRupiah(result.totalNominalUpgrade)}`,
        tone: result.totalNominalUpgrade > 0 ? 'amber' : 'default',
      },
      {
        id: 3,
        title: `3. Diskon Penurunan Spek (-${result.totalDowngradePercent}%)`,
        detail: downgradeDesc,
        valueText: `-${formatRupiah(result.discountNominalRp, true)}`,
        tone: result.totalDowngradePercent > 0 ? 'emerald' : 'default',
      },
      {
        id: 4,
        title: `4. Diskon / Margin (${marginSign}${result.marginPercent}%)`,
        detail: `${formatRupiah(result.hargaDiskon, true)} × ${(
          1 + result.marginDecimal
        ).toFixed(4)} = ${formatRupiah(result.hargaDenganMargin, true)}`,
        valueText: `${marginNominalSign}${formatRupiah(
          Math.abs(result.marginNominalRp),
          true
        )}`,
        tone: result.marginNominalRp < 0 ? 'emerald' : 'default',
      },
      {
        id: 5,
        title: `5. Multiplier Khusus (+${result.totalMultiplierPercent}%)`,
        detail: multiplierDesc,
        valueText: `+${formatRupiah(result.multiplierNominalRp, true)}`,
        tone: result.totalMultiplierPercent > 0 ? 'accent' : 'default',
      },
      {
        id: 6,
        title: `6. Pembulatan Akhir`,
        detail: `Decimal: Rp ${result.hargaFinalMentah.toFixed(2)}`,
        valueText: formatRupiah(result.hargaBersihPerM2),
        tone: 'accent',
      },
    ];
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

    // Fast smooth character-by-character AI chatbot streaming effect (~3 chars per 12ms tick at 120Hz)
    const interval = setInterval(() => {
      current += 3;
      if (current >= totalChars) {
        setRevealedChars(totalChars);
        clearInterval(interval);
      } else {
        setRevealedChars(current);
      }
    }, 12);

    return () => clearInterval(interval);
  }, [totalChars, result.inputSubstanceString, result.input.flute, result.marginPercent]);

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
