import React, { useState, useRef } from 'react';
import {
  Plus,
  Search,
  X,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Pin,
  Trash2,
  Edit3,
  FolderPlus,
  Sun,
  Moon,
  ChevronLeft,
  Folder,
  Layers,
  Check,
  Users,
  History,
  FileDown,
  FileUp,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import {
  PricingInput,
  formatRupiah,
  CustomerDiscountItem,
  CustomerTier,
} from '../utils/pricingEngine';
import {
  triggerHaptic,
  downloadCustomerTemplateMd,
  downloadCustomerTemplateExcel,
  parseCustomerImportFile,
  parseCustomerExcelBuffer,
} from '../utils/hapticsAndImport';
import { ChatThread, AIChatFolder } from '../utils/aiEngine';

export interface CalculationHistoryItem {
  id: string;
  title: string;
  createdAt: number;
  pinned?: boolean;
  folderId: string;
  input: PricingInput;
  finalPricePerM2: number;
  substanceLabel: string;
}

export interface HistoryFolder {
  id: string;
  name: string;
  isDefault?: boolean;
}

export type SidebarTabMode = 'history' | 'customers' | 'ai';

interface SidebarHistoryProps {
  isOpenDesktop: boolean;
  onToggleDesktop: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  sidebarMode: SidebarTabMode;
  onChangeSidebarMode: (mode: SidebarTabMode) => void;
  items: CalculationHistoryItem[];
  folders: HistoryFolder[];
  activeItemId: string | null;
  onSelectItem: (item: CalculationHistoryItem) => void;
  onNewCalculation: () => void;
  onRenameItem: (id: string, newTitle: string) => void;
  onTogglePinItem: (id: string) => void;
  onDeleteItems: (ids: string[]) => void;
  onMoveItemsToFolder: (ids: string[], targetFolderId: string) => void;
  onCreateFolder: (name: string) => void;
  // Customer Database Props
  customers: CustomerDiscountItem[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: CustomerDiscountItem) => void;
  onAddCustomer: (item: Omit<CustomerDiscountItem, 'id'>) => void;
  onUpdateCustomer: (item: CustomerDiscountItem) => void;
  onDeleteCustomer: (id: string) => void;
  onBulkImportCustomers: (items: CustomerDiscountItem[]) => void;
  // AI Chat Threads & Folders Props
  aiThreads: ChatThread[];
  aiFolders: AIChatFolder[];
  activeAiThreadId: string;
  onSelectAiThread: (threadId: string) => void;
  onNewAiChat: () => void;
  onRenameAiThread: (id: string, newTitle: string) => void;
  onTogglePinAiThread: (id: string) => void;
  onDeleteAiThreads: (ids: string[]) => void;
  onMoveAiThreadToFolder: (threadId: string, folderId: string) => void;
  onCreateAiFolder: (name: string) => void;
  // Theme
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const SidebarHistory: React.FC<SidebarHistoryProps> = ({
  isOpenDesktop,
  onToggleDesktop,
  isOpenMobile,
  onCloseMobile,
  sidebarMode,
  onChangeSidebarMode,
  items,
  folders,
  activeItemId,
  onSelectItem,
  onNewCalculation,
  onRenameItem,
  onTogglePinItem,
  onDeleteItems,
  onMoveItemsToFolder,
  onCreateFolder,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onBulkImportCustomers,
  aiThreads,
  aiFolders,
  activeAiThreadId,
  onSelectAiThread,
  onNewAiChat,
  onRenameAiThread,
  onTogglePinAiThread,
  onDeleteAiThreads,
  onMoveAiThreadToFolder,
  onCreateAiFolder,
  isDarkMode,
  onToggleTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [batchMoveMenuOpen, setBatchMoveMenuOpen] = useState(false);

  // Customer management state inside Sidebar
  const [custTierFilter, setCustTierFilter] = useState<'ALL' | CustomerTier>('ALL');
  const [isCustFormOpen, setIsCustFormOpen] = useState(false);
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [custName, setCustName] = useState('');
  const [custTier, setCustTier] = useState<CustomerTier>('Tier 1');
  const [custSw, setCustSw] = useState('9');
  const [custDw, setCustDw] = useState('13');
  const [custImportMsg, setCustImportMsg] = useState<string | null>(null);
  const [showSidebarGuide, setShowSidebarGuide] = useState(false);

  // AI Chat management state inside Sidebar
  const [aiCollapsedFolders, setAiCollapsedFolders] = useState<Record<string, boolean>>({});
  const [aiBatchMode, setAiBatchMode] = useState(false);
  const [selectedAiThreadIds, setSelectedAiThreadIds] = useState<string[]>([]);
  const [editingAiThreadId, setEditingAiThreadId] = useState<string | null>(null);
  const [editingAiText, setEditingAiText] = useState('');
  const [draggedAiThreadId, setDraggedAiThreadId] = useState<string | null>(null);
  const [dragOverAiFolderId, setDragOverAiFolderId] = useState<string | null>(null);
  const [isAddingAiFolder, setIsAddingAiFolder] = useState(false);
  const [newAiFolderName, setNewAiFolderName] = useState('');

  const custMdInputRef = useRef<HTMLInputElement>(null);

  const handleCustMdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isExcel = ['xls', 'xlsx', 'ods', 'xlsm', 'xlsb'].includes(ext);

    const reader = new FileReader();
    reader.onload = (ev) => {
      let parsed: CustomerDiscountItem[] = [];
      if (isExcel && ev.target?.result instanceof ArrayBuffer) {
        parsed = parseCustomerExcelBuffer(ev.target.result);
      } else {
        const content = String(ev.target?.result || '');
        parsed = parseCustomerImportFile(content);
      }

      if (parsed.length > 0) {
        triggerHaptic('success');
        onBulkImportCustomers(parsed);
        setCustImportMsg(`+${parsed.length} customer diimpor`);
      } else {
        setCustImportMsg('Format tidak sesuai');
      }
      setTimeout(() => setCustImportMsg(null), 2800);
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const toggleBatchSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const startEditing = (item: CalculationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditingText(item.title);
  };

  const commitRename = (id: string) => {
    const trimmed = editingText.trim();
    if (trimmed) {
      onRenameItem(id, trimmed);
    }
    setEditingId(null);
  };

  const handleKeyDownRename = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingId(null);
    }
  };

  const handleAddFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  const openCustCreate = () => {
    setEditingCustId(null);
    setCustName('');
    setCustTier('Tier 1');
    setCustSw('0');
    setCustDw('0');
    setIsCustFormOpen(true);
  };

  const openCustEdit = (c: CustomerDiscountItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustId(c.id);
    setCustName(c.name);
    setCustTier(c.tier);
    setCustSw(String(c.swMarginPercent));
    setCustDw(String(c.dwMarginPercent));
    setIsCustFormOpen(true);
  };

  const handleSaveCustForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;
    const swVal = parseFloat(custSw.replace(',', '.'));
    const dwVal = parseFloat(custDw.replace(',', '.'));
    const payload = {
      name: custName.trim(),
      tier: custTier,
      swMarginPercent: Number.isFinite(swVal) ? swVal : 0,
      dwMarginPercent: Number.isFinite(dwVal) ? dwVal : 0,
    };

    if (editingCustId) {
      onUpdateCustomer({ id: editingCustId, ...payload });
    } else {
      onAddCustomer(payload);
    }
    setIsCustFormOpen(false);
    setEditingCustId(null);
  };

  // Filter items by search query
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.substanceLabel.toLowerCase().includes(q) ||
      item.input.flute.toLowerCase().includes(q)
    );
  });

  const filteredCustomers = customers.filter((c) => {
    const matchTier = custTierFilter === 'ALL' || c.tier === custTierFilter;
    const matchSearch =
      !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTier && matchSearch;
  });

  const filteredAiThreads = aiThreads.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  const pinnedItems = filteredItems.filter((item) => item.pinned);
  const pinnedAiThreads = filteredAiThreads.filter((t) => t.pinned);

  const formatRelativeTime = (timestamp: number) => {
    const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
    if (diffMinutes < 60) return `${diffMinutes}m lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}h lalu`;
  };

  const renderHistoryRow = (item: CalculationHistoryItem) => {
    const isSelectedActive = activeItemId === item.id;
    const isChecked = selectedIds.includes(item.id);
    const isEditing = editingId === item.id;

    return (
      <div
        key={item.id}
        draggable={!isEditing && !batchMode}
        onDragStart={() => setDraggedItemId(item.id)}
        onDragEnd={() => {
          setDraggedItemId(null);
          setDragOverFolderId(null);
        }}
        onClick={() => {
          if (batchMode) {
            toggleBatchSelect(item.id);
          } else if (!isEditing) {
            onSelectItem(item);
            onCloseMobile();
          }
        }}
        className={`group relative flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xs text-[10.5px] transition-colors duration-150 cursor-pointer select-none ${
          isSelectedActive && !batchMode
            ? 'bg-[#C65D3B]/12 border border-[#C65D3B]/35 text-[#1C1B1A] dark:text-[#F2EFE9] font-semibold'
            : isChecked && batchMode
            ? 'bg-amber-600/15 border border-amber-600/35 text-[#1C1B1A] dark:text-[#F2EFE9]'
            : 'hover:bg-black/5 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {batchMode && (
            <span
              className={`w-3 h-3 rounded-xs flex items-center justify-center border shrink-0 ${
                isChecked
                  ? 'bg-[#C65D3B] border-[#C65D3B] text-white'
                  : 'border-neutral-400 dark:border-neutral-600'
              }`}
            >
              {isChecked && <Check className="w-2 h-2" />}
            </span>
          )}

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                type="text"
                autoFocus
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => handleKeyDownRename(e, item.id)}
                onBlur={() => commitRename(item.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-1.5 py-0.5 text-[10.5px] rounded-xs bg-white dark:bg-[#22201E] border border-[#C65D3B] text-[#1C1B1A] dark:text-[#F2EFE9] focus:outline-none"
              />
            ) : (
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[10.5px] leading-tight">{item.title}</span>
                <span className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 shrink-0 tabular-nums">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 text-[9px] text-neutral-400 dark:text-neutral-500 font-mono mt-0.5 tabular-nums">
              <span className="truncate">{item.substanceLabel}</span>
              <span>·</span>
              <span>{item.input.flute}</span>
              <span>·</span>
              <span className="text-[#C65D3B] dark:text-amber-400 font-medium">
                {formatRupiah(item.finalPricePerM2)}
              </span>
            </div>
          </div>
        </div>

        {/* Hover Actions */}
        {!batchMode && !isEditing && (
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 bg-[#FFFFFF] dark:bg-[#161311] pl-1 rounded-xs">
            <button
              type="button"
              title="Ubah Judul"
              onClick={(e) => startEditing(item, e)}
              className="p-0.5 text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white rounded-xs cursor-pointer"
            >
              <Edit3 className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              title={item.pinned ? 'Lepas Sematan' : 'Sematkan'}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinItem(item.id);
              }}
              className={`p-0.5 rounded-xs cursor-pointer ${
                item.pinned
                  ? 'text-[#C65D3B]'
                  : 'text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white'
              }`}
            >
              <Pin className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              title="Hapus Riwayat"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItems([item.id]);
              }}
              className="p-0.5 text-neutral-400 hover:text-rose-600 rounded-xs cursor-pointer"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAiThreadRow = (thread: ChatThread) => {
    const isActive = thread.id === activeAiThreadId;
    const isEditing = editingAiThreadId === thread.id;
    const isChecked = selectedAiThreadIds.includes(thread.id);

    return (
      <div
        key={thread.id}
        draggable={!isEditing && !aiBatchMode}
        onDragStart={() => setDraggedAiThreadId(thread.id)}
        onDragEnd={() => {
          setDraggedAiThreadId(null);
          setDragOverAiFolderId(null);
        }}
        onClick={() => {
          if (aiBatchMode) {
            setSelectedAiThreadIds((prev) =>
              prev.includes(thread.id)
                ? prev.filter((id) => id !== thread.id)
                : [...prev, thread.id]
            );
          } else if (!isEditing) {
            onSelectAiThread(thread.id);
            onCloseMobile();
          }
        }}
        className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xs text-[10.5px] cursor-pointer transition-colors select-none ${
          isActive && !aiBatchMode
            ? 'bg-[#C65D3B]/12 border border-[#C65D3B]/35 font-semibold text-[#1C1B1A] dark:text-[#F2EFE9]'
            : isChecked && aiBatchMode
            ? 'bg-amber-600/15 border border-amber-600/35 text-[#1C1B1A] dark:text-[#F2EFE9]'
            : 'hover:bg-black/5 dark:hover:bg-white/5 text-neutral-600 dark:text-neutral-300 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {aiBatchMode && (
            <span
              className={`w-3 h-3 rounded-xs flex items-center justify-center border shrink-0 ${
                isChecked
                  ? 'bg-[#C65D3B] border-[#C65D3B] text-white'
                  : 'border-neutral-400'
              }`}
            >
              {isChecked && <Check className="w-2 h-2" />}
            </span>
          )}

          {isEditing ? (
            <input
              type="text"
              autoFocus
              value={editingAiText}
              onChange={(e) => setEditingAiText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (editingAiText.trim()) {
                    onRenameAiThread(thread.id, editingAiText.trim());
                  }
                  setEditingAiThreadId(null);
                } else if (e.key === 'Escape') {
                  setEditingAiThreadId(null);
                }
              }}
              onBlur={() => {
                if (editingAiText.trim()) {
                  onRenameAiThread(thread.id, editingAiText.trim());
                }
                setEditingAiThreadId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-1 py-0.5 text-[10.5px] rounded-xs bg-white dark:bg-[#161311] border border-[#C65D3B] focus:outline-none"
            />
          ) : (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[10.5px] leading-tight">
                  {thread.title}
                </span>
                <span className="text-[9px] font-mono text-neutral-400 shrink-0 tabular-nums">
                  {formatRelativeTime(thread.createdAt)}
                </span>
              </div>
              <div className="text-[9px] font-mono text-neutral-400 truncate mt-0.5">
                {thread.messages.length} pesan
              </div>
            </div>
          )}
        </div>

        {!aiBatchMode && !isEditing && (
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 bg-[#FFFFFF] dark:bg-[#161311] pl-1 rounded-xs">
            <button
              type="button"
              title="Ubah Judul"
              onClick={(e) => {
                e.stopPropagation();
                setEditingAiThreadId(thread.id);
                setEditingAiText(thread.title);
              }}
              className="p-0.5 text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white cursor-pointer"
            >
              <Edit3 className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              title={thread.pinned ? 'Lepas Sematan' : 'Sematkan'}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinAiThread(thread.id);
              }}
              className={`p-0.5 cursor-pointer ${
                thread.pinned
                  ? 'text-[#C65D3B]'
                  : 'text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white'
              }`}
            >
              <Pin className="w-2.5 h-2.5" />
            </button>
            {aiThreads.length > 1 && (
              <button
                type="button"
                title="Hapus Obrolan"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAiThreads([thread.id]);
                }}
                className="p-0.5 text-neutral-400 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Dismiss */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Single Unified Sidebar for Desktop + Drawer for Mobile */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 h-[100dvh] flex flex-col bg-[#FFFFFF]/98 dark:bg-[#161311]/98 border-r border-black/8 dark:border-white/10 transition-all duration-200 ease-out shrink-0 overflow-hidden ${
          isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${
          isOpenDesktop
            ? 'lg:w-72 lg:opacity-100'
            : 'lg:w-0 lg:opacity-0 lg:border-r-0 lg:pointer-events-none'
        }`}
      >
        <div className="w-72 h-full flex flex-col">
          {/* 1. Header Island: 3-Part Segmented Switcher (Riwayat | Customer | AI) */}
          <div className="p-3 border-b border-black/6 dark:border-white/8">
            <div className="flex items-center justify-between gap-1.5 mb-2.5">
              {/* 3-Tab Segmented Switcher with Compact Font so all 3 fit cleanly */}
              <div className="grid grid-cols-3 items-center p-0.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/5 dark:border-white/5 flex-1 min-w-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onChangeSidebarMode('history');
                  }}
                  className={`flex items-center justify-center gap-1 py-1 px-1 rounded-xs text-[9.5px] font-medium transition-colors cursor-pointer truncate ${
                    sidebarMode === 'history'
                      ? 'bg-white dark:bg-[#161311] text-[#1C1B1A] dark:text-[#F2EFE9] font-semibold shadow-2xs'
                      : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
                  }`}
                >
                  <History className="w-2.5 h-2.5 text-[#C65D3B] shrink-0" />
                  <span className="truncate">Riwayat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onChangeSidebarMode('customers');
                  }}
                  className={`flex items-center justify-center gap-1 py-1 px-1 rounded-xs text-[9.5px] font-medium transition-colors cursor-pointer truncate ${
                    sidebarMode === 'customers'
                      ? 'bg-white dark:bg-[#161311] text-[#1C1B1A] dark:text-[#F2EFE9] font-semibold shadow-2xs'
                      : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
                  }`}
                >
                  <Users className="w-2.5 h-2.5 text-[#C65D3B] shrink-0" />
                  <span className="truncate">Customer ({customers.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onChangeSidebarMode('ai');
                  }}
                  className={`flex items-center justify-center gap-1 py-1 px-1 rounded-xs text-[9.5px] font-medium transition-colors cursor-pointer truncate ${
                    sidebarMode === 'ai'
                      ? 'bg-white dark:bg-[#161311] text-[#1C1B1A] dark:text-[#F2EFE9] font-semibold shadow-2xs'
                      : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-2.5 h-2.5 text-[#C65D3B] shrink-0" />
                  <span className="truncate">AI</span>
                </button>
              </div>

              {/* Hide Sidebar Button */}
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  onToggleDesktop();
                }}
                title="Sembunyikan Sidebar"
                className="p-1.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Primary Action Button per Active Mode */}
            {sidebarMode === 'history' ? (
              <button
                type="button"
                onClick={() => {
                  onNewCalculation();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-[#C65D3B] hover:bg-[#b24f2f] text-white font-semibold text-xs transition-colors duration-150 active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Kalkulasi Sheet Baru</span>
              </button>
            ) : sidebarMode === 'customers' ? (
              <button
                type="button"
                onClick={openCustCreate}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-[#C65D3B] hover:bg-[#b24f2f] text-white font-semibold text-xs transition-colors duration-150 active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Customer Baru</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onNewAiChat();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-[#C65D3B] hover:bg-[#b24f2f] text-white font-semibold text-xs transition-colors duration-150 active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Chat AI Baru</span>
              </button>
            )}

            {/* 2. Search & Batch Filter Bar */}
            <div className="flex items-center gap-1.5 mt-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    sidebarMode === 'history'
                      ? 'Cari spek / riwayat...'
                      : sidebarMode === 'customers'
                      ? 'Cari nama PT / customer...'
                      : 'Cari obrolan AI...'
                  }
                  className="w-full pl-8 pr-6 py-1.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/6 dark:border-white/8 text-xs text-[#1C1B1A] dark:text-[#F2EFE9] placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-1 focus:outline-[#C65D3B]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {sidebarMode === 'history' && (
                <button
                  type="button"
                  onClick={() => {
                    setBatchMode(!batchMode);
                    setSelectedIds([]);
                    setBatchMoveMenuOpen(false);
                  }}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md border text-[10.5px] font-medium transition-colors duration-150 cursor-pointer shrink-0 ${
                    batchMode
                      ? 'bg-[#C65D3B]/15 border-[#C65D3B] text-[#C65D3B] font-semibold'
                      : 'bg-[#F3F1ED] dark:bg-[#22201E] border-black/6 dark:border-white/8 text-neutral-600 dark:text-neutral-300 hover:text-[#1C1B1A]'
                  }`}
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>Pilih</span>
                </button>
              )}

              {sidebarMode === 'ai' && (
                <button
                  type="button"
                  onClick={() => {
                    setAiBatchMode(!aiBatchMode);
                    setSelectedAiThreadIds([]);
                  }}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md border text-[10.5px] font-medium transition-colors duration-150 cursor-pointer shrink-0 ${
                    aiBatchMode
                      ? 'bg-[#C65D3B]/15 border-[#C65D3B] text-[#C65D3B] font-semibold'
                      : 'bg-[#F3F1ED] dark:bg-[#22201E] border-black/6 dark:border-white/8 text-neutral-600 dark:text-neutral-300 hover:text-[#1C1B1A]'
                  }`}
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>Pilih</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Scrollable Content Area (History OR Customer Database OR AI Chat Threads) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-2">
            {sidebarMode === 'history' ? (
              <>
                {/* Pinned Section */}
                {pinnedItems.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-1.5 py-1 text-[10.5px] font-semibold text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Pin className="w-3 h-3 text-[#C65D3B]" />
                        <span>Disematkan</span>
                      </div>
                      <span className="font-mono text-[9.5px] tabular-nums">
                        {pinnedItems.length}
                      </span>
                    </div>
                    <div className="mt-0.5 space-y-0.5 pl-2 border-l border-black/8 dark:border-white/10">
                      {pinnedItems.map(renderHistoryRow)}
                    </div>
                  </div>
                )}

                {/* Folder Categories */}
                {folders.map((folder) => {
                  const folderItems = filteredItems.filter((i) => i.folderId === folder.id);
                  const isCollapsed = !!collapsedFolders[folder.id];
                  const isDropTarget = dragOverFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedItemId) {
                          setDragOverFolderId(folder.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverFolderId === folder.id) {
                          setDragOverFolderId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedItemId) {
                          onMoveItemsToFolder([draggedItemId], folder.id);
                          setDraggedItemId(null);
                          setDragOverFolderId(null);
                        }
                      }}
                      className={`rounded-md transition-all duration-150 ${
                        isDropTarget
                          ? 'bg-amber-500/20 border-2 border-dashed border-amber-500/80 p-1'
                          : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFolder(folder.id)}
                        className="w-full flex items-center justify-between px-1.5 py-1 rounded-xs hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Folder className="w-3 h-3 text-[#C65D3B] shrink-0" />
                          <span className="truncate">{folder.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9.5px] font-mono text-neutral-400 tabular-nums">
                            {folderItems.length}
                          </span>
                          {isCollapsed ? (
                            <ChevronRight className="w-3 h-3 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-neutral-400" />
                          )}
                        </div>
                      </button>

                      {!isCollapsed && (
                        <div className="mt-0.5 space-y-0.5 pl-2 border-l border-black/8 dark:border-white/10">
                          {folderItems.length === 0 ? (
                            <div className="py-1 px-2 text-[9.5px] italic text-neutral-400 dark:text-neutral-500">
                              Kosong
                            </div>
                          ) : (
                            folderItems.map(renderHistoryRow)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Folder */}
                {isAddingFolder ? (
                  <form onSubmit={handleAddFolderSubmit} className="px-1 pt-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setIsAddingFolder(false);
                        }}
                        placeholder="Nama kategori..."
                        className="flex-1 px-2 py-1 text-[10.5px] rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-[#C65D3B] text-[#1C1B1A] dark:text-[#F2EFE9] placeholder:text-neutral-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 text-[10px] font-semibold bg-[#C65D3B] text-white rounded-md cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingFolder(true)}
                    className="flex items-center gap-1.5 px-2 py-1 text-[10.5px] text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-3 h-3 text-[#C65D3B]" />
                    <span>+ Kategori Baru</span>
                  </button>
                )}
              </>
            ) : sidebarMode === 'customers' ? (
              /* CUSTOMER DISCOUNT DATABASE VIEW IN SIDEBAR */
              <div className="space-y-2">
                {/* Quick Import / Download Template (.MD & .XLSX) + Format Guide */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={downloadCustomerTemplateMd}
                    title="Download contoh file .MD"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 text-[10px] font-medium text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    <FileDown className="w-3 h-3 text-[#C65D3B]" />
                    <span>.MD</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadCustomerTemplateExcel}
                    title="Download contoh file Excel .XLSX (Kolom A-E)"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 border border-black/6 dark:border-white/8 text-[10px] font-medium text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    <FileDown className="w-3 h-3 text-emerald-600" />
                    <span>.XLSX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      custMdInputRef.current?.click();
                    }}
                    title="Import dari Excel (.xls, .xlsx) atau Markdown (.md, .csv)"
                    className="flex-[1.4] flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xs bg-[#C65D3B]/12 hover:bg-[#C65D3B] hover:text-white text-[#C65D3B] text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    <FileUp className="w-3 h-3" />
                    <span>Import</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setShowSidebarGuide(!showSidebarGuide);
                    }}
                    title="Panduan format kolom file .MD & Excel"
                    className={`p-1.5 rounded-xs border transition-colors cursor-pointer ${
                      showSidebarGuide
                        ? 'bg-[#C65D3B] text-white border-[#C65D3B]'
                        : 'bg-[#F3F1ED] dark:bg-[#22201E] border-black/6 dark:border-white/8 text-neutral-500'
                    }`}
                  >
                    <HelpCircle className="w-3 h-3" />
                  </button>
                  <input
                    ref={custMdInputRef}
                    type="file"
                    accept=".xlsx,.xls,.ods,.md,.markdown,.csv,.txt,.json"
                    onChange={handleCustMdUpload}
                    className="hidden"
                  />
                </div>

                {showSidebarGuide && (
                  <div className="p-2 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 space-y-1 text-[9.5px] font-mono text-neutral-500 dark:text-neutral-400">
                    <div className="font-sans font-semibold text-[#C65D3B] text-[10px]">
                      Struktur Kolom Excel / .MD:
                    </div>
                    <div>• Kol A: Nomor | Kol B: Nama Customer</div>
                    <div>• Kol C: Tier (Tier 1 / Tier 2 / Tier 3 / Tier 4)</div>
                    <div>• Kol D: Diskon SW | Kol E: Diskon DW</div>
                  </div>
                )}

                {custImportMsg && (
                  <div className="text-[10px] font-mono text-center text-emerald-600 dark:text-emerald-400">
                    {custImportMsg}
                  </div>
                )}

                {/* Tier Filter Tabs */}
                <div className="flex items-center p-0.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/5 dark:border-white/5 gap-0.5 overflow-x-auto no-scrollbar">
                  {(['ALL', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCustTierFilter(t)}
                      className={`flex-1 py-1 px-1 rounded-xs text-[9px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        custTierFilter === t
                          ? 'bg-[#C65D3B] text-white font-semibold'
                          : 'text-neutral-500 hover:text-[#1C1B1A] dark:hover:text-white'
                      }`}
                    >
                      {t === 'ALL' ? 'Semua' : t}
                    </button>
                  ))}
                </div>

                {/* Inline Add/Edit Form */}
                {isCustFormOpen && (
                  <form
                    onSubmit={handleSaveCustForm}
                    className="p-2.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-[#C65D3B]/40 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#C65D3B]">
                      <span>{editingCustId ? 'Edit Customer' : 'Customer Baru'}</span>
                      <button
                        type="button"
                        onClick={() => setIsCustFormOpen(false)}
                        className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="Contoh: PT Vinns Carton"
                      className="w-full px-2 py-1.5 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 text-xs placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-1 focus:outline-[#C65D3B]"
                    />

                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="block text-[9.5px] text-neutral-400 mb-0.5">
                          Tier
                        </label>
                        <div className="flex rounded-xs overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-[#161311]">
                          {(['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'] as CustomerTier[]).map(
                            (tierOpt) => (
                              <button
                                key={tierOpt}
                                type="button"
                                onClick={() => setCustTier(tierOpt)}
                                className={`flex-1 py-1 text-[8.5px] font-medium cursor-pointer ${
                                  custTier === tierOpt
                                    ? 'bg-[#C65D3B] text-white font-semibold'
                                    : 'text-neutral-500'
                                }`}
                              >
                                {tierOpt.replace('Tier ', 'T')}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9.5px] text-neutral-400 mb-0.5">
                          SW (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={custSw}
                          onChange={(e) => setCustSw(e.target.value)}
                          placeholder="+9 / -5"
                          className="w-full px-2 py-1 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 font-mono text-xs placeholder:text-neutral-400 focus:outline-1 focus:outline-[#C65D3B]"
                        />
                      </div>
                      <div>
                        <label className="block text-[9.5px] text-neutral-400 mb-0.5">
                          DW (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={custDw}
                          onChange={(e) => setCustDw(e.target.value)}
                          placeholder="+13"
                          className="w-full px-2 py-1 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 font-mono text-xs placeholder:text-neutral-400 focus:outline-1 focus:outline-[#C65D3B]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCustFormOpen(false)}
                        className="px-2 py-1 text-[10.5px] text-neutral-500 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-xs bg-[#C65D3B] text-white text-[10.5px] font-semibold cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                )}

                {/* Customer Rows */}
                <div className="space-y-0.5">
                  {filteredCustomers.map((cust) => {
                    const isSelected = cust.id === selectedCustomerId;
                    const swSign = cust.swMarginPercent > 0 ? '+' : '';
                    const dwSign = cust.dwMarginPercent > 0 ? '+' : '';

                    return (
                      <div
                        key={cust.id}
                        onClick={() => {
                          onSelectCustomer(cust);
                          onCloseMobile();
                        }}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-xs text-[10.5px] transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#C65D3B]/12 border border-[#C65D3B]/35 font-semibold'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1">
                            <span className="truncate text-[10.5px] font-medium">
                              {cust.name}
                            </span>
                            <span className="text-[9px] text-neutral-400 shrink-0">
                              · {cust.tier}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[9.5px] font-mono tabular-nums">
                            <span
                              className={
                                cust.swMarginPercent < 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-[#C65D3B]'
                              }
                            >
                              SW: {swSign}
                              {cust.swMarginPercent}%
                            </span>
                            <span className="text-neutral-300 dark:text-neutral-600">
                              |
                            </span>
                            <span className="text-neutral-400">
                              DW: {dwSign}
                              {cust.dwMarginPercent}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => openCustEdit(cust, e)}
                            className="p-1 text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white rounded-xs cursor-pointer"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCustomer(cust.id);
                            }}
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded-xs cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* AI CHAT THREADS & FOLDERS VIEW IN SIDEBAR */
              <>
                {pinnedAiThreads.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-1.5 py-1 text-[10.5px] font-semibold text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Pin className="w-3 h-3 text-[#C65D3B]" />
                        <span>Disematkan</span>
                      </div>
                      <span className="font-mono text-[9.5px] tabular-nums">
                        {pinnedAiThreads.length}
                      </span>
                    </div>
                    <div className="mt-0.5 space-y-0.5 pl-2 border-l border-black/8 dark:border-white/10">
                      {pinnedAiThreads.map(renderAiThreadRow)}
                    </div>
                  </div>
                )}

                {aiFolders.map((folder) => {
                  const folderThreads = filteredAiThreads.filter(
                    (t) => t.folderId === folder.id
                  );
                  const isCollapsed = !!aiCollapsedFolders[folder.id];
                  const isDropTarget = dragOverAiFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedAiThreadId) {
                          setDragOverAiFolderId(folder.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverAiFolderId === folder.id) {
                          setDragOverAiFolderId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedAiThreadId) {
                          onMoveAiThreadToFolder(draggedAiThreadId, folder.id);
                          setDraggedAiThreadId(null);
                          setDragOverAiFolderId(null);
                        }
                      }}
                      className={`rounded-md transition-all duration-150 ${
                        isDropTarget
                          ? 'bg-amber-500/20 border-2 border-dashed border-amber-500/80 p-1'
                          : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setAiCollapsedFolders((prev) => ({
                            ...prev,
                            [folder.id]: !prev[folder.id],
                          }))
                        }
                        className="w-full flex items-center justify-between px-1.5 py-1 rounded-xs hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Folder className="w-3 h-3 text-[#C65D3B] shrink-0" />
                          <span className="truncate">{folder.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9.5px] font-mono text-neutral-400 tabular-nums">
                            {folderThreads.length}
                          </span>
                          {isCollapsed ? (
                            <ChevronRight className="w-3 h-3 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-neutral-400" />
                          )}
                        </div>
                      </button>

                      {!isCollapsed && (
                        <div className="mt-0.5 space-y-0.5 pl-2 border-l border-black/8 dark:border-white/10">
                          {folderThreads.length === 0 ? (
                            <div className="py-1 px-2 text-[9.5px] italic text-neutral-400 dark:text-neutral-500">
                              Kosong
                            </div>
                          ) : (
                            folderThreads.map(renderAiThreadRow)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isAddingAiFolder ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newAiFolderName.trim()) {
                        onCreateAiFolder(newAiFolderName.trim());
                        setNewAiFolderName('');
                        setIsAddingAiFolder(false);
                      }
                    }}
                    className="px-1 pt-1"
                  >
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={newAiFolderName}
                        onChange={(e) => setNewAiFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setIsAddingAiFolder(false);
                        }}
                        placeholder="Nama folder AI..."
                        className="flex-1 px-2 py-1 text-[10.5px] rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-[#C65D3B] text-[#1C1B1A] dark:text-[#F2EFE9] placeholder:text-neutral-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 text-[10px] font-semibold bg-[#C65D3B] text-white rounded-md cursor-pointer"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingAiFolder(true)}
                    className="flex items-center gap-1.5 px-2 py-1 text-[10.5px] text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-3 h-3 text-[#C65D3B]" />
                    <span>+ Folder Baru</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* 4. Batch Action Dock for History */}
          {sidebarMode === 'history' && batchMode && selectedIds.length > 0 && (
            <div className="mx-3 mb-2 p-2.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/10 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[10.5px] font-semibold">
                <span>{selectedIds.length} spek dipilih</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-neutral-500 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <div className="flex items-center gap-1.5 relative">
                <button
                  type="button"
                  onClick={() => setBatchMoveMenuOpen(!batchMoveMenuOpen)}
                  className="flex-1 py-1 px-2 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 text-[10.5px] font-medium hover:bg-neutral-50 cursor-pointer"
                >
                  Pindah Folder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteItems(selectedIds);
                    setSelectedIds([]);
                    setBatchMode(false);
                  }}
                  className="py-1 px-2.5 rounded-xs bg-rose-600 text-white text-[10.5px] font-semibold hover:bg-rose-700 cursor-pointer"
                >
                  Hapus
                </button>

                {batchMoveMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-1 w-48 z-50 rounded-md bg-white dark:bg-[#161311] border border-black/15 dark:border-white/15 shadow-lg p-1">
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          onMoveItemsToFolder(selectedIds, f.id);
                          setBatchMoveMenuOpen(false);
                          setSelectedIds([]);
                          setBatchMode(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-[10.5px] rounded-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer truncate"
                      >
                        Ke: {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4B. Batch Action Dock for AI Threads */}
          {sidebarMode === 'ai' && aiBatchMode && selectedAiThreadIds.length > 0 && (
            <div className="mx-3 mb-2 p-2 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/10 dark:border-white/10 flex items-center justify-between text-[10.5px]">
              <span className="font-semibold">
                {selectedAiThreadIds.length} obrolan dipilih
              </span>
              <button
                type="button"
                onClick={() => {
                  onDeleteAiThreads(selectedAiThreadIds);
                  setSelectedAiThreadIds([]);
                  setAiBatchMode(false);
                }}
                className="py-1 px-2.5 rounded-xs bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          )}

          {/* 5. Footer Kontrol Sistem */}
          <div className="p-2.5 m-2.5 rounded-md bg-[#F9F9F9] dark:bg-[#1d1c1a] border border-black/6 dark:border-white/8 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[10.5px]">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 font-medium">
                <Layers className="w-3 h-3 text-[#C65D3B]" />
                <span>Engine Single Wall</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-xs bg-emerald-600" />
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between py-1 px-1.5 rounded-xs hover:bg-black/5 dark:hover:bg-white/5 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {isDarkMode ? (
                  <Moon className="w-3 h-3 text-amber-400" />
                ) : (
                  <Sun className="w-3 h-3 text-[#C65D3B]" />
                )}
                <span className="text-[10.5px]">Tema Tampilan</span>
              </div>
              <span className="font-mono text-[9.5px] text-neutral-400">
                {isDarkMode ? 'Dark' : 'Light'}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
