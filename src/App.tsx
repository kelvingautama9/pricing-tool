/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  OUTER_LAYER_OPTIONS,
  MID_LAYER_OPTIONS,
  FLUTE_OPTIONS,
  INITIAL_CUSTOMERS,
  PricingInput,
  OuterLayerMaterial,
  MidLayerMaterial,
  FluteType,
  CustomerDiscountItem,
  calculateCartonPricing,
  formatRupiah,
  generateWhatsAppText,
} from './utils/pricingEngine';
import { CustomPopoverDropdown } from './components/CustomPopoverDropdown';
import { CustomerDiscountPicker } from './components/CustomerDiscountPicker';
import { BreakdownTypewriter } from './components/BreakdownTypewriter';
import {
  SidebarHistory,
  CalculationHistoryItem,
  HistoryFolder,
} from './components/SidebarHistory';
import { MasterTableAndTests } from './components/MasterTableAndTests';
import { triggerHaptic } from './utils/hapticsAndImport';
import {
  Menu,
  Copy,
  Check,
  Save,
  RotateCcw,
  AlertTriangle,
  ArrowRightLeft,
  Ruler,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const STORAGE_KEY_ITEMS = 'prokemas_pricing_history_items_v1';
const STORAGE_KEY_FOLDERS = 'prokemas_pricing_history_folders_v1';
const STORAGE_KEY_CUSTOMERS = 'mypak_pricing_customers_v3';
const STORAGE_KEY_THEME = 'prokemas_pricing_theme_v1';

const DEFAULT_FOLDERS: HistoryFolder[] = [
  { id: 'all_quotes', name: 'Semua Kalkulasi', isDefault: true },
  { id: 'reguler_sw', name: 'Pesanan Reguler SW' },
  { id: 'heavy_duty', name: 'Spek Kraft & 275' },
];

const INITIAL_HISTORY_ITEMS: CalculationHistoryItem[] = [
  {
    id: 'preset-tc-1',
    title: 'TC1 · Pure Downgrade + Margin 7.5%',
    createdAt: Date.now() - 1000 * 60 * 45,
    pinned: true,
    folderId: 'all_quotes',
    input: {
      topLayer: 'K110',
      midLayer: 'M100',
      botLayer: 'K110',
      flute: 'B/F',
      marginPercent: 7.5,
    },
    finalPricePerM2: 4035,
    substanceLabel: 'K110/M100/K110',
  },
  {
    id: 'preset-tc-2',
    title: 'TC2 · Mid Kraft K150 Upgrade (+Rp2.000)',
    createdAt: Date.now() - 1000 * 60 * 120,
    pinned: false,
    folderId: 'heavy_duty',
    input: {
      topLayer: 'K125',
      midLayer: 'K150',
      botLayer: 'K125',
      flute: 'B/F',
      marginPercent: 0,
    },
    finalPricePerM2: 6125,
    substanceLabel: 'K125/K150/K125',
  },
  {
    id: 'preset-tc-3',
    title: 'TC3 · Multiplier Bertumpuk 275 & E/F',
    createdAt: Date.now() - 1000 * 60 * 180,
    pinned: false,
    folderId: 'heavy_duty',
    input: {
      topLayer: 'K275',
      midLayer: 'M125',
      botLayer: 'M100',
      flute: 'E/F',
      marginPercent: 0,
    },
    finalPricePerM2: 6106,
    substanceLabel: 'K275/M125/M100',
  },
  {
    id: 'preset-tc-5',
    title: 'TC5 · Virtual Base M135/M135/M135',
    createdAt: Date.now() - 1000 * 60 * 240,
    pinned: false,
    folderId: 'reguler_sw',
    input: {
      topLayer: 'M135',
      midLayer: 'M135',
      botLayer: 'M135',
      flute: 'B/F',
      marginPercent: 0,
    },
    finalPricePerM2: 4506,
    substanceLabel: 'M135/M135/M135',
  },
];

export default function App() {
  // Theme state (Class-based dark mode on <html>)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, isDarkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [isDarkMode]);

  // Navigation & Sidebar states (Desktop Hide-Show + Mobile Drawer)
  const [activeTab, setActiveTab] = useState<'calculator' | 'master' | 'tests'>('calculator');
  const [isSidebarOpenDesktop, setIsSidebarOpenDesktop] = useState(true);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // History, Folders, and Customers Persistence
  const [folders, setFolders] = useState<HistoryFolder[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FOLDERS);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    return DEFAULT_FOLDERS;
  });

  const [historyItems, setHistoryItems] = useState<CalculationHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    return INITIAL_HISTORY_ITEMS;
  });

  const [customers, setCustomers] = useState<CustomerDiscountItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    return INITIAL_CUSTOMERS;
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>('preset-tc-1');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(historyItems));
    } catch {
      // Ignore
    }
  }, [historyItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
    } catch {
      // Ignore
    }
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(customers));
    } catch {
      // Ignore
    }
  }, [customers]);

  // Pricing Calculator Form State
  const [topLayer, setTopLayer] = useState<OuterLayerMaterial>('K110');
  const [midLayer, setMidLayer] = useState<MidLayerMaterial>('M100');
  const [botLayer, setBotLayer] = useState<OuterLayerMaterial>('K110');
  const [flute, setFlute] = useState<FluteType>('B/F');
  const [marginStr, setMarginStr] = useState<string>('7.5');
  const [quoteTitle, setQuoteTitle] = useState<string>('');

  // Hide/Show toggles (Default HIDE as requested)
  const [showOrderBreakdown, setShowOrderBreakdown] = useState<boolean>(false);
  const [showWhatsAppSection, setShowWhatsAppSection] = useState<boolean>(false);
  const [showSheetConverter, setShowSheetConverter] = useState<boolean>(false);

  const [sheetLengthStr, setSheetLengthStr] = useState<string>('');
  const [sheetWidthStr, setSheetWidthStr] = useState<string>('');
  const [quantityStr, setQuantityStr] = useState<string>('');

  // WhatsApp Copy State
  const [waFormatMode, setWaFormatMode] = useState<'ringkas' | 'lengkap'>('ringkas');
  const [copiedWa, setCopiedWa] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  // Construct PricingInput & run real-time calculation (supports negative or positive margin)
  const currentInput: PricingInput = useMemo(() => {
    const parsedMargin = parseFloat(marginStr.replace(',', '.'));
    const parsedLength = parseFloat(sheetLengthStr);
    const parsedWidth = parseFloat(sheetWidthStr);
    const parsedQty = parseInt(quantityStr, 10);

    return {
      topLayer,
      midLayer,
      botLayer,
      flute,
      marginPercent: Number.isFinite(parsedMargin) ? parsedMargin : 0,
      sheetLengthMm:
        showSheetConverter && Number.isFinite(parsedLength) && parsedLength > 0
          ? parsedLength
          : undefined,
      sheetWidthMm:
        showSheetConverter && Number.isFinite(parsedWidth) && parsedWidth > 0
          ? parsedWidth
          : undefined,
      quantityPcs:
        showSheetConverter && Number.isFinite(parsedQty) && parsedQty > 0
          ? parsedQty
          : undefined,
    };
  }, [
    topLayer,
    midLayer,
    botLayer,
    flute,
    marginStr,
    showSheetConverter,
    sheetLengthStr,
    sheetWidthStr,
    quantityStr,
  ]);

  const calculationResult = useMemo(
    () => calculateCartonPricing(currentInput),
    [currentInput]
  );

  const whatsAppPreviewText = useMemo(
    () => generateWhatsAppText(calculationResult, waFormatMode, quoteTitle.trim() || undefined),
    [calculationResult, waFormatMode, quoteTitle]
  );

  // Handlers
  const handleSelectHistoryItem = (item: CalculationHistoryItem) => {
    setActiveHistoryId(item.id);
    setSelectedCustomerId(null);
    setTopLayer(item.input.topLayer);
    setMidLayer(item.input.midLayer);
    setBotLayer(item.input.botLayer);
    setFlute(item.input.flute);
    setMarginStr(String(item.input.marginPercent));
    setQuoteTitle(item.title);
    if (item.input.sheetLengthMm && item.input.sheetWidthMm) {
      setShowSheetConverter(true);
      setSheetLengthStr(String(item.input.sheetLengthMm));
      setSheetWidthStr(String(item.input.sheetWidthMm));
      setQuantityStr(item.input.quantityPcs ? String(item.input.quantityPcs) : '');
    } else {
      setShowSheetConverter(false);
    }
    setActiveTab('calculator');
  };

  const handleSelectCustomer = (customer: CustomerDiscountItem) => {
    setSelectedCustomerId(customer.id);
    setMarginStr(String(customer.swMarginPercent));
    setQuoteTitle(customer.name);
    setActiveTab('calculator');
  };

  const handleAddCustomer = (newCust: Omit<CustomerDiscountItem, 'id'>) => {
    const created: CustomerDiscountItem = {
      ...newCust,
      id: `cust-${Date.now()}`,
    };
    setCustomers((prev) => [created, ...prev]);
    handleSelectCustomer(created);
  };

  const handleUpdateCustomer = (updated: CustomerDiscountItem) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    if (selectedCustomerId === updated.id) {
      setMarginStr(String(updated.swMarginPercent));
      setQuoteTitle(updated.name);
    }
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (selectedCustomerId === id) {
      setSelectedCustomerId(null);
    }
  };

  const handleBulkImportCustomers = (importedList: CustomerDiscountItem[]) => {
    setCustomers((prev) => {
      const mapByName = new Map<string, CustomerDiscountItem>();
      prev.forEach((c) => mapByName.set(c.name.toLowerCase(), c));
      importedList.forEach((imp) => {
        const existing = mapByName.get(imp.name.toLowerCase());
        if (existing) {
          mapByName.set(imp.name.toLowerCase(), {
            ...existing,
            tier: imp.tier,
            swMarginPercent: imp.swMarginPercent,
            dwMarginPercent: imp.dwMarginPercent,
          });
        } else {
          mapByName.set(imp.name.toLowerCase(), imp);
        }
      });
      return Array.from(mapByName.values());
    });
  };

  const handleResetNewCalculation = () => {
    setActiveHistoryId(null);
    setSelectedCustomerId(null);
    setTopLayer('M125');
    setMidLayer('M125');
    setBotLayer('M125');
    setFlute('B/F');
    setMarginStr('0');
    setQuoteTitle('');
    setSheetLengthStr('');
    setSheetWidthStr('');
    setQuantityStr('');
    setActiveTab('calculator');
  };

  const handleLoadPresetInput = (input: PricingInput, title: string) => {
    setActiveHistoryId(null);
    setSelectedCustomerId(null);
    setTopLayer(input.topLayer);
    setMidLayer(input.midLayer);
    setBotLayer(input.botLayer);
    setFlute(input.flute);
    setMarginStr(String(input.marginPercent));
    setQuoteTitle(title);
    setActiveTab('calculator');
  };

  const handleSaveToHistory = () => {
    if (!calculationResult.success) return;
    triggerHaptic('success');

    const defaultLabel =
      quoteTitle.trim() ||
      `Spek ${calculationResult.inputSubstanceString} (${calculationResult.input.flute})`;

    const newItem: CalculationHistoryItem = {
      id: `calc-${Date.now()}`,
      title: defaultLabel,
      createdAt: Date.now(),
      pinned: false,
      folderId: folders[0]?.id || 'all_quotes',
      input: currentInput,
      finalPricePerM2: calculationResult.hargaBersihPerM2,
      substanceLabel: calculationResult.inputSubstanceString,
    };

    setHistoryItems((prev) => [newItem, ...prev]);
    setActiveHistoryId(newItem.id);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleCopyWhatsApp = async () => {
    if (!calculationResult.success || !whatsAppPreviewText) return;
    triggerHaptic('success');
    try {
      await navigator.clipboard.writeText(whatsAppPreviewText);
      setCopiedWa(true);
      setTimeout(() => setCopiedWa(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = whatsAppPreviewText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedWa(true);
      setTimeout(() => setCopiedWa(false), 2000);
    }
  };

  const handleSwapTopBottom = () => {
    triggerHaptic('medium');
    const temp = topLayer;
    setTopLayer(botLayer);
    setBotLayer(temp);
  };

  const handleToggleSignMargin = () => {
    triggerHaptic('light');
    const num = parseFloat(marginStr.replace(',', '.'));
    if (!Number.isFinite(num) || num === 0) {
      setMarginStr(marginStr.startsWith('-') ? '5' : '-5');
    } else {
      setMarginStr(String(num * -1));
    }
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(
      { items: historyItems, folders, customers },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prokemas-pricing-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Looping smooth typewriter for "BlackEYE- Corrugator Pricing Tools"
  const fullHeadingText = 'BlackEYE- Corrugator Pricing Tools';
  const [typedHeading, setTypedHeading] = useState<string>('');
  const [isDeletingHeading, setIsDeletingHeading] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeletingHeading && typedHeading.length < fullHeadingText.length) {
      timer = setTimeout(() => {
        setTypedHeading(fullHeadingText.slice(0, typedHeading.length + 1));
      }, 65);
    } else if (!isDeletingHeading && typedHeading.length === fullHeadingText.length) {
      timer = setTimeout(() => {
        setIsDeletingHeading(true);
      }, 2400);
    } else if (isDeletingHeading && typedHeading.length > 0) {
      timer = setTimeout(() => {
        setTypedHeading(fullHeadingText.slice(0, typedHeading.length - 1));
      }, 32);
    } else if (isDeletingHeading && typedHeading.length === 0) {
      timer = setTimeout(() => {
        setIsDeletingHeading(false);
      }, 450);
    }

    return () => clearTimeout(timer);
  }, [typedHeading, isDeletingHeading]);

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden bg-[#F9F9F9] dark:bg-[#18191e] text-[#1C1B1A] dark:text-[#F2EFE9]">
      {/* Left Sidebar Navigation & History / Customer Manager */}
      <SidebarHistory
        isOpenDesktop={isSidebarOpenDesktop}
        onToggleDesktop={() => setIsSidebarOpenDesktop(!isSidebarOpenDesktop)}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        items={historyItems}
        folders={folders}
        activeItemId={activeHistoryId}
        onSelectItem={handleSelectHistoryItem}
        onNewCalculation={handleResetNewCalculation}
        onRenameItem={(id, newTitle) =>
          setHistoryItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
          )
        }
        onTogglePinItem={(id) =>
          setHistoryItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, pinned: !item.pinned } : item
            )
          )
        }
        onDeleteItems={(ids) =>
          setHistoryItems((prev) => prev.filter((item) => !ids.includes(item.id)))
        }
        onMoveItemsToFolder={(ids, targetFolderId) =>
          setHistoryItems((prev) =>
            prev.map((item) =>
              ids.includes(item.id) ? { ...item, folderId: targetFolderId } : item
            )
          )
        }
        onCreateFolder={(name) =>
          setFolders((prev) => [
            ...prev,
            { id: `folder-${Date.now()}`, name },
          ])
        }
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={handleSelectCustomer}
        onAddCustomer={handleAddCustomer}
        onUpdateCustomer={handleUpdateCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onBulkImportCustomers={handleBulkImportCustomers}
        onExportJson={handleExportJson}
        onImportJson={(importedItems, importedFolders, importedCustomers) => {
          setHistoryItems(importedItems);
          setFolders(importedFolders);
          if (importedCustomers) setCustomers(importedCustomers);
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Right Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        {/* Top Bar: Clean Mobile-Safe Header (No overlapping, 3-line Menu icon, No PT Prokemas text) */}
        <header className="h-12 px-3 sm:px-6 bg-[#FFFFFF]/98 dark:bg-[#161311]/98 border-b border-black/8 dark:border-white/10 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
          {/* Zone 1: 3-Horizontal-Lines Sidebar Toggle Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsSidebarOpenMobile(true);
                } else {
                  setIsSidebarOpenDesktop(!isSidebarOpenDesktop);
                }
              }}
              title="Buka / Tutup Menu Sidebar"
              aria-label="Toggle Sidebar"
              className="h-8 w-8 flex items-center justify-center rounded-md bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Zone 2: Clean Navigation Links (Responsive gap & size so mobile never collides) */}
          <nav className="flex items-center justify-center gap-3 sm:gap-6 text-[11px] sm:text-xs font-medium min-w-0 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'calculator'
                  ? 'text-[#C65D3B] font-semibold underline underline-offset-8 decoration-2'
                  : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
              }`}
            >
              Kalkulator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('master')}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'master'
                  ? 'text-[#C65D3B] font-semibold underline underline-offset-8 decoration-2'
                  : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
              }`}
            >
              Master Tabel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'tests'
                  ? 'text-[#C65D3B] font-semibold underline underline-offset-8 decoration-2'
                  : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
              }`}
            >
              Uji Validasi
            </button>
          </nav>

          {/* Zone 3: Primary Action (Copy to WhatsApp) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              disabled={!calculationResult.success}
              onClick={handleCopyWhatsApp}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap cursor-pointer ${
                !calculationResult.success
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                  : copiedWa
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#C65D3B] hover:bg-[#b24f2f] text-white'
              }`}
            >
              {copiedWa ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy WhatsApp</span>
                  <span className="sm:hidden">WA</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Main Content Viewport */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
          <div className="max-w-5xl mx-auto">
            {activeTab !== 'calculator' ? (
              <MasterTableAndTests
                activeTab={activeTab}
                currentReferenceSubstance={calculationResult.mappedReferenceSubstance}
                onLoadPresetInput={handleLoadPresetInput}
              />
            ) : (
              <div className="space-y-4">
                {/* Fixed-Height Looping Typewriter Title (Never shifts or collides with other UI) */}
                <div className="h-7 flex items-center pb-2 border-b border-black/6 dark:border-white/8 overflow-hidden">
                  <h1 className="text-xs sm:text-sm md:text-base font-display font-bold tracking-tight text-[#1C1B1A] dark:text-[#F2EFE9] whitespace-nowrap truncate">
                    <span>{typedHeading}</span>
                    <span
                      aria-hidden="true"
                      className="inline-block w-[2px] h-3.5 sm:h-4 bg-[#C65D3B] ml-0.5 align-middle animate-pulse"
                    />
                  </h1>
                </div>

                {/* Main 12-Column Split Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* LEFT COLUMN (7 Cols): Configuration & Specification Controls */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Card 1: Layer, Flute & Margin / Customer Selectors */}
                    <div className="p-4 sm:p-5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 space-y-4">
                      <div className="flex items-center justify-between pb-2.5 border-b border-black/5 dark:border-white/5">
                        <h2 className="text-xs font-display font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                          Spesifikasi Layer & Flute
                        </h2>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleSwapTopBottom}
                            title="Tukar Top & Bottom Layer"
                            className="flex items-center gap-1 px-2 py-1 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 text-[11px] font-medium transition-colors duration-150 cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-[#C65D3B]" />
                            <span>Tukar Top/Bot</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleResetNewCalculation}
                            title="Reset ke M125/M125/M125"
                            className="p-1 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white transition-colors duration-150 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 3 Layer Custom Popover Dropdowns (Clean IDs only) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <CustomPopoverDropdown
                          label="Top Layer"
                          value={topLayer}
                          options={OUTER_LAYER_OPTIONS}
                          groups={['Medium', 'Kraft']}
                          onChange={(val) => setTopLayer(val as OuterLayerMaterial)}
                        />

                        <CustomPopoverDropdown
                          label="Middle Layer"
                          value={midLayer}
                          options={MID_LAYER_OPTIONS}
                          groups={['Medium', 'Kraft']}
                          warningNote="Tanpa K110, K125, K135 sesuai SOP."
                          onChange={(val) => setMidLayer(val as MidLayerMaterial)}
                        />

                        <CustomPopoverDropdown
                          label="Bottom Layer"
                          value={botLayer}
                          options={OUTER_LAYER_OPTIONS}
                          groups={['Medium', 'Kraft']}
                          align="right"
                          onChange={(val) => setBotLayer(val as OuterLayerMaterial)}
                        />
                      </div>

                      {/* Flute 1-Row Inline Selector (B/F, C/F, E/F — No Double Wall text, no extra description) */}
                      <div className="pt-2 border-t border-black/5 dark:border-white/5">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <label className="text-xs font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] tracking-tight">
                            Flute
                          </label>
                          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                            {flute === 'E/F' ? 'Multiplier +2%' : 'Reguler'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {FLUTE_OPTIONS.map((fOpt) => {
                            const isSelected = flute === fOpt.id;
                            return (
                              <button
                                key={fOpt.id}
                                type="button"
                                onClick={() => {
                                  triggerHaptic('medium');
                                  setFlute(fOpt.id);
                                }}
                                className={`py-2 px-3 rounded-md font-mono text-xs font-semibold border transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-[#C65D3B] border-[#C65D3B] text-white'
                                    : 'bg-[#FFFFFF] dark:bg-[#161311] border-black/10 dark:border-white/10 text-[#1C1B1A] dark:text-[#F2EFE9] hover:bg-neutral-50 dark:hover:bg-[#1e1b18]'
                                }`}
                              >
                                <span>{fOpt.id}</span>
                                {fOpt.tag && (
                                  <span
                                    className={`text-[10px] font-normal ${
                                      isSelected
                                        ? 'text-white/85'
                                        : 'text-neutral-400 dark:text-neutral-500'
                                    }`}
                                  >
                                    ({fOpt.tag})
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Diskon / Margin (%) + Inline Customer Database Picker */}
                      <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <label className="text-xs font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] tracking-tight">
                            Diskon / Margin (%)
                          </label>
                          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 tabular-nums">
                            {currentInput.marginPercent < 0
                              ? `Potongan Harga (${currentInput.marginPercent}%)`
                              : currentInput.marginPercent > 0
                              ? `Mark-Up Harga (+${currentInput.marginPercent}%)`
                              : 'Harga Normal (0%)'}
                            {activeCustomer
                              ? ` · DW Ref: ${activeCustomer.dwMarginPercent > 0 ? '+' : ''}${activeCustomer.dwMarginPercent}%`
                              : ''}
                          </span>
                        </div>

                        {/* Aligned Row: [+/- Toggle] [Margin Input] [+] [Acuan Customer Search Popover] */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center flex-1">
                            <button
                              type="button"
                              onClick={handleToggleSignMargin}
                              title="Ubah Plus (+) atau Minus (-)"
                              className={`h-9 px-2.5 rounded-l-md border border-r-0 font-mono text-xs font-bold transition-colors cursor-pointer ${
                                currentInput.marginPercent < 0
                                  ? 'bg-emerald-600/12 border-emerald-600/30 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-[#F3F1ED] dark:bg-[#22201E] border-black/10 dark:border-white/10 text-[#C65D3B]'
                              }`}
                            >
                              {currentInput.marginPercent < 0 ? '−' : '+'}
                            </button>
                            <input
                              type="number"
                              step="0.1"
                              min="-90"
                              max="200"
                              value={marginStr}
                              onChange={(e) => {
                                setMarginStr(e.target.value);
                                setSelectedCustomerId(null);
                              }}
                              placeholder="Contoh: 9 atau -5"
                              className="h-9 w-full px-3 pr-7 rounded-r-md bg-[#FFFFFF] dark:bg-[#161311] border border-black/10 dark:border-white/10 font-mono font-semibold text-sm text-[#1C1B1A] dark:text-[#F2EFE9] placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-1 focus:outline-[#C65D3B] tabular-nums"
                            />
                            <span className="absolute right-2.5 text-xs font-mono text-neutral-400 pointer-events-none">
                              %
                            </span>
                          </div>

                          {/* Customer Database Search & CRUD Popover Button */}
                          <CustomerDiscountPicker
                            customers={customers}
                            selectedCustomerId={selectedCustomerId}
                            onSelectCustomer={handleSelectCustomer}
                            onAddCustomer={handleAddCustomer}
                            onUpdateCustomer={handleUpdateCustomer}
                            onDeleteCustomer={handleDeleteCustomer}
                            onBulkImportCustomers={handleBulkImportCustomers}
                          />
                        </div>

                        {/* Quick Signed Presets (-10%, -5%, 0%, +5%, +9%, +13%) */}
                        <div className="flex items-center gap-1">
                          {['-10', '-5', '-2.5', '0', '5', '7.5', '9', '13'].map((mVal) => {
                            const num = parseFloat(mVal);
                            const label = num > 0 ? `+${mVal}%` : `${mVal}%`;
                            return (
                              <button
                                key={mVal}
                                type="button"
                                onClick={() => {
                                  setMarginStr(mVal);
                                  setSelectedCustomerId(null);
                                }}
                                className={`flex-1 py-1 rounded-xs text-[10px] font-mono transition-colors duration-150 cursor-pointer tabular-nums ${
                                  marginStr === mVal
                                    ? 'bg-[#C65D3B] text-white font-semibold'
                                    : 'bg-[#F3F1ED] dark:bg-[#22201E] text-neutral-500 dark:text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Save Label & Save to Sidebar Button (Light grey placeholder) */}
                      <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={quoteTitle}
                          onChange={(e) => setQuoteTitle(e.target.value)}
                          placeholder="Catatan / nama customer (opsional)..."
                          className="flex-1 px-3 py-2 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/6 dark:border-white/8 text-xs text-[#1C1B1A] dark:text-[#F2EFE9] placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-1 focus:outline-[#C65D3B]"
                        />
                        <button
                          type="button"
                          disabled={!calculationResult.success}
                          onClick={handleSaveToHistory}
                          className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 ${
                            !calculationResult.success
                              ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                              : savedNotice
                              ? 'bg-emerald-700 text-white'
                              : 'bg-[#1C1B1A] dark:bg-[#F2EFE9] text-white dark:text-[#1C1B1A] hover:opacity-90'
                          }`}
                        >
                          {savedNotice ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Tersimpan</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>Simpan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Card 2: Optional Sheet Dimension & Quantity Calculator */}
                    <div className="rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowSheetConverter(!showSheetConverter)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/3 dark:hover:bg-white/3 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Ruler className="w-3.5 h-3.5 text-[#C65D3B]" />
                          <span className="text-xs font-display font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]">
                            Konversi Ukuran Lembar Sheet (Opsional)
                          </span>
                        </div>
                        {showSheetConverter ? (
                          <ChevronUp className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>

                      {showSheetConverter && (
                        <div className="p-4 pt-2 border-t border-black/5 dark:border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10.5px] font-medium mb-1 text-neutral-500">
                              Panjang (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={sheetLengthStr}
                              onChange={(e) => setSheetLengthStr(e.target.value)}
                              placeholder="1200"
                              className="w-full px-2.5 py-1.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 font-mono text-xs placeholder:text-neutral-300 dark:placeholder:text-neutral-600 tabular-nums focus:outline-1 focus:outline-[#C65D3B]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-medium mb-1 text-neutral-500">
                              Lebar (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={sheetWidthStr}
                              onChange={(e) => setSheetWidthStr(e.target.value)}
                              placeholder="800"
                              className="w-full px-2.5 py-1.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 font-mono text-xs placeholder:text-neutral-300 dark:placeholder:text-neutral-600 tabular-nums focus:outline-1 focus:outline-[#C65D3B]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-medium mb-1 text-neutral-500">
                              Qty (Lembar)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={quantityStr}
                              onChange={(e) => setQuantityStr(e.target.value)}
                              placeholder="1000"
                              className="w-full px-2.5 py-1.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 font-mono text-xs placeholder:text-neutral-300 dark:placeholder:text-neutral-600 tabular-nums focus:outline-1 focus:outline-[#C65D3B]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN (5 Cols): Executive Price Result, Collapsible Breakdown & Collapsible WhatsApp */}
                  <div className="lg:col-span-5 space-y-4">
                    {!calculationResult.success ? (
                      <div className="p-5 rounded-lg bg-rose-500/10 border border-rose-600/30 space-y-2.5">
                        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-display font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Kalkulasi Diblokir</span>
                        </div>
                        <p className="text-xs text-rose-900 dark:text-rose-200">
                          {calculationResult.errorMessage}
                        </p>
                      </div>
                    ) : (
                      <div className="p-5 rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 space-y-4">
                        {/* Primary Focal Anchor: Final Rounded Price */}
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <span className="font-medium shrink-0">
                              Harga Bersih Akhir (Per M²)
                            </span>
                            <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] text-[#1C1B1A] dark:text-[#F2EFE9] font-semibold shrink-0">
                              {calculationResult.inputSubstanceString} · {calculationResult.input.flute}
                            </span>
                          </div>

                          <div className="mt-1.5 flex items-baseline justify-between gap-2">
                            <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-[#C65D3B] tabular-nums">
                              {formatRupiah(calculationResult.hargaBersihPerM2)}
                            </div>
                            <div className="text-right font-mono text-[10.5px] text-neutral-400 dark:text-neutral-500 tabular-nums shrink-0">
                              Decimal : Rp {calculationResult.hargaFinalMentah.toFixed(2)}
                            </div>
                          </div>

                          {/* Small Light-Grey Subtext as requested */}
                          <div className="mt-1.5 text-[10px] text-neutral-400 dark:text-neutral-500 leading-normal">
                            Pembulatan Desimal 5 dibulatkan ke atas (exc PPN)
                          </div>
                        </div>

                        {/* Compact Summary Strip (Always visible) */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-md bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/5 dark:border-white/5 text-[10.5px] font-mono tabular-nums">
                          <div>
                            <span className="block text-[9.5px] text-neutral-400">
                              Virtual Base
                            </span>
                            <span className="font-semibold">
                              {formatRupiah(calculationResult.virtualBase)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9.5px] text-neutral-400">
                              Downgrade
                            </span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              -{calculationResult.totalDowngradePercent}%
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9.5px] text-neutral-400">
                              Diskon/Margin
                            </span>
                            <span
                              className={`font-semibold ${
                                calculationResult.marginPercent < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-[#C65D3B]'
                              }`}
                            >
                              {calculationResult.marginPercent > 0 ? '+' : ''}
                              {calculationResult.marginPercent}%
                            </span>
                          </div>
                        </div>

                        {/* Optional Sheet Area Result */}
                        {calculationResult.areaPerSheetM2 && calculationResult.hargaPerSheetRp && (
                          <div className="p-3 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] space-y-1 font-mono text-xs tabular-nums">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-neutral-500">
                                Luas ({currentInput.sheetLengthMm}×{currentInput.sheetWidthMm} mm):
                              </span>
                              <span className="font-semibold">
                                {calculationResult.areaPerSheetM2.toFixed(4)} M²
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-neutral-500">Harga / Lembar:</span>
                              <span className="font-bold text-[#C65D3B]">
                                {formatRupiah(calculationResult.hargaPerSheetRp)}
                              </span>
                            </div>
                            {calculationResult.totalOrderRp && currentInput.quantityPcs && (
                              <div className="flex items-center justify-between pt-1 border-t border-black/8 dark:border-white/10">
                                <span className="font-semibold text-[11px]">
                                  Total ({currentInput.quantityPcs.toLocaleString('id-ID')} pcs):
                                </span>
                                <span className="font-bold text-xs">
                                  {formatRupiah(calculationResult.totalOrderRp)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Collapsible 1: Rincian Order — Default Hidden */}
                        <div className="pt-1 border-t border-black/6 dark:border-white/8">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setShowOrderBreakdown(!showOrderBreakdown);
                            }}
                            className="w-full flex items-center justify-between py-1.5 text-left text-xs font-display font-semibold text-neutral-600 dark:text-neutral-300 hover:text-[#1C1B1A] dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <span>Rincian Order</span>
                            <div className="flex items-center gap-1 text-[10.5px] font-mono text-neutral-400 shrink-0">
                              <span>{showOrderBreakdown ? 'Sembunyikan' : 'Tampilkan'}</span>
                              {showOrderBreakdown ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </button>

                          {showOrderBreakdown && (
                            <BreakdownTypewriter result={calculationResult} />
                          )}
                        </div>

                        {/* Collapsible 2: Format Teks WhatsApp — Default Hidden */}
                        <div className="pt-1 border-t border-black/6 dark:border-white/8">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setShowWhatsAppSection(!showWhatsAppSection);
                            }}
                            className="w-full flex items-center justify-between py-1.5 text-left text-xs font-display font-semibold text-neutral-600 dark:text-neutral-300 hover:text-[#1C1B1A] dark:hover:text-white transition-colors cursor-pointer"
                          >
                            <span>Format Teks WhatsApp</span>
                            <div className="flex items-center gap-1 text-[10.5px] font-mono text-neutral-400">
                              <span>{showWhatsAppSection ? 'Sembunyikan' : 'Tampilkan'}</span>
                              {showWhatsAppSection ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </button>

                          {showWhatsAppSection && (
                            <div className="pt-2 space-y-2.5 transition-opacity duration-150">
                              <div className="flex items-center justify-between">
                                <span className="text-[10.5px] text-neutral-400">
                                  Mode Teks:
                                </span>
                                <div className="flex items-center p-0.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/6 dark:border-white/8 text-[10.5px]">
                                  <button
                                    type="button"
                                    onClick={() => setWaFormatMode('ringkas')}
                                    className={`px-2 py-0.5 rounded-xs font-medium transition-colors cursor-pointer ${
                                      waFormatMode === 'ringkas'
                                        ? 'bg-[#C65D3B] text-white font-semibold'
                                        : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
                                    }`}
                                  >
                                    Ringkas
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setWaFormatMode('lengkap')}
                                    className={`px-2 py-0.5 rounded-xs font-medium transition-colors cursor-pointer ${
                                      waFormatMode === 'lengkap'
                                        ? 'bg-[#C65D3B] text-white font-semibold'
                                        : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
                                    }`}
                                  >
                                    Rincian 1–6
                                  </button>
                                </div>
                              </div>

                              <pre className="p-2.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 font-mono text-[11px] leading-relaxed text-[#1C1B1A] dark:text-[#F2EFE9] whitespace-pre-wrap overflow-x-auto select-all">
                                {whatsAppPreviewText}
                              </pre>
                            </div>
                          )}

                          {/* Quick Copy Button Always Accessible */}
                          <button
                            type="button"
                            onClick={handleCopyWhatsApp}
                            className={`mt-2.5 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md font-semibold text-xs transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                              copiedWa
                                ? 'bg-emerald-700 text-white'
                                : 'bg-[#C65D3B] hover:bg-[#b24f2f] text-white'
                            }`}
                          >
                            {copiedWa ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Teks Berhasil Disalin ke Clipboard!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin Format WhatsApp</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
