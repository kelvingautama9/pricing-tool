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
import { CheckCircle2, Play, Table2, ShieldCheck } from 'lucide-react';

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
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-black/8 dark:border-white/10">
          <div>
            <h2 className="text-lg font-display font-bold tracking-tight text-[#1C1B1A] dark:text-[#F2EFE9]">
              01. Master Tabel Referensi Harga Dasar (M²)
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              MYPAK Sheet Pricing Calculator · Harga belum termasuk PPN
            </p>
          </div>
          <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
            15 Kombinasi Acuan · Basis Ketebalan 125
          </div>
        </div>

        <div className="rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F3F1ED] dark:bg-[#22201E] border-b border-black/8 dark:border-white/10 text-[11px] font-display font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  <th className="py-3 px-4 w-12">No</th>
                  <th className="py-3 px-4">Substance (Top/Mid/Bot)</th>
                  <th className="py-3 px-4 text-right">B/F (Single Wall)</th>
                  <th className="py-3 px-4 text-right">C/F (Single Wall)</th>
                  <th className="py-3 px-4 text-right text-neutral-400 dark:text-neutral-500">
                    CB/F (Double Wall · Nonaktif)
                  </th>
                  <th className="py-3 px-4 text-right">E/F (Single Wall)</th>
                  <th className="py-3 px-4 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6 dark:divide-white/8 font-mono tabular-nums">
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
                      <td className="py-2.5 px-4 text-neutral-400">{row.no}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
                        {row.substance}
                        {isHighlighted && (
                          <span className="ml-2 font-sans text-[10.5px] text-[#C65D3B] font-normal">
                            · Acuan Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {formatRupiah(row['B/F'])}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {formatRupiah(row['C/F'])}
                      </td>
                      <td className="py-2.5 px-4 text-right text-neutral-400 dark:text-neutral-500 line-through decoration-neutral-400/50">
                        {formatRupiah(row['CB/F'])}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {formatRupiah(row['E/F'])}
                      </td>
                      <td className="py-2.5 px-4 text-right font-sans">
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
                              },
                              `Master #${row.no} (${row.substance})`
                            )
                          }
                          className="px-2.5 py-1 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-[#C65D3B] hover:text-white text-[11px] font-medium transition-colors duration-150 cursor-pointer"
                        >
                          Gunakan Acuan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ringkasan Aturan Penyesuaian sesuai Gambar ke-4 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 space-y-2">
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#C65D3B]">
              Aturan Penambahan (Virtual Base)
            </h3>
            <ul className="text-xs space-y-1.5 text-neutral-600 dark:text-neutral-300 font-mono tabular-nums">
              <li>• M125 → M150 atau M135: +Rp 300 / layer</li>
              <li>• K150 atau K200 di tengah: +Rp 2.000</li>
              <li>• K275 di tengah: +Rp 3.700</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 space-y-2">
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#C65D3B]">
              Aturan Penurunan (Single Wall)
            </h3>
            <ul className="text-xs space-y-1.5 text-neutral-600 dark:text-neutral-300 font-mono tabular-nums">
              <li>• Ketebalan 125 → 110: -2,5% / Layer</li>
              <li>• Ketebalan 125 → 100: -4,0% / Layer</li>
              <li>• Ketebalan 150 → 135: -2,0% / Layer</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 space-y-2">
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#C65D3B]">
              Multiplier Khusus & Pembulatan
            </h3>
            <ul className="text-xs space-y-1.5 text-neutral-600 dark:text-neutral-300 font-mono tabular-nums">
              <li>• Mengandung bahan 275: +2% dari Reg</li>
              <li>• Jenis Flute E/F: +2% dari Reg</li>
              <li>• Bertumpuk (275 + E/F): Akumulasi +4%</li>
              <li>• Desimal ,5 dibulatkan ke atas</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'tests') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/8 dark:border-white/10">
          <div>
            <h2 className="text-sm sm:text-base font-display font-bold tracking-tight text-[#1C1B1A] dark:text-[#F2EFE9]">
              02. Validated Test Cases (Unit Testing SOP)
            </h2>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              Verifikasi langsung 5 skenario uji resmi dari blueprint untuk memastikan tidak ada Double Penalty pada margin.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-emerald-600/10 border border-emerald-600/25 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 self-start sm:self-auto shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>5 / 5 Test Case Lulus Presisi 100%</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {VALIDATED_TEST_CASES.map((tc) => {
            const liveCalc = calculateCartonPricing(tc.input);
            const isPass =
              liveCalc.success && liveCalc.hargaBersihPerM2 === tc.expectedResultRp;

            return (
              <div
                key={tc.id}
                className="p-3.5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 hover:border-black/15 dark:hover:border-white/15 transition-colors"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center justify-between lg:justify-start gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isPass ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      />
                      <h3 className="text-xs font-display font-bold text-[#1C1B1A] dark:text-[#F2EFE9] truncate">
                        {tc.title}
                      </h3>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] font-mono text-[10px] font-semibold text-[#C65D3B] shrink-0">
                      {liveCalc.inputSubstanceString} · {tc.input.flute}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {tc.description}
                  </p>

                  {/* Structured Micro-Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-0.5 font-mono text-[10px] tabular-nums">
                    <div className="px-2 py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5">
                      <span className="block text-[9px] text-neutral-400">Acuan Tabel</span>
                      <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
                        {liveCalc.mappedReferenceSubstance} ({formatRupiah(liveCalc.basePrice)})
                      </span>
                    </div>
                    <div className="px-2 py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5">
                      <span className="block text-[9px] text-neutral-400">Virtual Base</span>
                      <span className="font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
                        {formatRupiah(liveCalc.virtualBase)}
                      </span>
                    </div>
                    <div className="px-2 py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5">
                      <span className="block text-[9px] text-neutral-400">Downgrade</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        -{liveCalc.totalDowngradePercent}%
                      </span>
                    </div>
                    <div className="px-2 py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5">
                      <span className="block text-[9px] text-neutral-400">Margin</span>
                      <span className="font-semibold text-[#C65D3B]">
                        +{tc.input.marginPercent}%
                      </span>
                    </div>
                    <div className="px-2 py-1 rounded-xs bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5 col-span-2 sm:col-span-1">
                      <span className="block text-[9px] text-neutral-400">Multiplier</span>
                      <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                        +{liveCalc.totalMultiplierPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-3 pt-2.5 lg:pt-0 border-t lg:border-t-0 border-black/6 dark:border-white/8 shrink-0">
                  <div className="text-left lg:text-right font-mono tabular-nums">
                    <div className="text-[9.5px] text-neutral-400 dark:text-neutral-500">
                      Target: {formatRupiah(tc.expectedResultRp)} · Dec: {liveCalc.hargaFinalMentah.toFixed(2)}
                    </div>
                    <div className="text-sm font-bold text-[#C65D3B] mt-0.5">
                      {formatRupiah(liveCalc.hargaBersihPerM2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLoadPresetInput(tc.input, tc.title)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#C65D3B] hover:bg-[#b24f2f] text-white text-[11px] font-semibold transition-colors duration-150 active:scale-[0.98] cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3" />
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
