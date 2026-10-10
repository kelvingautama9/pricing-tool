import React, { useState, useMemo, useCallback } from 'react';
import {
  calculateCartonPricing,
  formatRupiah,
  PricingInput,
  OuterLayerMaterial,
  MidLayerMaterial,
  FluteType,
  OUTER_LAYER_OPTIONS,
  MID_LAYER_OPTIONS,
  FLUTE_OPTIONS,
} from '../utils/pricingEngine';
import {
  Plus,
  Trash2,
  Copy,
  Download,
  ExternalLink,
  RotateCcw,
  Check,
  Calculator,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface BatchRowItem {
  id: string;
  name: string;
  flute: FluteType;
  topLayer: OuterLayerMaterial;
  flute1Layer?: MidLayerMaterial;
  midLayer: MidLayerMaterial;
  flute2Layer?: MidLayerMaterial;
  botLayer: OuterLayerMaterial;
  sheetLengthMm: number;
  sheetWidthMm: number;
  marginPercent: number;
  quantityPcs?: number;
}

const DEFAULT_SAMPLE_ITEMS: BatchRowItem[] = [
  {
    id: 'batch-1',
    name: 'Item 1',
    flute: 'B/F',
    topLayer: 'K125',
    midLayer: 'M125',
    botLayer: 'M125',
    sheetLengthMm: 1200,
    sheetWidthMm: 800,
    marginPercent: 0,
    quantityPcs: 1000,
  },
  {
    id: 'batch-2',
    name: 'Item 2',
    flute: 'C/F',
    topLayer: 'K150',
    midLayer: 'M125',
    botLayer: 'K125',
    sheetLengthMm: 1860,
    sheetWidthMm: 1161,
    marginPercent: 0,
    quantityPcs: 500,
  },
  {
    id: 'batch-3',
    name: 'Item 3',
    flute: 'CB/F',
    topLayer: 'K200',
    flute1Layer: 'M125',
    midLayer: 'M125',
    flute2Layer: 'M125',
    botLayer: 'K200',
    sheetLengthMm: 2100,
    sheetWidthMm: 1400,
    marginPercent: 0,
    quantityPcs: 300,
  },
  {
    id: 'batch-4',
    name: 'Item 4',
    flute: 'E/F',
    topLayer: 'M125',
    midLayer: 'M125',
    botLayer: 'M125',
    sheetLengthMm: 650,
    sheetWidthMm: 450,
    marginPercent: 0,
    quantityPcs: 2500,
  },
];

interface BatchCalculatorProps {
  onOpenInSingleCalculator: (input: PricingInput, title: string) => void;
}

export const BatchCalculator: React.FC<BatchCalculatorProps> = ({
  onOpenInSingleCalculator,
}) => {
  const [items, setItems] = useState<BatchRowItem[]>(() => {
    try {
      const saved = localStorage.getItem('mypak_batch_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const legacyNames = ['Box Sparepart A', 'Master Box C/F', 'Heavy Duty 5-Ply', 'Die-Cut Box E/F'];
          const hasLegacy = parsed.some((it: any) => legacyNames.includes(it.name));
          if (hasLegacy) {
            return parsed.map((it: any, idx: number) => ({
              ...it,
              name: legacyNames.includes(it.name) ? `Item ${idx + 1}` : it.name,
            }));
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_SAMPLE_ITEMS;
  });

  const [copiedSummary, setCopiedSummary] = useState(false);
  const [viewMode, setViewMode] = useState<'adaptive' | 'table'>('adaptive');
  const [globalMarginValue, setGlobalMarginValue] = useState<number>(0);
  const [customMarginInput, setCustomMarginInput] = useState<string>('0');
  const [marginAppliedFeedback, setMarginAppliedFeedback] = useState(false);

  // Save to LocalStorage whenever items change
  const saveItems = useCallback((newItems: BatchRowItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem('mypak_batch_items', JSON.stringify(newItems));
    } catch {
      // ignore
    }
  }, []);

  // Compute live calculations for all rows
  const calculatedRows = useMemo(() => {
    return items.map((item, index) => {
      const pricingInput: PricingInput = {
        flute: item.flute,
        topLayer: item.topLayer,
        flute1Layer: item.flute === 'CB/F' ? (item.flute1Layer || 'M125') : undefined,
        midLayer: item.midLayer,
        flute2Layer: item.flute === 'CB/F' ? (item.flute2Layer || 'M125') : undefined,
        botLayer: item.botLayer,
        sheetLengthMm: item.sheetLengthMm,
        sheetWidthMm: item.sheetWidthMm,
        marginPercent: item.marginPercent || 0,
        quantityPcs: item.quantityPcs,
      };

      const result = calculateCartonPricing(pricingInput);

      return {
        rowNumber: index + 1,
        item,
        pricingInput,
        result,
      };
    });
  }, [items]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    const totalItems = calculatedRows.length;
    let totalPcs = 0;
    let totalTonaseKg = 0;
    let sumHargaPcs = 0;
    let countHargaPcs = 0;
    let sumRpPerKg = 0;
    let countRpPerKg = 0;

    calculatedRows.forEach(({ item, result }) => {
      if (item.quantityPcs) totalPcs += item.quantityPcs;
      if (result.weightResult?.tonaseKg) totalTonaseKg += result.weightResult.tonaseKg;
      if (result.hargaPerSheetRp !== undefined) {
        sumHargaPcs += result.hargaPerSheetRp;
        countHargaPcs++;
      }
      if (result.weightResult?.rpPerKg) {
        sumRpPerKg += result.weightResult.rpPerKg;
        countRpPerKg++;
      }
    });

    return {
      totalItems,
      totalPcs,
      totalTonaseKg,
      avgHargaPcs: countHargaPcs > 0 ? Math.round(sumHargaPcs / countHargaPcs) : 0,
      avgRpPerKg: countRpPerKg > 0 ? Math.round(sumRpPerKg / countRpPerKg) : 0,
    };
  }, [calculatedRows]);

  // Handler: Add new row
  const handleAddRow = () => {
    const newItem: BatchRowItem = {
      id: `batch-${Date.now()}`,
      name: `Item ${items.length + 1}`,
      flute: 'B/F',
      topLayer: 'K125',
      midLayer: 'M125',
      botLayer: 'M125',
      sheetLengthMm: 1000,
      sheetWidthMm: 800,
      marginPercent: globalMarginValue,
      quantityPcs: 1000,
    };
    saveItems([...items, newItem]);
  };

  // Handler: Apply global margin/discount to all items
  const handleApplyGlobalMargin = (margin: number) => {
    setGlobalMarginValue(margin);
    setCustomMarginInput(margin.toString());
    const updated = items.map((item) => ({
      ...item,
      marginPercent: margin,
    }));
    saveItems(updated);
    setMarginAppliedFeedback(true);
    setTimeout(() => setMarginAppliedFeedback(false), 2500);
  };

  // Handler: Duplicate row
  const handleDuplicateRow = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const duplicated: BatchRowItem = {
      ...target,
      id: `batch-${Date.now()}`,
      name: `${target.name} (Copy)`,
    };
    const index = items.findIndex((i) => i.id === id);
    const newItems = [...items];
    newItems.splice(index + 1, 0, duplicated);
    saveItems(newItems);
  };

  // Handler: Delete row
  const handleDeleteRow = (id: string) => {
    if (items.length <= 1) {
      alert('Minimal harus ada 1 baris item di tabel batch.');
      return;
    }
    saveItems(items.filter((i) => i.id !== id));
  };

  // Handler: Update row field
  const handleUpdateField = <K extends keyof BatchRowItem>(
    id: string,
    field: K,
    value: BatchRowItem[K]
  ) => {
    saveItems(
      items.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, [field]: value };
        // If switching from CB/F to SW, retain or reset flute layers
        if (field === 'flute' && value !== 'CB/F') {
          updated.flute1Layer = undefined;
          updated.flute2Layer = undefined;
        } else if (field === 'flute' && value === 'CB/F') {
          if (!updated.flute1Layer) updated.flute1Layer = 'M125';
          if (!updated.flute2Layer) updated.flute2Layer = 'M125';
        }
        return updated;
      })
    );
  };

  // Handler: Reset to default sample
  const handleResetSample = () => {
    if (confirm('Kembalikan data ke contoh spek pabrik default? Data saat ini akan diganti.')) {
      saveItems(DEFAULT_SAMPLE_ITEMS);
    }
  };

  // Helper: Get color class for modifier percentage
  const getModifierColorClass = (modPercent: number) => {
    if (modPercent < 0) return 'text-red-700 dark:text-red-400 font-bold';
    if (modPercent > 0) return 'text-emerald-700 dark:text-emerald-400 font-bold';
    return 'text-[#1C1B1A] dark:text-[#F2EFE9] font-bold';
  };

  // Handler: Copy summary for WhatsApp
  const handleCopyWhatsAppSummary = () => {
    const lines = [
      `*REKAPITULASI BATCH HARGA KARTON SHEET (MYPAK)*`,
      `Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`,
      `Total: ${calculatedRows.length} Item`,
      `----------------------------------------`,
    ];

    calculatedRows.forEach(({ rowNumber, item, result }) => {
      const substance =
        item.flute === 'CB/F'
          ? `${item.topLayer}/${item.flute1Layer || 'M125'}/${item.midLayer}/${item.flute2Layer || 'M125'}/${item.botLayer}`
          : `${item.topLayer}/${item.midLayer}/${item.botLayer}`;

      const modSign = result.totalAdditiveModifierPercent > 0 ? '+' : '';
      const modText = `${modSign}${result.totalAdditiveModifierPercent}%`;

      lines.push(
        `${rowNumber}. *${item.name}* (${item.flute})`,
        `   • Spek     : ${substance}`,
        `   • Dimensi  : ${item.sheetLengthMm} × ${item.sheetWidthMm} mm (${result.areaPerSheetM2 ? result.areaPerSheetM2.toFixed(5) : 0} M²)`,
        `   • Modifier : ${modText} (Base: ${formatRupiah(result.basePrice)})`,
        `   • Harga/M² : ${formatRupiah(result.hargaBersihPerM2)}`,
        `   • *Harga/Pcs: ${result.hargaPerSheetRp !== undefined ? formatRupiah(result.hargaPerSheetRp) : '-'}*`,
        result.weightResult
          ? `   • Berat    : ${result.weightResult.beratPerPcsGram.toLocaleString('id-ID', { maximumFractionDigits: 1 })} g | Rp ${result.weightResult.rpPerKg.toLocaleString('id-ID')}/kg`
          : '',
        result.moqResult?.roundedMoq
          ? `   • MOQ      : ${result.moqResult.roundedMoq.toLocaleString('id-ID')} pcs`
          : '',
        `----------------------------------------`
      );
    });

    lines.push(
      `*RINGKASAN ESTIMASI:*`,
      aggregateStats.totalPcs > 0 ? `• Total Estimasi Qty  : ${aggregateStats.totalPcs.toLocaleString('id-ID')} pcs` : '',
      aggregateStats.totalTonaseKg > 0 ? `• Total Tonase        : ${aggregateStats.totalTonaseKg.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg (${(aggregateStats.totalTonaseKg / 1000).toFixed(3)} Ton)` : '',
      `\n*Dihitung otomatis via MYPAK Pricing Engine*`
    );

    const fullText = lines.filter(Boolean).join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    });
  };

  // Handler: Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const dataForExcel = calculatedRows.map(({ rowNumber, item, result }) => {
      const substance =
        item.flute === 'CB/F'
          ? `${item.topLayer}/${item.flute1Layer || 'M125'}/${item.midLayer}/${item.flute2Layer || 'M125'}/${item.botLayer}`
          : `${item.topLayer}/${item.midLayer}/${item.botLayer}`;

      return {
        No: rowNumber,
        'Nama Item': item.name,
        Flute: item.flute,
        'Susunan Layer (Substance)': substance,
        'Panjang (mm)': item.sheetLengthMm,
        'Lebar (mm)': item.sheetWidthMm,
        'Luas (M²)': result.areaPerSheetM2 ? Number(result.areaPerSheetM2.toFixed(5)) : 0,
        'Modifier (%)': `${result.totalAdditiveModifierPercent > 0 ? '+' : ''}${result.totalAdditiveModifierPercent}%`,
        'Base Rp/M²': result.basePrice,
        'Harga Bersih M²': result.hargaBersihPerM2,
        'Harga/Pcs (Rp)': result.hargaPerSheetRp || 0,
        'Berat/Pcs (g)': result.weightResult?.beratPerPcsGram || 0,
        'Berat/Pcs (kg)': result.weightResult?.beratPerPcsKg || 0,
        'Rp/Kg': result.weightResult?.rpPerKg || 0,
        'MOQ (pcs)': result.moqResult?.roundedMoq || 0,
        'Estimasi Qty': item.quantityPcs || 0,
        'Estimasi Tonase (kg)': result.weightResult?.tonaseKg || 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Batch Karton MYPAK');
    XLSX.writeFile(
      workbook,
      `MYPAK_Batch_Pricing_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-4">
      {/* ========================================================= */}
      {/* 1. Header Toolbar & Excel Spreadsheet Identity           */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/8 dark:border-white/10">
        <div>
          <h2 className="text-sm sm:text-base font-display font-bold tracking-tight text-[#1C1B1A] dark:text-[#F2EFE9]">
            Multi-Spec Calculator
          </h2>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
          {/* Add Row Button */}
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#C65D3B] hover:bg-[#b04f30] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Baris</span>
          </button>

          {/* Copy for WhatsApp */}
          <button
            type="button"
            onClick={handleCopyWhatsAppSummary}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1C1B1A]/6 dark:bg-white/8 hover:bg-[#1C1B1A]/10 dark:hover:bg-white/12 text-[#1C1B1A] dark:text-[#F2EFE9] text-xs font-medium border border-black/8 dark:border-white/10 transition-colors cursor-pointer"
            title="Salin rekap rapih untuk WhatsApp"
          >
            {copiedSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-500" />
                <span>Salin (WA)</span>
              </>
            )}
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1C1B1A]/6 dark:bg-white/8 hover:bg-[#1C1B1A]/10 dark:hover:bg-white/12 text-[#1C1B1A] dark:text-[#F2EFE9] text-xs font-medium border border-black/8 dark:border-white/10 transition-colors cursor-pointer"
            title="Download file Excel .xlsx"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Sample Preset Reset */}
          <button
            type="button"
            onClick={handleResetSample}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white text-xs transition-colors cursor-pointer"
            title="Reset ke contoh data pabrik"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Contoh</span>
          </button>

          {/* View Mode Toggle for Tablet/Desktop */}
          <div className="hidden lg:flex items-center rounded-md border border-black/8 dark:border-white/10 p-0.5 bg-[#1C1B1A]/5 dark:bg-white/5 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('adaptive')}
              className={`px-2 py-1 rounded-xs transition-colors cursor-pointer ${
                viewMode === 'adaptive'
                  ? 'bg-white dark:bg-[#22201E] text-[#1C1B1A] dark:text-white font-semibold shadow-2xs'
                  : 'text-neutral-500'
              }`}
            >
              Adaptif
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-xs transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#22201E] text-[#1C1B1A] dark:text-white font-semibold shadow-2xs'
                  : 'text-neutral-500'
              }`}
            >
              Spreadsheet
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Acuan Diskon / Margin Global                           */}
      {/* ========================================================= */}
      <div className="p-2.5 sm:p-3 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
              Acuan Diskon / Margin Global
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden md:inline">
              (Hitung & terapkan ke seluruh item)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Quick Chips */}
            <div className="flex items-center gap-1 bg-black/4 dark:bg-white/6 p-0.5 rounded-md border border-black/6 dark:border-white/8 text-[11px] font-mono">
              {[-10, -5, 0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyGlobalMargin(pct)}
                  className={`px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                    globalMarginValue === pct
                      ? 'bg-[#C65D3B] text-white font-bold shadow-2xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white'
                  }`}
                >
                  {pct > 0 ? `+${pct}%` : `${pct}%`}
                </button>
              ))}
            </div>

            {/* Custom Input + Button */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center">
                <input
                  type="number"
                  value={customMarginInput}
                  onChange={(e) => setCustomMarginInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyGlobalMargin(Number(customMarginInput) || 0);
                    }
                  }}
                  placeholder="0"
                  aria-label="Input persentase margin atau diskon global"
                  className="w-16 px-2 py-1 text-center text-xs font-mono font-bold rounded-md bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 text-[#1C1B1A] dark:text-[#F2EFE9] focus:border-[#C65D3B] outline-hidden"
                />
                <span className="absolute right-2 text-xs font-mono text-neutral-400 pointer-events-none">
                  %
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleApplyGlobalMargin(Number(customMarginInput) || 0)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#C65D3B] hover:bg-[#b04f30] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Terapkan</span>
              </button>
            </div>
          </div>
        </div>
        {marginAppliedFeedback && (
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>
              Diskon/Margin {globalMarginValue > 0 ? `+${globalMarginValue}%` : `${globalMarginValue}%`} berhasil diterapkan ke seluruh {items.length} item!
            </span>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. Top Metric Statistics Strip                            */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="p-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-sans">
            Total Item
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[#1C1B1A] dark:text-[#F2EFE9] tabular-nums mt-0.5">
            {aggregateStats.totalItems} <span className="text-xs font-normal text-neutral-400">Item</span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-sans">
            Total Tonase Estimasi
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[#1C1B1A] dark:text-[#F2EFE9] tabular-nums mt-0.5">
            {(aggregateStats.totalTonaseKg / 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-neutral-400">Ton</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. ULTRA RESPONSIVE DESKTOP SPREADSHEET TABLE             */}
      {/* Visible on md/lg screens when table mode or adaptive wide */}
      {/* ========================================================= */}
      <div className="hidden md:block">
        <div className="rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F2EE] dark:bg-[#201D1A] border-b border-black/8 dark:border-white/10 text-[10.5px] font-mono text-neutral-600 dark:text-neutral-300">
                  <th className="py-2.5 px-2 text-center w-9 border-r border-black/6 dark:border-white/6">#</th>
                  <th className="py-2.5 px-2 min-w-[85px] w-[85px] border-r border-black/6 dark:border-white/6 text-center">
                    Flute
                  </th>
                  <th className="py-2.5 px-2.5 min-w-[370px] w-[370px] border-r border-black/6 dark:border-white/6">
                    Susunan Layer (Substance)
                  </th>
                  <th className="py-2.5 px-2 min-w-[130px] border-r border-black/6 dark:border-white/6 text-center">
                    Dimensi (mm)
                  </th>
                  {/* MOQ moved right beside Dimensi */}
                  <th className="py-2.5 px-2 min-w-[80px] border-r border-black/6 dark:border-white/6 text-center">
                    MOQ
                  </th>
                  <th className="py-2.5 px-2 min-w-[80px] border-r border-black/6 dark:border-white/6 text-right">
                    Luas (M²)
                  </th>
                  <th className="py-2.5 px-2 min-w-[85px] border-r border-black/6 dark:border-white/6 text-center">
                    Modifier %
                  </th>
                  <th className="py-2.5 px-2 min-w-[95px] border-r border-black/6 dark:border-white/6 text-right">
                    Harga / M²
                  </th>
                  {/* Highlight Column: Harga/Pcs */}
                  <th className="py-2.5 px-3 min-w-[125px] border-r border-black/6 dark:border-white/6 text-right bg-[#C65D3B]/10 dark:bg-[#C65D3B]/20 font-bold text-[#C65D3B]">
                    HARGA / PCS
                  </th>
                  <th className="py-2.5 px-2 min-w-[90px] border-r border-black/6 dark:border-white/6 text-right">
                    Berat / Pcs
                  </th>
                  <th className="py-2.5 px-2 min-w-[90px] border-r border-black/6 dark:border-white/6 text-right">
                    Rp / Kg
                  </th>
                  <th className="py-2.5 px-2 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6 dark:divide-white/6 font-mono text-[11.5px]">
                {calculatedRows.map(({ rowNumber, item, pricingInput, result }) => {
                  const isDw = item.flute === 'CB/F';
                  const modColorClass = getModifierColorClass(result.totalAdditiveModifierPercent);
                  const modSign = result.totalAdditiveModifierPercent > 0 ? '+' : '';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#F8F7F5] dark:hover:bg-[#1A1816] transition-colors group"
                    >
                      {/* Row No */}
                      <td className="py-2 px-2 text-center text-neutral-400 border-r border-black/6 dark:border-white/6 font-bold text-[10px]">
                        {rowNumber}
                      </td>

                      {/* Flute Selector */}
                      <td className="py-2 px-1.5 border-r border-black/6 dark:border-white/6 text-center w-[85px]">
                        <select
                          value={item.flute}
                          onChange={(e) =>
                            handleUpdateField(item.id, 'flute', e.target.value as FluteType)
                          }
                          aria-label="Pilih tipe flute karton"
                          className="w-full px-1.5 py-1 rounded-xs bg-black/4 dark:bg-white/6 border border-black/8 dark:border-white/10 text-center font-bold text-[#1C1B1A] dark:text-[#F2EFE9] text-xs cursor-pointer focus:border-[#C65D3B] outline-hidden"
                        >
                          {FLUTE_OPTIONS.map((f) => (
                            <option key={f.id} value={f.id} className="dark:bg-[#1C1B1A]">
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Layers Selector (Top, Flute1, Mid, Flute2, Bot) */}
                      <td className="py-2 px-2 border-r border-black/6 dark:border-white/6 w-[370px]">
                        <div className="flex items-center gap-1 justify-start">
                          {/* Top Layer */}
                          <select
                            value={item.topLayer}
                            onChange={(e) =>
                              handleUpdateField(
                                item.id,
                                'topLayer',
                                e.target.value as OuterLayerMaterial
                              )
                            }
                            aria-label="Pilih material Top Liner"
                            className={`${isDw ? 'w-[66px]' : 'w-[110px]'} px-1 py-1 rounded-xs bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 text-[11px] font-mono font-bold text-[#1C1B1A] dark:text-[#F2EFE9] text-center cursor-pointer`}
                            title="Top Layer"
                          >
                            {OUTER_LAYER_OPTIONS.map((o) => (
                              <option key={o.id} value={o.id} className="dark:bg-[#1C1B1A]">
                                {o.name}
                              </option>
                            ))}
                          </select>

                          {/* Flute 1 (CB/F only) */}
                          {isDw && (
                            <select
                              value={item.flute1Layer || 'M125'}
                              onChange={(e) =>
                                handleUpdateField(
                                  item.id,
                                  'flute1Layer',
                                  e.target.value as MidLayerMaterial
                                )
                              }
                              aria-label="Pilih material Flute 1"
                              className="w-[66px] px-1 py-1 rounded-xs bg-[#C65D3B]/10 dark:bg-[#C65D3B]/20 border border-[#C65D3B]/35 text-[11px] font-mono text-[#C65D3B] font-bold text-center cursor-pointer"
                              title="Flute 1 Layer"
                            >
                              {MID_LAYER_OPTIONS.map((m) => (
                                <option key={m.id} value={m.id} className="dark:bg-[#1C1B1A]">
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Mid Layer */}
                          <select
                            value={item.midLayer}
                            onChange={(e) =>
                              handleUpdateField(
                                item.id,
                                'midLayer',
                                e.target.value as MidLayerMaterial
                              )
                            }
                            aria-label="Pilih material Middle Layer"
                            className={`${isDw ? 'w-[66px]' : 'w-[110px]'} px-1 py-1 rounded-xs bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 text-[11px] font-mono font-bold text-[#1C1B1A] dark:text-[#F2EFE9] text-center cursor-pointer`}
                            title="Middle Layer"
                          >
                            {MID_LAYER_OPTIONS.map((m) => (
                              <option key={m.id} value={m.id} className="dark:bg-[#1C1B1A]">
                                {m.name}
                              </option>
                            ))}
                          </select>

                          {/* Flute 2 (CB/F only) */}
                          {isDw && (
                            <select
                              value={item.flute2Layer || 'M125'}
                              onChange={(e) =>
                                handleUpdateField(
                                  item.id,
                                  'flute2Layer',
                                  e.target.value as MidLayerMaterial
                                )
                              }
                              aria-label="Pilih material Flute 2"
                              className="w-[66px] px-1 py-1 rounded-xs bg-[#C65D3B]/10 dark:bg-[#C65D3B]/20 border border-[#C65D3B]/35 text-[11px] font-mono text-[#C65D3B] font-bold text-center cursor-pointer"
                              title="Flute 2 Layer"
                            >
                              {MID_LAYER_OPTIONS.map((m) => (
                                <option key={m.id} value={m.id} className="dark:bg-[#1C1B1A]">
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Bottom Layer */}
                          <select
                            value={item.botLayer}
                            onChange={(e) =>
                              handleUpdateField(
                                item.id,
                                'botLayer',
                                e.target.value as OuterLayerMaterial
                              )
                            }
                            aria-label="Pilih material Bottom Liner"
                            className={`${isDw ? 'w-[66px]' : 'w-[110px]'} px-1 py-1 rounded-xs bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 text-[11px] font-mono font-bold text-[#1C1B1A] dark:text-[#F2EFE9] text-center cursor-pointer`}
                            title="Bottom Layer"
                          >
                            {OUTER_LAYER_OPTIONS.map((o) => (
                              <option key={o.id} value={o.id} className="dark:bg-[#1C1B1A]">
                                {o.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Dimensions P x L (mm) */}
                      <td className="py-2 px-2 border-r border-black/6 dark:border-white/6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={item.sheetLengthMm || ''}
                            onChange={(e) =>
                              handleUpdateField(
                                item.id,
                                'sheetLengthMm',
                                Math.max(0, Number(e.target.value))
                              )
                            }
                            aria-label="Panjang sheet dalam milimeter"
                            className="w-14 px-1 py-0.5 text-center rounded-xs bg-black/4 dark:bg-white/6 border border-black/8 dark:border-white/10 text-[11px] font-mono font-bold text-[#1C1B1A] dark:text-[#F2EFE9] outline-hidden"
                            placeholder="P"
                          />
                          <span className="text-neutral-400 text-[10px]">×</span>
                          <input
                            type="number"
                            value={item.sheetWidthMm || ''}
                            onChange={(e) =>
                              handleUpdateField(
                                item.id,
                                'sheetWidthMm',
                                Math.max(0, Number(e.target.value))
                              )
                            }
                            aria-label="Lebar sheet dalam milimeter"
                            className="w-14 px-1 py-0.5 text-center rounded-xs bg-black/4 dark:bg-white/6 border border-black/8 dark:border-white/10 text-[11px] font-mono font-bold text-[#1C1B1A] dark:text-[#F2EFE9] outline-hidden"
                            placeholder="L"
                          />
                        </div>
                      </td>

                      {/* MOQ (disamping kanan Dimensi) */}
                      <td className="py-2 px-2 text-center border-r border-black/6 dark:border-white/6 text-neutral-700 dark:text-neutral-300 font-semibold font-mono text-[11px]">
                        {result.moqResult?.roundedMoq
                          ? `${result.moqResult.roundedMoq.toLocaleString('id-ID')} pcs`
                          : '-'}
                      </td>

                      {/* Area (M²) */}
                      <td className="py-2 px-2 text-right border-r border-black/6 dark:border-white/6 font-semibold text-neutral-700 dark:text-neutral-300">
                        {result.areaPerSheetM2 ? result.areaPerSheetM2.toFixed(5) : '-'}
                      </td>

                      {/* Modifier % */}
                      <td className="py-2 px-2 text-center border-r border-black/6 dark:border-white/6">
                        <span className={`px-1.5 py-0.5 rounded-xs text-[11px] ${modColorClass}`}>
                          {modSign}
                          {result.totalAdditiveModifierPercent}%
                        </span>
                      </td>

                      {/* Harga / M² */}
                      <td className="py-2 px-2 text-right border-r border-black/6 dark:border-white/6 font-medium text-neutral-800 dark:text-neutral-200">
                        {formatRupiah(result.hargaBersihPerM2)}
                      </td>

                      {/* HARGA / PCS (PROMINENT HIGHLIGHT) */}
                      <td className="py-2 px-3 text-right border-r border-black/6 dark:border-white/6 bg-[#C65D3B]/8 dark:bg-[#C65D3B]/15">
                        <span className="text-xs sm:text-sm font-extrabold text-[#C65D3B] tracking-tight">
                          {result.hargaPerSheetRp !== undefined
                            ? formatRupiah(result.hargaPerSheetRp)
                            : '-'}
                        </span>
                      </td>

                      {/* Berat / Pcs */}
                      <td className="py-2 px-2 text-right border-r border-black/6 dark:border-white/6 text-neutral-700 dark:text-neutral-300">
                        {result.weightResult && result.weightResult.beratPerPcsGram > 0
                          ? `${result.weightResult.beratPerPcsGram.toLocaleString('id-ID', { maximumFractionDigits: 1 })} g`
                          : '-'}
                      </td>

                      {/* Rp / Kg */}
                      <td className="py-2 px-2 text-right border-r border-black/6 dark:border-white/6 font-semibold text-[#C65D3B]">
                        {result.weightResult && result.weightResult.rpPerKg > 0
                          ? `Rp ${result.weightResult.rpPerKg.toLocaleString('id-ID')}`
                          : '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenInSingleCalculator(pricingInput, item.name)}
                            className="p-1 rounded-xs text-neutral-500 hover:text-[#C65D3B] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Buka rincian lengkap di Kalkulator Utama"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(item.id)}
                            className="p-1 rounded-xs text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Duplikat baris ini"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(item.id)}
                            className="p-1 rounded-xs text-neutral-400 hover:text-rose-600 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. ULTRA-RESPONSIVE MERGED ROW CARDS FOR MOBILE           */}
      {/* (Solusi Khusus Permintaan User: Kolom di-merge kebawah     */}
      {/*  sehingga SEMUA info penting terlihat tanpa geser tabel)  */}
      {/* ========================================================= */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1">
          <span>Tampilan Kartu Spreadsheet Merged</span>
          <span className="font-mono text-[10px]">{calculatedRows.length} Item</span>
        </div>

        {calculatedRows.map(({ rowNumber, item, pricingInput, result }) => {
          const isDw = item.flute === 'CB/F';
          const modColorClass = getModifierColorClass(result.totalAdditiveModifierPercent);
          const modSign = result.totalAdditiveModifierPercent > 0 ? '+' : '';

          return (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 shadow-2xs space-y-2.5"
            >
              {/* Row Header: No, Name & Flute Selector */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-black/6 dark:border-white/6">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="w-5 h-5 rounded-xs bg-[#1C1B1A]/8 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                    {rowNumber}
                  </span>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateField(item.id, 'name', e.target.value)}
                    className="flex-1 font-sans font-bold text-xs text-[#1C1B1A] dark:text-[#F2EFE9] bg-transparent focus:outline-hidden"
                    placeholder="Nama Item..."
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={item.flute}
                    onChange={(e) =>
                      handleUpdateField(item.id, 'flute', e.target.value as FluteType)
                    }
                    aria-label="Pilih tipe flute karton"
                    className="px-2 py-0.5 rounded-xs bg-[#C65D3B]/10 dark:bg-[#C65D3B]/20 border border-[#C65D3B]/30 font-bold text-xs text-[#C65D3B] font-mono cursor-pointer"
                  >
                    {FLUTE_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id} className="dark:bg-[#1C1B1A]">
                        {f.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDuplicateRow(item.id)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                    title="Duplikat"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteRow(item.id)}
                    className="p-1 text-neutral-400 hover:text-rose-600 cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Merged Layer Selectors */}
              <div className="space-y-1">
                <div className="text-[10px] text-neutral-500 font-mono flex items-center justify-between">
                  <span>Susunan Kertas (Substance):</span>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    {isDw ? '5-Layer Double Wall' : '3-Layer Single Wall'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <select
                    value={item.topLayer}
                    onChange={(e) =>
                      handleUpdateField(item.id, 'topLayer', e.target.value as OuterLayerMaterial)
                    }
                    aria-label="Pilih material Top Liner"
                    className="flex-1 min-w-0 px-0.5 py-1 rounded-xs bg-black/4 dark:bg-white/6 border border-black/8 dark:border-white/10 text-[10px] font-mono font-bold text-center text-[#1C1B1A] dark:text-[#F2EFE9]"
                    title="Top Layer"
                  >
                    {OUTER_LAYER_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id} className="dark:bg-[#1C1B1A]">
                        {o.name}
                      </option>
                    ))}
                  </select>

                  {isDw && (
                    <select
                      value={item.flute1Layer || 'M125'}
                      onChange={(e) =>
                        handleUpdateField(
                          item.id,
                          'flute1Layer',
                          e.target.value as MidLayerMaterial
                        )
                      }
                      aria-label="Pilih material Flute 1"
                      className="flex-1 min-w-0 px-0.5 py-1 rounded-xs bg-[#C65D3B]/10 dark:bg-[#C65D3B]/20 border border-[#C65D3B]/30 text-[10px] font-mono font-bold text-center text-[#C65D3B]"
                      title="Flute 1"
                    >
                      {MID_LAYER_OPTIONS.map((m) => (
                        <option key={m.id} value={m.id} className="dark:bg-[#1C1B1A]">
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={item.midLayer}
                    onChange={(e) =>
                      handleUpdateField(item.id, 'midLayer', e.target.value as MidLayerMaterial)
                    }
                    aria-label="Pilih material Middle Layer"
                    className="flex-1 min-w-0 px-0.5 py-1 rounded-xs bg-black/4 dark:bg-white/6 border border-black/8 dark:border-white/10 text-[10px] font-mono font-bold text-center text-[#1C1B1A] dark:text-[#F2EFE9]"
                    title="Middle Layer"
                  >
                    {MID_LAYER_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id} className="dark:bg-[#1C1B1A]">
                        {m.name}
                      </option>
                    ))}
                  </select>

                  {isDw && (
                    <select
                      value={item.flute2Layer || 'M125'}
                      onChange={(e) =>
                        handleUpdateField(
                          item.id,
                          'flute2Layer',
                          e.target.value as MidLayerMaterial
                        )
                      }
                      aria-label="Pilih material Flute 2"
                      className="flex-1 min-w-0 px-0.5 py-1 rounded-xs bg-[#C65D3B]/10 dark:bg-[#C65D3B]/20 border border-[#C65D3B]/30 text-[10px] font-mono font-bold text-center text-[#C65D3B]"
                      title="Flute 2"
                    >
                      {MID_LAYER_OPTIONS.map((m) => (
                        <option key={m.id} value={m.id} className="dark:bg-[#1C1B1A]">
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={item.botLayer}
                    onChange={(e) =>
                      handleUpdateField(item.id, 'botLayer', e.target.value as OuterLayerMaterial)
                    }
                    aria-label="Pilih material Bottom Liner"
                    className="flex-1 min-w-0 px-0.5 py-1 rounded-xs bg-black/4 dark:bg-white/6 border border-black/8 dark:border-white/10 text-[10px] font-mono font-bold text-center text-[#1C1B1A] dark:text-[#F2EFE9]"
                    title="Bottom Layer"
                  >
                    {OUTER_LAYER_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id} className="dark:bg-[#1C1B1A]">
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Merged Dimensions & Sheet Area Row */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-[#F8F7F5] dark:bg-[#1A1816] text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-neutral-500">Ukuran:</span>
                  <input
                    type="number"
                    value={item.sheetLengthMm || ''}
                    onChange={(e) =>
                      handleUpdateField(
                        item.id,
                        'sheetLengthMm',
                        Math.max(0, Number(e.target.value))
                      )
                    }
                    aria-label="Panjang sheet dalam milimeter"
                    className="w-16 px-1.5 py-0.5 rounded-xs bg-white dark:bg-[#22201E] border border-black/8 dark:border-white/10 text-center font-bold text-[#1C1B1A] dark:text-[#F2EFE9] text-xs"
                    placeholder="P (mm)"
                  />
                  <span className="text-neutral-400">×</span>
                  <input
                    type="number"
                    value={item.sheetWidthMm || ''}
                    onChange={(e) =>
                      handleUpdateField(
                        item.id,
                        'sheetWidthMm',
                        Math.max(0, Number(e.target.value))
                      )
                    }
                    aria-label="Lebar sheet dalam milimeter"
                    className="w-16 px-1.5 py-0.5 rounded-xs bg-white dark:bg-[#22201E] border border-black/8 dark:border-white/10 text-center font-bold text-[#1C1B1A] dark:text-[#F2EFE9] text-xs"
                    placeholder="L (mm)"
                  />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block">Luas:</span>
                  <span className="font-bold text-[#1C1B1A] dark:text-[#F2EFE9]">
                    {result.areaPerSheetM2 ? `${result.areaPerSheetM2.toFixed(5)} M²` : '-'}
                  </span>
                </div>
              </div>

              {/* Merged Prominent Output Box (HARGA/PCS, MODIFIER, RP/KG, MOQ) */}
              <div className="p-2.5 rounded-md bg-[#C65D3B]/10 dark:bg-[#C65D3B]/20 border-l-[3.5px] border-[#C65D3B] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">
                      Harga/Pcs
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-[#C65D3B] tabular-nums">
                      {result.hargaPerSheetRp !== undefined
                        ? formatRupiah(result.hargaPerSheetRp)
                        : '-'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 block">Modifier:</span>
                    <span className={`text-xs font-mono ${modColorClass}`}>
                      {modSign}
                      {result.totalAdditiveModifierPercent}%
                    </span>
                  </div>
                </div>

                {/* Sub metrics grid */}
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#C65D3B]/20 text-[10.5px] font-mono tabular-nums">
                  <div>
                    <span className="text-neutral-500 text-[9.5px] block">Harga/M²:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {formatRupiah(result.hargaBersihPerM2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-500 text-[9.5px] block">Rp / Kg:</span>
                    <span className="font-bold text-[#C65D3B]">
                      {result.weightResult && result.weightResult.rpPerKg > 0
                        ? `Rp ${result.weightResult.rpPerKg.toLocaleString('id-ID')}`
                        : '-'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-neutral-500 text-[9.5px] block">MOQ:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {result.moqResult?.roundedMoq
                        ? `${result.moqResult.roundedMoq.toLocaleString('id-ID')} pcs`
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row Action Footer */}
              <div className="pt-1 flex items-center justify-between">
                <div className="text-[10px] text-neutral-500 font-mono">
                  {result.weightResult && result.weightResult.beratPerPcsGram > 0
                    ? `Berat: ${result.weightResult.beratPerPcsGram.toLocaleString('id-ID', { maximumFractionDigits: 1 })} g`
                    : ''}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenInSingleCalculator(pricingInput, item.name)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xs bg-[#1C1B1A]/8 dark:bg-white/10 hover:bg-[#C65D3B] hover:text-white text-[#1C1B1A] dark:text-[#F2EFE9] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Calculator className="w-3 h-3" />
                  <span>Buka di Kalkulator</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 5. Bottom Action                                          */}
      {/* ========================================================= */}
      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={handleAddRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#C65D3B] hover:bg-[#b04f30] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Baris Baru</span>
        </button>
      </div>
    </div>
  );
};
