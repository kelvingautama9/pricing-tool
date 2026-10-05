import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../utils/hapticsAndImport';

export interface DropdownOptionItem {
  id: string;
  name: string;
  group?: string;
  tag?: string;
  supported?: boolean;
}

interface CustomPopoverDropdownProps {
  label: string;
  subLabel?: string;
  value: string;
  options: DropdownOptionItem[];
  onChange: (newValue: string) => void;
  groups?: string[];
  warningNote?: string;
  align?: 'left' | 'right';
}

export const CustomPopoverDropdown: React.FC<CustomPopoverDropdownProps> = ({
  label,
  subLabel,
  value,
  options,
  onChange,
  groups,
  warningNote,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.id === value) || options[0];

  // Close on click outside WITHOUT blocking page scroll (no fixed inset-0 overlay!)
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
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

  const filteredOptions =
    activeTab === 'ALL'
      ? options
      : options.filter((o) => o.group === activeTab);

  // Determine status indicator color based on selection characteristics
  const getIndicatorColor = (id: string, supported?: boolean) => {
    if (supported === false || id === 'CB/F') return 'bg-rose-600';
    if (id.startsWith('K')) return 'bg-[#C65D3B]';
    if (id === 'E/F') return 'bg-amber-600';
    return 'bg-emerald-600';
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Field Header */}
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] tracking-tight">
          {label}
        </label>
        {subLabel && (
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
            {subLabel}
          </span>
        )}
      </div>

      {/* Trigger Button — Clean Minimalist (Only ID + Tag, no duplicate description) */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-[#FFFFFF] dark:bg-[#161311] hover:bg-neutral-50 dark:hover:bg-[#1e1b18] border text-left transition-all duration-150 ease-out active:scale-[0.99] cursor-pointer select-none ${
          isOpen
            ? 'border-[#C65D3B] ring-1 ring-[#C65D3B]/30'
            : 'border-black/10 dark:border-white/10'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-xs shrink-0 ${getIndicatorColor(
              selectedOption?.id || value,
              selectedOption?.supported
            )}`}
          />
          <span className="font-mono font-semibold text-sm text-[#1C1B1A] dark:text-[#F2EFE9] truncate">
            {selectedOption?.id || value}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedOption?.tag && (
            <span className="text-[10.5px] font-mono text-neutral-400 dark:text-neutral-500">
              {selectedOption.tag}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-[#C65D3B]' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Popover Surface */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1 w-full min-w-[220px] z-50 rounded-md p-2 bg-[#FFFFFF]/98 dark:bg-[#161311]/98 border border-black/12 dark:border-white/15 shadow-lg text-xs text-[#1C1B1A] dark:text-[#F2EFE9]`}
        >
          {/* Optional Segmented Filter Tabs inside Popover */}
          {groups && groups.length > 0 && (
            <div className="flex items-center p-0.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/5 dark:border-white/5 mb-1.5 gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 py-1 px-2 rounded-xs font-medium text-[10.5px] transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === 'ALL'
                    ? 'bg-[#C65D3B] text-white font-semibold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white'
                }`}
              >
                Semua ({options.length})
              </button>
              {groups.map((grp) => {
                const count = options.filter((o) => o.group === grp).length;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setActiveTab(grp)}
                    className={`flex-1 py-1 px-2 rounded-xs font-medium text-[10.5px] transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                      activeTab === grp
                        ? 'bg-[#C65D3B] text-white font-semibold'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white'
                    }`}
                  >
                    {grp} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Contextual SOP Note if provided */}
          {warningNote && (
            <div className="flex items-start gap-1.5 px-2 py-1.5 mb-1.5 rounded-xs bg-amber-500/8 border border-amber-600/15 text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
              <AlertCircle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
              <span>{warningNote}</span>
            </div>
          )}

          {/* Option List (Overscroll contain so scrolling inside dropdown is smooth and outside page scroll works naturally) */}
          <div className="max-h-52 overflow-y-auto overscroll-contain custom-scrollbar space-y-0.5 pr-0.5">
            {filteredOptions.map((item) => {
              const isSelected = value === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onChange(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xs text-left transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[#C65D3B]/12 border border-[#C65D3B]/35 text-[#1C1B1A] dark:text-[#F2EFE9] font-semibold'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-xs shrink-0 ${getIndicatorColor(
                        item.id,
                        item.supported
                      )}`}
                    />
                    <span className="font-mono font-semibold text-xs">
                      {item.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.tag && (
                      <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                        {item.tag}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#C65D3B] shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

