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
  align?: 'left' | 'right' | 'center';
  compact?: boolean;
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
  compact = false,
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
    <div ref={containerRef} className={`relative w-full min-w-0 ${isOpen ? 'z-40' : 'z-10'}`}>
      {/* Field Header */}
      <div className="flex items-baseline justify-between mb-1">
        <label
          className={`${
            compact ? 'text-xs sm:text-[10.5px]' : 'text-xs'
          } font-semibold text-[#1C1B1A] dark:text-[#F2EFE9] tracking-tight whitespace-nowrap truncate`}
        >
          {label}
        </label>
        {subLabel && (
          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
            {subLabel}
          </span>
        )}
      </div>

      {/* Trigger Button — Clean Minimalist (On mobile stacked 1-col, full comfortable layout; on sm desktop, compact 5-col) */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between ${
          compact
            ? 'gap-1 px-2.5 sm:px-1.5 md:px-2 py-2'
            : 'gap-2 px-3 py-2'
        } rounded-md bg-[#FFFFFF] dark:bg-[#161311] hover:bg-neutral-50 dark:hover:bg-[#1e1b18] border text-left transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer select-none overflow-hidden ${
          isOpen
            ? 'border-[#C65D3B] ring-1 ring-[#C65D3B]/30'
            : 'border-black/10 dark:border-white/10'
        }`}
      >
        <div
          className={`flex items-center ${
            compact ? 'gap-1.5 sm:gap-1' : 'gap-2'
          } min-w-0`}
        >
          <span
            className={`${
              compact ? 'w-2 h-2 sm:w-1.5 sm:h-1.5' : 'w-2 h-2'
            } rounded-xs shrink-0 ${getIndicatorColor(
              selectedOption?.id || value,
              selectedOption?.supported
            )}`}
          />
          <span
            className={`font-mono font-semibold ${
              compact
                ? 'text-sm sm:text-[11px] md:text-xs'
                : 'text-sm'
            } text-[#1C1B1A] dark:text-[#F2EFE9] whitespace-nowrap leading-none`}
          >
            {selectedOption?.id || value}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {/* Hide secondary tag in compact mode on desktop (sm to 2xl) so it never collides or overlaps with the material ID */}
          {selectedOption?.tag && (
            <span
              className={`text-[10px] font-mono text-neutral-400 dark:text-neutral-500 whitespace-nowrap ${
                compact ? 'inline sm:hidden' : 'hidden xl:inline'
              }`}
            >
              {selectedOption.tag}
            </span>
          )}
          <ChevronDown
            className={`${
              compact
                ? 'w-3.5 h-3.5 sm:w-3 sm:h-3'
                : 'w-3.5 h-3.5'
            } shrink-0 text-neutral-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#C65D3B]' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Popover Surface — Clean responsive alignment that never collides or overflows mobile screen */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right'
              ? 'right-0'
              : align === 'center'
              ? 'left-0 sm:left-1/2 sm:-translate-x-1/2'
              : 'left-0'
          } mt-1.5 w-full sm:w-auto min-w-full sm:min-w-[230px] max-w-[calc(100vw-2rem)] sm:max-w-none z-50 rounded-md p-2 bg-[#FFFFFF]/98 dark:bg-[#161311]/98 border border-black/12 dark:border-white/15 shadow-xl text-xs text-[#1C1B1A] dark:text-[#F2EFE9] origin-top animate-[liquidPop_0.22s_cubic-bezier(0.22,1,0.36,1)]`}
        >
          {/* Segmented Filter Tabs inside Popover (clean compact tab pills that never wrap or overflow) */}
          {groups && groups.length > 0 && (
            <div className="flex items-center p-0.5 rounded-md bg-[#F3F1ED] dark:bg-[#22201E] border border-black/5 dark:border-white/5 mb-1.5 gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 py-1 px-1.5 rounded-xs font-medium text-[9.5px] sm:text-[10px] transition-colors duration-150 cursor-pointer text-center truncate ${
                  activeTab === 'ALL'
                    ? 'bg-[#C65D3B] text-white font-semibold shadow-xs'
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
                    className={`flex-1 py-1 px-1.5 rounded-xs font-medium text-[9.5px] sm:text-[10px] transition-colors duration-150 cursor-pointer text-center truncate ${
                      activeTab === grp
                        ? 'bg-[#C65D3B] text-white font-semibold shadow-xs'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-[#1C1B1A] dark:hover:text-white'
                    }`}
                  >
                    {grp} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Contextual SOP Note if provided (Ultra-compact badge to save vertical space) */}
          {warningNote && (
            <div className="flex items-center gap-1 px-1.5 py-1 mb-1.5 rounded-xs bg-amber-500/8 border border-amber-600/15 text-[9px] text-neutral-500 dark:text-neutral-400 leading-tight">
              <AlertCircle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
              <span className="truncate">{warningNote}</span>
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

