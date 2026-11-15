import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle } from '../MomentumIcons';

/**
 * CustomSelect - Menu sổ xuống được thiết kế theo chuẩn SmartChain Design System
 * Thay thế hoàn toàn thẻ <select> mặc định thô kệch của trình duyệt.
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Chọn một mục...',
  className = '',
  popoverClassName = '',
  align = 'left',
  size = 'md', // 'sm' | 'md' | 'lg'
  dotIndicator = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Đóng dropdown khi nhấp ra ngoài hoặc nhấn phím ESC
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-[11.5px]',
    md: 'py-2 px-3.5 text-xs',
    lg: 'py-2.5 px-4 text-[13px]',
  }[size] || 'py-2 px-3.5 text-xs';

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between gap-2.5 rounded-full border border-orange-950/10 bg-white font-bold text-[#1A1A1A] shadow-sm transition-all hover:border-[#F95716]/40 hover:bg-orange-500/[0.02] focus:outline-none dark:border-orange-500/20 dark:bg-[#1C140F] dark:text-[#F5F5F5] ${sizeClasses} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          {dotIndicator && (
            <span className="h-2 w-2 rounded-full bg-[#F95716] shrink-0 animate-pulse" />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.subLabel && (
            <span className="hidden sm:inline text-neutral-400 font-normal truncate">
              &bull; {selectedOption.subLabel}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-neutral-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#F95716]' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 min-w-[240px] max-w-[380px] rounded-2xl border border-orange-950/10 bg-white/95 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-orange-500/20 dark:bg-[#1C140F]/95 animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${popoverClassName}`}
          role="listbox"
        >
          <div className="max-h-64 overflow-y-auto space-y-1 overscroll-contain pr-1 custom-scrollbar">
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isSelected}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-orange-500/10 text-[#F95716] font-bold'
                      : 'text-neutral-700 hover:bg-orange-950/[0.04] hover:text-[#1A1A1A] dark:text-neutral-300 dark:hover:bg-white/5 dark:hover:text-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {opt.subLabel && (
                      <div className="text-[10.5px] text-neutral-400 font-normal truncate mt-0.5">
                        {opt.subLabel}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span className="text-[#F95716] shrink-0">
                      <CheckCircle size={15} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

