/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  resolveCustomerEffectiveMargin,
} from './utils/pricingEngine';
import { CustomPopoverDropdown } from './components/CustomPopoverDropdown';
import { CustomerDiscountPicker } from './components/CustomerDiscountPicker';
import { BreakdownTypewriter } from './components/BreakdownTypewriter';
import { GachaNumberText } from './components/GachaNumberText';
import {
  SidebarHistory,
  CalculationHistoryItem,
  HistoryFolder,
  SidebarTabMode,
} from './components/SidebarHistory';
import { MasterTableAndTests } from './components/MasterTableAndTests';
import { AIChatWorkspace } from './components/AIChatWorkspace';
import {
  ChatThread,
  AIChatFolder,
  DEFAULT_AI_FOLDERS,
  INITIAL_AI_THREADS,
} from './utils/aiEngine';
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
  Scale,
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
    title: 'TC1 · Double Wall CB/F 5-Layer (+9.5%)',
    createdAt: Date.now() - 1000 * 60 * 45,
    pinned: true,
    folderId: 'all_quotes',
    input: {
      topLayer: 'K150',
      flute1Layer: 'M100',
      midLayer: 'M100',
      flute2Layer: 'M100',
      botLayer: 'K125',
      flute: 'CB/F',
      marginPercent: 9.5,
      sheetLengthMm: 1860,
      sheetWidthMm: 1161,
    },
    finalPricePerM2: 7166,
    substanceLabel: 'K150/M100/M100/M100/K125',
  },
  {
    id: 'preset-tc-2',
    title: 'TC2 · Virtual Base + Multiplier Bertumpuk (E/F)',
    createdAt: Date.now() - 1000 * 60 * 120,
    pinned: false,
    folderId: 'heavy_duty',
    input: {
      topLayer: 'K275',
      midLayer: 'K150',
      botLayer: 'M100',
      flute: 'E/F',
      marginPercent: 5.0,
      sheetLengthMm: 1000,
      sheetWidthMm: 1000,
    },
    finalPricePerM2: 8522,
    substanceLabel: 'K275/K150/M100',
  },
  {
    id: 'preset-tc-3',
    title: 'TC3 · Virtual Base M135 (Turunan M150)',
    createdAt: Date.now() - 1000 * 60 * 180,
    pinned: false,
    folderId: 'reguler_sw',
    input: {
      topLayer: 'K125',
      midLayer: 'M135',
      botLayer: 'K110',
      flute: 'B/F',
      marginPercent: 8.0,
      sheetLengthMm: 1000,
      sheetWidthMm: 1000,
    },
    finalPricePerM2: 4580,
    substanceLabel: 'K125/M135/K110',
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
  const [activeTab, setActiveTab] = useState<'calculator' | 'master' | 'tests' | 'ai'>('calculator');
  const [sidebarMode, setSidebarMode] = useState<SidebarTabMode>('history');
  const [isSidebarOpenDesktop, setIsSidebarOpenDesktop] = useState(true);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Sync sidebar tab automatically when active page changes
  useEffect(() => {
    if (activeTab === 'ai') {
      setSidebarMode('ai');
    } else if (activeTab === 'calculator') {
      setSidebarMode((prev) => (prev === 'ai' ? 'history' : prev));
    } else if (activeTab === 'master') {
      setSidebarMode('customers');
    } else if (activeTab === 'tests') {
      setSidebarMode('history');
    }
  }, [activeTab]);

  // AI Threads & Folders Persistence (Unified in Left Sidebar)
  const [aiFolders, setAiFolders] = useState<AIChatFolder[]>(() => {
    try {
      const raw = localStorage.getItem('mypak_ai_folders_v2');
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
    return DEFAULT_AI_FOLDERS;
  });

  const [aiThreads, setAiThreads] = useState<ChatThread[]>(() => {
    try {
      const raw = localStorage.getItem('mypak_ai_threads_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return INITIAL_AI_THREADS;
  });

  const [activeAiThreadId, setActiveAiThreadId] = useState<string>('thread-welcome');

  useEffect(() => {
    try {
      localStorage.setItem('mypak_ai_folders_v2', JSON.stringify(aiFolders));
    } catch {
      // Ignore
    }
  }, [aiFolders]);

  useEffect(() => {
    try {
      localStorage.setItem('mypak_ai_threads_v2', JSON.stringify(aiThreads));
    } catch {
      // Ignore
    }
  }, [aiThreads]);

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

  // Pricing Calculator Form State (Supports 3-Layer Single Wall & 5-Layer Double Wall CB/F)
  const [topLayer, setTopLayer] = useState<OuterLayerMaterial>('K150');
  const [flute1Layer, setFlute1Layer] = useState<MidLayerMaterial>('M100');
  const [midLayer, setMidLayer] = useState<MidLayerMaterial>('M100');
  const [flute2Layer, setFlute2Layer] = useState<MidLayerMaterial>('M100');
  const [botLayer, setBotLayer] = useState<OuterLayerMaterial>('K125');
  const [flute, setFlute] = useState<FluteType>('CB/F');
  const [marginStr, setMarginStr] = useState<string>('9.5');
  const [quoteTitle, setQuoteTitle] = useState<string>('');

  // Hide/Show toggles (Default HIDE for breakdown & WhatsApp; Sheet Dimensions visible for Pcs)
  const [showOrderBreakdown, setShowOrderBreakdown] = useState<boolean>(false);
  const [showWhatsAppSection, setShowWhatsAppSection] = useState<boolean>(false);
  const [showSheetConverter, setShowSheetConverter] = useState<boolean>(true);

  const [sheetLengthStr, setSheetLengthStr] = useState<string>('1860');
  const [sheetWidthStr, setSheetWidthStr] = useState<string>('1161');
  const [quantityStr, setQuantityStr] = useState<string>('');

  // WhatsApp Copy State
  const [waFormatMode, setWaFormatMode] = useState<'ringkas' | 'lengkap'>('ringkas');
  const [copiedWa, setCopiedWa] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  // Hybrid Opsi A: Automatically switch between Customer's SW Margin vs "275 / E Flute" Margin
  // when a Customer is selected and the spec changes to/from K275 or E/F!
  const customerMarginResolution = useMemo(() => {
    if (!activeCustomer) return null;
    return resolveCustomerEffectiveMargin(activeCustomer, {
      topLayer,
      flute1Layer,
      midLayer,
      flute2Layer,
      botLayer,
      flute,
    });
  }, [activeCustomer, topLayer, flute1Layer, midLayer, flute2Layer, botLayer, flute]);

  useEffect(() => {
    if (customerMarginResolution) {
      setMarginStr(String(customerMarginResolution.effectiveMarginPercent));
    }
  }, [customerMarginResolution]);

  // Construct PricingInput & run real-time calculation (supports negative or positive margin)
  const currentInput: PricingInput = useMemo(() => {
    const parsedMargin = parseFloat(marginStr.replace(',', '.'));
    const parsedLength = parseFloat(sheetLengthStr);
    const parsedWidth = parseFloat(sheetWidthStr);
    const parsedQty = parseInt(quantityStr, 10);

    return {
      topLayer,
      flute1Layer: flute === 'CB/F' ? flute1Layer : undefined,
      midLayer,
      flute2Layer: flute === 'CB/F' ? flute2Layer : undefined,
      botLayer,
      flute,
      marginPercent: Number.isFinite(parsedMargin) ? parsedMargin : 0,
      customerSpecial275EfOverrideActive: Boolean(
        customerMarginResolution?.customerSpecial275EfOverrideActive
      ),
      sheetLengthMm:
        Number.isFinite(parsedLength) && parsedLength > 0 ? parsedLength : undefined,
      sheetWidthMm:
        Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : undefined,
      quantityPcs:
        Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : undefined,
    };
  }, [
    topLayer,
    flute1Layer,
    midLayer,
    flute2Layer,
    botLayer,
    flute,
    marginStr,
    customerMarginResolution,
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
    if (item.input.flute1Layer) setFlute1Layer(item.input.flute1Layer);
    setMidLayer(item.input.midLayer);
    if (item.input.flute2Layer) setFlute2Layer(item.input.flute2Layer);
    setBotLayer(item.input.botLayer);
    setFlute(item.input.flute);
    setMarginStr(String(item.input.marginPercent));
    setQuoteTitle(item.title);
    if (item.input.sheetLengthMm && item.input.sheetWidthMm) {
      setShowSheetConverter(true);
      setSheetLengthStr(String(item.input.sheetLengthMm));
      setSheetWidthStr(String(item.input.sheetWidthMm));
      setQuantityStr(item.input.quantityPcs ? String(item.input.quantityPcs) : '');
    }
    setActiveTab('calculator');
  };

  const handleSelectCustomer = (customer: CustomerDiscountItem) => {
    setSelectedCustomerId(customer.id);
    const resolved = resolveCustomerEffectiveMargin(customer, {
      topLayer,
      flute1Layer,
      midLayer,
      flute2Layer,
      botLayer,
      flute,
    });
    setMarginStr(String(resolved.effectiveMarginPercent));
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
      const resolved = resolveCustomerEffectiveMargin(updated, {
        topLayer,
        flute1Layer,
        midLayer,
        flute2Layer,
        botLayer,
        flute,
      });
      setMarginStr(String(resolved.effectiveMarginPercent));
      setQuoteTitle(updated.name);
    }
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (selectedCustomerId === id) {
      setSelectedCustomerId(null);
    }
  };

  const handleDeleteCustomers = (ids: string[]) => {
    setCustomers((prev) => prev.filter((c) => !ids.includes(c.id)));
    if (selectedCustomerId && ids.includes(selectedCustomerId)) {
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
    setTopLayer('K125');
    setFlute1Layer('M125');
    setMidLayer('M125');
    setFlute2Layer('M125');
    setBotLayer('K125');
    setFlute('B/F');
    setMarginStr('0');
    setQuoteTitle('');
    setSheetLengthStr('1000');
    setSheetWidthStr('1000');
    setQuantityStr('');
    setActiveTab('calculator');
  };

  const handleLoadPresetInput = (input: PricingInput, title: string) => {
    setActiveHistoryId(null);
    setSelectedCustomerId(null);
    setTopLayer(input.topLayer);
    if (input.flute1Layer) setFlute1Layer(input.flute1Layer);
    setMidLayer(input.midLayer);
    if (input.flute2Layer) setFlute2Layer(input.flute2Layer);
    setBotLayer(input.botLayer);
    setFlute(input.flute);
    setMarginStr(String(input.marginPercent));
    if (input.sheetLengthMm && input.sheetWidthMm) {
      setShowSheetConverter(true);
      setSheetLengthStr(String(input.sheetLengthMm));
      setSheetWidthStr(String(input.sheetWidthMm));
      setQuantityStr(input.quantityPcs ? String(input.quantityPcs) : '');
    }
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

  const activeAiThread =
    aiThreads.find((t) => t.id === activeAiThreadId) || aiThreads[0] || INITIAL_AI_THREADS[0];

  const handleNewAiChat = () => {
    triggerHaptic('light');
    const newThread: ChatThread = {
      id: `thread-${Date.now()}`,
      title: 'Percakapan Baru',
      folderId: aiFolders[0]?.id || 'general',
      createdAt: Date.now(),
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          role: 'assistant',
          content: `Hi, i'm BlackEYE AI, how can i help you today...\n\nYou can ask me everything about Sheet Pricing`,
          createdAt: Date.now(),
          modelUsed: 'gemini-2.5-flash',
        },
      ],
    };
    setAiThreads((prev) => [newThread, ...prev]);
    setActiveAiThreadId(newThread.id);
    setActiveTab('ai');
    setSidebarMode('ai');
  };

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
      {/* Left Sidebar Navigation & Unified History / Customer / AI Manager */}
      <SidebarHistory
        isOpenDesktop={isSidebarOpenDesktop}
        onToggleDesktop={() => setIsSidebarOpenDesktop(!isSidebarOpenDesktop)}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        sidebarMode={sidebarMode}
        onChangeSidebarMode={(mode) => {
          setSidebarMode(mode);
          if (mode === 'ai' && activeTab !== 'ai') {
            setActiveTab('ai');
          } else if (mode === 'history' && activeTab === 'ai') {
            setActiveTab('calculator');
          }
        }}
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
        onDeleteCustomers={handleDeleteCustomers}
        onBulkImportCustomers={handleBulkImportCustomers}
        aiThreads={aiThreads}
        aiFolders={aiFolders}
        activeAiThreadId={activeAiThread.id}
        onSelectAiThread={(threadId) => {
          setActiveAiThreadId(threadId);
          setActiveTab('ai');
        }}
        onNewAiChat={handleNewAiChat}
        onRenameAiThread={(id, newTitle) =>
          setAiThreads((prev) =>
            prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t))
          )
        }
        onTogglePinAiThread={(id) =>
          setAiThreads((prev) =>
            prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t))
          )
        }
        onDeleteAiThreads={(ids) =>
          setAiThreads((prev) => {
            const rem = prev.filter((t) => !ids.includes(t.id));
            if (rem.length === 0) return INITIAL_AI_THREADS;
            if (ids.includes(activeAiThread.id)) {
              setActiveAiThreadId(rem[0].id);
            }
            return rem;
          })
        }
        onMoveAiThreadToFolder={(threadId, folderId) =>
          setAiThreads((prev) =>
            prev.map((t) => (t.id === threadId ? { ...t, folderId } : t))
          )
        }
        onCreateAiFolder={(name) =>
          setAiFolders((prev) => [...prev, { id: `aif-${Date.now()}`, name }])
        }
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

          {/* Zone 2: Clean Navigation Links (Kalkulator | Database | Testing | AI) */}
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
              Database
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
              Testing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'ai'
                  ? 'text-[#C65D3B] font-semibold underline underline-offset-8 decoration-2'
                  : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
              }`}
            >
              AI
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

        {/* Scrollable Main Content Viewport (Locked flex height when AI Chat is active so AI Header never scrolls away) */}
        <main
          className={
            activeTab === 'ai'
              ? 'flex-1 overflow-hidden p-2 sm:p-4 flex flex-col min-h-0'
              : 'flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6'
          }
        >
          <div
            className={
              activeTab === 'ai'
                ? 'max-w-5xl w-full mx-auto flex-1 flex flex-col min-h-0'
                : 'max-w-5xl mx-auto'
            }
          >
            {activeTab === 'ai' ? (
              <AIChatWorkspace
                activeCalculation={calculationResult}
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                activeThread={activeAiThread}
                onUpdateThread={(updater) =>
                  setAiThreads((prev) =>
                    prev.map((t) => (t.id === activeAiThread.id ? updater(t) : t))
                  )
                }
                onApplySpecToCalculator={(spec, custId, title) => {
                  if (spec.topLayer) setTopLayer(spec.topLayer);
                  if (spec.flute1Layer) setFlute1Layer(spec.flute1Layer);
                  if (spec.midLayer) setMidLayer(spec.midLayer);
                  if (spec.flute2Layer) setFlute2Layer(spec.flute2Layer);
                  if (spec.botLayer) setBotLayer(spec.botLayer);
                  if (spec.flute) setFlute(spec.flute);
                  if (typeof spec.marginPercent === 'number') {
                    setMarginStr(String(spec.marginPercent));
                  }
                  if (custId !== undefined) {
                    setSelectedCustomerId(custId);
                  }
                  if (title) {
                    setQuoteTitle(title);
                  }
                  setActiveTab('calculator');
                }}
              />
            ) : activeTab !== 'calculator' ? (
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
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/5 dark:border-white/5">
                        <h2 className="text-xs font-display font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 truncate">
                          Spesifikasi Layer & Flute
                        </h2>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={handleSwapTopBottom}
                            title="Tukar Top & Bottom Layer"
                            className="flex items-center gap-1 px-2 py-1 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 text-[11px] font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-[#C65D3B] shrink-0" />
                            <span>Tukar Top/Bot</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleResetNewCalculation}
                            title="Reset ke M125/M125/M125"
                            className="p-1 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white transition-colors duration-150 cursor-pointer shrink-0"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Conditional Layer Dropdowns: Smooth Liquid Popup Morphing between 3-Layer (SW/E-Flute) and 5-Layer (CB/F) */}
                      <motion.div
                        layout
                        transition={{
                          layout: { type: 'spring', stiffness: 420, damping: 30, mass: 0.75 },
                        }}
                        className={`relative z-30 grid ${
                          flute === 'CB/F'
                            ? 'grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2'
                            : 'grid-cols-1 sm:grid-cols-3 gap-3'
                        } items-start`}
                      >
                        {/* 1. TOP LAYER (Smoothly morphs between 3-layer and 5-layer grid) */}
                        <motion.div
                          layout
                          key="layer-slot-top"
                          transition={{
                            layout: { type: 'spring', stiffness: 430, damping: 29, mass: 0.7 },
                          }}
                          className="min-w-0"
                        >
                          <CustomPopoverDropdown
                            label={flute === 'CB/F' ? 'Top Layer' : 'Top Layer'}
                            compact={flute === 'CB/F'}
                            value={topLayer}
                            options={OUTER_LAYER_OPTIONS}
                            groups={['Medium', 'Kraft']}
                            onChange={(val) => setTopLayer(val as OuterLayerMaterial)}
                          />
                        </motion.div>

                        {/* 2. FLUTE 1 LAYER (Liquid Pop-In when switching to CB/F, Liquid Pop-Out when returning to SW/EF) */}
                        <AnimatePresence mode="popLayout" initial={false}>
                          {flute === 'CB/F' && (
                            <motion.div
                              layout
                              key="layer-slot-flute1"
                              initial={{ opacity: 0, scale: 0.72, y: 10, filter: 'blur(4px)' }}
                              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                              exit={{ opacity: 0, scale: 0.72, y: -8, filter: 'blur(4px)' }}
                              transition={{
                                type: 'spring',
                                stiffness: 460,
                                damping: 26,
                                mass: 0.65,
                              }}
                              className="min-w-0"
                            >
                              <CustomPopoverDropdown
                                label="Flute 1"
                                compact={flute === 'CB/F'}
                                value={flute1Layer}
                                options={MID_LAYER_OPTIONS}
                                groups={['Medium', 'Kraft']}
                                warningNote="Inner Layer: Tanpa K110, K125, K135."
                                onChange={(val) => setFlute1Layer(val as MidLayerMaterial)}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* 3. MIDDLE LAYER (Smoothly morphs between 3-layer and 5-layer grid) */}
                        <motion.div
                          layout
                          key="layer-slot-mid"
                          transition={{
                            layout: { type: 'spring', stiffness: 430, damping: 29, mass: 0.7 },
                          }}
                          className="min-w-0"
                        >
                          <CustomPopoverDropdown
                            label={flute === 'CB/F' ? 'Middle Layer' : 'Middle Layer'}
                            compact={flute === 'CB/F'}
                            value={midLayer}
                            options={MID_LAYER_OPTIONS}
                            groups={['Medium', 'Kraft']}
                            align={flute === 'CB/F' ? 'center' : 'left'}
                            warningNote="Inner Layer: Tanpa K110, K125, K135."
                            onChange={(val) => setMidLayer(val as MidLayerMaterial)}
                          />
                        </motion.div>

                        {/* 4. FLUTE 2 LAYER (Liquid Pop-In when switching to CB/F, Liquid Pop-Out when returning to SW/EF) */}
                        <AnimatePresence mode="popLayout" initial={false}>
                          {flute === 'CB/F' && (
                            <motion.div
                              layout
                              key="layer-slot-flute2"
                              initial={{ opacity: 0, scale: 0.72, y: 10, filter: 'blur(4px)' }}
                              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                              exit={{ opacity: 0, scale: 0.72, y: -8, filter: 'blur(4px)' }}
                              transition={{
                                type: 'spring',
                                stiffness: 460,
                                damping: 26,
                                mass: 0.65,
                              }}
                              className="min-w-0"
                            >
                              <CustomPopoverDropdown
                                label="Flute 2"
                                compact={flute === 'CB/F'}
                                value={flute2Layer}
                                options={MID_LAYER_OPTIONS}
                                groups={['Medium', 'Kraft']}
                                align="right"
                                warningNote="Inner Layer: Tanpa K110, K125, K135."
                                onChange={(val) => setFlute2Layer(val as MidLayerMaterial)}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* 5. BOTTOM LAYER (Smoothly morphs between 3-layer and 5-layer grid) */}
                        <motion.div
                          layout
                          key="layer-slot-bot"
                          transition={{
                            layout: { type: 'spring', stiffness: 430, damping: 29, mass: 0.7 },
                          }}
                          className="min-w-0"
                        >
                          <CustomPopoverDropdown
                            label={flute === 'CB/F' ? 'Bottom Layer' : 'Bottom Layer'}
                            compact={flute === 'CB/F'}
                            value={botLayer}
                            options={OUTER_LAYER_OPTIONS}
                            groups={['Medium', 'Kraft']}
                            align="right"
                            onChange={(val) => setBotLayer(val as OuterLayerMaterial)}
                          />
                        </motion.div>
                      </motion.div>

                      {/* Flute 1-Row Selector (B/F, C/F, E/F, CB/F) */}
                      <div className="pt-2 border-t border-black/5 dark:border-white/5">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <label className="text-xs font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] tracking-tight">
                            Flute
                          </label>
                          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                            {flute === 'CB/F'
                              ? 'Double Wall (5-Layer)'
                              : flute === 'E/F'
                              ? 'Single Wall · Multiplier +2%'
                              : 'Single Wall (3-Layer)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
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
                                className={`py-2 px-2 rounded-md font-mono text-xs font-semibold border transition-all duration-150 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                                  isSelected
                                    ? 'bg-[#C65D3B] border-[#C65D3B] text-white'
                                    : 'bg-[#FFFFFF] dark:bg-[#161311] border-black/10 dark:border-white/10 text-[#1C1B1A] dark:text-[#F2EFE9] hover:bg-neutral-50 dark:hover:bg-[#1e1b18]'
                                }`}
                              >
                                <span>{fOpt.id}</span>
                                {fOpt.tag && (
                                  <span
                                    className={`text-[9.5px] font-normal hidden sm:inline ${
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
                        <div className="flex items-baseline justify-between gap-2">
                          <label className="text-xs font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] tracking-tight shrink-0">
                            Diskon / Margin (%)
                          </label>
                          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 tabular-nums text-right truncate">
                            {currentInput.marginPercent < 0
                              ? `Potongan Harga (${currentInput.marginPercent}%)`
                              : currentInput.marginPercent > 0
                              ? `Mark-Up Harga (+${currentInput.marginPercent}%)`
                              : 'Harga Normal (0%)'}
                            {activeCustomer && customerMarginResolution
                              ? ` · ${
                                  customerMarginResolution.customerSpecial275EfOverrideActive
                                    ? 'Acuan 275/EF Customer'
                                    : 'Acuan SW Customer'
                                }`
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

                    {/* Card 2: Sheet Dimension, MOQ & Quantity Calculator */}
                    <div className="rounded-lg bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowSheetConverter(!showSheetConverter)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-black/3 dark:hover:bg-white/3 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Ruler className="w-3.5 h-3.5 text-[#C65D3B] shrink-0" />
                          <span className="text-xs font-display font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] truncate">
                            Dimensi Sheet & MOQ
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {calculationResult.moqResult && calculationResult.moqResult.roundedMoq > 0 && (
                            <span
                              className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-xs ${
                                calculationResult.moqResult.validation.hasAnyWarning
                                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                  : 'text-[#C65D3B] bg-[#F3F1ED] dark:bg-[#22201E]'
                              }`}
                            >
                              MOQ: {calculationResult.moqResult.roundedMoq.toLocaleString('id-ID')} pcs
                            </span>
                          )}
                          {showSheetConverter ? (
                            <ChevronUp className="w-4 h-4 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                      </button>

                      {showSheetConverter && (
                        <div className="p-4 pt-2 border-t border-black/5 dark:border-white/5 space-y-2.5">
                          <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <div>
                              <label className="block text-[10px] sm:text-[10.5px] font-medium mb-1 text-neutral-500 truncate">
                                Panjang (mm)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={sheetLengthStr}
                                onChange={(e) => setSheetLengthStr(e.target.value)}
                                placeholder="1200"
                                className="w-full px-2 sm:px-2.5 py-1.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 font-mono text-xs placeholder:text-neutral-300 dark:placeholder:text-neutral-600 tabular-nums focus:outline-1 focus:outline-[#C65D3B]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] sm:text-[10.5px] font-medium mb-1 text-neutral-500 truncate">
                                Lebar (mm)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={sheetWidthStr}
                                onChange={(e) => setSheetWidthStr(e.target.value)}
                                placeholder="800"
                                className="w-full px-2 sm:px-2.5 py-1.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 font-mono text-xs placeholder:text-neutral-300 dark:placeholder:text-neutral-600 tabular-nums focus:outline-1 focus:outline-[#C65D3B]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] sm:text-[10.5px] font-medium mb-1 text-neutral-500 truncate">
                                Qty (pcs)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={quantityStr}
                                onChange={(e) => setQuantityStr(e.target.value)}
                                placeholder="1000"
                                className="w-full px-2 sm:px-2.5 py-1.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 font-mono text-xs placeholder:text-neutral-300 dark:placeholder:text-neutral-600 tabular-nums focus:outline-1 focus:outline-[#C65D3B]"
                              />
                            </div>
                          </div>

                          {/* Live MOQ Corrugator Calculation Result Strip */}
                          {calculationResult.moqResult &&
                            calculationResult.moqResult.lengthMm > 0 &&
                            calculationResult.moqResult.widthMm > 0 && (
                              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/5 dark:border-white/5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 shrink-0">
                                    MOQ
                                  </span>
                                  <div className="flex items-baseline gap-1.5 min-w-0">
                                    <span className="font-mono text-xs sm:text-sm font-bold text-[#C65D3B] tabular-nums">
                                      {calculationResult.moqResult.roundedMoq > 0
                                        ? `${calculationResult.moqResult.roundedMoq.toLocaleString('id-ID')} pcs`
                                        : '—'}
                                    </span>
                                    <span className="font-mono text-[10px] text-neutral-400 truncate">
                                      ({calculationResult.moqResult.out > 0 ? `${calculationResult.moqResult.out} Out` : '0 Out'} · 500m)
                                    </span>
                                  </div>
                                </div>

                                {calculationResult.moqResult.roundedMoq > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerHaptic('light');
                                      setQuantityStr(
                                        String(calculationResult.moqResult!.roundedMoq)
                                      );
                                    }}
                                    className="shrink-0 px-2 py-1 rounded bg-[#FFFFFF] dark:bg-[#161311] border border-black/8 dark:border-white/10 hover:border-[#C65D3B] text-[10px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-[#C65D3B] transition-colors cursor-pointer shadow-2xs"
                                    title="Salin nilai MOQ ke Qty order"
                                  >
                                    Pakai MOQ
                                  </button>
                                )}
                              </div>
                            )}

                          {/* Live Berat & Tonase Calculation Result Strip */}
                          {calculationResult.weightResult &&
                            calculationResult.weightResult.beratPerPcsGram > 0 && (
                              <div className="grid grid-cols-3 gap-2 px-3 py-2 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/5 dark:border-white/5 text-[11px] font-mono tabular-nums">
                                <div>
                                  <div className="flex items-center gap-1 text-[9.5px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                                    <Scale className="w-2.5 h-2.5 text-[#C65D3B]" />
                                    <span>Berat / Pcs</span>
                                  </div>
                                  <div className="mt-0.5">
                                    <span className="font-bold text-[#1C1B1A] dark:text-[#F2EFE9] text-xs">
                                      {calculationResult.weightResult.beratPerPcsGram.toLocaleString(
                                        'id-ID',
                                        {
                                          minimumFractionDigits: 1,
                                          maximumFractionDigits: 1,
                                        }
                                      )}{' '}
                                      g
                                    </span>
                                    <span className="block text-[9.5px] text-neutral-400 font-sans">
                                      {calculationResult.weightResult.beratPerPcsKg.toFixed(4)} kg
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[9.5px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 truncate">
                                    Tonase {currentInput.quantityPcs ? 'Order' : 'MOQ'}
                                  </div>
                                  <div className="mt-0.5">
                                    <span className="font-bold text-[#1C1B1A] dark:text-[#F2EFE9] text-xs">
                                      {currentInput.quantityPcs &&
                                      calculationResult.weightResult.tonaseKg > 0
                                        ? `${calculationResult.weightResult.tonaseKg.toLocaleString(
                                            'id-ID',
                                            { maximumFractionDigits: 1 }
                                          )} kg`
                                        : calculationResult.weightResult.moqTonaseKg
                                        ? `${calculationResult.weightResult.moqTonaseKg.toLocaleString(
                                            'id-ID',
                                            { maximumFractionDigits: 1 }
                                          )} kg`
                                        : '—'}
                                    </span>
                                    <span className="block text-[9.5px] text-neutral-400 font-sans truncate">
                                      {currentInput.quantityPcs &&
                                      calculationResult.weightResult.tonaseTon > 0
                                        ? `${calculationResult.weightResult.tonaseTon.toFixed(3)} Ton`
                                        : calculationResult.weightResult.moqTonaseTon
                                        ? `${calculationResult.weightResult.moqTonaseTon.toFixed(3)} Ton (MOQ)`
                                        : 'Isi Qty pcs'}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[9.5px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                                    Rp / Kg
                                  </div>
                                  <div className="mt-0.5">
                                    <span className="font-bold text-[#C65D3B] text-xs">
                                      Rp{' '}
                                      {calculationResult.weightResult.rpPerKg.toLocaleString('id-ID')}
                                    </span>
                                    <span className="block text-[9.5px] text-neutral-400 font-sans">
                                      {calculationResult.weightResult.totalGsm} gsm
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Peringatan / Notes Warna Merah Jika Spesifikasi Tidak Memenuhi Standar */}
                          {calculationResult.moqResult?.validation.warnings &&
                            calculationResult.moqResult.validation.warnings.length > 0 && (
                              <div className="space-y-1.5 pt-0.5">
                                {calculationResult.moqResult.validation.warnings.map(
                                  (w, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex items-start gap-2 px-2.5 py-1.5 rounded-md text-[11px] leading-snug border ${
                                        w.type === 'danger'
                                          ? 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-300'
                                          : w.type === 'warning'
                                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300'
                                          : 'bg-blue-500/10 border-blue-500/25 text-blue-800 dark:text-blue-300'
                                      }`}
                                    >
                                      <AlertTriangle
                                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                          w.type === 'danger'
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : w.type === 'warning'
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-blue-600 dark:text-blue-400'
                                        }`}
                                      />
                                      <div className="min-w-0">
                                        <span className="font-semibold">{w.title} — </span>
                                        <span className="opacity-90">{w.message}</span>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
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
                              <GachaNumberText
                                value={formatRupiah(calculationResult.hargaBersihPerM2)}
                              />
                            </div>
                            <div className="text-right font-mono text-[10.5px] text-neutral-400 dark:text-neutral-500 tabular-nums shrink-0">
                              Decimal :{' '}
                              <GachaNumberText
                                value={`Rp ${calculationResult.hargaFinalMentah.toFixed(2)}`}
                              />
                            </div>
                          </div>

                          {/* Small Light-Grey Subtext as requested */}
                          <div className="mt-1.5 text-[10px] text-neutral-400 dark:text-neutral-500 leading-normal">
                            Pembulatan Desimal 5 dibulatkan ke atas (exc PPN)
                          </div>
                        </div>

                        {/* Compact Summary Strip (Always visible — Additive Architecture) */}
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
                              Downgrade ({calculationResult.isDoubleWall ? 'DW' : 'SW'})
                            </span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              -{calculationResult.totalDowngradePercent}%
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9.5px] text-neutral-400">
                              Total Modifier
                            </span>
                            <span
                              className={`font-semibold ${
                                calculationResult.totalAdditiveModifierPercent < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-[#C65D3B]'
                              }`}
                            >
                              {calculationResult.totalAdditiveModifierPercent > 0 ? '+' : ''}
                              {calculationResult.totalAdditiveModifierPercent}%
                            </span>
                          </div>
                        </div>

                        {/* Sheet Area & Harga / Pcs Result */}
                        {calculationResult.areaPerSheetM2 &&
                          calculationResult.hargaPerSheetRp !== undefined && (
                            <div className="p-3 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] space-y-1 font-mono text-xs tabular-nums">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-neutral-500">
                                  Luas ({currentInput.sheetLengthMm}×{currentInput.sheetWidthMm} mm):
                                </span>
                                <span className="font-semibold">
                                  {calculationResult.areaPerSheetM2.toFixed(5)} M²
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-neutral-500">Harga / Pcs (Lembar):</span>
                                <span className="font-bold text-[#C65D3B]">
                                  {formatRupiah(calculationResult.hargaPerSheetRp)}
                                </span>
                              </div>
                              {calculationResult.weightResult &&
                                calculationResult.weightResult.beratPerPcsGram > 0 && (
                                  <>
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-neutral-500 font-sans">
                                        Berat / Pcs (Lembar):
                                      </span>
                                      <span className="font-semibold font-mono text-[#1C1B1A] dark:text-[#F2EFE9]">
                                        {calculationResult.weightResult.beratPerPcsGram.toLocaleString(
                                          'id-ID',
                                          {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1,
                                          }
                                        )}{' '}
                                        g
                                        <span className="text-neutral-400 font-normal ml-1 text-[10px]">
                                          ({calculationResult.weightResult.beratPerPcsKg.toFixed(4)} kg)
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-neutral-500 font-sans">
                                        Rp / Kg:
                                      </span>
                                      <span className="font-bold font-mono text-[#C65D3B]">
                                        Rp{' '}
                                        {calculationResult.weightResult.rpPerKg.toLocaleString('id-ID')}{' '}
                                        / kg
                                      </span>
                                    </div>
                                    {currentInput.quantityPcs &&
                                      calculationResult.weightResult.tonaseKg > 0 && (
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-neutral-500 font-sans">
                                            Tonase ({currentInput.quantityPcs.toLocaleString('id-ID')}{' '}
                                            pcs):
                                          </span>
                                          <span className="font-semibold font-mono text-[#1C1B1A] dark:text-[#F2EFE9]">
                                            {calculationResult.weightResult.tonaseKg.toLocaleString(
                                              'id-ID',
                                              { maximumFractionDigits: 1 }
                                            )}{' '}
                                            kg
                                            <span className="text-neutral-400 font-normal ml-1 text-[10px]">
                                              ({calculationResult.weightResult.tonaseTon.toFixed(3)} Ton)
                                            </span>
                                          </span>
                                        </div>
                                      )}
                                  </>
                                )}
                              {calculationResult.moqResult &&
                                calculationResult.moqResult.roundedMoq > 0 && (
                                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-black/6 dark:border-white/8">
                                    <span className="text-neutral-500 font-sans">
                                      MOQ (500m · {calculationResult.moqResult.out} Out):
                                    </span>
                                    <span className="font-bold font-mono text-[#1C1B1A] dark:text-[#F2EFE9]">
                                      {calculationResult.moqResult.roundedMoq.toLocaleString('id-ID')} pcs
                                    </span>
                                  </div>
                                )}
                              {calculationResult.moqResult?.validation.warnings &&
                                calculationResult.moqResult.validation.warnings.length > 0 && (
                                  <div className="pt-0.5 space-y-0.5">
                                    {calculationResult.moqResult.validation.warnings.map((w, idx) => (
                                      <div
                                        key={idx}
                                        className="text-[10px] font-sans font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1"
                                      >
                                        <AlertTriangle className="w-3 h-3 shrink-0" />
                                        <span>{w.title}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
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
                            <BreakdownTypewriter
                              result={calculationResult}
                              customer={activeCustomer}
                              customerMarginResolution={customerMarginResolution}
                            />
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
