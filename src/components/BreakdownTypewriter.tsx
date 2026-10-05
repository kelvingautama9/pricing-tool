import React, { useState, useEffect } from 'react';
import { PricingCalculationResult, formatRupiah } from '../utils/pricingEngine';

interface BreakdownTypewriterProps {
  result: PricingCalculationResult;
}

export const BreakdownTypewriter: React.FC<BreakdownTypewriterProps> = ({
  result,
}) => {
  const [visibleSteps, setVisibleSteps] = useState<number>(0);

  // Fast smooth sequential reveal when opened or when result changes
  useEffect(() => {
    setVisibleSteps(1);
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    for (let i = 2; i <= 6; i++) {
      timers.push(
        setTimeout(() => {
          setVisibleSteps(i);
        }, (i - 1) * 55)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [
    result.inputSubstanceString,
    result.input.flute,
    result.marginPercent,
  ]);

  const marginSign = result.marginPercent > 0 ? '+' : '';
  const marginNominalSign = result.marginNominalRp >= 0 ? '+' : '-';

  return (
    <div className="space-y-2 text-xs pt-2 border-t border-black/6 dark:border-white/8">
      {/* Step 1: Master Base */}
      {visibleSteps >= 1 && (
        <div className="flex items-start justify-between gap-2 py-1 border-b border-black/5 dark:border-white/5 transition-opacity duration-150">
          <div>
            <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
              1. Harga Dasar Acuan (#{result.baseRowNo})
            </span>
            <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
              {result.mappedReferenceSubstance} ({result.input.flute})
              {result.autoSwapped ? ' · Auto-Swap' : ''}
            </span>
          </div>
          <span className="font-mono font-semibold tabular-nums shrink-0">
            {formatRupiah(result.basePrice)}
          </span>
        </div>
      )}

      {/* Step 2: Nominal Upgrade & Virtual Base */}
      {visibleSteps >= 2 && (
        <div className="py-1 border-b border-black/5 dark:border-white/5 space-y-1 transition-opacity duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
                2. Penambahan Spek (Virtual Base)
              </span>
              {result.upgradeDetails.length === 0 ? (
                <span className="block text-[10px] text-neutral-400 dark:text-neutral-500">
                  Tidak ada tambahan nominal (+Rp 0)
                </span>
              ) : (
                <div className="space-y-0.5 mt-0.5">
                  {result.upgradeDetails.map((up, i) => (
                    <span
                      key={i}
                      className="block text-[10px] text-amber-700 dark:text-amber-400 font-mono"
                    >
                      + {formatRupiah(up.amountRp)} ({up.reason})
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="font-mono font-semibold text-amber-700 dark:text-amber-400 tabular-nums shrink-0">
              +{formatRupiah(result.totalNominalUpgrade)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono bg-[#F3F1ED] dark:bg-[#22201E] px-2 py-1 rounded-xs tabular-nums">
            <span className="font-medium text-neutral-600 dark:text-neutral-300">
              Virtual Base
            </span>
            <span className="font-bold">
              {formatRupiah(result.virtualBase)}
            </span>
          </div>
        </div>
      )}

      {/* Step 3: Downgrade Discount */}
      {visibleSteps >= 3 && (
        <div className="py-1 border-b border-black/5 dark:border-white/5 space-y-1 transition-opacity duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
                3. Diskon Penurunan Spek (-{result.totalDowngradePercent}%)
              </span>
              {result.downgradeDetails.length === 0 ? (
                <span className="block text-[10px] text-neutral-400 dark:text-neutral-500">
                  Tidak ada penurunan ketebalan (0%)
                </span>
              ) : (
                <div className="space-y-0.5 mt-0.5">
                  {result.downgradeDetails.map((dw, i) => (
                    <span
                      key={i}
                      className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-mono"
                    >
                      • {dw.reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
              -{formatRupiah(result.discountNominalRp, true)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 dark:text-neutral-500 tabular-nums">
            <span>Harga Setelah Diskon</span>
            <span>{formatRupiah(result.hargaDiskon, true)}</span>
          </div>
        </div>
      )}

      {/* Step 4: Margin / Diskon Customer (+ or -) */}
      {visibleSteps >= 4 && (
        <div className="py-1 border-b border-black/5 dark:border-white/5 space-y-1 transition-opacity duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
                4. Diskon / Margin Customer ({marginSign}
                {result.marginPercent}%)
              </span>
              <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                {formatRupiah(result.hargaDiskon, true)} ×{' '}
                {(1 + result.marginDecimal).toFixed(4)}
              </span>
            </div>
            <span
              className={`font-mono font-semibold tabular-nums shrink-0 ${
                result.marginNominalRp < 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : ''
              }`}
            >
              {marginNominalSign}
              {formatRupiah(Math.abs(result.marginNominalRp), true)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 dark:text-neutral-500 tabular-nums">
            <span>Harga Dengan Margin/Diskon</span>
            <span>{formatRupiah(result.hargaDenganMargin, true)}</span>
          </div>
        </div>
      )}

      {/* Step 5: Conditional Multipliers (275 & E/F) */}
      {visibleSteps >= 5 && (
        <div className="py-1 border-b border-black/5 dark:border-white/5 space-y-1 transition-opacity duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
                5. Multiplier Khusus (+{result.totalMultiplierPercent}%)
              </span>
              {result.multiplierDetails.length === 0 ? (
                <span className="block text-[10px] text-neutral-400 dark:text-neutral-500">
                  Tidak ada bahan 275 atau Flute E/F (0%)
                </span>
              ) : (
                <div className="space-y-0.5 mt-0.5">
                  {result.multiplierDetails.map((m, i) => (
                    <span
                      key={i}
                      className="block text-[10px] text-[#C65D3B] font-mono"
                    >
                      • +{m.percent}% ({m.label})
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="font-mono font-semibold tabular-nums shrink-0">
              +{formatRupiah(result.multiplierNominalRp, true)}
            </span>
          </div>
        </div>
      )}

      {/* Step 6: Finalisasi */}
      {visibleSteps >= 6 && (
        <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums transition-opacity duration-150">
          <span>6. Pembulatan Akhir (Mentah Rp {result.hargaFinalMentah.toFixed(2)})</span>
          <span className="font-bold text-[#C65D3B]">
            {formatRupiah(result.hargaBersihPerM2)}
          </span>
        </div>
      )}
    </div>
  );
};
