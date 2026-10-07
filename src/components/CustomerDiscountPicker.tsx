import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Users,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  FileDown,
  FileUp,
  HelpCircle,
} from 'lucide-react';
import { CustomerDiscountItem, CustomerTier } from '../utils/pricingEngine';
import {
  triggerHaptic,
  downloadCustomerTemplateMd,
  downloadCustomerTemplateExcel,
  parseCustomerImportFile,
  parseCustomerExcelBuffer,
} from '../utils/hapticsAndImport';

interface CustomerDiscountPickerProps {
  customers: CustomerDiscountItem[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: CustomerDiscountItem) => void;
  onAddCustomer: (item: Omit<CustomerDiscountItem, 'id'>) => void;
  onUpdateCustomer: (item: CustomerDiscountItem) => void;
  onDeleteCustomer: (id: string) => void;
  onBulkImportCustomers: (items: CustomerDiscountItem[]) => void;
}

const TIERS: Array<'ALL' | CustomerTier> = ['ALL', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];

export const CustomerDiscountPicker: React.FC<CustomerDiscountPickerProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onBulkImportCustomers,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTier, setActiveTier] = useState<'ALL' | CustomerTier>('ALL');
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);
  const [showFormatGuide, setShowFormatGuide] = useState(false);

  // Inline Add / Edit Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formTier, setFormTier] = useState<CustomerTier>('Tier 1');
  const [formSw, setFormSw] = useState('9');
  const [formDw, setFormDw] = useState('11');
  const [isDwManuallyEdited, setIsDwManuallyEdited] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileImportRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Close on click outside WITHOUT blocking page scroll
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsFormOpen(false);
        setShowFormatGuide(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsFormOpen(false);
        setShowFormatGuide(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside, { passive: true });
    document.addEventListener('touchstart', handlePointerDownOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredCustomers = customers.filter((c) => {
    const matchesTier = activeTier === 'ALL' || c.tier === activeTier;
    const matchesSearch =
      !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const openAddForm = () => {
    triggerHaptic('light');
    setEditingId(null);
    setFormName('');
    setFormTier('Tier 1');
    setFormSw('0');
    setFormDw('2');
    setIsDwManuallyEdited(false);
    setIsFormOpen(true);
    setShowFormatGuide(false);
  };

  const openEditForm = (cust: CustomerDiscountItem, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setEditingId(cust.id);
    setFormName(cust.name);
    setFormTier(cust.tier);
    setFormSw(String(cust.swMarginPercent));
    setFormDw(String(cust.dwMarginPercent));
    setIsDwManuallyEdited(true);
    setIsFormOpen(true);
    setShowFormatGuide(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) return;

    triggerHaptic('success');
    const swVal = parseFloat(formSw.replace(',', '.'));
    const dwVal = parseFloat(formDw.replace(',', '.'));

    const payload = {
      name: trimmedName,
      tier: formTier,
      swMarginPercent: Number.isFinite(swVal) ? swVal : 0,
      dwMarginPercent: Number.isFinite(dwVal) ? dwVal : 0,
    };

    if (editingId) {
      onUpdateCustomer({ id: editingId, ...payload });
    } else {
      onAddCustomer(payload);
    }

    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setImportStatusMsg(`+${parsed.length} customer berhasil diimpor`);
      } else {
        setImportStatusMsg('Format file tidak sesuai / kosong');
      }
      setTimeout(() => setImportStatusMsg(null), 3000);
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const formatSignedPercent = (val: number) => {
    if (val > 0) return `+${val}%`;
    return `${val}%`;
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Split Action Trigger Button */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            openAddForm();
          }}
          title="Tambah Acuan Diskon Customer Baru"
          className="h-9 w-9 flex items-center justify-center rounded-md bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-[#C65D3B] hover:text-white border border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-300 transition-colors duration-150 active:scale-[0.97] cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsOpen(!isOpen);
          }}
          className={`h-9 px-3 flex items-center gap-2 rounded-md border text-xs font-medium transition-colors duration-150 active:scale-[0.98] cursor-pointer select-none whitespace-nowrap ${
            selectedCustomer
              ? 'bg-[#C65D3B]/10 border-[#C65D3B]/40 text-[#C65D3B] font-semibold'
              : 'bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 border-black/10 dark:border-white/10 text-[#1C1B1A] dark:text-[#F2EFE9]'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-[#C65D3B] shrink-0" />
          <span className="truncate max-w-[130px] sm:max-w-[160px]">
            {selectedCustomer ? selectedCustomer.name : 'Acuan Customer'}
          </span>
        </button>
      </div>

      {/* Floating Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-80 sm:w-96 z-50 rounded-md p-2.5 bg-[#FFFFFF]/98 dark:bg-[#161311]/98 border border-black/15 dark:border-white/15 shadow-xl text-xs text-[#1C1B1A] dark:text-[#F2EFE9]">
          {/* Top Search & Add Bar */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus={!isFormOpen}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama PT / customer..."
                className="w-full pl-8 pr-6 py-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 text-xs text-[#1C1B1A] dark:text-[#F2EFE9] placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-1 focus:outline-[#C65D3B]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={openAddForm}
              className="px-2.5 py-1.5 rounded-xs bg-[#C65D3B] hover:bg-[#b24f2f] text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>Baru</span>
            </button>
          </div>

          {/* Filter by Tier Tabs (Semua | Tier 1 | Tier 2 | Tier 3 | Tier 4) */}
          <div className="flex items-center p-0.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/5 dark:border-white/5 mb-2 gap-0.5 overflow-x-auto no-scrollbar">
            {TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTier(tier);
                }}
                className={`flex-1 py-1 px-1 rounded-xs text-[9.5px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTier === tier
                    ? 'bg-[#C65D3B] text-white font-semibold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white'
                }`}
              >
                {tier === 'ALL' ? 'Semua' : tier}
              </button>
            ))}
          </div>

          {/* Inline Create / Edit Customer Form */}
          {isFormOpen && (
            <form
              onSubmit={handleSaveForm}
              className="mb-2 p-2.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-[#C65D3B]/40 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#C65D3B]">
                <span>{editingId ? 'Edit Data Customer' : 'Tambah Customer Baru'}</span>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: PT Vinns Carton"
                className="w-full px-2 py-1.5 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 text-xs placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-1 focus:outline-[#C65D3B]"
              />

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[10px] text-neutral-500 mb-0.5">
                    Tier
                  </label>
                  <div className="flex rounded-xs overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-[#161311]">
                    {(['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'] as CustomerTier[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setFormTier(t);
                        }}
                        className={`flex-1 py-1 text-[9px] font-medium cursor-pointer ${
                          formTier === t
                            ? 'bg-[#C65D3B] text-white font-semibold'
                            : 'text-neutral-500'
                        }`}
                      >
                        {t.replace('Tier ', 'T')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-500 mb-0.5">
                    SW (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formSw}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormSw(val);
                      if (!isDwManuallyEdited) {
                        const parsed = parseFloat(val.replace(',', '.'));
                        if (Number.isFinite(parsed)) {
                          setFormDw(String(Number((parsed + 2).toFixed(2))));
                        }
                      }
                    }}
                    placeholder="+9 / -5"
                    className="w-full px-2 py-1 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 font-mono text-xs placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-1 focus:outline-[#C65D3B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-500 mb-0.5 truncate" title="Diskon khusus saat memakai bahan 275 atau E-Flute">
                    275 / E Flute (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formDw}
                    onChange={(e) => {
                      setIsDwManuallyEdited(true);
                      setFormDw(e.target.value);
                    }}
                    placeholder="+11"
                    className="w-full px-2 py-1 rounded-xs bg-white dark:bg-[#161311] border border-black/10 dark:border-white/10 font-mono text-xs placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:outline-1 focus:outline-[#C65D3B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-2.5 py-1 rounded-xs text-[11px] text-neutral-500 hover:bg-black/5 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-xs bg-[#C65D3B] text-white text-[11px] font-semibold cursor-pointer"
                >
                  Simpan Customer
                </button>
              </div>
            </form>
          )}

          {/* Scrollable Customer List (Compact font size) */}
          <div className="max-h-52 overflow-y-auto overscroll-contain custom-scrollbar space-y-0.5 pr-0.5">
            {filteredCustomers.length === 0 ? (
              <div className="py-4 text-center text-[10.5px] text-neutral-400">
                Customer tidak ditemukan.
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = cust.id === selectedCustomerId;
                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      triggerHaptic('medium');
                      onSelectCustomer(cust);
                      setIsOpen(false);
                    }}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#C65D3B]/12 border border-[#C65D3B]/35'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[10.5px] truncate">
                          {cust.name}
                        </span>
                        <span className="text-[9px] text-neutral-400 dark:text-neutral-500 shrink-0">
                          · {cust.tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[9.5px] font-mono tabular-nums">
                        <span
                          className={
                            cust.swMarginPercent < 0
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-[#C65D3B] font-semibold'
                          }
                        >
                          SW: {formatSignedPercent(cust.swMarginPercent)}
                        </span>
                        <span className="text-neutral-300 dark:text-neutral-600">|</span>
                        <span className="text-neutral-400 dark:text-neutral-500">
                          275/EF: {formatSignedPercent(cust.dwMarginPercent)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        title="Edit Customer"
                        onClick={(e) => openEditForm(cust, e)}
                        className="p-1 text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white rounded-xs cursor-pointer"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        title="Hapus Customer"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          onDeleteCustomer(cust.id);
                        }}
                        className="p-1 text-neutral-400 hover:text-rose-600 rounded-xs cursor-pointer"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                      {isSelected && (
                        <Check className="w-3 h-3 text-[#C65D3B] ml-0.5" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Utility Bar: Format Guide Preview, Template (.MD & .XLSX), and Import */}
          <div className="mt-2 pt-2 border-t border-black/8 dark:border-white/10 space-y-1.5">
            {importStatusMsg && (
              <div className="text-[10.5px] font-mono text-center text-emerald-600 dark:text-emerald-400">
                {importStatusMsg}
              </div>
            )}

            {/* Toggleable Visual Format Guide for .MD and Excel (Kolom A–E) */}
            {showFormatGuide && (
              <div className="p-2 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] border border-black/8 dark:border-white/10 space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between font-semibold text-[#C65D3B]">
                  <span>Panduan Format Kolom (.MD & Excel .XLSX)</span>
                  <button
                    type="button"
                    onClick={() => setShowFormatGuide(false)}
                    className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-neutral-500 dark:text-neutral-400 leading-relaxed font-mono text-[9.5px]">
                  • Kolom A: Nomor (1, 2, ...)<br />
                  • Kolom B: Nama Customer (PT Vinns Carton)<br />
                  • Kolom C: Tier (Tier 1 / Tier 2 / Tier 3 / Tier 4)<br />
                  • Kolom D: Diskon SW (+9% atau -3.5%)<br />
                  • Kolom E: 275 / E Flute (+11% — sudah termasuk +2%)
                </div>
                <pre className="p-1.5 rounded-xs bg-white dark:bg-[#161311] border border-black/6 dark:border-white/8 font-mono text-[9px] text-neutral-600 dark:text-neutral-300 overflow-x-auto">
{`| No | Nama Customer   | Tier   | Diskon SW | 275 / E Flute |
| 1  | PT Vinns Carton | Tier 1 | +9%       | +11%          |`}
                </pre>
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={downloadCustomerTemplateMd}
                title="Download contoh file template-database-customer.md"
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 text-[10px] font-medium text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                <FileDown className="w-3 h-3 text-[#C65D3B]" />
                <span>.MD</span>
              </button>
              <button
                type="button"
                onClick={downloadCustomerTemplateExcel}
                title="Download contoh file template-database-customer.xlsx (Kolom A-E)"
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xs bg-[#F3F1ED] dark:bg-[#22201E] hover:bg-black/8 dark:hover:bg-white/8 text-[10px] font-medium text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                <FileDown className="w-3 h-3 text-emerald-600" />
                <span>.XLSX</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  fileImportRef.current?.click();
                }}
                title="Import dari file Excel (.xls, .xlsx) atau Markdown (.md, .csv)"
                className="flex-[1.5] flex items-center justify-center gap-1 py-1.5 px-2 rounded-xs bg-[#C65D3B]/12 hover:bg-[#C65D3B] hover:text-white text-[#C65D3B] text-[10px] font-semibold transition-colors cursor-pointer"
              >
                <FileUp className="w-3 h-3" />
                <span>Import File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowFormatGuide(!showFormatGuide);
                }}
                title="Lihat contoh struktur kolom file .MD & Excel"
                className={`p-1.5 rounded-xs border transition-colors cursor-pointer ${
                  showFormatGuide
                    ? 'bg-[#C65D3B] text-white border-[#C65D3B]'
                    : 'bg-[#F3F1ED] dark:bg-[#22201E] border-black/6 dark:border-white/8 text-neutral-500'
                }`}
              >
                <HelpCircle className="w-3 h-3" />
              </button>
              <input
                ref={fileImportRef}
                type="file"
                accept=".xlsx,.xls,.ods,.md,.markdown,.csv,.txt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
